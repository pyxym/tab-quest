export {}

console.log('[TabAI Background] Service worker started')

// Simple tab grouping for testing
async function organizeTabsSimple() {
  console.log('[TabAI] Starting simple organization...')
  
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true })
    console.log(`[TabAI] Found ${tabs.length} tabs`)
    
    // Ungroup all tabs first
    const tabIds = tabs.map(t => t.id).filter(id => id !== undefined) as number[]
    if (tabIds.length > 0) {
      try {
        await chrome.tabs.ungroup(tabIds)
        console.log('[TabAI] Ungrouped all tabs')
      } catch (e) {
        console.log('[TabAI] Some tabs were already ungrouped')
      }
    }
    
    // Group by domain
    const domainGroups = new Map<string, number[]>()
    
    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue
      
      // Skip chrome:// URLs
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
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
        console.error(`[TabAI] Error parsing URL: ${tab.url}`, error)
      }
    }
    
    console.log('[TabAI] Domain groups:', Array.from(domainGroups.entries()))
    
    // Create groups
    let groupsCreated = 0
    const colors: chrome.tabGroups.ColorEnum[] = ['blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange']
    let colorIndex = 0
    
    for (const [domain, tabIds] of domainGroups) {
      if (tabIds.length >= 2) {
        try {
          const groupId = await chrome.tabs.group({ tabIds })
          await chrome.tabGroups.update(groupId, {
            title: domain,
            color: colors[colorIndex % colors.length],
            collapsed: false
          })
          groupsCreated++
          colorIndex++
          console.log(`[TabAI] Created group for ${domain} with ${tabIds.length} tabs`)
        } catch (error) {
          console.error(`[TabAI] Failed to create group for ${domain}:`, error)
        }
      }
    }
    
    return {
      success: true,
      message: `Organized ${tabs.length} tabs into ${groupsCreated} groups`,
      groupsCreated
    }
    
  } catch (error) {
    console.error('[TabAI] Organization failed:', error)
    return {
      success: false,
      message: `Failed to organize tabs: ${error}`,
      groupsCreated: 0
    }
  }
}

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[TabAI] Received message:', request)
  
  if (request.action === 'smartOrganize' || request.action === 'aiOrganize') {
    organizeTabsSimple().then(sendResponse)
    return true // Keep the message channel open for async response
  }
  
  // For other messages, return false to let other handlers process them
  return false
})

// Log when installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('[TabAI] Extension installed successfully')
})