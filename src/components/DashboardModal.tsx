import React, { useEffect, useState } from "react"
import { ProductivityScore } from "./ProductivityScore"

interface DashboardModalProps {
  onClose: () => void
}

interface TabData {
  id: number
  url: string
  title: string
  domain: string
  category: string
  lastAccessed: number
  accessCount: number
}

interface CategoryStats {
  name: string
  count: number
  percentage: number
  color: string
}

export const DashboardModal: React.FC<DashboardModalProps> = ({ onClose }) => {
  const [tabs, setTabs] = useState<TabData[]>([])
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([])
  const [productivityScore, setProductivityScore] = useState(0)
  const [mostVisited, setMostVisited] = useState<TabData[]>([])
  const [totalTabs, setTotalTabs] = useState(0)
  const [duplicates, setDuplicates] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      // Get all tabs
      const allTabs = await chrome.tabs.query({})
      setTotalTabs(allTabs.length)

      // Get tabs data from storage
      const result = await chrome.storage.local.get("tabsData")
      const tabsData = result.tabsData || {}
      
      // Get categories from storage
      const categoriesResult = await chrome.storage.sync.get(["categories"])
      const categories = categoriesResult.categories || []
      
      // Convert to array and analyze
      const tabsArray = Object.values(tabsData) as TabData[]
      setTabs(tabsArray)

      // Calculate category statistics
      const categoryCount: Record<string, number> = {}
      tabsArray.forEach(tab => {
        const category = tab.category || "other"
        categoryCount[category] = (categoryCount[category] || 0) + 1
      })

      const stats: CategoryStats[] = categories.map((cat: any) => ({
        name: cat.name,
        count: categoryCount[cat.id] || 0,
        percentage: tabsArray.length > 0 ? Math.round(((categoryCount[cat.id] || 0) / tabsArray.length) * 100) : 0,
        color: getColorHex(cat.color)
      })).filter((stat: CategoryStats) => stat.count > 0)

      setCategoryStats(stats)

      // Calculate productivity score
      const workTabs = categoryCount["work"] || 0
      const entertainmentTabs = categoryCount["entertainment"] || 0
      const socialTabs = categoryCount["social"] || 0
      const totalProductiveTabs = workTabs
      const totalDistractingTabs = entertainmentTabs + socialTabs
      
      let score = 50
      if (totalProductiveTabs + totalDistractingTabs > 0) {
        score = Math.round((totalProductiveTabs / (totalProductiveTabs + totalDistractingTabs)) * 100)
      }
      setProductivityScore(score)

      // Find most visited tabs
      const sortedByAccess = [...tabsArray].sort((a, b) => b.accessCount - a.accessCount)
      setMostVisited(sortedByAccess.slice(0, 3))

      // Count duplicates
      const duplicatesResponse = await chrome.runtime.sendMessage({ action: "findDuplicates" })
      if (duplicatesResponse) {
        const totalDuplicates = duplicatesResponse.reduce((sum: number, group: any) => sum + group.count - 1, 0)
        setDuplicates(totalDuplicates)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="glass-convex w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold ai-gradient-text">
                TabAI Dashboard
              </h1>
              <p className="text-sm text-white/90 mt-1">
                AI-powered insights for your browsing habits
              </p>
            </div>
            <button
              onClick={onClose}
              className="glass-button-primary !p-2 !px-3"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <p className="mt-2 text-white/80">Loading dashboard data...</p>
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="glass-card text-center">
                  <p className="text-2xl font-bold ai-gradient-text">{totalTabs}</p>
                  <p className="text-xs text-white/80 mt-1">Total Tabs</p>
                </div>
                <div className="glass-card text-center">
                  <p className="text-2xl font-bold ai-gradient-text">{categoryStats.length}</p>
                  <p className="text-xs text-white/80 mt-1">Categories</p>
                </div>
                <div className="glass-card text-center">
                  <p className="text-2xl font-bold ai-gradient-text">{duplicates}</p>
                  <p className="text-xs text-white/80 mt-1">Duplicates</p>
                </div>
                <div className="glass-card text-center">
                  <ProductivityScore score={productivityScore} compact />
                  <p className="text-xs text-white/80 mt-1">Productivity</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Category Distribution */}
                <div className="glass-card">
                  <h3 className="font-semibold mb-4 flex items-center gap-2 text-white">
                    <span className="text-lg">📊</span> Category Distribution
                  </h3>
                  <div className="space-y-3">
                    {categoryStats.length > 0 ? categoryStats.map((stat) => (
                      <div key={stat.name}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-white">{stat.name}</span>
                          <span className="text-xs text-white/70">
                            {stat.count} ({stat.percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all duration-500"
                            style={{
                              width: `${stat.percentage}%`,
                              backgroundColor: stat.color
                            }}
                          />
                        </div>
                      </div>
                    )) : (
                      <p className="text-sm text-white/60">No tab data available yet</p>
                    )}
                  </div>
                </div>

                {/* Most Visited */}
                <div className="glass-card">
                  <h3 className="font-semibold mb-4 flex items-center gap-2 text-white">
                    <span className="text-lg">🔥</span> Most Visited Sites
                  </h3>
                  <div className="space-y-3">
                    {mostVisited.length > 0 ? mostVisited.map((tab, index) => (
                      <div key={tab.id} className="flex items-center gap-3">
                        <span className="text-xl font-bold text-white/90">#{index + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-white">{tab.title}</p>
                          <p className="text-xs text-white/70">{tab.domain}</p>
                        </div>
                        <span className="text-sm font-medium text-purple-400">
                          {tab.accessCount}x
                        </span>
                      </div>
                    )) : (
                      <p className="text-sm text-white/60">No visit data available yet</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Tips */}
              <div className="mt-6 p-4 glass-card bg-gradient-to-r from-purple-500/10 to-blue-500/10">
                <h3 className="font-semibold mb-2 flex items-center gap-2 text-white">
                  <span className="text-lg">💡</span> AI Insights
                </h3>
                <ul className="text-sm space-y-1 text-white/90">
                  {productivityScore < 50 ? (
                    <li>• You have more entertainment tabs than work tabs. Try closing some distracting tabs!</li>
                  ) : (
                    <li>• Great productivity balance! Keep up the focused browsing.</li>
                  )}
                  {duplicates > 0 && (
                    <li>• You have {duplicates} duplicate tabs. Use Smart Organize to clean them up!</li>
                  )}
                  {totalTabs > 30 && (
                    <li>• With {totalTabs} tabs open, consider grouping them for better organization.</li>
                  )}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper function to get color hex values
function getColorHex(color: string): string {
  const colorMap: Record<string, string> = {
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