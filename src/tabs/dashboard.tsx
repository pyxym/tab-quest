import React, { useEffect, useState } from "react"
import { AILogo } from "../components/AILogo"
import { ProductivityScore } from "../components/ProductivityScore"
import { storageUtils } from "../utils/storage"
import "../../style.css"

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

interface TimeStats {
  hour: number
  count: number
}

function Dashboard() {
  const [tabs, setTabs] = useState<TabData[]>([])
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([])
  const [productivityScore, setProductivityScore] = useState(0)
  const [mostVisited, setMostVisited] = useState<TabData[]>([])
  const [timeStats, setTimeStats] = useState<TimeStats[]>([])
  const [totalTabs, setTotalTabs] = useState(0)
  const [duplicates, setDuplicates] = useState(0)

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    // Get all tabs
    const allTabs = await chrome.tabs.query({})
    setTotalTabs(allTabs.length)

    // Get tabs data from storage
    const tabsData = (await storageUtils.getItem<any>('local:tabsData')) || {}
    
    // Get categories from storage
    const categories = await storageUtils.getCategories()
    
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
      percentage: Math.round(((categoryCount[cat.id] || 0) / tabsArray.length) * 100) || 0,
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
    setMostVisited(sortedByAccess.slice(0, 5))

    // Calculate time distribution
    const hourCounts: Record<number, number> = {}
    tabsArray.forEach(tab => {
      const hour = new Date(tab.lastAccessed).getHours()
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    })

    const timeData: TimeStats[] = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: hourCounts[i] || 0
    }))
    setTimeStats(timeData)

    // Count duplicates
    const duplicatesResponse = await chrome.runtime.sendMessage({ action: "findDuplicates" })
    if (duplicatesResponse) {
      const totalDuplicates = duplicatesResponse.reduce((sum: number, group: any) => sum + group.count - 1, 0)
      setDuplicates(totalDuplicates)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <AILogo size="large" />
            <div>
              <h1 className="text-3xl font-bold ai-gradient-text">TabQuest Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400">
                AI-powered insights for your browsing habits
              </p>
            </div>
          </div>
          <ProductivityScore score={productivityScore} trend="up" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="ai-card">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Total Tabs</h3>
            <p className="text-3xl font-bold ai-gradient-text">{totalTabs}</p>
          </div>
          <div className="ai-card">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Categories</h3>
            <p className="text-3xl font-bold ai-gradient-text">{categoryStats.length}</p>
          </div>
          <div className="ai-card">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Duplicates</h3>
            <p className="text-3xl font-bold ai-gradient-text">{duplicates}</p>
          </div>
          <div className="ai-card">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Tracked Tabs</h3>
            <p className="text-3xl font-bold ai-gradient-text">{tabs.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Category Distribution */}
          <div className="ai-card">
            <h2 className="text-xl font-semibold mb-4">Category Distribution</h2>
            <div className="space-y-3">
              {categoryStats.map((stat) => (
                <div key={stat.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{stat.name}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {stat.count} tabs ({stat.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${stat.percentage}%`,
                        backgroundColor: stat.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Most Visited */}
          <div className="ai-card">
            <h2 className="text-xl font-semibold mb-4">Most Visited Sites</h2>
            <div className="space-y-3">
              {mostVisited.map((tab, index) => (
                <div key={tab.id} className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-gray-300">#{index + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium truncate">{tab.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{tab.domain}</p>
                  </div>
                  <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                    {tab.accessCount} visits
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Time Distribution */}
          <div className="ai-card lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Activity by Hour</h2>
            <div className="flex items-end gap-1 h-32">
              {timeStats.map((stat) => {
                const maxCount = Math.max(...timeStats.map(s => s.count))
                const height = maxCount > 0 ? (stat.count / maxCount) * 100 : 0
                return (
                  <div
                    key={stat.hour}
                    className="flex-1 bg-gradient-to-t from-purple-600 to-blue-600 rounded-t opacity-80 hover:opacity-100 transition-opacity relative group"
                    style={{ height: `${height}%` }}
                  >
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      {stat.hour}:00 - {stat.count} tabs
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>12 AM</span>
              <span>6 AM</span>
              <span>12 PM</span>
              <span>6 PM</span>
              <span>11 PM</span>
            </div>
          </div>

          {/* AI Insights */}
          <div className="ai-card lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">AI Insights</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 p-4 rounded-lg">
                <h3 className="font-medium mb-2">💡 Productivity Tip</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {productivityScore < 50 
                    ? "You have more entertainment tabs than work tabs. Consider closing some distracting tabs."
                    : "Great job! You're maintaining a good balance of productive tabs."}
                </p>
              </div>
              <div className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg">
                <h3 className="font-medium mb-2">🎯 Focus Suggestion</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {duplicates > 5
                    ? `You have ${duplicates} duplicate tabs. Use Smart Organize to clean them up!`
                    : "Your tabs are well organized. Keep up the good work!"}
                </p>
              </div>
            </div>
          </div>
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

export default Dashboard