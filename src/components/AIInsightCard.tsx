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
    high: "border-red-500/50",
    medium: "border-yellow-500/50",
    low: "border-blue-500/50"
  }
  
  return (
    <div className={`glass-card border-l-4 ${priorityColors[insight.priority]} relative`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{typeIcons[insight.type]}</span>
        <div className="flex-1">
          <h4 className="font-semibold glass-text">
            {insight.title}
          </h4>
          <p className="text-sm glass-text opacity-80 mt-1">
            {insight.description}
          </p>
          {insight.actionable && (
            <button
              onClick={() => {
                insight.actionable?.action()
                onAction?.()
              }}
              className="glass-button-primary text-xs mt-3"
            >
              {insight.actionable.label}
            </button>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={() => onDismiss(insight.id)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}