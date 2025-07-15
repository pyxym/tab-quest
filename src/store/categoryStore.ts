import { create } from "zustand"
import type { Category, CategoryMapping } from "../types/category"
import { DEFAULT_CATEGORIES } from "../types/category"

interface CategoryStore {
  categories: Category[]
  categoryMapping: CategoryMapping
  
  // Actions
  loadCategories: () => Promise<void>
  addCategory: (category: Omit<Category, "id" | "createdAt">) => Promise<string>
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  assignDomainToCategory: (domain: string, categoryId: string) => Promise<void>
  getCategoryForDomain: (domain: string) => string
  resetToDefaults: () => Promise<void>
}

export const useCategoryStore = create<CategoryStore>((set, get) => ({
  categories: DEFAULT_CATEGORIES,
  categoryMapping: {},

  loadCategories: async () => {
    const result = await chrome.storage.sync.get(["categories", "categoryMapping"])
    
    if (result.categories) {
      // Merge default categories with saved ones
      const savedCategories = result.categories as Category[]
      const savedIds = new Set(savedCategories.map(c => c.id))
      
      // Add any new default categories that don't exist
      const newDefaultCategories = DEFAULT_CATEGORIES.filter(
        defaultCat => !savedIds.has(defaultCat.id)
      )
      
      // Keep custom categories and update default ones
      const mergedCategories = [
        ...DEFAULT_CATEGORIES, // Use latest default categories
        ...savedCategories.filter(c => !c.isDefault) // Keep only custom categories
      ]
      
      set({ 
        categories: mergedCategories,
        categoryMapping: result.categoryMapping || {}
      })
      
      // Update storage with merged categories
      await chrome.storage.sync.set({ categories: mergedCategories })
    } else {
      // First time setup
      await chrome.storage.sync.set({ 
        categories: DEFAULT_CATEGORIES,
        categoryMapping: {}
      })
      set({ 
        categories: DEFAULT_CATEGORIES,
        categoryMapping: {}
      })
    }
  },

  addCategory: async (categoryData) => {
    const newCategory: Category = {
      ...categoryData,
      id: `custom-${Date.now()}`,
      createdAt: Date.now()
    }
    
    const updatedCategories = [...get().categories, newCategory]
    await chrome.storage.sync.set({ categories: updatedCategories })
    set({ categories: updatedCategories })
    
    return newCategory.id
  },

  updateCategory: async (id, updates) => {
    const categories = get().categories
    const updatedCategories = categories.map(cat => 
      cat.id === id ? { ...cat, ...updates } : cat
    )
    
    await chrome.storage.sync.set({ categories: updatedCategories })
    set({ categories: updatedCategories })
  },

  deleteCategory: async (id) => {
    const categories = get().categories
    const categoryMapping = get().categoryMapping
    
    // Don't allow deleting default categories
    const category = categories.find(c => c.id === id)
    if (category?.isDefault) {
      throw new Error("Cannot delete default categories")
    }
    
    // Remove category
    const updatedCategories = categories.filter(c => c.id !== id)
    
    // Update mapping to reassign domains to "other"
    const updatedMapping = { ...categoryMapping }
    Object.keys(updatedMapping).forEach(domain => {
      if (updatedMapping[domain] === id) {
        updatedMapping[domain] = "other"
      }
    })
    
    await chrome.storage.sync.set({ 
      categories: updatedCategories,
      categoryMapping: updatedMapping
    })
    set({ 
      categories: updatedCategories,
      categoryMapping: updatedMapping
    })
  },

  assignDomainToCategory: async (domain, categoryId) => {
    const mapping = { ...get().categoryMapping, [domain]: categoryId }
    await chrome.storage.sync.set({ categoryMapping: mapping })
    set({ categoryMapping: mapping })
  },

  getCategoryForDomain: (domain) => {
    const { categories, categoryMapping } = get()
    
    // Check explicit mapping first
    if (categoryMapping[domain]) {
      return categoryMapping[domain]
    }
    
    // Check category domains
    for (const category of categories) {
      if (category.domains.some(d => domain.includes(d))) {
        return category.id
      }
    }
    
    // Check keywords in domain
    for (const category of categories) {
      if (category.keywords.some(keyword => domain.includes(keyword))) {
        return category.id
      }
    }
    
    return "other"
  },

  resetToDefaults: async () => {
    await chrome.storage.sync.set({ 
      categories: DEFAULT_CATEGORIES,
      categoryMapping: {}
    })
    set({ 
      categories: DEFAULT_CATEGORIES,
      categoryMapping: {}
    })
  }
}))