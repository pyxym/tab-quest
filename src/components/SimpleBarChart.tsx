import React from "react"

interface BarChartData {
  label: string
  value: number
  color: string
}

interface SimpleBarChartProps {
  data: BarChartData[]
  title?: string
  maxValue?: number
  showValues?: boolean
  height?: number
}

export const SimpleBarChart: React.FC<SimpleBarChartProps> = ({ 
  data, 
  title, 
  maxValue,
  showValues = true,
  height = 200 
}) => {
  const max = maxValue || Math.max(...data.map(d => d.value), 1)
  
  return (
    <div className="w-full">
      {title && (
        <h4 className="text-sm font-medium text-white/80 mb-3">{title}</h4>
      )}
      <div 
        className="relative flex items-end justify-between gap-2" 
        style={{ height: `${height}px` }}
      >
        {data.map((item, index) => {
          const percentage = (item.value / max) * 100
          
          return (
            <div key={index} className="flex-1 flex flex-col items-center justify-end">
              {showValues && (
                <span className="text-xs text-white/70 mb-1">
                  {item.value}m
                </span>
              )}
              <div 
                className="w-full rounded-t transition-all duration-500"
                style={{
                  height: `${percentage}%`,
                  backgroundColor: item.color,
                  minHeight: '4px'
                }}
              />
              <span className="text-xs text-white/60 mt-2 text-center truncate w-full">
                {item.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}