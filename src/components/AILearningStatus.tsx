import React, { useEffect, useState } from 'react'

/**
 * AI 학습 상태 컴포넌트의 Props 타입 정의
 */
interface AILearningStatusProps {
  compact?: boolean  // 컴팩트 모드 여부
}

/**
 * AI 학습 통계 데이터 타입 정의
 */
interface LearningStats {
  totalDomains: number      // 학습된 총 도메인 수
  totalCategories: number   // 활성 카테고리 수
  confidenceLevel: number   // AI 신뢰도 레벨 (0-100%)
  lastUpdated: string       // 마지막 업데이트 시간
}

/**
 * AI 학습 상태 컴포넌트
 * AI의 학습 진행 상황과 신뢰도를 시각적으로 표시
 *
 * @component
 * @param {AILearningStatusProps} props - 컴포넌트 속성
 */
export const AILearningStatus: React.FC<AILearningStatusProps> = ({ compact = false }) => {
  // AI 학습 통계 상태
  const [stats, setStats] = useState<LearningStats>({
    totalDomains: 0,
    totalCategories: 0,
    confidenceLevel: 0,
    lastUpdated: 'Never'
  })
  // 로딩 상태
  const [isLoading, setIsLoading] = useState(false)

  // 컴포넌트 마운트 시 AI 통계 로드
  useEffect(() => {
    loadAIStats()
  }, [])

  /**
   * AI 학습 통계를 로드하는 함수
   * 백그라운드 스크립트에서 AI 인사이트 데이터를 가져와 처리
   */
  const loadAIStats = async () => {
    setIsLoading(true)
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getAIInsights' })

      if (response) {
        const domains = response.totalDomains || 0
        const categories = Object.keys(response.categoryCounts || {}).length

        // 학습된 도메인 수를 기반으로 신뢰도 계산
        const confidence = Math.min(
          Math.floor((domains / 50) * 100), // 50개 도메인 학습 시 100% 신뢰도
          95 // 최대 95%로 제한하여 지속적인 학습 표시
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
  
  // 컴팩트 모드 렌더링
  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 px-2 py-1 glass-card">
        {/* 원형 진행률 표시기 */}
        <div className="relative w-6 h-6">
          <svg className="w-6 h-6 -rotate-90">
            {/* 배경 원 */}
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              className="text-white/20"
            />
            {/* 진행률 원 */}
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
            {/* 그라디언트 정의 */}
            <defs>
              <linearGradient id="gradient">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#EC4899" />
              </linearGradient>
            </defs>
          </svg>
          {/* 신뢰도 퍼센트 표시 */}
          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold glass-text">
            {stats.confidenceLevel}%
          </span>
        </div>
        {/* 텍스트 정보 */}
        <div className="flex flex-col">
          <span className="text-xs font-medium glass-text">AI Learning</span>
          <span className="text-[10px] glass-text opacity-60">
            {stats.totalDomains} domains
          </span>
        </div>
      </div>
    )
  }
  
  // 전체 모드 렌더링
  return (
    <div className="glass-card">
      {/* 헤더 섹션 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm glass-text flex items-center gap-2">
          <span className="text-lg">🧠</span>
          AI Learning Status
        </h3>
        {/* 새로고침 버튼 */}
        <button
          onClick={loadAIStats}
          disabled={isLoading}
          className="text-xs glass-text opacity-60 hover:opacity-100"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* 원형 진행률 표시기 (큰 사이즈) */}
      <div className="flex items-center justify-center mb-4">
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 -rotate-90">
            {/* 배경 원 */}
            <circle
              cx="40"
              cy="40"
              r="36"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              className="text-white/20"
            />
            {/* 진행률 원 */}
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
            {/* 그라디언트 정의 */}
            <defs>
              <linearGradient id="gradient-full">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#EC4899" />
              </linearGradient>
            </defs>
          </svg>
          {/* 중앙 신뢰도 표시 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold glass-text">{stats.confidenceLevel}%</span>
            <span className="text-xs glass-text opacity-60">Confidence</span>
          </div>
        </div>
      </div>

      {/* 통계 그리드 */}
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

      {/* 학습 팁 섹션 */}
      <div className="p-3 bg-white/5 rounded-lg">
        <p className="text-xs glass-text opacity-80">
          {/* 신뢰도 레벨에 따른 다른 메시지 표시 */}
          {stats.confidenceLevel < 30 && "💡 AI가 더 많이 학습할수록 정확해집니다. 탭을 재분류해보세요!"}
          {stats.confidenceLevel >= 30 && stats.confidenceLevel < 60 && "🚀 AI가 당신의 패턴을 이해하기 시작했습니다!"}
          {stats.confidenceLevel >= 60 && stats.confidenceLevel < 90 && "🎯 AI가 꽤 정확하게 예측하고 있습니다!"}
          {stats.confidenceLevel >= 90 && "🏆 AI가 당신의 브라우징 패턴을 완벽히 이해했습니다!"}
        </p>
      </div>

      {/* 마지막 업데이트 시간 */}
      <p className="text-[10px] glass-text opacity-40 text-center mt-2">
        Last updated: {stats.lastUpdated}
      </p>
    </div>
  )
}