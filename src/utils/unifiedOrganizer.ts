// Unified tab organization logic used by both Smart Organize and Apply Grouping
import { useCategoryStore } from '../store/categoryStore'

export async function organizeTabsUnified(categories: any[]) {
  try {
    console.log('[TabAI Unified] Starting organization...')
    console.log('[TabAI Unified] Categories order:', categories.map(c => c.name))
    
    const tabs = await chrome.tabs.query({ currentWindow: true })
    console.log(`[TabAI Unified] Found ${tabs.length} tabs`)
    
    // First, ungroup all tabs
    const allTabIds = tabs
      .map(tab => tab.id)
      .filter((id): id is number => id !== undefined)
    
    if (allTabIds.length > 0) {
      try {
        await chrome.tabs.ungroup(allTabIds)
        console.log('[TabAI Unified] Ungrouped all tabs')
      } catch (e) {
        console.log('[TabAI Unified] Some tabs already ungrouped')
      }
    }
    
    // Get the category store instance
    const { getCategoryForDomain } = useCategoryStore.getState()
    
    // Step 1: Analyze and categorize all tabs
    const categorizedTabs = new Map<string, chrome.tabs.Tab[]>()
    
    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue
      
      // Skip system URLs but not extension URLs
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
        continue
      }
      
      let categoryId = 'uncategorized'
      
      try {
        const domain = new URL(tab.url).hostname.replace(/^www\./, '')
        // Use the store's getCategoryForDomain which checks both mappings and category domains
        categoryId = getCategoryForDomain(domain)
        console.log(`[TabAI Unified] ${domain} -> ${categoryId}`)
      } catch (error) {
        console.error(`[TabAI Unified] Error parsing URL: ${tab.url}`)
        categoryId = 'uncategorized'
      }
      
      if (!categorizedTabs.has(categoryId)) {
        categorizedTabs.set(categoryId, [])
      }
      categorizedTabs.get(categoryId)!.push(tab)
    }
    
    // Step 2: Reorganize tabs by moving them in category order
    // This ensures tabs are physically arranged in the correct order before grouping
    let currentPosition = 0
    const reorderedTabIds: number[] = []
    
    for (const category of categories) {
      const categoryTabs = categorizedTabs.get(category.id)
      if (!categoryTabs || categoryTabs.length === 0) continue
      
      console.log(`[TabAI Unified] Moving ${categoryTabs.length} tabs for category: ${category.name}`)
      
      for (const tab of categoryTabs) {
        if (tab.id) {
          reorderedTabIds.push(tab.id)
        }
      }
    }
    
    // Move all tabs to their correct positions
    for (let i = 0; i < reorderedTabIds.length; i++) {
      try {
        await chrome.tabs.move(reorderedTabIds[i], { index: i })
      } catch (error) {
        console.error(`[TabAI Unified] Failed to move tab:`, error)
      }
    }
    
    // Step 3: Create groups in order (tabs are already in correct positions)
    let groupsCreated = 0
    let tabsProcessed = 0
    
    for (const category of categories) {
      const categoryTabs = categorizedTabs.get(category.id)
      if (!categoryTabs || categoryTabs.length === 0) continue
      
      const tabIds = categoryTabs.map(t => t.id).filter((id): id is number => id !== undefined)
      
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
          color: category.color as chrome.tabGroups.ColorEnum,
          collapsed: false
        })
        
        groupsCreated++
        tabsProcessed += tabIds.length
        console.log(`[TabAI Unified] Created group for ${category.name} with ${tabIds.length} tabs`)
      } catch (error) {
        console.error(`[TabAI Unified] Failed to create group for ${category.name}:`, error)
      }
    }
    
    const message = groupsCreated > 0 
      ? `Successfully organized ${tabsProcessed} tabs into ${groupsCreated} groups`
      : 'No groups created'
    
    return {
      success: true,
      message,
      groupsCreated,
      tabsProcessed: tabs.length
    }
    
  } catch (error) {
    console.error('[TabAI Unified] Organization failed:', error)
    throw error
  }
}