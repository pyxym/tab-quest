export {}
import { DEFAULT_CATEGORIES } from "./types/category"
import type { Category, CategoryMapping } from "./types/category"
import { detectSmartGroups } from "./utils/smartGrouping"

// Configuration for smart organize behavior
interface SmartOrganizeConfig {
  closeDuplicates: boolean
  minGroupSize: number
  respectUserCategories: boolean
  enableSmartGroups: boolean
  prioritizeRecent: boolean
  groupSingleTabs: boolean
}

// Store for undo operations
interface UndoState {
  timestamp: number
  groupIds: number[]
  ungroupedTabs: number[]
  closedTabs: Array<{ url: string, title: string }>
}

let lastUndoState: UndoState | null = null

// Tab monitoring and AI analysis
chrome.runtime.onInstalled.addListener(async () => {
  console.log("TabAI installed and ready!")
  
  // Initialize default settings with more options
  chrome.storage.local.set({
    aiEnabled: true,
    autoGrouping: true,
    productivityTracking: true,
    smartOrganizeConfig: {
      closeDuplicates: true,
      minGroupSize: 2,
      respectUserCategories: true,
      enableSmartGroups: true,
      prioritizeRecent: true,
      groupSingleTabs: false
    } as SmartOrganizeConfig
  })
  
  // Initialize categories if not exist
  const result = await chrome.storage.sync.get(["categories"])
  if (!result.categories) {
    await chrome.storage.sync.set({ 
      categories: DEFAULT_CATEGORIES,
      categoryMapping: {}
    })
  }
  
  // Clean up old tab data on install
  await chrome.storage.local.set({ tabsData: {} })
})

// Clean up tab data periodically (every 30 minutes)
setInterval(async () => {
  try {
    const result = await chrome.storage.local.get("tabsData")
    const tabsData = result.tabsData || {}
    const tabs = await chrome.tabs.query({})
    const activeTabIds = new Set(tabs.map(tab => tab.id).filter(id => id !== undefined))
    
    // Remove data for tabs that no longer exist
    const cleanedData: any = {}
    for (const [tabId, data] of Object.entries(tabsData)) {
      if (activeTabIds.has(parseInt(tabId))) {
        cleanedData[tabId] = data
      }
    }
    
    // Keep only the most recent 1000 tabs data to prevent unbounded growth
    const entries = Object.entries(cleanedData)
    if (entries.length > 1000) {
      entries.sort((a: any, b: any) => b[1].lastAccessed - a[1].lastAccessed)
      const limitedData: any = {}
      entries.slice(0, 1000).forEach(([id, data]) => {
        limitedData[id] = data
      })
      await chrome.storage.local.set({ tabsData: limitedData })
    } else {
      await chrome.storage.local.set({ tabsData: cleanedData })
    }
  } catch (error) {
    console.error("Error cleaning tab data:", error)
  }
}, 30 * 60 * 1000) // 30 minutes

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener(async (tabId) => {
  try {
    const result = await chrome.storage.local.get("tabsData")
    const tabsData = result.tabsData || {}
    delete tabsData[tabId]
    await chrome.storage.local.set({ tabsData })
  } catch (error) {
    console.error("Error removing tab data:", error)
  }
})

// Monitor tab creation
chrome.tabs.onCreated.addListener((tab) => {
  console.log("New tab created:", tab.url)
  analyzeAndCategorizeTab(tab)
})

// Monitor tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    analyzeAndCategorizeTab(tab)
  }
})

// Monitor tab activation for usage tracking
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId)
    updateTabAccessTime(tab)
  } catch (error) {
    console.error("Error getting active tab:", error)
  }
})

