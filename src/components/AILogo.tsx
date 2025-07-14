import React from "react"

interface AILogoProps {
  size?: "small" | "medium" | "large"
  animated?: boolean
}

export const AILogo: React.FC<AILogoProps> = ({ size = "medium", animated = true }) => {
  const sizeClasses = {
    small: "w-6 h-6",
    medium: "w-8 h-8",
    large: "w-12 h-12"
  }
  
  return (
    <div className={`${sizeClasses[size]} relative`}>
      <div className={`absolute inset-0 ai-gradient rounded-lg ${animated ? 'animate-gradient' : ''}`} />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-white font-bold text-xs">AI</span>
      </div>
      {animated && (
        <div className="absolute inset-0 ai-gradient rounded-lg opacity-50 animate-pulse-slow" />
      )}
    </div>
  )
}