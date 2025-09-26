export {}
import { TabTracker } from './utils/tabTracker'
import { TabTrackerDebug } from './utils/debugTabTracker'
import { storageUtils } from './utils/storage'

// Suppress external extension errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (event.message?.includes('MetaMask') || event.message?.includes('inpage.js')) {
      event.preventDefault()
      return
    }
  })
}

console.log('[TabQuest] Background script loaded at', new Date().toISOString())

// Initialize tab tracking
TabTracker.initialize().then(() => {
  console.log('[TabQuest] Tab tracking initialized')
}).catch(error => {
  console.error('[TabQuest] Failed to initialize tab tracking:', error)
})

// Clean up old data daily
setInterval(() => {
  TabTracker.cleanupOldData()
}, 24 * 60 * 60 * 1000) // Once per day

// Simple message handler for tab organization
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[TabQuest] Received message:', request?.action || 'unknown action', request)
  
  // Simple ping test
  if (request.action === 'ping') {
    console.log('[TabQuest] Responding to ping')
    sendResponse({ success: true, message: 'pong' })
    return true
  }
  
  if (request.action === 'smartOrganize' || request.action === 'aiOrganize') {
    console.log('[TabAI Background] Received smartOrganize/aiOrganize request')
    organizeTabsSimple()
      .then(sendResponse)
      .catch(error => {
        console.error('[TabQuest] Error:', error)
        sendResponse({ success: false, message: error.message })
      })
    return true // Keep channel open for async response
  }
  
  if (request.action === 'getTabsAnalysis') {
    getTabsAnalysis()
      .then(sendResponse)
      .catch(error => {
        console.error('[TabQuest] Error:', error)
        sendResponse({ error: error.message })
      })
    return true
  }
  
  if (request.action === 'organizeByCategories') {
    console.log('[TabAI Background] Received organizeByCategories request')
    if (!request.categories) {
      console.error('[TabAI Background] No categories provided!')
      sendResponse({ success: false, message: 'No categories provided' })
      return false
    }
    organizeTabsByCategories(request.categories)
      .then(result => {
        console.log('[TabAI Background] Organization complete, sending response:', result)
        sendResponse(result)
      })
      .catch(error => {
        console.error('[TabAI Background] Organization error:', error)
        sendResponse({ success: false, message: error.message })
      })
    return true
  }
  
  return false
})

// Simple tab organization function
async function organizeTabsSimple() {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true })
    console.log(`[TabQuest] Found ${tabs.length} tabs to organize`)
    
    // First, ungroup all tabs
    const allTabIds = tabs
      .map(tab => tab.id)
      .filter((id): id is number => id !== undefined)
    
    if (allTabIds.length > 0) {
      try {
        await chrome.tabs.ungroup(allTabIds)
        console.log('[TabQuest] Ungrouped all tabs')
      } catch (e) {
        console.log('[TabQuest] Some tabs were already ungrouped')
      }
    }
    
    // Group tabs by domain
    const domainGroups = new Map<string, number[]>()
    
    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue
      
      // Skip special URLs
      if (tab.url.startsWith('chrome://') || 
          tab.url.startsWith('chrome-extension://') ||
          tab.url.startsWith('edge://')) {
        continue
      }
      
      try {
        const url = new URL(tab.url)
        const domain = url.hostname.replace(/^www\./, '')
        
        if (!domainGroups.has(domain)) {
          domainGroups.set(domain, [])
        }
        domainGroups.get(domain)!.push(tab.id)
      } catch (error) {
        console.error(`[TabQuest] Error parsing URL: ${tab.url}`)
      }
    }
    
    // Create groups for domains with 2+ tabs
    let groupsCreated = 0
    const colors: chrome.tabGroups.ColorEnum[] = 
      ['blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange']
    let colorIndex = 0
    
    for (const [domain, tabIds] of domainGroups) {
      if (tabIds.length >= 2) {
        try {
          const groupId = await chrome.tabs.group({ tabIds })
          // Create abbreviation for domain name
          const domainParts = domain.split('.')
          const abbreviation = domainParts[0]
            .toUpperCase()
            .slice(0, 3)
          
          await chrome.tabGroups.update(groupId, {
            title: abbreviation,
            color: colors[colorIndex % colors.length],
            collapsed: false
          })
          groupsCreated++
          colorIndex++
          console.log(`[TabQuest] Created group for ${domain} with ${tabIds.length} tabs`)
        } catch (error) {
          console.error(`[TabQuest] Failed to create group for ${domain}:`, error)
        }
      }
    }
    
    const message = groupsCreated > 0 
      ? `Successfully organized ${tabs.length} tabs into ${groupsCreated} groups`
      : 'No groups created (need at least 2 tabs from the same domain)'
    
    return {
      success: true,
      message,
      groupsCreated,
      tabsProcessed: tabs.length
    }
    
  } catch (error) {
    console.error('[TabQuest] Organization failed:', error)
    throw error
  }
}

