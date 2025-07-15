import React from "react"

interface ColorPickerProps {
  value: chrome.tabGroups.ColorEnum
  onChange: (color: chrome.tabGroups.ColorEnum) => void
  className?: string
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, className = "" }) => {
  const colors: chrome.tabGroups.ColorEnum[] = [
    "blue", "cyan", "green", "yellow", "orange", "red", "pink", "purple", "grey"
  ]

  const colorMap: Record<chrome.tabGroups.ColorEnum, string> = {
    blue: "#3B82F6",
    cyan: "#06B6D4",
    green: "#10B981",
    yellow: "#F59E0B",
    orange: "#F97316",
    red: "#EF4444",
    pink: "#EC4899",
    purple: "#8B5CF6",
    grey: "#6B7280"
  }

  return (
    <div className={`flex gap-1.5 p-2 glass-card ${className}`}>
      {colors.map(color => (
        <button
          key={color}
          onClick={() => onChange(color)}
          className={`w-6 h-6 rounded-full transition-all hover:scale-110 ${
            value === color ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent' : ''
          }`}
          style={{ backgroundColor: colorMap[color] }}
          title={color}
        />
      ))}
    </div>
  )
}