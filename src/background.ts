export {}
import { DEFAULT_CATEGORIES } from "./types/category"
import type { Category, CategoryMapping } from "./types/category"
import { detectSmartGroups } from "./utils/smartGrouping"

// Tab monitoring and AI analysis
chrome.runtime.onInstalled.addListener(async () => {
  console.log("TabAI installed and ready!")
  
  // Initialize default settings
  chrome.storage.local.set({
    aiEnabled: true,
    autoGrouping: true,
    productivityTracking: true
  })
  
  // Initialize categories if not exist
  const result = await chrome.storage.sync.get(["categories"])
  if (!result.categories) {
    await chrome.storage.sync.set({ 
      categories: DEFAULT_CATEGORIES,
      categoryMapping: {}
    })
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
  const tab = await chrome.tabs.get(activeInfo.tabId)
  updateTabAccessTime(tab)
})

// Analyze and categorize tabs
async function analyzeAndCategorizeTab(tab: chrome.tabs.Tab) {
  if (!tab.url || !tab.id) return
  
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
  
  // Get existing tabs data
  const result = await chrome.storage.local.get("tabsData")
  const tabsData = result.tabsData || {}
  
  // Update or add tab data
  if (tabsData[tab.id]) {
    tabsData[tab.id].accessCount++
    tabsData[tab.id].lastAccessed = Date.now()
  } else {
    tabsData[tab.id] = tabData
  }
  
  await chrome.storage.local.set({ tabsData })
}

// Get category for domain using stored categories
async function getCategoryForDomain(domain: string): Promise<string> {
  const result = await chrome.storage.sync.get(["categories", "categoryMapping"])
  const categories: Category[] = result.categories || DEFAULT_CATEGORIES
  const categoryMapping: CategoryMapping = result.categoryMapping || {}
  
  // Check explicit mapping first
  if (categoryMapping[domain]) {
    return categoryMapping[domain]
  }
  
  // Check category domains
  for (const category of categories) {
    if (category.domains.some(d => domain.includes(d))) {
      return category.id
    }
  }
  
  // Check keywords in domain
  for (const category of categories) {
    if (category.keywords.some(keyword => domain.includes(keyword))) {
      return category.id
    }
  }
  
  return "other"
}

// Update tab access time
async function updateTabAccessTime(tab: chrome.tabs.Tab) {
  if (!tab.id) return
  
  const result = await chrome.storage.local.get("tabsData")
  const tabsData = result.tabsData || {}
  
  if (tabsData[tab.id]) {
    tabsData[tab.id].lastAccessed = Date.now()
    await chrome.storage.local.set({ tabsData })
  }
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getTabsAnalysis") {
    getTabsAnalysis().then(sendResponse)
    return true
  }
  
  if (request.action === "smartOrganize") {
    smartOrganizeTabs().then(sendResponse)
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

// Smart organize tabs into groups with advanced features
async function smartOrganizeTabs() {
  const tabs = await chrome.tabs.query({ currentWindow: true })
  const result = await chrome.storage.local.get("tabsData")
  const tabsData = result.tabsData || {}
  
  let closedDuplicates = 0
  let suspendedTabs = 0
  let groupsCreated = 0
  
  // Step 1: Find and close duplicate tabs
  const duplicates = await findDuplicateTabs()
  for (const duplicate of duplicates) {
    // Keep the most recently accessed tab
    const sortedTabs = duplicate.tabs.sort((a, b) => {
      const aData = tabsData[a.id!]
      const bData = tabsData[b.id!]
      const aTime = aData?.lastAccessed || 0
      const bTime = bData?.lastAccessed || 0
      return bTime - aTime
    })
    
    // Close all but the first (most recent) tab
    for (let i = 1; i < sortedTabs.length; i++) {
      if (sortedTabs[i].id) {
        await chrome.tabs.remove(sortedTabs[i].id)
        closedDuplicates++
      }
    }
  }
  
  // Step 2: Re-query tabs after closing duplicates
  const remainingTabs = await chrome.tabs.query({ currentWindow: true })
  
  // Step 3: Analyze tabs and group by smart criteria
  const groups = {} as Record<string, number[]>
  const projectGroups = {} as Record<string, number[]>
  
  for (const tab of remainingTabs) {
    if (!tab.id || !tab.url) continue
    
    try {
      const url = new URL(tab.url)
      const domain = url.hostname
      
      // Special handling for development/project tabs
      if (domain === "github.com" || domain === "gitlab.com") {
        // Extract project name from URL
        const pathParts = url.pathname.split('/')
        if (pathParts.length >= 3) {
          const projectKey = `project_${pathParts[1]}_${pathParts[2]}`
          if (!projectGroups[projectKey]) {
            projectGroups[projectKey] = []
          }
          projectGroups[projectKey].push(tab.id)
          continue
        }
      }
      
      // Regular category grouping
      let category = "other"
      if (tabsData[tab.id]) {
        category = tabsData[tab.id].category || "other"
      } else {
        category = await getCategoryForDomain(domain)
        await analyzeAndCategorizeTab(tab)
      }
      
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(tab.id)
    } catch (error) {
      // Invalid URL, skip
      continue
    }
  }
  
  // Step 4: Create groups for categories
  const categoriesResult = await chrome.storage.sync.get(["categories"])
  const categories: Category[] = categoriesResult.categories || DEFAULT_CATEGORIES
  const categoryMap = new Map(categories.map(c => [c.id, c]))
  
  for (const [categoryId, tabIds] of Object.entries(groups)) {
    if (tabIds.length > 1) {
      const groupId = await chrome.tabs.group({ tabIds })
      groupsCreated++
      
      const category = categoryMap.get(categoryId)
      await chrome.tabGroups.update(groupId, {
        title: category?.name || categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
        color: category?.color || "grey"
      })
    }
  }
  
  // Step 5: Create groups for projects
  const projectColors: chrome.tabGroups.ColorEnum[] = ["blue", "cyan", "green", "yellow", "orange", "red", "pink", "purple"]
  let colorIndex = 0
  
  for (const [projectKey, tabIds] of Object.entries(projectGroups)) {
    if (tabIds.length > 1) {
      const groupId = await chrome.tabs.group({ tabIds })
      groupsCreated++
      
      const projectName = projectKey.replace('project_', '').replace('_', '/')
      await chrome.tabGroups.update(groupId, {
        title: `📁 ${projectName}`,
        color: projectColors[colorIndex % projectColors.length]
      })
      colorIndex++
    }
  }
  
  // Step 6: Detect smart groups (search context, documentation, etc.)
  const smartGroups = detectSmartGroups(remainingTabs)
  for (const smartGroup of smartGroups) {
    // Check if tabs are not already grouped
    const ungroupedTabIds = smartGroup.tabIds.filter(tabId => {
      return !Object.values(groups).flat().includes(tabId) && 
             !Object.values(projectGroups).flat().includes(tabId)
    })
    
    if (ungroupedTabIds.length > 1) {
      const groupId = await chrome.tabs.group({ tabIds: ungroupedTabIds })
      groupsCreated++
      
      await chrome.tabGroups.update(groupId, {
        title: smartGroup.name,
        color: projectColors[colorIndex % projectColors.length]
      })
      colorIndex++
    }
  }
  
  // Step 6: Suspend old tabs (commented out for now - can be enabled)
  // const oneHourAgo = Date.now() - (60 * 60 * 1000)
  // for (const tab of remainingTabs) {
  //   if (tab.id && tabsData[tab.id] && tabsData[tab.id].lastAccessed < oneHourAgo) {
  //     // chrome.tabs.discard(tab.id) // This would suspend the tab
  //     suspendedTabs++
  //   }
  // }
  
  return { 
    success: true, 
    groupsCreated,
    closedDuplicates,
    suspendedTabs,
    message: `✨ Organized ${remainingTabs.length} tabs: Created ${groupsCreated} groups, closed ${closedDuplicates} duplicates`
  }
}


// Find duplicate tabs
async function findDuplicateTabs() {
  const tabs = await chrome.tabs.query({})
  const duplicates = [] as any[]
  const urlMap = new Map<string, chrome.tabs.Tab[]>()
  
  // Group tabs by URL
  tabs.forEach(tab => {
    if (tab.url) {
      const normalizedUrl = tab.url.replace(/\/$/, "")
      if (!urlMap.has(normalizedUrl)) {
        urlMap.set(normalizedUrl, [])
      }
      urlMap.get(normalizedUrl)!.push(tab)
    }
  })
  
  // Find duplicates
  urlMap.forEach((tabList, url) => {
    if (tabList.length > 1) {
      duplicates.push({
        url,
        tabs: tabList,
        count: tabList.length
      })
    }
  })
  
  return duplicates
}