// Get tabs analysis
async function getTabsAnalysis() {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true })
    
    // Count by domain
    const domainCounts: Record<string, number> = {}
    const categoryCounts: Record<string, number> = {
      work: 0,
      productivity: 0,
      entertainment: 0,
      social: 0,
      uncategorized: 0
    }
    
    for (const tab of tabs) {
      if (!tab.url) continue
      
      // Handle new tabs
      if (tab.url === 'chrome://newtab/' || 
          tab.url === 'edge://newtab/' ||
          tab.url === 'about:blank' ||
          tab.url === 'about:newtab' ||
          tab.url.startsWith('chrome://newtab') ||
          tab.url.startsWith('edge://newtab')) {
        domainCounts['New Tab'] = (domainCounts['New Tab'] || 0) + 1
        categoryCounts.uncategorized++
        continue
      }
      
      // Skip other special URLs
      if (tab.url.startsWith('chrome://') || 
          tab.url.startsWith('chrome-extension://') ||
          tab.url.startsWith('edge://')) {
        continue
      }
      
      try {
        const url = new URL(tab.url)
        const domain = url.hostname.replace(/^www\./, '')
        domainCounts[domain] = (domainCounts[domain] || 0) + 1
        
        // Simple categorization
        if (domain.includes('github') || domain.includes('gitlab')) {
          categoryCounts.work++
        } else if (domain.includes('google') || domain.includes('notion')) {
          categoryCounts.productivity++
        } else if (domain.includes('youtube') || domain.includes('netflix')) {
          categoryCounts.entertainment++
        } else if (domain.includes('facebook') || domain.includes('twitter')) {
          categoryCounts.social++
        } else {
          categoryCounts.uncategorized++
        }
      } catch (e) {
        // Skip invalid URLs
      }
    }
    
    // Find duplicates by exact URL (not just domain)
    const urlCounts: Record<string, chrome.tabs.Tab[]> = {}
    
    for (const tab of tabs) {
      if (!tab.url || tab.url.startsWith('chrome-extension://')) continue
      
      let normalizedUrl: string
      
      // Treat all new tabs as the same
      if (tab.url === 'chrome://newtab/' || 
          tab.url === 'edge://newtab/' ||
          tab.url === 'about:blank' ||
          tab.url === 'about:newtab' ||
          tab.url.startsWith('chrome://newtab') ||
          tab.url.startsWith('edge://newtab')) {
        normalizedUrl = '__newtab__'
      } else if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
        // Skip other system pages
        continue
      } else {
        // Normalize URL
        normalizedUrl = tab.url.replace(/\/$/, '').split('#')[0].split('?')[0]
      }
      
      if (!urlCounts[normalizedUrl]) {
        urlCounts[normalizedUrl] = []
      }
      urlCounts[normalizedUrl].push(tab)
    }
    
    // Convert to duplicates array
    const duplicates = Object.entries(urlCounts)
      .filter(([_, tabs]) => tabs.length > 1)
      .map(([url, tabs]) => ({
        domain: url === '__newtab__' ? 'New Tab' : new URL(tabs[0].url!).hostname,
        count: tabs.length,
        tabs
      }))
    
    return {
      totalTabs: tabs.length,
      domainCounts,
      categoryCounts,
      duplicates
    }
    
  } catch (error) {
    console.error('[TabQuest] Analysis failed:', error)
    throw error
  }
}

