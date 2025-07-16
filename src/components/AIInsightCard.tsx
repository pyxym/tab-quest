import React from "react"
import type { AIInsight } from "../store/aiStore"

interface AIInsightCardProps {
  insight: AIInsight
  onDismiss?: (id: string) => void
  onAction?: () => void
}

export const AIInsightCard: React.FC<AIInsightCardProps> = ({ 
  insight, 
  onDismiss, 
  onAction 
}) => {
  const typeIcons = {
    suggestion: "💡",
    pattern: "📊",
    alert: "⚠️",
    tip: "✨"
  }
  
  const priorityColors = {
    high: "border-red-500/50 bg-red-500/5",
    medium: "border-yellow-500/50 bg-yellow-500/5",
    low: "border-blue-500/50 bg-blue-500/5"
  }
  
  const typeLabels = {
    suggestion: "제안",
    pattern: "패턴",
    alert: "알림",
    tip: "팁"
  }
  
  return (
    <div className={`glass-card !p-3 border-l-4 ${priorityColors[insight.priority]} relative transition-all hover:scale-[1.01]`}>
      <div className="flex items-start gap-2.5">
        <span className="text-xl flex-shrink-0 mt-0.5">{typeIcons[insight.type]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium glass-text text-sm leading-tight">
              {insight.title}
            </h4>
            {onDismiss && (
              <button
                onClick={() => onDismiss(insight.id)}
                className="text-white/30 hover:text-white/50 flex-shrink-0 transition-colors -mt-1 -mr-1"
                title="Dismiss"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <p className="text-xs glass-text opacity-70 mt-1 leading-relaxed">
            {insight.description}
          </p>
          {insight.actionable && (
            <button
              onClick={() => {
                insight.actionable?.action()
                onAction?.()
              }}
              className="glass-button-primary !py-1.5 !px-3 text-xs mt-2.5 hover:scale-105 transition-transform"
            >
              {insight.actionable.label}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}