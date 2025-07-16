import React, { useState, useEffect } from "react"
import { useCategoryStore } from "../store/categoryStore"
import { InfoTooltip } from "./InfoTooltip"
import { CategoryEditModal } from "./CategoryEditModal"
import type { Category } from "../types/category"

interface CategoryManagerProps {
  onClose: () => void
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ onClose }) => {
  const { categories, loadCategories, addCategory, updateCategory, deleteCategory, reorderCategories } = useCategoryStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const handleEdit = (category: Category) => {
    // Don't allow editing system categories
    if (category.isSystem) {
      alert("미분류 카테고리는 수정할 수 없습니다.")
      return
    }
    setEditingCategory(category)
    setIsModalOpen(true)
  }

  const handleAdd = () => {
    setEditingCategory(null)
    setIsModalOpen(true)
  }

  const handleSave = async (name: string, color: chrome.tabGroups.ColorEnum) => {
    if (editingCategory) {
      // Update existing category
      await updateCategory(editingCategory.id, { name, color })
    } else {
      // Add new category
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

  const handleDragStart = (e: React.DragEvent, index: number) => {
    // Don't allow dragging system categories
    if (categories[index].isSystem) {
      e.preventDefault()
      return
    }
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) return

    // Don't allow dropping on system category position
    if (categories[dropIndex].isSystem) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const newCategories = [...categories]
    const [draggedItem] = newCategories.splice(draggedIndex, 1)
    newCategories.splice(dropIndex, 0, draggedItem)
    
    await reorderCategories(newCategories)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDelete = async (id: string) => {
    const category = categories.find(c => c.id === id)
    if (category?.isSystem) {
      alert("미분류 카테고리는 삭제할 수 없습니다.")
      return
    }
    if (confirm("이 카테고리를 삭제하시겠습니까?")) {
      try {
        await deleteCategory(id)
      } catch (error) {
        alert("기본 카테고리는 삭제할 수 없습니다.")
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
      <div className="glass-main rounded-[24px] w-[480px] h-[90vh] max-h-[90vh] flex flex-col">
        <div className="px-4 py-4 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold ai-gradient-text">
                Manage Categories
              </h2>
              <InfoTooltip 
                title="카테고리 관리"
                description="탭을 효율적으로 정리하기 위한 카테고리를 관리합니다."
                features={[
                  "카테고리 이름과 색상 편집",
                  "드래그 앤 드롭으로 순서 변경",
                  "카테고리 순서대로 탭 그룹 정렬",
                  "미분류는 항상 마지막에 위치"
                ]}
                position="bottom"
              />
            </div>
            <button
              onClick={onClose}
              className="glass-button-primary !p-2 !px-3"
            >
              ✕
            </button>
          </div>
        </div>

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
                <div className="flex items-center gap-2 flex-1">
                  {!category.isSystem ? (
                    <div className="cursor-move flex items-center gap-1">
                      <span className="text-xs glass-text opacity-50 font-mono">{index + 1}</span>
                      <svg className="w-4 h-4 glass-text opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                      </svg>
                    </div>
                  ) : (
                    <span className="text-xs glass-text opacity-50 font-mono ml-1">{index + 1}</span>
                  )}
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getColorHex(category.color) }}
                  />
                  <span className="flex-1 text-sm font-medium glass-text whitespace-nowrap">
                    {category.name}
                    {category.isSystem && (
                      <span className="ml-1 text-xs opacity-60">(시스템)</span>
                    )}
                  </span>
                </div>
                <div className="flex gap-1 ml-2">
                  {!category.isSystem && (
                    <button
                      onClick={() => handleEdit(category)}
                      className="text-xs glass-text hover:opacity-70 p-1"
                      title="Edit"
                    >
                      ✏️
                    </button>
                  )}
                  {!category.isDefault && !category.isSystem && (
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="text-xs text-red-500 hover:text-red-600 p-1"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button
              onClick={handleAdd}
              className="glass-card col-span-2 p-2.5 border-2 border-dashed border-white/30 text-sm glass-text hover:border-purple-500/50 hover:text-purple-600 transition-colors flex items-center justify-center min-h-[50px]"
            >
              + Add New Category
            </button>
          </div>
        </div>
        
        <div className="px-4 py-3 border-t border-white/20">
          <div className="text-xs glass-text opacity-60 space-y-1">
            <p>💡 Tip: 카테고리를 드래그하여 순서를 변경할 수 있습니다.</p>
            <p>📝 Edit: 연필 아이콘을 클릭하여 이름과 색상을 편집하세요.</p>
            <p>🔢 순서: 카테고리 순서대로 탭 그룹이 정렬됩니다.</p>
          </div>
        </div>
      </div>
      
      <CategoryEditModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingCategory(null)
        }}
        onSave={handleSave}
        category={editingCategory}
        title={editingCategory ? "Edit Category" : "Add New Category"}
      />
    </div>
  )
}

// Helper function to get color hex values
function getColorHex(color: chrome.tabGroups.ColorEnum): string {
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
  return colorMap[color] || colorMap.grey
}