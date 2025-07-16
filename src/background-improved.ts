// Improved background.ts with better error handling and tab grouping logic

interface GroupingResult {
  success: boolean
  groupsCreated: number
  closedDuplicates: number
  errors: string[]
  message: string
  details?: any
}

// Helper function to safely ungroup tabs
async function safeUngroup(tabIds: number[]): Promise<void> {
  if (!tabIds.length) return
  
  // Ungroup tabs in small batches to avoid API limits
  const batchSize = 10
  for (let i = 0; i < tabIds.length; i += batchSize) {
    const batch = tabIds.slice(i, i + batchSize)
    try {
      await chrome.tabs.ungroup(batch)
    } catch (error) {
      // Some tabs might not be grouped, which is OK
      console.log(`Some tabs in batch couldn't be ungrouped:`, error)
    }
  }
}

// Helper function to create a tab group with proper error handling
async function createTabGroup(
  tabIds: number[], 
  title: string, 
  color: chrome.tabGroups.ColorEnum
): Promise<number | null> {
  if (!tabIds.length) {
    console.warn(`Cannot create group "${title}" with 0 tabs`)
    return null
  }
  
  try {
    // Filter out any invalid tab IDs
    const validTabIds = tabIds.filter(id => id > 0)
    if (!validTabIds.length) return null
    
    // Create the group
    const groupId = await chrome.tabs.group({ tabIds: validTabIds })
    
    // Update group properties
    await chrome.tabGroups.update(groupId, { 
      title, 
      color,
      collapsed: false 
    })
    
    return groupId
  } catch (error) {
    console.error(`Failed to create group "${title}":`, error)
    return null
  }
}

// Improved duplicate detection with better comparison
async function findAndCloseDuplicates(tabs: chrome.tabs.Tab[]): Promise<number> {
  const duplicateGroups = new Map<string, chrome.tabs.Tab[]>()
  let closedCount = 0
  
  // Group tabs by normalized URL
  for (const tab of tabs) {
    if (!tab.url || !tab.id) continue
    
    // Skip chrome:// and other internal URLs
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) continue
    
    // Normalize URL (remove trailing slash, www, and fragment)
    const normalizedUrl = tab.url
      .replace(/^https?:\/\/(www\.)?/, '')
      .replace(/\/$/, '')
      .replace(/#.*$/, '')
    
    if (!duplicateGroups.has(normalizedUrl)) {
      duplicateGroups.set(normalizedUrl, [])
    }
    duplicateGroups.get(normalizedUrl)!.push(tab)
  }
  
  // Close duplicates, keeping the most recently active
  for (const [url, tabGroup] of duplicateGroups) {
    if (tabGroup.length <= 1) continue
    
    // Sort by last accessed time (if available) or by active status
    const sortedTabs = tabGroup.sort((a, b) => {
      if (a.active) return -1
      if (b.active) return 1
      return (b.lastAccessed || 0) - (a.lastAccessed || 0)
    })
    
    // Close all but the first (most recent/active)
    for (let i = 1; i < sortedTabs.length; i++) {
      try {
        if (sortedTabs[i].id) {
          await chrome.tabs.remove(sortedTabs[i].id)
          closedCount++
        }
      } catch (error) {
        console.error('Failed to close duplicate tab:', error)
      }
    }
  }
  
  return closedCount
}

// Get category for a tab with improved logic
async function getTabCategory(tab: chrome.tabs.Tab): Promise<string> {
  if (!tab.url) return 'other'
  
  try {
    const url = new URL(tab.url)
    const domain = url.hostname.toLowerCase().replace(/^www\./, '')
    
    // Check user-assigned categories first
    const result = await chrome.storage.sync.get(['categoryMapping', 'categories'])
    const categoryMapping = result.categoryMapping || {}
    const categories = result.categories || []
    
    // Direct domain mapping
    if (categoryMapping[domain]) {
      return categoryMapping[domain]
    }
    
    // Check categories for domain/keyword matches
    for (const category of categories) {
      // Check domain list
      if (category.domains?.some((d: string) => {
        const categoryDomain = d.toLowerCase().replace(/^www\./, '')
        return domain === categoryDomain || domain.endsWith('.' + categoryDomain)
      })) {
        return category.id
      }
      
      // Check keywords in title and URL
      const searchText = `${tab.title || ''} ${tab.url}`.toLowerCase()
      if (category.keywords?.some((keyword: string) => 
        searchText.includes(keyword.toLowerCase())
      )) {
        return category.id
      }
    }
    
    // Default categorization based on common patterns
    const defaultCategories = {
      'work': ['slack', 'teams', 'zoom', 'meet', 'jira', 'confluence', 'notion', 'asana'],
      'social': ['facebook', 'twitter', 'instagram', 'linkedin', 'reddit', 'discord'],
      'entertainment': ['youtube', 'netflix', 'twitch', 'spotify', 'hulu', 'disney'],
      'shopping': ['amazon', 'ebay', 'etsy', 'shopify', 'alibaba', 'walmart'],
      'news': ['cnn', 'bbc', 'reuters', 'nytimes', 'wsj', 'guardian'],
      'development': ['github', 'gitlab', 'stackoverflow', 'npm', 'pypi', 'docker']
    }
    
    for (const [categoryId, domains] of Object.entries(defaultCategories)) {
      if (domains.some(d => domain.includes(d))) {
        return categoryId
      }
    }
    
    return 'other'
  } catch (error) {
    console.error('Error categorizing tab:', error)
    return 'other'
  }
}

