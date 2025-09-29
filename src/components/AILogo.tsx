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

  // Use actual icon images from public/icon folder
  const iconSizes = {
    small: 32,  // Use 32px icon for small
    medium: 48, // Use 48px icon for medium
    large: 128  // Use 128px icon for large
  }

  const iconPath = `/icon/icon-${iconSizes[size]}.png`

  return (
    <div className={`${sizeClasses[size]} relative`}>
      <div className={`absolute inset-0 ai-gradient rounded-lg ${animated ? 'animate-gradient' : ''}`} />
      <div className="absolute inset-0 flex items-center justify-center p-1">
        <img
          src={iconPath}
          alt="TabQuest Logo"
          className="w-full h-full object-contain"
        />
      </div>
      {animated && (
        <div className="absolute inset-0 ai-gradient rounded-lg opacity-50 animate-pulse-slow" />
      )}
    </div>
  )
}