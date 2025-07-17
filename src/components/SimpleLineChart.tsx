import React from "react"

interface LineChartData {
  label: string
  value: number
}

interface SimpleLineChartProps {
  data: LineChartData[]
  title?: string
  height?: number
  color?: string
}

export const SimpleLineChart: React.FC<SimpleLineChartProps> = ({ 
  data, 
  title,
  height = 150,
  color = "#8B5CF6"
}) => {
  if (data.length === 0) return null
  
  const maxValue = Math.max(...data.map(d => d.value), 100)
  const minValue = Math.min(...data.map(d => d.value), 0)
  const range = maxValue - minValue || 1
  
  // Create SVG path
  const points = data.map((item, index) => {
    const x = (index / (data.length - 1)) * 100
    const y = 100 - ((item.value - minValue) / range) * 100
    return { x, y, value: item.value, label: item.label }
  })
  
  const pathData = points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`
    return `${path} L ${point.x} ${point.y}`
  }, "")
  
  return (
    <div className="w-full">
      {title && (
        <h4 className="text-sm font-medium text-white/80 mb-3">{title}</h4>
      )}
      <div className="flex">
        {/* Y-axis labels */}
        <div className="w-12 flex flex-col justify-between pr-2" style={{ height: `${height}px` }}>
          <span className="text-xs text-white/60 text-right">{maxValue}%</span>
          <span className="text-xs text-white/60 text-right">{Math.round((maxValue + minValue) / 2)}%</span>
          <span className="text-xs text-white/60 text-right">{minValue}%</span>
        </div>
        
        {/* Chart */}
        <div className="flex-1 flex flex-col">
          <div className="relative" style={{ height: `${height}px` }}>
            <svg 
              viewBox="0 0 100 100" 
              preserveAspectRatio="none"
              className="w-full h-full"
            >
          {/* Grid lines */}
          <line x1="0" y1="0" x2="100" y2="0" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
          <line x1="0" y1="100" x2="100" y2="100" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
          
          {/* Line */}
          <path 
            d={pathData} 
            fill="none" 
            stroke={color}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          
          {/* Points */}
          {points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="1.5"
              fill={color}
              vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
          </div>
          
          {/* X-axis labels */}
          <div className="flex justify-between mt-2 text-xs text-white/60">
            {data.map((item, index) => (
              <span key={index} style={{ width: `${100 / data.length}%` }} className="text-center">
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}