import React, { useEffect, useState } from "react"
import { AILogo } from "./components/AILogo"
import { AIInsightCard } from "./components/AIInsightCard"
import { ProductivityScore } from "./components/ProductivityScore"
import { CategoryManager } from "./components/CategoryManager"
import { TabList } from "./components/TabList"
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
          title: "Tabs organized successfully!",
          description: `Created ${result.groupsCreated} smart groups based on your browsing patterns.`,
          priority: "low",
          timestamp: Date.now()
        })
      }
    } catch (error) {
      console.error("Failed to organize tabs:", error)
    } finally {
      setIsOrganizing(false)
      loadTabsAndAnalyze()
    }
  }
  
  async function handleViewDashboard() {
    // Show dashboard info in a new window with current stats
    const tabsAnalysis = await chrome.runtime.sendMessage({ action: "getTabsAnalysis" })
    
    // Create a simple dashboard page
    const dashboardHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>TabAI Dashboard</title>
  <meta charset="utf-8">
  <style>
    body {
      margin: 0;
      padding: 40px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f3f4f6;
      color: #1f2937;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      font-size: 3rem;
      margin-bottom: 0.5rem;
      background: linear-gradient(to right, #9333ea, #3b82f6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle {
      color: #6b7280;
      margin-bottom: 3rem;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 3rem;
    }
    .stat-card {
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .stat-value {
      font-size: 2.5rem;
      font-weight: bold;
      background: linear-gradient(to right, #9333ea, #3b82f6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .stat-label {
      color: #6b7280;
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }
    .info-card {
      background: white;
      padding: 32px;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    .info-card h2 {
      margin-bottom: 1rem;
      color: #1f2937;
    }
    .productivity-score {
      display: inline-block;
      padding: 8px 16px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      border-radius: 20px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>TabAI Dashboard</h1>
    <p class="subtitle">AI-powered insights for your browsing habits</p>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${tabs.length}</div>
        <div class="stat-label">Total Tabs</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${tabsAnalysis?.categoryCounts ? Object.keys(tabsAnalysis.categoryCounts).length : 0}</div>
        <div class="stat-label">Categories</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${tabsAnalysis?.duplicates ? tabsAnalysis.duplicates.reduce((sum: number, d: any) => sum + d.count - 1, 0) : 0}</div>
        <div class="stat-label">Duplicate Tabs</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">
          <span class="productivity-score">${productivityScore}%</span>
        </div>
        <div class="stat-label">Productivity Score</div>
      </div>
    </div>
    
    <div class="info-card">
      <h2>📊 Full Dashboard Coming Soon!</h2>
      <p>We're working on advanced features including:</p>
      <ul>
        <li>📈 Detailed browsing patterns and time analysis</li>
        <li>🎯 Personalized productivity recommendations</li>
        <li>📊 Category distribution charts</li>
        <li>⏰ Time-based activity heatmaps</li>
        <li>🔍 Deep insights powered by AI</li>
      </ul>
    </div>
    
    <div class="info-card">
      <h2>💡 Quick Tips</h2>
      <ul>
        <li>Use <strong>Smart Organize</strong> to automatically group your tabs by category</li>
        <li>Assign custom categories to domains for better organization</li>
        <li>Check your productivity score regularly to stay focused</li>
      </ul>
    </div>
  </div>
</body>
</html>`;

    // Create a blob URL for the dashboard
    const blob = new Blob([dashboardHTML], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    
    // Open in new tab
    chrome.tabs.create({ url }, (tab) => {
      // Clean up blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    })
  }
  
  return (
    <>
      <div className="w-96 h-[600px] bg-gray-50 dark:bg-gray-900 overflow-hidden">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AILogo size="medium" />
              <div>
                <h1 className="font-bold text-lg ai-gradient-text">TabAI</h1>
                <p className="text-xs text-gray-500">Your AI-Powered Tab Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTabList(true)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Assign Tabs to Categories"
              >
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </button>
              <button
                onClick={() => setShowCategoryManager(true)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Manage Categories"
              >
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </button>
              <ProductivityScore score={productivityScore} trend="up" compact />
            </div>
          </div>
        </div>
        
        {/* Tab Stats */}
        <div className="p-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="ai-card text-center">
              <p className="text-2xl font-bold ai-gradient-text">{tabs.length}</p>
              <p className="text-xs text-gray-500">Active Tabs</p>
            </div>
            <div className="ai-card text-center">
              <p className="text-2xl font-bold ai-gradient-text">
                {analysis?.categoryCounts ? Object.keys(analysis.categoryCounts).length : 0}
              </p>
              <p className="text-xs text-gray-500">Categories</p>
            </div>
            <div className="ai-card text-center">
              <p className="text-2xl font-bold ai-gradient-text">
                {analysis?.duplicates ? analysis.duplicates.reduce((sum: number, d: any) => sum + d.count - 1, 0) : 0}
              </p>
              <p className="text-xs text-gray-500">Duplicates</p>
            </div>
          </div>
        </div>
        
        {/* AI Insights */}
        <div className="px-4">
          <h2 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3">
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
        <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="grid grid-cols-2 gap-3">
            <button 
              className="ai-button text-sm disabled:opacity-50"
              onClick={handleSmartOrganize}
              disabled={isOrganizing || tabs.length < 2}
            >
              {isOrganizing ? "Organizing..." : "🤖 Smart Organize"}
            </button>
            <button 
              className="ai-button text-sm"
              onClick={handleViewDashboard}
            >
              📊 View Dashboard
            </button>
          </div>
        </div>
      </div>
      
      {showCategoryManager && (
        <CategoryManager onClose={() => setShowCategoryManager(false)} />
      )}
      
      {showTabList && (
        <TabList onClose={() => setShowTabList(false)} />
      )}
    </>
  )
}

export default IndexPopup