// Improved background.ts with better error handling and tab grouping logic
export {}
import { DEFAULT_CATEGORIES } from "./types/category"
import type { Category, CategoryMapping } from "./types/category"

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

// Get category for a tab with improved logic and debug logging
async function getTabCategory(tab: chrome.tabs.Tab): Promise<string> {
  if (!tab.url) return 'other'
  
  console.log(`[DEBUG] getTabCategory for: ${tab.title} (${tab.url})`)
  
  try {
    const url = new URL(tab.url)
    const domain = url.hostname.toLowerCase().replace(/^www\./, '')
    console.log(`[DEBUG] Normalized domain: ${domain}`)
    
    // Check user-assigned categories first
    const result = await chrome.storage.sync.get(['categoryMapping', 'categories'])
    const categoryMapping: CategoryMapping = result.categoryMapping || {}
    const categories: Category[] = result.categories || DEFAULT_CATEGORIES
    
    console.log('[DEBUG] Category mapping:', categoryMapping)
    console.log('[DEBUG] Available categories:', categories.map(c => c.id))
    
    // Direct domain mapping - highest priority
    if (categoryMapping[domain]) {
      console.log(`[DEBUG] Found user mapping: ${domain} -> ${categoryMapping[domain]}`)
      return categoryMapping[domain]
    }
    
    // Check categories for domain matches
    for (const category of categories) {
      // Check exact domain matches
      for (const categoryDomain of category.domains) {
        const normalizedCategoryDomain = categoryDomain.toLowerCase().replace(/^www\./, '')
        
        // Exact match
        if (domain === normalizedCategoryDomain) {
          console.log(`[DEBUG] Exact domain match: ${domain} -> ${category.id}`)
          return category.id
        }
        
        // Subdomain match (e.g., mail.google.com matches google.com)
        if (domain.endsWith('.' + normalizedCategoryDomain)) {
          console.log(`[DEBUG] Subdomain match: ${domain} -> ${category.id}`)
          return category.id
        }
      }
      
      // Check keywords in domain, title, and URL
      const searchText = `${domain} ${tab.title || ''} ${tab.url}`.toLowerCase()
      for (const keyword of category.keywords) {
        if (searchText.includes(keyword.toLowerCase())) {
          console.log(`[DEBUG] Keyword match "${keyword}": ${domain} -> ${category.id}`)
          return category.id
        }
      }
    }
    
    console.log(`[DEBUG] No match found for ${domain}, returning "other"`)
    return 'other'
  } catch (error) {
    console.error('[DEBUG] Error categorizing tab:', error)
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
    const tabCategories = new Map<number, string>()
    
    console.log('[DEBUG] Starting tab categorization...')
    
    for (const tab of remainingTabs) {
      if (!tab.id || !tab.url) continue
      
      // Skip special URLs
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        console.log(`[DEBUG] Skipping special URL: ${tab.url}`)
        continue
      }
      
      const category = await getTabCategory(tab)
      tabCategories.set(tab.id, category)
      
      if (!categoryGroups.has(category)) {
        categoryGroups.set(category, [])
      }
      categoryGroups.get(category)!.push(tab.id)
    }
    
    console.log('[DEBUG] Category groups:')
    for (const [category, tabIds] of categoryGroups) {
      console.log(`  ${category}: ${tabIds.length} tabs`)
    }
    
    // Step 4: Get categories configuration for proper names and colors
    const categoriesResult = await chrome.storage.sync.get(['categories'])
    const categories: Category[] = categoriesResult.categories || DEFAULT_CATEGORIES
    const categoryMap = new Map(categories.map(c => [c.id, c]))
    
    // Create groups for each category
    console.log('[DEBUG] Creating tab groups...')
    
    for (const [categoryId, tabIds] of categoryGroups) {
      if (tabIds.length === 0) continue
      
      // Get category details
      const category = categoryMap.get(categoryId)
      const groupTitle = category?.name || (categoryId === 'other' ? 'Other' : categoryId.charAt(0).toUpperCase() + categoryId.slice(1))
      const groupColor = (category?.color || 'grey') as chrome.tabGroups.ColorEnum
      
      console.log(`[DEBUG] Creating group "${groupTitle}" with ${tabIds.length} tabs`)
      
      const groupId = await createTabGroup(
        tabIds,
        groupTitle,
        groupColor
      )
      
      if (groupId !== null) {
        groupsCreated++
        console.log(`[DEBUG] Successfully created group "${groupTitle}"`)
      } else {
        console.error(`[DEBUG] Failed to create group "${groupTitle}"`)
      }
    }
    
    // No need for separate ungrouped handling since all tabs should be categorized
    
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