// Organize tabs by categories with proper ordering
async function organizeTabsByCategories(categories: any[]) {
  console.log('[TabAI Background] organizeTabsByCategories called with:', categories?.length, 'categories')
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true })
    console.log(`[TabAI Background] Found ${tabs.length} tabs to organize`)
    
    // Get existing tab groups to check for duplicates
    const existingGroups = await chrome.tabGroups.query({})
    console.log('[TabQuest] Existing groups:', existingGroups.map(g => g.title))
    
    // Remove duplicate groups with same title
    const groupsToRemove = new Map<string, chrome.tabGroups.TabGroup[]>()
    existingGroups.forEach(group => {
      const title = group.title || ''
      if (!groupsToRemove.has(title)) {
        groupsToRemove.set(title, [])
      }
      groupsToRemove.get(title)!.push(group)
    })
    
    // Keep only the first group of each title, remove duplicates
    for (const [title, groups] of groupsToRemove) {
      if (groups.length > 1) {
        console.log(`[TabQuest] Found ${groups.length} duplicate groups for "${title}", removing extras`)
        for (let i = 1; i < groups.length; i++) {
          try {
            await chrome.tabs.ungroup(await chrome.tabs.query({ groupId: groups[i].id }))
          } catch (e) {
            console.log(`[TabQuest] Failed to remove duplicate group: ${e}`)
          }
        }
      }
    }
    
    // First, ungroup all tabs
    const allTabIds = tabs
      .map(tab => tab.id)
      .filter((id): id is number => id !== undefined)
    
    if (allTabIds.length > 0) {
      try {
        await chrome.tabs.ungroup(allTabIds)
        console.log('[TabQuest] Ungrouped all tabs')
      } catch (e) {
        console.log('[TabQuest] Some tabs were already ungrouped')
      }
    }
    
    // Get saved category mappings
    const categoryMapping = await storageUtils.getCategoryMapping()
    console.log('[TabAI Background] Category mappings:', categoryMapping)
    
    // Group tabs by category
    const categoryGroups = new Map<string, number[]>()
    
    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue
      
      // Default to uncategorized
      let categoryId = 'uncategorized'
      
      // Skip chrome:// and edge:// URLs but keep chrome-extension://
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
        // These system URLs will remain ungrouped
        continue
      }
      
      try {
        const domain = new URL(tab.url).hostname.replace(/^www\./, '')
        
        // First check if user has assigned a category to this specific domain
        if (categoryMapping[domain]) {
          categoryId = categoryMapping[domain]
          console.log(`[TabAI Background] Found user mapping for ${domain}: ${categoryId}`)
        } else {
          // Then check category domains
          for (const category of categories) {
            if (category.domains.some((d: string) => {
              const catDomain = d.toLowerCase()
              return domain === catDomain || domain.endsWith(`.${catDomain}`)
            })) {
              categoryId = category.id
              break
            }
          }
        }
      } catch (error) {
        console.error(`[TabQuest] Error parsing URL: ${tab.url}`)
        // For invalid URLs, treat as uncategorized
        categoryId = 'uncategorized'
      }
      
      if (!categoryGroups.has(categoryId)) {
        categoryGroups.set(categoryId, [])
      }
      categoryGroups.get(categoryId)!.push(tab.id)
    }
    
    // Create groups in category order
    let groupsCreated = 0
    for (const category of categories) {
      const tabIds = categoryGroups.get(category.id)
      if (!tabIds || tabIds.length === 0) continue
      
      try {
        const groupId = await chrome.tabs.group({ tabIds })
        // Create abbreviation for category name
        const abbreviation = category.name
          .split(' ')
          .map((word: string) => word.charAt(0).toUpperCase())
          .join('')
          .slice(0, 3) // Max 3 characters
        
        await chrome.tabGroups.update(groupId, {
          title: abbreviation,
          color: category.color,
          collapsed: false
        })
        
        // Move group to maintain order
        await chrome.tabGroups.move(groupId, { index: -1 })
        
        groupsCreated++
        console.log(`[TabQuest] Created group for ${category.name} with ${tabIds.length} tabs`)
      } catch (error) {
        console.error(`[TabQuest] Failed to create group for ${category.name}:`, error)
      }
    }
    
    const message = groupsCreated > 0 
      ? `Successfully organized tabs into ${groupsCreated} category groups`
      : 'No groups created'
    
    return {
      success: true,
      message,
      groupsCreated,
      tabsProcessed: tabs.length
    }
    
  } catch (error) {
    console.error('[TabQuest] Category organization failed:', error)
    throw error
  }
}

console.log('[TabQuest] Background script initialized')

// Make debug tools available globally
if (typeof globalThis !== 'undefined') {
  (globalThis as any).TabTrackerDebug = TabTrackerDebug
}