// Main improved smart organize function
export async function smartOrganizeTabsImproved(config?: any): Promise<GroupingResult> {
  const errors: string[] = []
  let groupsCreated = 0
  let closedDuplicates = 0
  
  try {
    // Check if we have tabGroups permission
    const permissions = await chrome.permissions.contains({ permissions: ['tabGroups'] })
    if (!permissions) {
      return {
        success: false,
        groupsCreated: 0,
        closedDuplicates: 0,
        errors: ['Missing tabGroups permission'],
        message: '❌ Please enable tab grouping permission'
      }
    }
    
    // Get all tabs in current window
    const tabs = await chrome.tabs.query({ currentWindow: true })
    console.log(`[TabAI] Processing ${tabs.length} tabs`)
    
    // Step 1: Close duplicates if enabled
    if (config?.closeDuplicates !== false) {
      closedDuplicates = await findAndCloseDuplicates(tabs)
      console.log(`[TabAI] Closed ${closedDuplicates} duplicate tabs`)
    }
    
    // Get remaining tabs
    const remainingTabs = await chrome.tabs.query({ currentWindow: true })
    
    // Step 2: Ungroup all tabs for a clean start
    const tabIds = remainingTabs.map(t => t.id).filter(id => id !== undefined) as number[]
    await safeUngroup(tabIds)
    
    // Step 3: Group tabs by category
    const categoryGroups = new Map<string, number[]>()
    
    for (const tab of remainingTabs) {
      if (!tab.id) continue
      
      const category = await getTabCategory(tab)
      if (!categoryGroups.has(category)) {
        categoryGroups.set(category, [])
      }
      categoryGroups.get(category)!.push(tab.id)
    }
    
    // Step 4: Create groups for each category with sufficient tabs
    const colors: chrome.tabGroups.ColorEnum[] = ['blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange']
    let colorIndex = 0
    
    for (const [category, tabIds] of categoryGroups) {
      // Only create groups with 2+ tabs
      if (tabIds.length < 2) continue
      
      const color = colors[colorIndex % colors.length]
      colorIndex++
      
      const groupId = await createTabGroup(
        tabIds,
        category.charAt(0).toUpperCase() + category.slice(1),
        color
      )
      
      if (groupId !== null) {
        groupsCreated++
        console.log(`[TabAI] Created group "${category}" with ${tabIds.length} tabs`)
      }
    }
    
    // Step 5: Handle ungrouped tabs
    const ungroupedTabs = await chrome.tabs.query({ 
      currentWindow: true, 
      groupId: chrome.tabGroups.TAB_GROUP_ID_NONE 
    })
    
    if (ungroupedTabs.length >= 3) {
      const ungroupedIds = ungroupedTabs.map(t => t.id).filter(id => id !== undefined) as number[]
      const groupId = await createTabGroup(
        ungroupedIds,
        'Other',
        'grey'
      )
      if (groupId !== null) {
        groupsCreated++
      }
    }
    
    return {
      success: true,
      groupsCreated,
      closedDuplicates,
      errors,
      message: `✅ Organized ${remainingTabs.length} tabs into ${groupsCreated} groups`,
      details: {
        totalTabs: remainingTabs.length,
        categories: Array.from(categoryGroups.keys())
      }
    }
    
  } catch (error) {
    console.error('[TabAI] Smart organize failed:', error)
    errors.push(error instanceof Error ? error.message : 'Unknown error')
    
    return {
      success: false,
      groupsCreated,
      closedDuplicates,
      errors,
      message: '❌ Failed to organize tabs'
    }
  }
}