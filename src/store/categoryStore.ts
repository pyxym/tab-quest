import { create } from "zustand"
import type { Category, CategoryMapping } from "../types/category"
import { DEFAULT_CATEGORIES } from "../types/category"
import { ErrorBoundary, DataValidator } from "../utils/errorBoundary"

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
    return ErrorBoundary.wrap(
      async () => {
        // Validate category data
        const validatedData = {
          ...categoryData,
          name: DataValidator.sanitizeString(categoryData.name, 50),
          domains: categoryData.domains.map(d => d.toLowerCase().replace(/^www\./, '')),
          keywords: categoryData.keywords.map(k => k.toLowerCase()),
          color: categoryData.color as chrome.tabGroups.ColorEnum
        }
        
        const newCategory: Category = {
          ...validatedData,
          id: `custom-${Date.now()}`,
          createdAt: Date.now()
        }
        
        // Check for duplicate names
        const categories = get().categories
        if (categories.some(c => c.name.toLowerCase() === newCategory.name.toLowerCase())) {
          throw new Error('Category with this name already exists')
        }
        
        const updatedCategories = [...categories, newCategory]
        
        // Check storage quota before saving
        const { quota, usage } = await chrome.storage.sync.getBytesInUse(null)
        if (usage > quota * 0.9) {
          throw new Error('Storage quota exceeded')
        }
        
        await chrome.storage.sync.set({ categories: updatedCategories })
        set({ categories: updatedCategories })
        
        return newCategory.id
      },
      '',
      'categoryStore.addCategory'
    )
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
    return ErrorBoundary.wrap(
      async () => {
        // Validate inputs
        const normalizedDomain = domain.toLowerCase().replace(/^www\./, '')
        if (!normalizedDomain || normalizedDomain.length > 255) {
          throw new Error('Invalid domain')
        }
        
        const categories = get().categories
        if (!categories.some(c => c.id === categoryId)) {
          throw new Error('Invalid category ID')
        }
        
        const mapping = { ...get().categoryMapping, [normalizedDomain]: categoryId }
        await chrome.storage.sync.set({ categoryMapping: mapping })
        set({ categoryMapping: mapping })
      },
      undefined,
      'categoryStore.assignDomainToCategory'
    )
  },

  getCategoryForDomain: (domain) => {
    return ErrorBoundary.wrapSync(
      () => {
        const { categories, categoryMapping } = get()
        const normalizedDomain = domain.toLowerCase().replace(/^www\./, '')
        
        // Check explicit mapping first
        if (categoryMapping[normalizedDomain]) {
          return categoryMapping[normalizedDomain]
        }
        
        // Check category domains with better pattern matching
        for (const category of categories) {
          // Exact domain match
          if (category.domains.some(d => normalizedDomain === d.toLowerCase())) {
            return category.id
          }
          
          // Subdomain match (e.g., docs.github.com matches github.com)
          if (category.domains.some(d => {
            const pattern = d.toLowerCase()
            return normalizedDomain.endsWith(`.${pattern}`) || normalizedDomain === pattern
          })) {
            return category.id
          }
        }
        
        // Check keywords in domain with word boundaries
        for (const category of categories) {
          if (category.keywords.some(keyword => {
            const keywordLower = keyword.toLowerCase()
            // Match whole words only
            const regex = new RegExp(`\\b${keywordLower}\\b`)
            return regex.test(normalizedDomain)
          })) {
            return category.id
          }
        }
        
        return "other"
      },
      "other",
      'categoryStore.getCategoryForDomain'
    )
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