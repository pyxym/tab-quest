import React, { useState, useEffect } from "react"
import { useCategoryStore } from "../store/categoryStore"
import { FavIcon } from "./FavIcon"
import { InfoTooltip } from "./InfoTooltip"
import type { Category } from "../types/category"
import { organizeTabsUnified } from "../utils/unifiedOrganizer"

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
  const [isOrganizing, setIsOrganizing] = useState(false)

  useEffect(() => {
    loadCategories()
    loadTabs()
  }, [loadCategories])

  const loadTabs = async () => {
    const allTabs = await chrome.tabs.query({ currentWindow: true })
    const tabsWithCategories = allTabs.map(tab => {
      if (tab.url) {
        try {
          const domain = new URL(tab.url).hostname.replace(/^www\./, '')
          const category = getCategoryForDomain(domain)
          return { ...tab, category }
        } catch {
          return { ...tab, category: "uncategorized" }
        }
      }
      return { ...tab, category: "uncategorized" }
    })
    
    // Sort tabs by category order
    const categoryOrder = categories.map(c => c.id)
    const sortedTabs = tabsWithCategories.sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a.category || 'uncategorized')
      const bIndex = categoryOrder.indexOf(b.category || 'uncategorized')
      return aIndex - bIndex
    })
    
    setTabs(sortedTabs)
  }

  const handleCategoryChange = async (tabId: number, tabUrl: string, newCategoryId: string) => {
    if (!tabUrl) return
    
    setIsUpdating(true)
    try {
      const domain = new URL(tabUrl).hostname.replace(/^www\./, '')
      await assignDomainToCategory(domain, newCategoryId)
      
      // Update local state - all tabs from the same domain
      setTabs(tabs.map(tab => {
        if (tab.url) {
          try {
            const tabDomain = new URL(tab.url).hostname.replace(/^www\./, '')
            if (tabDomain === domain) {
              return { ...tab, category: newCategoryId }
            }
          } catch {
            // Ignore invalid URLs
          }
        }
        return tab
      }))
      
      // Skip AI learning for now - background script doesn't handle this yet
      // TODO: Implement AI learning in future version
      
      // Don't auto-organize here - let user click Apply Grouping
      // Just show success feedback
      setSelectedTab(tabId)
      setTimeout(() => setSelectedTab(null), 1500)
      
      // Reload tabs to show updated categories
      await loadTabs()
    } catch (error) {
      console.error("Failed to update category:", error)
    } finally {
      setIsUpdating(false)
    }
  }
  
  const organizeTabsByCategory = async () => {
    if (isOrganizing) return
    
    try {
      console.log('[TabQuest] Using unified organization...')
      setIsOrganizing(true)
      
      // Use the unified organization function
      const result = await organizeTabsUnified(categories)
      
      console.log('[TabQuest] Tab organization complete:', result)
      
      // Reload tabs after organization
      setTimeout(() => {
        loadTabs()
      }, 500)
    } catch (error) {
      console.error('[TabQuest] Failed to organize tabs:', error)
    } finally {
      setIsOrganizing(false)
    }
  }

  const getCategoryColor = (categoryId: string): string => {
    const category = categories.find(c => c.id === categoryId)
    return category ? getColorHex(category.color) : "#6B7280"
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
      <div className="glass-main rounded-[24px] w-full max-w-2xl h-[90vh] max-h-[90vh] flex flex-col">
        <div className="px-4 py-4 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold ai-gradient-text">
                Assign Tabs to Categories
              </h2>
              <InfoTooltip 
                title="탭 카테고리 할당"
                description="각 탭을 적절한 카테고리로 분류하여 효율적으로 관리하세요."
                features={[
                  "도메인 단위로 카테고리 할당",
                  "같은 도메인의 모든 탭은 동일한 카테고리 사용",
                  "Apply 버튼으로 브라우저에 탭 그룹 생성"
                ]}
                position="bottom"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={organizeTabsByCategory}
                className="glass-button-primary py-2 px-3 text-sm"
                disabled={isOrganizing || isUpdating}
                title="Apply category grouping to browser tabs"
              >
                {isOrganizing ? '⏳ Applying...' : '🎯 Apply'}
              </button>
              <button
                onClick={onClose}
                className="glass-button-primary p-2 px-3"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {tabs.map((tab) => (
              <div 
                key={tab.id} 
                className={`glass-card py-2 px-3 transition-all ${
                  selectedTab === tab.id ? 'ring-2 ring-green-500' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Favicon */}
                  <FavIcon url={tab.favIconUrl || tab.url} size={18} className="flex-shrink-0" />
                  
                  {/* Tab Title (single line) */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm glass-text truncate" title={`${tab.title} - ${tab.url}`}>
                      {tab.title || 'Untitled'}
                      <span className="opacity-50 ml-2 text-xs">
                        {tab.url ? `• ${new URL(tab.url).hostname}` : ''}
                      </span>
                    </p>
                  </div>
                  
                  {/* Category Selector */}
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getCategoryColor(tab.category || "other") }}
                    />
                    <select
                      value={tab.category || "other"}
                      onChange={(e) => handleCategoryChange(tab.id!, tab.url!, e.target.value)}
                      disabled={isUpdating || !tab.url}
                      className="px-2 py-1 text-xs glass-card border-none outline-none focus:ring-2 focus:ring-purple-500/50 min-w-[100px] glass-text"
                    >
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    
                    {/* Success Indicator */}
                    {selectedTab === tab.id && (
                      <span className="text-green-500 text-sm">✓</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 py-4 border-t border-white/20">
          <p className="text-xs glass-text opacity-80">
            💡 Tip: Categories are assigned by domain. When you change a tab's category, all tabs from the same domain (e.g., all github.com tabs) will use the same category.
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