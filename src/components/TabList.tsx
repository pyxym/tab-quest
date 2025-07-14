import React, { useState, useEffect } from "react"
import { useCategoryStore } from "../store/categoryStore"
import type { Category } from "../types/category"

interface TabListProps {
  onClose: () => void
}

interface TabWithCategory extends chrome.tabs.Tab {
  category?: string
}

export const TabList: React.FC<TabListProps> = ({ onClose }) => {
  const { categories, getCategoryForDomain, assignDomainToCategory, loadCategories } = useCategoryStore()
  const [tabs, setTabs] = useState<TabWithCategory[]>([])
  const [selectedTab, setSelectedTab] = useState<number | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    loadCategories()
    loadTabs()
  }, [loadCategories])

  const loadTabs = async () => {
    const allTabs = await chrome.tabs.query({ currentWindow: true })
    const tabsWithCategories = allTabs.map(tab => {
      if (tab.url) {
        try {
          const domain = new URL(tab.url).hostname
          const category = getCategoryForDomain(domain)
          return { ...tab, category }
        } catch {
          return { ...tab, category: "other" }
        }
      }
      return { ...tab, category: "other" }
    })
    setTabs(tabsWithCategories)
  }

  const handleCategoryChange = async (tabId: number, tabUrl: string, newCategoryId: string) => {
    if (!tabUrl) return
    
    setIsUpdating(true)
    try {
      const domain = new URL(tabUrl).hostname
      await assignDomainToCategory(domain, newCategoryId)
      
      // Update local state
      setTabs(tabs.map(tab => 
        tab.id === tabId ? { ...tab, category: newCategoryId } : tab
      ))
      
      // Show success feedback
      setSelectedTab(tabId)
      setTimeout(() => setSelectedTab(null), 1500)
    } catch (error) {
      console.error("Failed to update category:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const getCategoryColor = (categoryId: string): string => {
    const category = categories.find(c => c.id === categoryId)
    return category ? getColorHex(category.color) : "#6B7280"
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Assign Tabs to Categories
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {tabs.map((tab) => (
              <div 
                key={tab.id} 
                className={`p-3 bg-gray-50 dark:bg-gray-700 rounded-lg transition-all ${
                  selectedTab === tab.id ? 'ring-2 ring-green-500' : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  {/* Tab Info Row */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Favicon */}
                    <img 
                      src={tab.favIconUrl || '/assets/icon.png'} 
                      alt="" 
                      className="w-5 h-5 rounded flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/icon.png'
                      }}
                    />
                    
                    {/* Tab Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {tab.title || 'Untitled'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {tab.url ? new URL(tab.url).hostname : 'Unknown'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Category Controls */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getCategoryColor(tab.category || "other") }}
                    />
                    <select
                      value={tab.category || "other"}
                      onChange={(e) => handleCategoryChange(tab.id!, tab.url!, e.target.value)}
                      disabled={isUpdating || !tab.url}
                      className="px-2 py-1 text-sm bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md focus:ring-2 focus:ring-purple-500 min-w-[120px]"
                    >
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    
                    {/* Success Indicator */}
                    {selectedTab === tab.id && (
                      <span className="text-green-500 text-lg">
                        ✓
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            💡 Tip: When you change a tab's category, all tabs from the same domain will be grouped together
          </p>
        </div>
      </div>
    </div>
  )
}

// Helper function to get color hex values
function getColorHex(color: chrome.tabGroups.ColorEnum): string {
  const colorMap: Record<chrome.tabGroups.ColorEnum, string> = {
    blue: "#3B82F6",
    cyan: "#06B6D4",
    green: "#10B981",
    yellow: "#F59E0B",
    orange: "#F97316",
    red: "#EF4444",
    pink: "#EC4899",
    purple: "#8B5CF6",
    grey: "#6B7280"
  }
  return colorMap[color] || colorMap.grey
}