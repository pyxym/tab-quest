export {}
import { DEFAULT_CATEGORIES } from "./types/category"
import type { Category, CategoryMapping } from "./types/category"

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

// Smart organize tabs into groups
async function smartOrganizeTabs() {
  const tabs = await chrome.tabs.query({ currentWindow: true })
  const result = await chrome.storage.local.get("tabsData")
  const tabsData = result.tabsData || {}
  
  // Group tabs by category
  const groups = {} as Record<string, number[]>
  
  // Analyze all tabs, including those without metadata
  for (const tab of tabs) {
    if (!tab.id || !tab.url) continue
    
    let category = "other"
    
    // Check if we have metadata for this tab
    if (tabsData[tab.id]) {
      category = tabsData[tab.id].category || "other"
    } else {
      // Analyze tab on the fly if no metadata exists
      try {
        const domain = new URL(tab.url).hostname
        category = await getCategoryForDomain(domain)
        
        // Save metadata for future use
        await analyzeAndCategorizeTab(tab)
      } catch (error) {
        // Invalid URL, skip
        continue
      }
    }
    
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(tab.id)
  }
  
  // Get category details
  const categoriesResult = await chrome.storage.sync.get(["categories"])
  const categories: Category[] = categoriesResult.categories || DEFAULT_CATEGORIES
  const categoryMap = new Map(categories.map(c => [c.id, c]))
  
  // Create tab groups in Chrome
  let groupsCreated = 0
  for (const [categoryId, tabIds] of Object.entries(groups)) {
    if (tabIds.length > 1) {
      const groupId = await chrome.tabs.group({ tabIds })
      groupsCreated++
      
      const category = categoryMap.get(categoryId)
      // Set group properties
      await chrome.tabGroups.update(groupId, {
        title: category?.name || categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
        color: category?.color || "grey"
      })
    }
  }
  
  return { success: true, groupsCreated }
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