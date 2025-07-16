// Debug version of tab grouping for testing
export {}

// Simple test function to verify tab grouping works
async function testTabGrouping() {
  console.log('[TabAI Debug] Starting test tab grouping...')
  
  try {
    // Get all tabs in current window
    const tabs = await chrome.tabs.query({ currentWindow: true })
    console.log(`[TabAI Debug] Found ${tabs.length} tabs`)
    
    // Group tabs by domain
    const domainGroups = new Map<string, number[]>()
    
    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue
      
      // Skip chrome:// URLs
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
        console.log(`[TabAI Debug] Skipping internal URL: ${tab.url}`)
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
        console.error(`[TabAI Debug] Error parsing URL: ${tab.url}`, error)
      }
    }
    
    console.log('[TabAI Debug] Domain groups:', Array.from(domainGroups.entries()))
    
    // Ungroup all tabs first
    const allTabIds = tabs.map(t => t.id).filter(id => id !== undefined) as number[]
    console.log('[TabAI Debug] Ungrouping all tabs...')
    
    // Ungroup in batches
    const batchSize = 10
    for (let i = 0; i < allTabIds.length; i += batchSize) {
      const batch = allTabIds.slice(i, i + batchSize)
      try {
        await chrome.tabs.ungroup(batch)
      } catch (error) {
        console.log(`[TabAI Debug] Some tabs couldn't be ungrouped:`, error)
      }
    }
    
    // Create groups for domains with 2+ tabs
    const colors: chrome.tabGroups.ColorEnum[] = ['blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange']
    let colorIndex = 0
    let groupsCreated = 0
    
    for (const [domain, tabIds] of domainGroups) {
      if (tabIds.length < 2) {
        console.log(`[TabAI Debug] Skipping ${domain} - only ${tabIds.length} tab(s)`)
        continue
      }
      
      try {
        console.log(`[TabAI Debug] Creating group for ${domain} with ${tabIds.length} tabs`)
        
        // Create the group
        const groupId = await chrome.tabs.group({ tabIds })
        console.log(`[TabAI Debug] Created group ${groupId}`)
        
        // Update group properties
        await chrome.tabGroups.update(groupId, {
          title: domain,
          color: colors[colorIndex % colors.length],
          collapsed: false
        })
        
        groupsCreated++
        colorIndex++
        console.log(`[TabAI Debug] Successfully grouped ${domain}`)
        
      } catch (error) {
        console.error(`[TabAI Debug] Failed to group ${domain}:`, error)
      }
    }
    
    return {
      success: true,
      message: `Created ${groupsCreated} groups from ${domainGroups.size} domains`,
      groupsCreated
    }
    
  } catch (error) {
    console.error('[TabAI Debug] Test failed:', error)
    return {
      success: false,
      message: `Error: ${error}`,
      groupsCreated: 0
    }
  }
}

// Export for use in background.ts
(globalThis as any).testTabGrouping = testTabGrouping

// Add message listener for testing
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'testGrouping') {
    testTabGrouping().then(sendResponse)
    return true
  }
})