// Analyze and categorize tabs with better error handling
async function analyzeAndCategorizeTab(tab: chrome.tabs.Tab) {
  if (!tab.url || !tab.id) return
  
  try {
    const domain = new URL(tab.url).hostname
    const category = await getCategoryForDomain(domain)
    
    // Store tab metadata
    const tabData = {
      id: tab.id,
      url: tab.url,
      title: tab.title || "",
      domain,
      category,
      lastAccessed: Date.now(),
      accessCount: 1
    }
    
    // Get existing tabs data with error handling
    const result = await chrome.storage.local.get("tabsData")
    const tabsData = result.tabsData || {}
    
    // Update or add tab data
    if (tabsData[tab.id]) {
      tabsData[tab.id].accessCount++
      tabsData[tab.id].lastAccessed = Date.now()
      tabsData[tab.id].category = category // Always update to latest category
    } else {
      tabsData[tab.id] = tabData
    }
    
    await chrome.storage.local.set({ tabsData })
  } catch (error) {
    console.error("Error analyzing tab:", error)
  }
}

// Enhanced category detection with better domain matching
async function getCategoryForDomain(domain: string): Promise<string> {
  const result = await chrome.storage.sync.get(["categories", "categoryMapping"])
  const categories: Category[] = result.categories || DEFAULT_CATEGORIES
  const categoryMapping: CategoryMapping = result.categoryMapping || {}
  
  // Normalize domain for better matching
  const normalizedDomain = domain.toLowerCase().replace(/^www\./, '')
  
  // Check explicit mapping first - this takes precedence over everything
  if (categoryMapping[normalizedDomain]) {
    return categoryMapping[normalizedDomain]
  }
  
  // Check for exact domain matches first
  for (const category of categories) {
    if (category.domains.some(d => normalizedDomain === d.toLowerCase())) {
      return category.id
    }
  }
  
  // Then check for subdomain/partial matches
  for (const category of categories) {
    if (category.domains.some(d => normalizedDomain.includes(d.toLowerCase()))) {
      return category.id
    }
  }
  
  // Check keywords in domain
  for (const category of categories) {
    if (category.keywords.some(keyword => normalizedDomain.includes(keyword.toLowerCase()))) {
      return category.id
    }
  }
  
  return "other" // Always return lowercase to match DEFAULT_CATEGORIES
}

// Update tab access time with error handling
async function updateTabAccessTime(tab: chrome.tabs.Tab) {
  if (!tab.id) return
  
  try {
    const result = await chrome.storage.local.get("tabsData")
    const tabsData = result.tabsData || {}
    
    if (tabsData[tab.id]) {
      tabsData[tab.id].lastAccessed = Date.now()
      await chrome.storage.local.set({ tabsData })
    }
  } catch (error) {
    console.error("Error updating tab access time:", error)
  }
}

// Check if a domain has been explicitly assigned by user
async function isUserAssignedCategory(domain: string): Promise<boolean> {
  const result = await chrome.storage.sync.get(["categoryMapping"])
  const categoryMapping = result.categoryMapping || {}
  const normalizedDomain = domain.toLowerCase().replace(/^www\./, '')
  return normalizedDomain in categoryMapping
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getTabsAnalysis") {
    getTabsAnalysis().then(sendResponse)
    return true
  }
  
  if (request.action === "smartOrganize") {
    smartOrganizeTabs(request.config).then(sendResponse)
    return true
  }
  
  if (request.action === "undoOrganize") {
    undoLastOrganize().then(sendResponse)
    return true
  }
  
  if (request.action === "getCategoryForDomain") {
    getCategoryForDomain(request.domain).then(sendResponse)
    return true
  }
  
  if (request.action === "findDuplicates") {
    findDuplicateTabs().then(sendResponse)
    return true
  }
})

