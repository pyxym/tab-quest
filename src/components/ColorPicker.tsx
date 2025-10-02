import React from "react"

/**
 * 색상 선택기 컴포넌트의 Props 타입 정의
 */
interface ColorPickerProps {
  value: chrome.tabGroups.ColorEnum      // 현재 선택된 색상
  onChange: (color: chrome.tabGroups.ColorEnum) => void  // 색상 변경 핸들러
  className?: string                     // 추가 CSS 클래스
  compact?: boolean                      // 컴팩트 모드 여부
}

/**
 * 색상 선택기 컴포넌트
 * Chrome 탭 그룹에서 사용 가능한 색상을 선택할 수 있는 UI
 *
 * @component
 * @param {ColorPickerProps} props - 컴포넌트 속성
 */
export const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
  className = "",
  compact = false
}) => {
  // Chrome 탭 그룹에서 사용 가능한 색상 목록
  const colors: chrome.tabGroups.ColorEnum[] = [
    "blue", "cyan", "green", "yellow", "orange", "red", "pink", "purple", "grey"
  ]

  // 색상 이름과 실제 색상 코드 매핑
  const colorMap: Record<chrome.tabGroups.ColorEnum, string> = {
    blue: "#3B82F6",    // 파란색
    cyan: "#06B6D4",    // 청록색
    green: "#10B981",   // 초록색
    yellow: "#F59E0B",  // 노란색
    orange: "#F97316",  // 주황색
    red: "#EF4444",     // 빨간색
    pink: "#EC4899",    // 분홍색
    purple: "#8B5CF6",  // 보라색
    grey: "#6B7280"     // 회색
  }

  return (
    <div className={`flex ${compact ? 'gap-0.5' : 'gap-1.5 p-2'} ${compact ? '' : 'glass-card'} ${className}`}>
      {colors.map(color => (
        <button
          key={color}
          onClick={() => onChange(color)}
          className={`
            ${compact ? 'w-4 h-4' : 'w-6 h-6'}
            rounded-full
            transition-all
            hover:scale-110
            ${value === color ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent' : ''}
          `}
          style={{ backgroundColor: colorMap[color] }}
          title={color}
          aria-label={`색상 선택: ${color}`}
        />
      ))}
    </div>
  )
}