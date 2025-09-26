import React from 'react'

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null
  
  const features = [
    {
      icon: '🤖',
      title: 'AI Smart Organize',
      description: 'AI가 당신의 브라우징 패턴을 학습하여 탭을 자동으로 정리합니다.',
      details: [
        '사용 시간대와 맥락을 고려한 지능형 분류',
        '함께 사용하는 탭들의 관계 분석',
        '사용할수록 정확해지는 개인화 학습'
      ]
    },
    {
      icon: '🏷️',
      title: 'Category Management',
      description: '나만의 카테고리를 만들고 색상과 아이콘을 커스터마이징하세요.',
      details: [
        '드래그 앤 드롭으로 쉬운 탭 분류',
        '도메인별 자동 카테고리 매핑',
        'AI가 학습하는 카테고리 패턴'
      ]
    },
    {
      icon: '📊',
      title: 'Productivity Insights',
      description: 'AI가 분석한 브라우징 패턴과 생산성 점수를 확인하세요.',
      details: [
        '시간대별 사용 패턴 분석',
        '카테고리별 시간 추적',
        '생산성 향상을 위한 AI 제안'
      ]
    },
    {
      icon: '🧹',
      title: 'Smart Cleanup',
      description: '중복 탭 자동 감지 및 정리로 브라우저 성능을 최적화합니다.',
      details: [
        'URL 기반 중복 탭 감지',
        '가장 최근 탭 유지 옵션',
        '메모리 사용량 최적화'
      ]
    }
  ]
  
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
      <div className="glass-main rounded-[24px] w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-white text-xl">?</span>
            </div>
            <div>
              <h2 className="text-xl font-bold ai-gradient-text">TabQuest 사용 가이드</h2>
              <p className="text-sm glass-text opacity-70">AI 기반 탭 관리의 모든 것</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="glass-button-primary !p-2 !px-4"
          >
            닫기
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-88px)]">
          {/* AI Learning Status */}
          <div className="glass-card mb-6 border-2 border-purple-500/30">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🧠</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold glass-text mb-2">AI 학습 상태</h3>
                <p className="text-sm glass-text opacity-80 mb-3">
                  TabQuest는 현재 당신의 브라우징 패턴을 학습 중입니다. 
                  탭을 재분류하거나 새로운 탭을 열 때마다 AI가 더 똑똑해집니다.
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full w-1/3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse" />
                  </div>
                  <span className="text-xs glass-text opacity-60">학습 중...</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Features Grid */}
          <div className="grid gap-4">
            {features.map((feature, index) => (
              <div key={index} className="glass-card hover:scale-[1.02] transition-transform">
                <div className="flex items-start gap-4">
                  <div className="text-3xl flex-shrink-0">{feature.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold glass-text mb-2">{feature.title}</h3>
                    <p className="text-sm glass-text opacity-80 mb-3">{feature.description}</p>
                    <ul className="space-y-1">
                      {feature.details.map((detail, idx) => (
                        <li key={idx} className="text-xs glass-text opacity-60 flex items-start">
                          <span className="text-purple-400 mr-2">→</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Tips Section */}
          <div className="mt-6 glass-card bg-gradient-to-br from-purple-500/10 to-pink-500/10">
            <h3 className="font-semibold glass-text mb-3 flex items-center gap-2">
              <span className="text-2xl">💡</span>
              Pro Tips
            </h3>
            <ul className="space-y-2">
              <li className="text-sm glass-text opacity-80 flex items-start">
                <span className="text-yellow-400 mr-2">★</span>
                <span>탭을 수동으로 재분류하면 AI가 당신의 선호도를 학습합니다</span>
              </li>
              <li className="text-sm glass-text opacity-80 flex items-start">
                <span className="text-yellow-400 mr-2">★</span>
                <span>업무 시간과 개인 시간에 다른 카테고리를 사용하면 AI가 시간대별로 구분합니다</span>
              </li>
              <li className="text-sm glass-text opacity-80 flex items-start">
                <span className="text-yellow-400 mr-2">★</span>
                <span>관련 탭을 함께 열면 AI가 컨텍스트를 이해하고 더 정확하게 분류합니다</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}