// Get comprehensive tabs analysis
async function getTabsAnalysis() {
  const tabs = await chrome.tabs.query({})
  const result = await chrome.storage.local.get("tabsData")
  const tabsData = result.tabsData || {}
  
  const analysis = {
    totalTabs: tabs.length,
    categoryCounts: {} as Record<string, number>,
    duplicates: [] as any[],
    memoryUsage: 0,
    suggestions: [] as any[]
  }
  
  // Count categories
  tabs.forEach(tab => {
    if (tab.id && tabsData[tab.id]) {
      const category = tabsData[tab.id].category || "other"
      analysis.categoryCounts[category] = (analysis.categoryCounts[category] || 0) + 1
    }
  })
  
  // Find duplicates
  const urlCounts = {} as Record<string, chrome.tabs.Tab[]>
  tabs.forEach(tab => {
    if (tab.url) {
      const normalizedUrl = tab.url.replace(/\/$/, "") // Remove trailing slash
      if (!urlCounts[normalizedUrl]) {
        urlCounts[normalizedUrl] = []
      }
      urlCounts[normalizedUrl].push(tab)
    }
  })
  
  Object.entries(urlCounts).forEach(([url, tabList]) => {
    if (tabList.length > 1) {
      analysis.duplicates.push({
        url,
        count: tabList.length,
        tabs: tabList
      })
    }
  })
  
  // Generate AI suggestions
  if (analysis.totalTabs > 20) {
    analysis.suggestions.push({
      type: "high_tab_count",
      message: `You have ${analysis.totalTabs} tabs open. Consider closing inactive tabs to improve performance.`,
      priority: "high"
    })
  }
  
  if (analysis.duplicates.length > 0) {
    const totalDuplicates = analysis.duplicates.reduce((sum, d) => sum + d.count - 1, 0)
    analysis.suggestions.push({
      type: "duplicates",
      message: `Found ${totalDuplicates} duplicate tabs that can be closed.`,
      priority: "medium"
    })
  }
  
  return analysis
}

