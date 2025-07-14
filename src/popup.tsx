import React, { useEffect, useState } from "react"
import { AILogo } from "./components/AILogo"
import { AIInsightCard } from "./components/AIInsightCard"
import { ProductivityScore } from "./components/ProductivityScore"
import { CategoryManager } from "./components/CategoryManager"
import { TabList } from "./components/TabList"
import { DashboardModal } from "./components/DashboardModal"
import { useTabStore } from "./store/tabStore"
import { useAIStore } from "./store/aiStore"
import { calculateProductivityScore, findDuplicates } from "./utils/tabAnalyzer"
import "../style.css"

function IndexPopup() {
  const { tabs, setTabs } = useTabStore()
  const { insights, productivityScore, addInsight, removeInsight, setProductivityScore } = useAIStore()
  const [analysis, setAnalysis] = useState<any>(null)
  const [isOrganizing, setIsOrganizing] = useState(false)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [showTabList, setShowTabList] = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)
  
  useEffect(() => {
    loadTabsAndAnalyze()
  }, [])
  
  async function loadTabsAndAnalyze() {
    // Load current tabs
    const currentTabs = await chrome.tabs.query({})
    setTabs(currentTabs.map(tab => ({
      id: tab.id!,
      title: tab.title || "",
      url: tab.url || "",
      favIconUrl: tab.favIconUrl,
      lastAccessed: Date.now()
    })))
    
    // Get analysis from background
    const response = await chrome.runtime.sendMessage({ action: "getTabsAnalysis" })
    setAnalysis(response)
    
    // Calculate and set productivity score
    const score = calculateProductivityScore(currentTabs)
    setProductivityScore(score)
    
    // Generate insights based on analysis
    generateInsights(currentTabs, response)
  }
  
  function generateInsights(tabs: chrome.tabs.Tab[], analysis: any) {
    // Clear existing insights
    insights.forEach(insight => removeInsight(insight.id))
    
    // Add duplicate tabs insight
    if (analysis.duplicates.length > 0) {
      const totalDuplicates = analysis.duplicates.reduce((sum: number, d: any) => sum + d.count - 1, 0)
      addInsight({
        id: "duplicates",
        type: "alert",
        title: `${totalDuplicates} duplicate tabs detected`,
        description: `You have multiple tabs open for the same pages. Clean them up to save memory.`,
        priority: "high",
        timestamp: Date.now(),
        actionable: {
          label: "Remove duplicates",
          action: async () => {
            const duplicates = await chrome.runtime.sendMessage({ action: "findDuplicates" })
            duplicates.forEach((group: any) => {
              // Keep the first tab, close others
              group.tabs.slice(1).forEach((tab: chrome.tabs.Tab) => {
                if (tab.id) chrome.tabs.remove(tab.id)
              })
            })
            loadTabsAndAnalyze()
          }
        }
      })
    }
    
    // Add high tab count insight
    if (tabs.length > 20) {
      addInsight({
        id: "high-tab-count",
        type: "suggestion",
        title: `${tabs.length} tabs are slowing you down`,
        description: "Consider using AI Smart Organize to group related tabs together.",
        priority: tabs.length > 30 ? "high" : "medium",
        timestamp: Date.now(),
        actionable: {
          label: "Organize now",
          action: handleSmartOrganize
        }
      })
    }
    
    // Add category insight
    if (analysis.categoryCounts) {
      const topCategory = Object.entries(analysis.categoryCounts)
        .sort(([,a], [,b]) => (b as number) - (a as number))[0]
      
      if (topCategory && topCategory[1] as number > 5) {
        addInsight({
          id: "category-focus",
          type: "pattern",
          title: `Heavy ${topCategory[0]} usage detected`,
          description: `You have ${topCategory[1]} ${topCategory[0]} tabs open. Consider creating a dedicated workspace.`,
          priority: "low",
          timestamp: Date.now()
        })
      }
    }
  }
  
  async function handleSmartOrganize() {
    setIsOrganizing(true)
    try {
      const result = await chrome.runtime.sendMessage({ action: "smartOrganize" })
      if (result.success) {
        addInsight({
          id: `organize-success-${Date.now()}`,
          type: "tip",
          title: "✨ Smart Organization Complete!",
          description: result.message || `Created ${result.groupsCreated} groups`,
          priority: "medium",
          timestamp: Date.now()
        })
        
        // Add specific insights based on actions taken
        if (result.closedDuplicates > 0) {
          addInsight({
            id: `duplicates-closed-${Date.now()}`,
            type: "tip",
            title: "🗑️ Duplicates Removed",
            description: `Closed ${result.closedDuplicates} duplicate tabs to reduce clutter`,
            priority: "low",
            timestamp: Date.now() + 1
          })
        }
      }
    } catch (error) {
      console.error("Failed to organize tabs:", error)
    } finally {
      setIsOrganizing(false)
      loadTabsAndAnalyze()
    }
  }
  
  async function handleViewDashboard() {
    setShowDashboard(true)
  }
  
  return (
    <>
      <div className="w-96 h-[600px] relative overflow-hidden">
        {/* Dynamic gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500"></div>
        
        {/* Animated gradient orbs */}
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        {/* Glass container */}
        <div className="absolute inset-0 p-4">
          <div className="h-full glass-main rounded-[24px] flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AILogo size="medium" />
                <div>
                  <h1 className="font-bold text-lg ai-gradient-text">TabAI</h1>
                  <p className="text-xs glass-text opacity-70">Your AI-Powered Tab Assistant</p>
                </div>
              </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTabList(true)}
                className="p-2 glass-card !p-2 transition-all hover:scale-105"
                title="Assign Tabs to Categories"
              >
                <svg className="w-4 h-4 glass-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </button>
              <button
                onClick={() => setShowCategoryManager(true)}
                className="p-2 glass-card !p-2 transition-all hover:scale-105"
                title="Manage Categories"
              >
                <svg className="w-4 h-4 glass-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </button>
              <ProductivityScore score={productivityScore} trend="up" compact />
            </div>
          </div>
        </div>
        
            {/* Tab Stats */}
            <div className="p-5">
            <div className="grid grid-cols-3 gap-3">
              <div className="glass-card text-center">
                <p className="text-3xl font-bold glass-text">{tabs.length}</p>
                <p className="text-xs glass-text opacity-70">Active Tabs</p>
              </div>
              <div className="glass-card text-center">
                <p className="text-3xl font-bold glass-text">
                  {analysis?.categoryCounts ? Object.keys(analysis.categoryCounts).length : 0}
                </p>
                <p className="text-xs glass-text opacity-70">Categories</p>
              </div>
              <div className="glass-card text-center">
                <p className="text-3xl font-bold glass-text">
                  {analysis?.duplicates ? analysis.duplicates.reduce((sum: number, d: any) => sum + d.count - 1, 0) : 0}
                </p>
                <p className="text-xs glass-text opacity-70">Duplicates</p>
              </div>
            </div>
          </div>
        
            {/* AI Insights */}
            <div className="px-5 flex-1 overflow-y-auto">
          <h2 className="font-semibold text-sm glass-text mb-3">
            AI Insights
          </h2>
          <div className="space-y-3">
            {insights.map((insight) => (
              <AIInsightCard
                key={insight.id}
                insight={insight}
                onDismiss={removeInsight}
              />
            ))}
          </div>
        </div>
        
            {/* Quick Actions */}
            <div className="border-t border-white/20 p-5">
            <div className="grid grid-cols-2 gap-3">
              <button 
                className="glass-button-primary text-sm disabled:opacity-50 glass-text"
                onClick={handleSmartOrganize}
                disabled={isOrganizing || tabs.length < 2}
              >
                {isOrganizing ? "Organizing..." : "🤖 Smart Organize"}
              </button>
              <button 
                className="glass-button-primary text-sm glass-text"
                onClick={handleViewDashboard}
              >
                📊 View Dashboard
              </button>
            </div>
            </div>
          </div>
        </div>
      </div>
      
      {showCategoryManager && (
        <CategoryManager onClose={() => setShowCategoryManager(false)} />
      )}
      
      {showTabList && (
        <TabList onClose={() => setShowTabList(false)} />
      )}
      
      {showDashboard && (
        <DashboardModal onClose={() => setShowDashboard(false)} />
      )}
    </>
  )
}

export default IndexPopup