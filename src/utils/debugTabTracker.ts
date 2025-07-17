// Debug utilities for TabTracker
export class TabTrackerDebug {
  static async getStoredData() {
    const data = await chrome.storage.local.get(['tabUsageData', 'dailyStats'])
    console.log('[TabTrackerDebug] Stored data:', data)
    return data
  }
  
  static async clearAllData() {
    await chrome.storage.local.remove(['tabUsageData', 'dailyStats'])
    console.log('[TabTrackerDebug] All tracking data cleared')
  }
  
  static async recategorizeAllData() {
    console.log('[TabTrackerDebug] Starting recategorization...')
    
    const { tabUsageData = {}, categoryMapping = {}, categories = [] } = await chrome.storage.local.get(['tabUsageData'])
    const { categoryMapping: mapping, categories: cats } = await chrome.storage.sync.get(['categoryMapping', 'categories'])
    
    let updated = 0
    
    for (const [domain, data] of Object.entries(tabUsageData)) {
      const oldCategory = data.category
      
      // Use same logic as TabTracker
      let newCategory = mapping?.[domain]
      
      if (!newCategory && cats) {
        for (const cat of cats) {
          if (cat.domains && cat.domains.some((d: string) => {
            const catDomain = d.toLowerCase()
            return domain === catDomain || domain.endsWith(`.${catDomain}`)
          })) {
            newCategory = cat.id
            break
          }
        }
      }
      
      if (!newCategory) {
        newCategory = 'uncategorized'
      }
      
      if (oldCategory !== newCategory) {
        data.category = newCategory
        updated++
        console.log(`[TabTrackerDebug] Updated ${domain}: ${oldCategory} -> ${newCategory}`)
      }
    }
    
    if (updated > 0) {
      await chrome.storage.local.set({ tabUsageData })
      console.log(`[TabTrackerDebug] Updated ${updated} domains`)
    } else {
      console.log('[TabTrackerDebug] No updates needed')
    }
    
    return { updated, total: Object.keys(tabUsageData).length }
  }
  
  static async simulateTabUsage() {
    const testData = {
      'example.com': {
        url: 'https://example.com',
        domain: 'example.com',
        title: 'Example Domain',
        category: 'work',
        firstSeen: Date.now() - 3600000,
        lastAccessed: Date.now(),
        totalTimeSpent: 300000, // 5 minutes
        accessCount: 10,
        activations: 5
      },
      'youtube.com': {
        url: 'https://youtube.com',
        domain: 'youtube.com',
        title: 'YouTube',
        category: 'entertainment',
        firstSeen: Date.now() - 7200000,
        lastAccessed: Date.now() - 600000,
        totalTimeSpent: 1200000, // 20 minutes
        accessCount: 25,
        activations: 15
      }
    }
    
    const today = new Date().toISOString().split('T')[0]
    const dailyStats = {
      [today]: {
        date: today,
        totalTabs: 10,
        totalTimeSpent: 1500000, // 25 minutes
        categoryBreakdown: {
          work: 300000,
          entertainment: 1200000
        },
        domainBreakdown: {
          'example.com': 300000,
          'youtube.com': 1200000
        },
        productivityScore: 20
      }
    }
    
    await chrome.storage.local.set({ 
      tabUsageData: testData,
      dailyStats: dailyStats
    })
    
    console.log('[TabTrackerDebug] Test data injected')
  }
}

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).TabTrackerDebug = TabTrackerDebug
}