// Enhanced smart organize with better error handling and user preferences
async function smartOrganizeTabs(userConfig?: Partial<SmartOrganizeConfig>) {
  // Prevent concurrent executions
  if ((globalThis as any).isOrganizing) {
    return {
      success: false,
      groupsCreated: 0,
      closedDuplicates: 0,
      suspendedTabs: 0,
      errors: ['Organization already in progress'],
      message: '⏳ Organization already in progress',
      canUndo: false
    }
  }
  
  (globalThis as any).isOrganizing = true
  
  try {
    // Small delay to ensure storage sync is complete
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Get configuration
    const storedConfig = await chrome.storage.local.get("smartOrganizeConfig")
    const config: SmartOrganizeConfig = {
      ...storedConfig.smartOrganizeConfig,
      ...userConfig
    }
    
    // Initialize undo state
    const undoState: UndoState = {
      timestamp: Date.now(),
      groupIds: [],
      ungroupedTabs: [],
      closedTabs: []
    }
    
    const tabs = await chrome.tabs.query({ currentWindow: true })
    const result = await chrome.storage.local.get("tabsData")
    const tabsData = result.tabsData || {}
    
    let closedDuplicates = 0
    let suspendedTabs = 0
    let groupsCreated = 0
    let errors: string[] = []
    
    // Step 1: Find and close duplicate tabs if enabled
    if (config.closeDuplicates) {
      const duplicates = await findDuplicateTabs()
      for (const duplicate of duplicates) {
        try {
          // Keep the most recently accessed tab
          const sortedTabs = duplicate.tabs.sort((a, b) => {
            const aData = tabsData[a.id!]
            const bData = tabsData[b.id!]
            const aTime = aData?.lastAccessed || 0
            const bTime = bData?.lastAccessed || 0
            return config.prioritizeRecent ? bTime - aTime : aTime - bTime
          })
          
          // Close all but the first tab
          for (let i = 1; i < sortedTabs.length; i++) {
            if (sortedTabs[i].id) {
              undoState.closedTabs.push({
                url: sortedTabs[i].url || '',
                title: sortedTabs[i].title || ''
              })
              await chrome.tabs.remove(sortedTabs[i].id)
              closedDuplicates++
            }
          }
        } catch (error) {
          console.error("Error closing duplicate:", error)
          errors.push(`Failed to close duplicate: ${error}`)
        }
      }
    }
    
    // Step 2: Re-query tabs after closing duplicates
    const remainingTabs = await chrome.tabs.query({ currentWindow: true })
    
    // Step 3: Save current grouping state for undo
    const existingGroupIds = new Set<number>()
    for (const tab of remainingTabs) {
      if (tab.groupId && tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
        existingGroupIds.add(tab.groupId)
        if (tab.id) undoState.ungroupedTabs.push(tab.id)
      }
    }
    
    // Step 4: Ungroup all existing tabs first to ensure clean grouping
    console.log('[DEBUG] Existing group IDs to ungroup:', Array.from(existingGroupIds))
    
    // First, ungroup ALL tabs in the current window to ensure clean slate
    try {
      const allTabIds = remainingTabs.map(t => t.id).filter(id => id !== undefined) as number[]
      if (allTabIds.length > 0) {
        await chrome.tabs.ungroup(allTabIds)
        console.log('[DEBUG] Ungrouped all tabs successfully')
      }
    } catch (error) {
      console.error('[DEBUG] Error ungrouping all tabs:', error)
      // Continue anyway, some tabs might not be in groups
    }
    
    // Step 5: Enhanced project detection with more platforms
    const projectPatterns = [
      { pattern: /github\.com\/([^\/]+)\/([^\/]+)/, prefix: 'GH' },
      { pattern: /gitlab\.com\/([^\/]+)\/([^\/]+)/, prefix: 'GL' },
      { pattern: /bitbucket\.org\/([^\/]+)\/([^\/]+)/, prefix: 'BB' },
      { pattern: /codepen\.io\/([^\/]+)\/pen\/([^\/]+)/, prefix: 'CP' },
      { pattern: /codesandbox\.io\/s\/([^\/]+)/, prefix: 'CS' },
      { pattern: /stackblitz\.com\/edit\/([^\/]+)/, prefix: 'SB' },
      { pattern: /replit\.com\/@([^\/]+)\/([^\/]+)/, prefix: 'RP' }
    ]
    
    // Step 6: Analyze tabs and group by smart criteria
    const categoryGroups = new Map<string, number[]>()
    const projectGroups = new Map<string, { tabs: number[], confidence: number }>()
    const processedTabs = new Set<number>()
    
    // First pass: Identify project tabs
    for (const tab of remainingTabs) {
      if (!tab.id || !tab.url) continue
      
      try {
        const url = new URL(tab.url)
        const domain = url.hostname.toLowerCase().replace(/^www\./, '')
        
        // Check if user has explicitly assigned a category
        const isUserAssigned = await isUserAssignedCategory(domain)
        
        // Project detection only if not user-assigned and respectUserCategories is true
        if (!isUserAssigned || !config.respectUserCategories) {
          for (const { pattern, prefix } of projectPatterns) {
            const match = tab.url.match(pattern)
            if (match) {
              const projectKey = `${prefix}:${match[1]}/${match[2] || match[1]}`
              if (!projectGroups.has(projectKey)) {
                projectGroups.set(projectKey, { tabs: [], confidence: 0.95 })
              }
              projectGroups.get(projectKey)!.tabs.push(tab.id)
              processedTabs.add(tab.id)
              break
            }
          }
        }
      } catch (error) {
        console.error("Error processing tab for projects:", error)
      }
    }
    
    // Second pass: Regular category grouping for non-project tabs
    for (const tab of remainingTabs) {
      if (!tab.id || !tab.url || processedTabs.has(tab.id)) continue
      
      // Skip chrome:// and other special URLs
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        continue
      }
      
      try {
        const url = new URL(tab.url)
        const domain = url.hostname
        
        // Get category with latest mapping
        const category = await getCategoryForDomain(domain)
        
        // Update tabsData with the latest category
        if (!tabsData[tab.id]) {
          await analyzeAndCategorizeTab(tab)
        } else if (tabsData[tab.id].category !== category) {
          tabsData[tab.id].category = category
          await chrome.storage.local.set({ tabsData })
        }
        
        // Ensure category is valid
        const finalCategory = category || 'other'
        
        if (!categoryGroups.has(finalCategory)) {
          categoryGroups.set(finalCategory, [])
        }
        categoryGroups.get(finalCategory)!.push(tab.id)
        processedTabs.add(tab.id)
        
      } catch (error) {
        console.error("Error categorizing tab:", error)
      }
    }
    
    // Step 7: Ensure all remaining tabs are in "other" category if not processed
    // This must happen BEFORE smart grouping to ensure "other" category gets populated
    const unprocessedTabs = remainingTabs.filter(tab => 
      tab.id && !processedTabs.has(tab.id) && tab.url && 
      !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')
    )
    
    // Add unprocessed tabs to "other" category first
    for (const tab of unprocessedTabs) {
      if (!tab.id) continue
      
      // Get the category one more time to be sure
      try {
        const url = new URL(tab.url!)
        const domain = url.hostname
        const category = await getCategoryForDomain(domain)
        
        // If it's truly "other", add it to the other category group
        if (category === 'other') {
          if (!categoryGroups.has('other')) {
            categoryGroups.set('other', [])
          }
          categoryGroups.get('other')!.push(tab.id)
          processedTabs.add(tab.id)
        }
      } catch (error) {
        // If we can't determine category, add to other
        if (!categoryGroups.has('other')) {
          categoryGroups.set('other', [])
        }
        categoryGroups.get('other')!.push(tab.id)
        processedTabs.add(tab.id)
      }
    }
    
    // Step 8: Apply smart grouping if enabled (after other categorization)
    let smartGroups: any[] = []
    if (config.enableSmartGroups) {
      // Get tabs that haven't been processed yet (excludes "other" tabs now)
      const tabsForSmartGrouping = remainingTabs.filter(tab => 
        tab.id && !processedTabs.has(tab.id) && tab.url && 
        !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')
      )
      
      if (tabsForSmartGrouping.length > 0) {
        smartGroups = detectSmartGroups(tabsForSmartGrouping)
        
        // Filter smart groups by minimum size and confidence
        smartGroups = smartGroups.filter(group => 
          group.tabIds.length >= config.minGroupSize && group.confidence >= 0.6
        )
        
        // Mark smart group tabs as processed
        smartGroups.forEach(group => {
          group.tabIds.forEach(tabId => processedTabs.add(tabId))
        })
      }
    }
    
    // Step 9: Create tab groups
    const categoriesResult = await chrome.storage.sync.get(["categories"])
    const categories: Category[] = categoriesResult.categories || DEFAULT_CATEGORIES
    const categoryMap = new Map(categories.map(c => [c.id, c]))
    
    // Create category groups
    console.log('[DEBUG] Category groups:', Array.from(categoryGroups.entries()).map(([cat, tabs]) => ({ 
      category: cat, 
      count: tabs.length,
      tabIds: tabs
    })))
    
    for (const [categoryId, tabIds] of categoryGroups) {
      // Group all categories with tabs, including "Other"
      if (tabIds.length > 0) {
        try {
          console.log(`[DEBUG] Attempting to group ${tabIds.length} tabs for category: ${categoryId}`)
          
          // Verify tabs exist before grouping
          const validTabs = await Promise.all(
            tabIds.map(async (id) => {
              try {
                const tab = await chrome.tabs.get(id)
                return tab ? id : null
              } catch {
                return null
              }
            })
          )
          const validTabIds = validTabs.filter(id => id !== null) as number[]
          
          if (validTabIds.length === 0) {
            console.warn(`[DEBUG] No valid tabs found for category ${categoryId}`)
            continue
          }
          
          const groupId = await chrome.tabs.group({ tabIds: validTabIds })
          groupsCreated++
          undoState.groupIds.push(groupId)
          
          const category = categoryMap.get(categoryId)
          const groupTitle = category?.name || (categoryId === 'other' ? 'Other' : categoryId.charAt(0).toUpperCase() + categoryId.slice(1))
          
          await chrome.tabGroups.update(groupId, {
            title: groupTitle,
            color: category?.color || "grey",
            collapsed: false
          })
          
          console.log(`[DEBUG] Successfully grouped ${validTabIds.length} tabs as "${groupTitle}"`)
        } catch (error) {
          console.error(`[DEBUG] Error creating category group for ${categoryId}:`, error)
          errors.push(`Failed to group ${categoryId} tabs`)
        }
      }
    }
    
    // Create project groups
    const projectColors: chrome.tabGroups.ColorEnum[] = ["blue", "cyan", "green", "yellow", "orange", "red", "pink", "purple"]
    let colorIndex = 0
    
    for (const [projectKey, { tabs: tabIds, confidence }] of projectGroups) {
      const shouldGroup = config.groupSingleTabs || tabIds.length >= config.minGroupSize
      
      if (shouldGroup && tabIds.length > 0) {
        try {
          const groupId = await chrome.tabs.group({ tabIds })
          groupsCreated++
          undoState.groupIds.push(groupId)
          
          const [prefix, projectName] = projectKey.split(':')
          await chrome.tabGroups.update(groupId, {
            title: `📁 ${projectName}`,
            color: projectColors[colorIndex % projectColors.length],
            collapsed: false
          })
          colorIndex++
        } catch (error) {
          console.error("Error creating project group:", error)
          errors.push(`Failed to group project ${projectKey}`)
        }
      }
    }
    
    // Create smart groups
    for (const smartGroup of smartGroups) {
      try {
        const groupId = await chrome.tabs.group({ tabIds: smartGroup.tabIds })
        groupsCreated++
        undoState.groupIds.push(groupId)
        
        await chrome.tabGroups.update(groupId, {
          title: smartGroup.name,
          color: projectColors[colorIndex % projectColors.length],
          collapsed: false
        })
        colorIndex++
      } catch (error) {
        console.error("Error creating smart group:", error)
        errors.push(`Failed to create smart group ${smartGroup.name}`)
      }
    }
    
    // Save undo state
    lastUndoState = undoState
    
    // Generate summary message
    const summary = []
    if (groupsCreated > 0) summary.push(`${groupsCreated} groups created`)
    if (closedDuplicates > 0) summary.push(`${closedDuplicates} duplicates closed`)
    if (errors.length > 0) summary.push(`${errors.length} errors`)
    
    return { 
      success: errors.length === 0, 
      groupsCreated,
      closedDuplicates,
      suspendedTabs,
      errors,
      message: summary.length > 0 
        ? `✨ ${summary.join(', ')}`
        : '✨ Tabs are already well organized!',
      canUndo: true
    }
  } catch (error) {
    console.error("Critical error in smartOrganizeTabs:", error)
    return {
      success: false,
      groupsCreated: 0,
      closedDuplicates: 0,
      suspendedTabs: 0,
      errors: [`Critical error: ${error}`],
      message: '❌ Failed to organize tabs',
      canUndo: false
    }
  } finally {
    (globalThis as any).isOrganizing = false
  }
}

