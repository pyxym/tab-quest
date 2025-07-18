import { storage } from 'wxt/utils/storage'

// Define storage keys and types
export interface StorageSchema {
  // Sync storage items
  'sync:categories': Category[]
  'sync:categoryMapping': Record<string, string>
  
  // Local storage items
  'local:tabUsageData': Record<string, any>
  'local:dailyStats': Record<string, any>
  'local:hasSeenWelcome': boolean
  'local:userPatterns': Record<string, any>
  'local:categoryHistory': Record<string, any>
  'local:tabsData': any[]
}

// Category type definition
export interface Category {
  id: string
  name: string
  icon: string
  color: string
  domains?: string[]
  keywords?: string[]
  priority?: number
}

// Storage utilities
export const storageUtils = {
  // Sync storage methods
  async getCategories() {
    return await storage.getItem<Category[]>('sync:categories') || []
  },
  
  async setCategories(categories: Category[]) {
    await storage.setItem('sync:categories', categories)
  },
  
  async getCategoryMapping() {
    return await storage.getItem<Record<string, string>>('sync:categoryMapping') || {}
  },
  
  async setCategoryMapping(mapping: Record<string, string>) {
    await storage.setItem('sync:categoryMapping', mapping)
  },
  
  // Local storage methods
  async getTabUsageData() {
    return await storage.getItem<Record<string, any>>('local:tabUsageData') || {}
  },
  
  async setTabUsageData(data: Record<string, any>) {
    await storage.setItem('local:tabUsageData', data)
  },
  
  async getDailyStats() {
    return await storage.getItem<Record<string, any>>('local:dailyStats') || {}
  },
  
  async setDailyStats(stats: Record<string, any>) {
    await storage.setItem('local:dailyStats', stats)
  },
  
  async getHasSeenWelcome() {
    return await storage.getItem<boolean>('local:hasSeenWelcome') || false
  },
  
  async setHasSeenWelcome(value: boolean) {
    await storage.setItem('local:hasSeenWelcome', value)
  },
  
  async getUserPatterns() {
    return await storage.getItem<Record<string, any>>('local:userPatterns') || {}
  },
  
  async setUserPatterns(patterns: Record<string, any>) {
    await storage.setItem('local:userPatterns', patterns)
  },
  
  async getCategoryHistory() {
    return await storage.getItem<Record<string, any>>('local:categoryHistory') || {}
  },
  
  async setCategoryHistory(history: Record<string, any>) {
    await storage.setItem('local:categoryHistory', history)
  },
  
  // Clear all local storage
  async clearLocalStorage() {
    const localKeys = [
      'local:tabUsageData',
      'local:dailyStats', 
      'local:hasSeenWelcome',
      'local:userPatterns',
      'local:categoryHistory',
      'local:tabsData'
    ]
    
    for (const key of localKeys) {
      await storage.removeItem(key as keyof StorageSchema)
    }
  }
}

// Watch storage changes
export function watchCategories(callback: (newValue: Category[] | null, oldValue: Category[] | null) => void) {
  return storage.watch<Category[]>('sync:categories', callback)
}

export function watchCategoryMapping(callback: (newValue: Record<string, string> | null, oldValue: Record<string, string> | null) => void) {
  return storage.watch<Record<string, string>>('sync:categoryMapping', callback)
}