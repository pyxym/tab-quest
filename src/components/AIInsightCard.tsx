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
    high: "border-red-500 bg-red-50 dark:bg-red-900/20",
    medium: "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20",
    low: "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
  }
  
  return (
    <div className={`ai-card border-l-4 ${priorityColors[insight.priority]} relative`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{typeIcons[insight.type]}</span>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">
            {insight.title}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {insight.description}
          </p>
          {insight.actionable && (
            <button
              onClick={() => {
                insight.actionable?.action()
                onAction?.()
              }}
              className="ai-button text-xs mt-3"
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