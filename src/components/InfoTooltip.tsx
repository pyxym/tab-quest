import React, { useState, useRef, useEffect } from 'react'

interface InfoTooltipProps {
  title: string
  description: string
  features?: string[]
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto' | 'bottom-left' | 'bottom-right'
  className?: string
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ 
  title, 
  description, 
  features,
  position = 'auto',
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [actualPosition, setActualPosition] = useState(position === 'auto' ? 'bottom' : position)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  
  useEffect(() => {
    if (isVisible && position === 'auto' && buttonRef.current && tooltipRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const tooltipHeight = 200 // Approximate height including padding
      const tooltipWidth = 280 // 256px (w-64) + padding + margin
      
      // Check available space in each direction
      const spaceTop = rect.top
      const spaceBottom = viewportHeight - rect.bottom
      const spaceLeft = rect.left
      const spaceRight = viewportWidth - rect.right
      
      // Prioritize position based on available space
      if (spaceBottom >= tooltipHeight && spaceLeft >= tooltipWidth / 2 && spaceRight >= tooltipWidth / 2) {
        setActualPosition('bottom')
      } else if (spaceTop >= tooltipHeight && spaceLeft >= tooltipWidth / 2 && spaceRight >= tooltipWidth / 2) {
        setActualPosition('top')
      } else if (spaceLeft >= tooltipWidth) {
        setActualPosition('left')
      } else if (spaceRight >= tooltipWidth) {
        setActualPosition('right')
      } else {
        // Default to bottom if no ideal position
        setActualPosition('bottom')
      }
    } else if (position !== 'auto') {
      setActualPosition(position)
    }
  }, [isVisible, position])
  
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1',
    'bottom-left': 'top-full right-0 mt-1',
    'bottom-right': 'top-full left-0 mt-1'
  }
  
  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-white/90',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-white/90',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-white/90',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-white/90',
    'bottom-left': 'bottom-full right-4 border-b-white/90',
    'bottom-right': 'bottom-full left-4 border-b-white/90'
  }
  
  return (
    <div className={`relative inline-flex ${className}`}>
      <button
        ref={buttonRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className="p-1 rounded-full hover:bg-white/10 transition-colors"
        aria-label="Information"
      >
        <svg 
          className="w-4 h-4 glass-text opacity-60 hover:opacity-100" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
      </button>
      
      {/* Tooltip */}
      {isVisible && (
        <div 
          ref={tooltipRef}
          className={`
            absolute z-50 w-64 p-4 
            bg-white/95 dark:bg-gray-800/95 
            backdrop-blur-md rounded-lg shadow-xl
            transition-all duration-200 pointer-events-none
            ${positionClasses[actualPosition]}
            opacity-100 scale-100
          `}
        >
        {/* Arrow */}
        <div 
          className={`
            absolute w-0 h-0 
            border-4 border-transparent 
            ${arrowClasses[actualPosition]}
          `} 
        />
        
        {/* Content */}
        <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-2">
          {title}
        </h4>
        <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
          {description}
        </p>
        
        {features && features.length > 0 && (
          <ul className="mt-2 space-y-1">
            {features.map((feature, index) => (
              <li key={index} className="text-xs text-gray-600 dark:text-gray-400 flex items-start">
                <span className="mr-1">•</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      )}
    </div>
  )
}