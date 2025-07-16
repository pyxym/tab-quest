// AI-powered background script using the TabClassifier
export {}
import { tabClassifier, type TabContext } from './lib/tabClassifier'
import { DEFAULT_CATEGORIES } from './types/category'
import type { Category } from './types/category'

// Helper to get current context
function getCurrentContext(tab: chrome.tabs.Tab, allTabs: chrome.tabs.Tab[]): TabContext {
  const now = new Date()
  const hour = now.getHours()
  
  let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
  if (hour < 6) timeOfDay = 'night'
  else if (hour < 12) timeOfDay = 'morning'
  else if (hour < 18) timeOfDay = 'afternoon'
  else if (hour < 22) timeOfDay = 'evening'
  else timeOfDay = 'night'
  
  return {
    tab: {
      id: tab.id!,
      title: tab.title || '',
      url: tab.url || '',
      favIconUrl: tab.favIconUrl,
      lastAccessed: Date.now()
    },
    timeOfDay,
    dayOfWeek: now.getDay(),
    sessionTabs: allTabs.map(t => ({
      id: t.id!,
      title: t.title || '',
      url: t.url || '',
      favIconUrl: t.favIconUrl,
      lastAccessed: Date.now()
    })),
    userActivity: 'active'
  }
}

// Smart organize using AI classifier
export async function aiSmartOrganize() {
  console.log('[TabAI] Starting AI-powered organization...')
  
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true })
    console.log(`[TabAI] Processing ${tabs.length} tabs with AI classifier`)
    
    // Ungroup all tabs first
    const allTabIds = tabs.map(t => t.id).filter(id => id !== undefined) as number[]
    try {
      await chrome.tabs.ungroup(allTabIds)
    } catch (e) {
      console.log('[TabAI] Some tabs were already ungrouped')
    }
    
    // Classify each tab using AI
    const classificationResults = new Map<string, chrome.tabs.Tab[]>()
    const tabClassifications = new Map<number, { category: string; confidence: number; reasoning: string }>()
    
    for (const tab of tabs) {
      if (!tab.url || !tab.id) continue
      
      // Skip special URLs
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        continue
      }
      
      const context = getCurrentContext(tab, tabs)
      const result = await tabClassifier.classify(context)
      
      console.log(`[TabAI] ${tab.title} -> ${result.category} (confidence: ${result.confidence.toFixed(2)}) - ${result.reasoning}`)
      
      tabClassifications.set(tab.id, {
        category: result.category,
        confidence: result.confidence,
        reasoning: result.reasoning
      })
      
      if (!classificationResults.has(result.category)) {
        classificationResults.set(result.category, [])
      }
      classificationResults.get(result.category)!.push(tab)
    }
    
    // Get categories configuration
    const categoriesResult = await chrome.storage.sync.get(['categories'])
    const categories: Category[] = categoriesResult.categories || DEFAULT_CATEGORIES
    const categoryMap = new Map(categories.map(c => [c.id, c]))
    
    // Create groups based on AI classification
    let groupsCreated = 0
    const groupingDetails: any[] = []
    
    for (const [categoryId, categoryTabs] of classificationResults) {
      if (categoryTabs.length === 0) continue
      
      const category = categoryMap.get(categoryId)
      const groupTitle = category?.name || (categoryId === 'other' ? 'Other' : categoryId.charAt(0).toUpperCase() + categoryId.slice(1))
      const groupColor = (category?.color || 'grey') as chrome.tabGroups.ColorEnum
      
      try {
        const tabIds = categoryTabs.map(t => t.id).filter(id => id !== undefined) as number[]
        const groupId = await chrome.tabs.group({ tabIds })
        
        await chrome.tabGroups.update(groupId, {
          title: groupTitle,
          color: groupColor,
          collapsed: false
        })
        
        groupsCreated++
        
        // Collect grouping details for summary
        const avgConfidence = categoryTabs.reduce((sum, tab) => {
          const classification = tabClassifications.get(tab.id!)
          return sum + (classification?.confidence || 0)
        }, 0) / categoryTabs.length
        
        groupingDetails.push({
          category: groupTitle,
          tabCount: categoryTabs.length,
          avgConfidence: avgConfidence.toFixed(2),
          tabs: categoryTabs.map(t => ({
            title: t.title,
            confidence: tabClassifications.get(t.id!)?.confidence.toFixed(2)
          }))
        })
        
        console.log(`[TabAI] Created group "${groupTitle}" with ${tabIds.length} tabs (avg confidence: ${avgConfidence.toFixed(2)})`)
      } catch (error) {
        console.error(`[TabAI] Failed to create group "${groupTitle}":`, error)
      }
    }
    
    // Get AI insights
    const insights = tabClassifier.getUserInsights()
    
    return {
      success: true,
      message: `AI organized ${tabs.length} tabs into ${groupsCreated} smart groups`,
      groupsCreated,
      details: groupingDetails,
      aiInsights: Object.fromEntries(insights)
    }
    
  } catch (error) {
    console.error('[TabAI] AI organization failed:', error)
    return {
      success: false,
      message: `AI organization failed: ${error}`,
      groupsCreated: 0
    }
  }
}

// Learn from user tab reassignment
export async function learnFromReassignment(tabId: number, newCategory: string) {
  try {
    const tab = await chrome.tabs.get(tabId)
    if (!tab.url) return
    
    const url = new URL(tab.url)
    const domain = url.hostname.toLowerCase().replace(/^www\./, '')
    
    // Get current context
    const allTabs = await chrome.tabs.query({ currentWindow: true })
    const context = getCurrentContext(tab, allTabs)
    
    // Learn from this user action
    await tabClassifier.learnFromUserAction(domain, newCategory, context)
    
    console.log(`[TabAI] Learned: ${domain} -> ${newCategory}`)
    
    return { success: true, message: 'AI learning updated' }
  } catch (error) {
    console.error('[TabAI] Learning failed:', error)
    return { success: false, message: 'Learning failed' }
  }
}

// Message handlers
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'aiOrganize') {
    aiSmartOrganize().then(sendResponse)
    return true
  }
  
  if (request.action === 'learnReassignment') {
    learnFromReassignment(request.tabId, request.category).then(sendResponse)
    return true
  }
  
  if (request.action === 'getAIInsights') {
    const insights = tabClassifier.getUserInsights()
    sendResponse(Object.fromEntries(insights))
    return true
  }
  
  return false
})