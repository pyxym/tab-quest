// Simplified smartOrganizeTabs function
import { organizeTabs } from "./utils/tabOrganizer"
import type { Category } from "./types/category"
import { DEFAULT_CATEGORIES } from "./types/category"

export async function smartOrganizeTabsSimplified(userConfig?: any) {
  // Prevent concurrent executions
  if ((globalThis as any).isOrganizing) {
    return {
      success: false,
      groupsCreated: 0,
      closedDuplicates: 0,
      errors: ['Organization already in progress'],
      message: '⏳ Organization already in progress'
    }
  }
  
  (globalThis as any).isOrganizing = true
  
  try {
    // Get all tabs in current window
    const tabs = await chrome.tabs.query({ currentWindow: true })
    console.log(`[TabAI] Processing ${tabs.length} tabs`)
    
    // Step 1: Ungroup all existing tabs
    const allTabIds = tabs.map(t => t.id).filter(id => id !== undefined) as number[]
    await safeUngroup(allTabIds)
    
    // Step 2: Get categories and user mappings
    const storage = await chrome.storage.sync.get(['categories', 'categoryMapping'])
    const categories: Category[] = storage.categories || DEFAULT_CATEGORIES
    const userMappings: Record<string, string> = storage.categoryMapping || {}
    
    // Step 3: Organize tabs
    const organized = await organizeTabs(tabs, categories, userMappings)
    
    // Step 4: Create groups
    let groupsCreated = 0
    const errors: string[] = []
    const colors: chrome.tabGroups.ColorEnum[] = ['blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange']
    let colorIndex = 0
    
    // Create category groups
    const categoryMap = new Map(categories.map(c => [c.id, c]))
    for (const [categoryId, tabIds] of organized.categoryGroups) {
      if (tabIds.length < 2) continue // Skip single tabs
      
      const category = categoryMap.get(categoryId)
      const title = category?.name || categoryId.charAt(0).toUpperCase() + categoryId.slice(1)
      const color = (category?.color || colors[colorIndex % colors.length]) as chrome.tabGroups.ColorEnum
      
      const groupId = await createTabGroup(tabIds, title, color)
      if (groupId !== null) {
        groupsCreated++
        colorIndex++
      } else {
        errors.push(`Failed to group ${categoryId} tabs`)
      }
    }
    
    // Create project groups
    for (const [projectName, tabIds] of organized.projectGroups) {
      if (tabIds.length < 2) continue
      
      const color = colors[colorIndex % colors.length]
      const groupId = await createTabGroup(tabIds, `📁 ${projectName}`, color)
      
      if (groupId !== null) {
        groupsCreated++
        colorIndex++
      } else {
        errors.push(`Failed to group project ${projectName}`)
      }
    }
    
    // Create smart groups
    for (const smartGroup of organized.smartGroups) {
      if (smartGroup.tabIds.length < 2) continue
      
      const color = colors[colorIndex % colors.length]
      const groupId = await createTabGroup(smartGroup.tabIds, smartGroup.name, color)
      
      if (groupId !== null) {
        groupsCreated++
        colorIndex++
      } else {
        errors.push(`Failed to create smart group ${smartGroup.name}`)
      }
    }
    
    return {
      success: errors.length === 0,
      groupsCreated,
      closedDuplicates: 0,
      errors,
      message: groupsCreated > 0 
        ? `✅ Created ${groupsCreated} groups` 
        : '📋 Tabs are already well organized!'
    }
    
  } catch (error) {
    console.error('[TabAI] Organization failed:', error)
    return {
      success: false,
      groupsCreated: 0,
      closedDuplicates: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      message: '❌ Failed to organize tabs'
    }
  } finally {
    (globalThis as any).isOrganizing = false
  }
}

// Helper functions (these should be imported from the main background.ts)
async function safeUngroup(tabIds: number[]): Promise<void> {
  if (!tabIds.length) return
  
  const batchSize = 10
  for (let i = 0; i < tabIds.length; i += batchSize) {
    const batch = tabIds.slice(i, i + batchSize)
    try {
      await chrome.tabs.ungroup(batch)
    } catch (error) {
      console.log(`Some tabs in batch couldn't be ungrouped:`, error)
    }
  }
}

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
    const validTabIds = tabIds.filter(id => id > 0)
    if (!validTabIds.length) return null
    
    const groupId = await chrome.tabs.group({ tabIds: validTabIds })
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