// Undo last organize operation
async function undoLastOrganize() {
  if (!lastUndoState) {
    return {
      success: false,
      message: "No organize operation to undo"
    }
  }
  
  try {
    // Ungroup all tabs that were grouped
    for (const tabId of lastUndoState.ungroupedTabs) {
      try {
        await chrome.tabs.ungroup([tabId])
      } catch (error) {
        console.error("Error ungrouping tab:", error)
      }
    }
    
    // Restore closed tabs
    for (const closedTab of lastUndoState.closedTabs) {
      try {
        await chrome.tabs.create({
          url: closedTab.url,
          active: false
        })
      } catch (error) {
        console.error("Error restoring tab:", error)
      }
    }
    
    lastUndoState = null
    
    return {
      success: true,
      message: "✅ Organize operation undone"
    }
  } catch (error) {
    console.error("Error undoing organize:", error)
    return {
      success: false,
      message: "Failed to undo organize operation"
    }
  }
}

// Enhanced duplicate detection with multi-factor similarity
async function findDuplicateTabs() {
  const tabs = await chrome.tabs.query({})
  const duplicates = [] as any[]
  const processedTabs = new Set<number>()
  
  // Normalize URLs for better duplicate detection
  const normalizeUrl = (url: string): string => {
    try {
      const parsed = new URL(url)
      // Remove common tracking parameters
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'ref', 'source']
      trackingParams.forEach(param => parsed.searchParams.delete(param))
      
      // Remove hash fragments for comparison
      parsed.hash = ''
      
      // Normalize the URL
      let normalized = parsed.toString()
        .replace(/\/$/, '') // Remove trailing slash
        .replace(/^https?:\/\/(www\.)?/, 'https://') // Normalize protocol and www
        .toLowerCase()
      
      return normalized
    } catch {
      return url.toLowerCase()
    }
  }
  
  // Calculate string similarity (Jaccard similarity)
  const calculateSimilarity = (str1: string, str2: string): number => {
    if (!str1 || !str2) return 0
    
    const tokens1 = new Set(str1.toLowerCase().split(/\s+/))
    const tokens2 = new Set(str2.toLowerCase().split(/\s+/))
    
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)))
    const union = new Set([...tokens1, ...tokens2])
    
    return union.size === 0 ? 0 : intersection.size / union.size
  }
  
  // Multi-factor duplicate detection
  for (let i = 0; i < tabs.length; i++) {
    if (processedTabs.has(tabs[i].id!) || !tabs[i].url || tabs[i].url.startsWith('chrome://')) {
      continue
    }
    
    const similarTabs = [tabs[i]]
    const baseUrl = normalizeUrl(tabs[i].url!)
    const baseTitle = tabs[i].title || ''
    
    for (let j = i + 1; j < tabs.length; j++) {
      if (processedTabs.has(tabs[j].id!) || !tabs[j].url || tabs[j].url.startsWith('chrome://')) {
        continue
      }
      
      const compareUrl = normalizeUrl(tabs[j].url!)
      const compareTitle = tabs[j].title || ''
      
      // Check URL similarity
      const urlMatch = baseUrl === compareUrl
      
      // Check title similarity (for dynamic pages with same base URL)
      const titleSimilarity = calculateSimilarity(baseTitle, compareTitle)
      
      // Check domain match with different paths (for related pages)
      const baseDomain = new URL(tabs[i].url!).hostname
      const compareDomain = new URL(tabs[j].url!).hostname
      const domainMatch = baseDomain === compareDomain
      
      // Consider as duplicate if:
      // 1. Exact URL match OR
      // 2. Same domain with very similar titles (>0.8 similarity) OR
      // 3. Same domain with identical title
      if (urlMatch || (domainMatch && titleSimilarity > 0.8) || (domainMatch && baseTitle === compareTitle)) {
        similarTabs.push(tabs[j])
        processedTabs.add(tabs[j].id!)
      }
    }
    
    if (similarTabs.length > 1) {
      processedTabs.add(tabs[i].id!)
      duplicates.push({
        url: tabs[i].url,
        title: tabs[i].title,
        tabs: similarTabs,
        count: similarTabs.length,
        type: similarTabs.every(t => normalizeUrl(t.url!) === baseUrl) ? 'exact' : 'similar'
      })
    }
  }
  
  return duplicates
}