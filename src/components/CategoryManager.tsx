import React, { useState, useEffect } from "react"
import { useTranslation } from 'react-i18next'
import { useCategoryStore } from "../store/categoryStore"
import { InfoTooltip } from "./InfoTooltip"
import { CategoryEditModal } from "./CategoryEditModal"
import type { Category } from "../types/category"

interface CategoryManagerProps {
  onClose: () => void
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ onClose }) => {
  const { t } = useTranslation()
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
      alert(t('tooltips.categoryManager.cannotEditSystem'))
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
      <div className="glass-main rounded-[24px] w-[480px] h-[90vh] max-h-[90vh] flex flex-col">
        <div className="px-4 py-4 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold ai-gradient-text">
                {t('modal.categoryManager.title')}
              </h2>
              <InfoTooltip
                title={t('tooltips.categoryManager.title')}
                description={t('tooltips.categoryManager.description')}
                features={t('tooltips.categoryManager.features', { returnObjects: true }) as string[]}
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
                <div className="flex items-center gap-2 flex-1 overflow-hidden">
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
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getColorHex(category.color) }}
                  />
                  <div className="flex-1 overflow-hidden">
                    <span className="text-sm font-medium glass-text block truncate" title={category.name}>
                      {category.name}
                      {category.isSystem && (
                        <span className="ml-1 text-xs opacity-60">{t('tooltips.categoryManager.system')}</span>
                      )}
                    </span>
                  </div>
                </div>
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

            <button
              onClick={handleAdd}
              className="glass-card col-span-2 p-2.5 border-2 border-dashed border-white/30 text-sm glass-text hover:border-purple-500/50 hover:text-purple-600 transition-colors flex items-center justify-center min-h-[50px]"
            >
              {t('modal.categoryManager.addNewCategory')}
            </button>
          </div>
        </div>
        
        <div className="px-4 py-3 border-t border-white/20">
          <div className="text-xs glass-text opacity-60 space-y-1">
            <p>💡 Tip: {t('tooltips.categoryManager.tips.dragTip')}</p>
            <p>📝 Edit: {t('tooltips.categoryManager.tips.editTip')}</p>
            <p>🔢 {t('actions.ordering')}: {t('tooltips.categoryManager.tips.orderTip')}</p>
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
        title={editingCategory ? t('modal.categoryManager.editCategory') : t('modal.categoryManager.addCategory')}
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