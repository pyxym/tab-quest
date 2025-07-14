import React from "react"
import { AILogo } from "../src/components/AILogo"
import "../style.css"

function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <AILogo size="large" />
          <div>
            <h1 className="text-3xl font-bold ai-gradient-text">TabAI Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">
              AI-powered insights for your browsing habits
            </p>
          </div>
        </div>
        
        <div className="ai-card text-center py-20">
          <h2 className="text-xl font-semibold mb-4">Dashboard Coming Soon</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Advanced analytics, patterns, and AI insights will be available here.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard