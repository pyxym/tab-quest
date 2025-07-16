import React, { useEffect, useState } from 'react'

interface AILearningStatusProps {
  compact?: boolean
}

interface LearningStats {
  totalDomains: number
  totalCategories: number
  confidenceLevel: number
  lastUpdated: string
}

export const AILearningStatus: React.FC<AILearningStatusProps> = ({ compact = false }) => {
  const [stats, setStats] = useState<LearningStats>({
    totalDomains: 0,
    totalCategories: 0,
    confidenceLevel: 0,
    lastUpdated: 'Never'
  })
  const [isLoading, setIsLoading] = useState(false)
  
  useEffect(() => {
    loadAIStats()
  }, [])
  
  const loadAIStats = async () => {
    setIsLoading(true)
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getAIInsights' })
      
      if (response) {
        const domains = response.totalDomains || 0
        const categories = Object.keys(response.categoryCounts || {}).length
        
        // Calculate confidence based on learning data
        const confidence = Math.min(
          Math.floor((domains / 50) * 100), // 50 domains = 100% confidence
          95 // Max 95% to show continuous learning
        )
        
        setStats({
          totalDomains: domains,
          totalCategories: categories,
          confidenceLevel: confidence,
          lastUpdated: new Date().toLocaleTimeString()
        })
      }
    } catch (error) {
      console.error('Failed to load AI stats:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 px-2 py-1 glass-card">
        <div className="relative w-6 h-6">
          <svg className="w-6 h-6 -rotate-90">
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              className="text-white/20"
            />
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="url(#gradient)"
              strokeWidth="2"
              fill="none"
              strokeDasharray={`${stats.confidenceLevel * 0.628} 62.8`}
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="gradient">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#EC4899" />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold glass-text">
            {stats.confidenceLevel}%
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-medium glass-text">AI Learning</span>
          <span className="text-[10px] glass-text opacity-60">
            {stats.totalDomains} domains
          </span>
        </div>
      </div>
    )
  }
  
  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm glass-text flex items-center gap-2">
          <span className="text-lg">🧠</span>
          AI Learning Status
        </h3>
        <button
          onClick={loadAIStats}
          disabled={isLoading}
          className="text-xs glass-text opacity-60 hover:opacity-100"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      
      {/* Progress Circle */}
      <div className="flex items-center justify-center mb-4">
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="36"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              className="text-white/20"
            />
            <circle
              cx="40"
              cy="40"
              r="36"
              stroke="url(#gradient-full)"
              strokeWidth="4"
              fill="none"
              strokeDasharray={`${stats.confidenceLevel * 2.26} 226`}
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="gradient-full">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#EC4899" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold glass-text">{stats.confidenceLevel}%</span>
            <span className="text-xs glass-text opacity-60">Confidence</span>
          </div>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="text-center">
          <p className="text-lg font-semibold glass-text">{stats.totalDomains}</p>
          <p className="text-xs glass-text opacity-60">Learned Domains</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold glass-text">{stats.totalCategories}</p>
          <p className="text-xs glass-text opacity-60">Active Categories</p>
        </div>
      </div>
      
      {/* Learning Tips */}
      <div className="p-3 bg-white/5 rounded-lg">
        <p className="text-xs glass-text opacity-80">
          {stats.confidenceLevel < 30 && "💡 AI가 더 많이 학습할수록 정확해집니다. 탭을 재분류해보세요!"}
          {stats.confidenceLevel >= 30 && stats.confidenceLevel < 60 && "🚀 AI가 당신의 패턴을 이해하기 시작했습니다!"}
          {stats.confidenceLevel >= 60 && stats.confidenceLevel < 90 && "🎯 AI가 꽤 정확하게 예측하고 있습니다!"}
          {stats.confidenceLevel >= 90 && "🏆 AI가 당신의 브라우징 패턴을 완벽히 이해했습니다!"}
        </p>
      </div>
      
      <p className="text-[10px] glass-text opacity-40 text-center mt-2">
        Last updated: {stats.lastUpdated}
      </p>
    </div>
  )
}