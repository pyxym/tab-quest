import React, { useState, useEffect } from "react"
import { useTranslation } from 'react-i18next'
import { useCategoryStore } from "../store/categoryStore"
import { InfoTooltip } from "./InfoTooltip"
import { CategoryEditModal } from "./CategoryEditModal"
import type { Category } from "../types/category"

/**
 * 카테고리 관리자 컴포넌트의 Props
 */
interface CategoryManagerProps {
  onClose: () => void  // 모달 닫기 핸들러
}

/**
 * 카테고리 관리자 컴포넌트
 * 사용자가 탭 카테고리를 추가, 편집, 삭제, 재정렬할 수 있는 UI
 * 드래그 앤 드롭으로 카테고리 순서 변경 가능
 *
 * @component
 * @param {CategoryManagerProps} props - 컴포넌트 속성
 */
export const CategoryManager: React.FC<CategoryManagerProps> = ({ onClose }) => {
  const { t } = useTranslation()
  const { categories, loadCategories, addCategory, updateCategory, deleteCategory, reorderCategories } = useCategoryStore()

  // 모달 및 편집 상태 관리
  const [isModalOpen, setIsModalOpen] = useState(false)            // 편집 모달 열림 상태
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)  // 편집 중인 카테고리

  // 드래그 앤 드롭 상태 관리
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)    // 드래그 중인 항목 인덱스
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)  // 드롭 대상 인덱스

  // 컴포넌트 마운트 시 카테고리 로드
  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  /**
   * 카테고리 편집 핸들러
   * 시스템 카테고리는 편집 불가
   */
  const handleEdit = (category: Category) => {
    // 시스템 카테고리 편집 방지
    if (category.isSystem) {
      alert(t('tooltips.categoryManager.cannotEditSystem'))
      return
    }
    setEditingCategory(category)
    setIsModalOpen(true)
  }

  /**
   * 새 카테고리 추가 핸들러
   */
  const handleAdd = () => {
    setEditingCategory(null)
    setIsModalOpen(true)
  }

  /**
   * 카테고리 저장 핸들러
   * 기존 카테고리 수정 또는 새 카테고리 추가
   */
  const handleSave = async (name: string, color: chrome.tabGroups.ColorEnum) => {
    if (editingCategory) {
      // 기존 카테고리 업데이트
      await updateCategory(editingCategory.id, { name, color })
    } else {
      // 새 카테고리 추가
      await addCategory({
        name,
        color,
        domains: [],
        keywords: [],
        isDefault: false
      })
    }
    setIsModalOpen(false)
    setEditingCategory(null)
  }

  /**
   * 드래그 시작 핸들러
   * 시스템 카테고리는 드래그 불가
   */
  const handleDragStart = (e: React.DragEvent, index: number) => {
    // 시스템 카테고리 드래그 방지
    if (categories[index].isSystem) {
      e.preventDefault()
      return
    }
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  /**
   * 드래그 오버 핸들러
   * 드롭 가능 영역 표시
   */
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  /**
   * 드래그 종료 핸들러
   * 드래그 상태 초기화
   */
  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  /**
   * 드롭 핸들러
   * 카테고리 순서 재정렬 실행
   */
  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) return

    // 시스템 카테고리 위치에 드롭 방지
    if (categories[dropIndex].isSystem) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    // 카테고리 배열 재정렬
    const newCategories = [...categories]
    const [draggedItem] = newCategories.splice(draggedIndex, 1)
    newCategories.splice(dropIndex, 0, draggedItem)

    // 새로운 순서로 저장
    await reorderCategories(newCategories)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  /**
   * 카테고리 삭제 핸들러
   * 시스템 카테고리와 기본 카테고리는 삭제 불가
   */
  const handleDelete = async (id: string) => {
    const category = categories.find(c => c.id === id)
    if (category?.isSystem) {
      alert(t('tooltips.categoryManager.cannotDeleteSystem'))
      return
    }
    if (confirm(t('modal.categoryManager.deleteConfirm'))) {
      try {
        await deleteCategory(id)
      } catch (error) {
        alert(t('tooltips.categoryManager.defaultCannotDelete'))
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
      {/* 모달 배경 오버레이 */}
      {/* 모달 메인 컨테이너 */}
      <div className="glass-main rounded-[24px] w-[480px] h-[90vh] max-h-[90vh] flex flex-col">
        {/* 헤더 영역 */}
        <div className="px-4 py-4 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold ai-gradient-text">
                {t('modal.categoryManager.title')}
              </h2>
              {/* 정보 툴팁 */}
              <InfoTooltip
                title={t('tooltips.categoryManager.title')}
                description={t('tooltips.categoryManager.description')}
                features={t('tooltips.categoryManager.features', { returnObjects: true }) as string[]}
                position="bottom"
              />
            </div>
            {/* 닫기 버튼 */}
            <button
              onClick={onClose}
              className="glass-button-primary !p-2 !px-3"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 카테고리 목록 영역 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-3">
            {categories.map((category, index) => (
              <div
                key={category.id}
                className={`glass-card flex items-center p-2.5 min-h-[50px] transition-all ${
                  category.isSystem ? 'opacity-60 cursor-not-allowed' : 'cursor-move'
                } ${
                  dragOverIndex === index && !category.isSystem ? 'scale-105 border-2 border-purple-500' : ''
                } ${draggedIndex === index ? 'opacity-50' : ''}`}
                draggable={!category.isSystem}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, index)}
              >
                <div className="flex items-center gap-2 flex-1 overflow-hidden">
                  {/* 드래그 핸들 또는 인덱스 번호 */}
                  {!category.isSystem ? (
                    <div className="cursor-move flex items-center gap-1 flex-shrink-0">
                      <span className="text-xs glass-text opacity-50 font-mono">{index + 1}</span>
                      <svg className="w-4 h-4 glass-text opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                      </svg>
                    </div>
                  ) : (
                    <span className="text-xs glass-text opacity-50 font-mono ml-1 flex-shrink-0">{index + 1}</span>
                  )}
                  {/* 카테고리 색상 표시 */}
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getColorHex(category.color) }}
                  />
                  {/* 카테고리 이름 */}
                  <div className="flex-1 overflow-hidden">
                    <span className="text-sm font-medium glass-text block truncate" title={category.name}>
                      {category.name}
                      {category.isSystem && (
                        <span className="ml-1 text-xs opacity-60">{t('tooltips.categoryManager.system')}</span>
                      )}
                    </span>
                  </div>
                </div>
                {/* 액션 버튼들 (편집, 삭제) */}
                <div className="flex gap-1 ml-2 flex-shrink-0">
                  {!category.isSystem && (
                    <button
                      onClick={() => handleEdit(category)}
                      className="text-xs glass-text hover:opacity-70 p-1"
                      title={t('actions.edit')}
                    >
                      ✏️
                    </button>
                  )}
                  {!category.isDefault && !category.isSystem && (
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="text-xs text-red-500 hover:text-red-600 p-1"
                      title={t('actions.delete')}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* 새 카테고리 추가 버튼 */}
            <button
              onClick={handleAdd}
              className="glass-card col-span-2 p-2.5 border-2 border-dashed border-white/30 text-sm glass-text hover:border-purple-500/50 hover:text-purple-600 transition-colors flex items-center justify-center min-h-[50px]"
            >
              {t('modal.categoryManager.addNewCategory')}
            </button>
          </div>
        </div>
        {/* 하단 도움말 영역 */}
        <div className="px-4 py-3 border-t border-white/20">
          <div className="text-xs glass-text opacity-60 space-y-1">
            <p>💡 Tip: {t('tooltips.categoryManager.tips.dragTip')}</p>
            <p>📝 Edit: {t('tooltips.categoryManager.tips.editTip')}</p>
            <p>🔢 {t('actions.ordering')}: {t('tooltips.categoryManager.tips.orderTip')}</p>
          </div>
        </div>
      </div>

      {/* 카테고리 편집 모달 */}
      <CategoryEditModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingCategory(null)
        }}
        onSave={handleSave}
        category={editingCategory}
        title={editingCategory ? t('modal.categoryManager.editCategory') : t('modal.categoryManager.addCategory')}
      />
    </div>
  )
}

/**
 * Chrome 탭 그룹 색상을 HEX 색상 코드로 변환
 * @param {chrome.tabGroups.ColorEnum} color - Chrome 탭 그룹 색상
 * @returns {string} HEX 색상 코드
 */
function getColorHex(color: chrome.tabGroups.ColorEnum): string {
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
  return colorMap[color] || colorMap.grey
}