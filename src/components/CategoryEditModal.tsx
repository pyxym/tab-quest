import React, { useState, useEffect } from "react"
import { ColorPicker } from "./ColorPicker"
import type { Category } from "../types/category"

/**
 * 카테고리 편집 모달의 Props 타입 정의
 */
interface CategoryEditModalProps {
  isOpen: boolean                                           // 모달 표시 여부
  onClose: () => void                                      // 모달 닫기 핸들러
  onSave: (name: string, color: chrome.tabGroups.ColorEnum) => void  // 저장 핸들러
  category?: Category | null                               // 편집할 카테고리 (없으면 신규 생성)
  title?: string                                           // 모달 제목
}

/**
 * 카테고리 편집 모달 컴포넌트
 * 카테고리를 생성하거나 편집할 수 있는 팝업 모달
 *
 * @component
 * @param {CategoryEditModalProps} props - 컴포넌트 속성
 */
export const CategoryEditModal: React.FC<CategoryEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  category,
  title = "Edit Category"
}) => {
  // 카테고리 이름 상태
  const [name, setName] = useState("")
  // 카테고리 색상 상태
  const [color, setColor] = useState<chrome.tabGroups.ColorEnum>("blue")

  // 카테고리 데이터가 변경될 때 폼 필드 업데이트
  useEffect(() => {
    if (category) {
      // 기존 카테고리 편집 모드
      setName(category.name)
      setColor(category.color)
    } else {
      // 신규 카테고리 생성 모드
      setName("")
      setColor("blue")
    }
  }, [category])

  // ESC 키 이벤트 핸들러 설정
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      // 모달이 열렸을 때 ESC 키 리스너 추가
      document.addEventListener('keydown', handleEsc)
      // 클린업 함수로 리스너 제거
      return () => document.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, onClose])
  
  // 모달이 열려있지 않으면 렌더링하지 않음
  if (!isOpen) return null

  /**
   * 카테고리 저장 핸들러
   * 이름이 비어있지 않으면 저장하고 모달을 닫음
   */
  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim(), color)
      onClose()
    }
  }

  return (
    <>
      {/* 모달 배경 오버레이 */}
      <div
      className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[10000] p-4"
      onClick={(e) => {
        // 배경 클릭 시 모달 닫기
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      {/* 모달 컨텐츠 컨테이너 */}
      <div className="glass-main rounded-[20px] w-full max-w-md p-6">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold glass-text">{title}</h3>
          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white/80 transition-colors"
            title="Close"
            aria-label="모달 닫기"
          >
            ✕
          </button>
        </div>

        {/* 모달 바디 */}
        <div className="space-y-4">
          {/* 카테고리 이름 입력 필드 */}
          <div>
            <label className="block text-sm glass-text opacity-70 mb-2">
              Category Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter category name"
              className="w-full px-4 py-2 glass-card border-none outline-none text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500/50"
              autoFocus
              onKeyDown={(e) => {
                // Enter 키 입력 시 저장
                if (e.key === "Enter") {
                  handleSave()
                }
              }}
            />
          </div>

          {/* 색상 선택 필드 */}
          <div>
            <label className="block text-sm glass-text opacity-70 mb-2">
              Color
            </label>
            <ColorPicker
              value={color}
              onChange={setColor}
            />
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-3 justify-end mt-6">
            {/* 취소 버튼 */}
            <button
              onClick={onClose}
              className="px-4 py-2 glass-button text-sm hover:bg-white/10"
            >
              Cancel
            </button>
            {/* 저장/업데이트 버튼 */}
            <button
              onClick={handleSave}
              className="px-4 py-2 glass-button-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!name.trim()} // 이름이 비어있으면 비활성화
            >
              {category ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}