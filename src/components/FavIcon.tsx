import React, { useState } from "react"

interface FavIconProps {
  url?: string
  size?: number
  className?: string
}

export const FavIcon: React.FC<FavIconProps> = ({ url, size = 20, className = "" }) => {
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Generate fallback icon based on the first letter of the domain
  const getFallbackIcon = () => {
    if (!url) return "?"
    try {
      const hostname = new URL(url).hostname
      // Remove www. prefix if present
      const cleanHostname = hostname.replace(/^www\./, '')
      return cleanHostname.charAt(0).toUpperCase()
    } catch {
      return "?"
    }
  }

  if (!url || hasError) {
    // Render a fallback icon instead of an image
    return (
      <div 
        className={`flex items-center justify-center rounded-md glass-card !p-0 text-gray-600 dark:text-gray-300 font-semibold text-xs ${className}`}
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
      >
        {getFallbackIcon()}
      </div>
    )
  }

  return (
    <>
      {isLoading && (
        <div 
          className={`flex items-center justify-center rounded-md glass-card !p-0 animate-pulse ${className}`}
          style={{ width: size, height: size, minWidth: size, minHeight: size }}
        />
      )}
      <img
        src={url}
        alt=""
        className={`rounded-md ${isLoading ? 'hidden' : ''} ${className}`}
        style={{ width: size, height: size }}
        onError={() => {
          setHasError(true)
          setIsLoading(false)
        }}
        onLoad={() => setIsLoading(false)}
      />
    </>
  )
}