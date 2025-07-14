import React from "react"

interface ProductivityScoreProps {
  score: number
  trend?: "up" | "down" | "stable"
  compact?: boolean
}

export const ProductivityScore: React.FC<ProductivityScoreProps> = ({ 
  score, 
  trend = "stable",
  compact = false 
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500"
    if (score >= 60) return "text-yellow-500"
    return "text-red-500"
  }
  
  const trendIcons = {
    up: "↗️",
    down: "↘️",
    stable: "→"
  }
  
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className={`font-bold text-lg ${getScoreColor(score)}`}>
          {score}
        </span>
        <span className="text-sm">{trendIcons[trend]}</span>
      </div>
    )
  }
  
  return (
    <div className="ai-card">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold ai-gradient-text">AI Productivity Score</h3>
        <span className="text-xl">{trendIcons[trend]}</span>
      </div>
      <div className="relative h-32 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full border-8 border-gray-200 dark:border-gray-700" />
        </div>
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background: `conic-gradient(from -90deg, #8B5CF6 0%, #EC4899 ${score * 3.6}deg, transparent ${score * 3.6}deg)`,
            WebkitMask: 'radial-gradient(farthest-side, transparent 55%, white 56%)',
            mask: 'radial-gradient(farthest-side, transparent 55%, white 56%)'
          }}
        >
          <div className="w-24 h-24 rounded-full" />
        </div>
        <span className={`font-bold text-3xl ${getScoreColor(score)}`}>
          {score}
        </span>
      </div>
      <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">
        {score >= 80 && "Excellent! Your browsing is highly optimized."}
        {score >= 60 && score < 80 && "Good! Room for improvement."}
        {score < 60 && "Let AI help optimize your workflow."}
      </p>
    </div>
  )
}