import React, { useState, useEffect } from "react"
import { useCategoryStore } from "../store/categoryStore"
import type { Category } from "../types/category"

interface CategoryManagerProps {
  onClose: () => void
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ onClose }) => {
  const { categories, loadCategories, addCategory, updateCategory, deleteCategory } = useCategoryStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryColor, setNewCategoryColor] = useState<chrome.tabGroups.ColorEnum>("blue")

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const colors: chrome.tabGroups.ColorEnum[] = [
    "blue", "cyan", "green", "yellow", "orange", "red", "pink", "purple", "grey"
  ]

  const handleEdit = (category: Category) => {
    setEditingId(category.id)
    setEditingName(category.name)
  }

  const handleSaveEdit = async () => {
    if (editingId && editingName.trim()) {
      await updateCategory(editingId, { name: editingName.trim() })
      setEditingId(null)
      setEditingName("")
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id)
    } catch (error) {
      console.error("Cannot delete default category")
    }
  }

  const handleAddCategory = async () => {
    if (newCategoryName.trim()) {
      await addCategory({
        name: newCategoryName.trim(),
        color: newCategoryColor,
        domains: [],
        keywords: [],
        isDefault: false
      })
      setNewCategoryName("")
      setIsAdding(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-96 max-h-[500px] flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Manage Categories
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div
                  className={`w-4 h-4 rounded-full bg-${category.color}-500`}
                  style={{ backgroundColor: getColorHex(category.color) }}
                />
                {editingId === category.id ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={handleSaveEdit}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                    className="flex-1 px-2 py-1 text-sm bg-white dark:bg-gray-600 rounded border border-gray-300 dark:border-gray-500"
                    autoFocus
                  />
                ) : (
                  <span className="flex-1 text-sm">{category.name}</span>
                )}
                <div className="flex gap-2">
                  {!category.isDefault && (
                    <>
                      <button
                        onClick={() => handleEdit(category)}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {isAdding ? (
              <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <select
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value as chrome.tabGroups.ColorEnum)}
                  className="px-2 py-1 text-sm bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-500"
                >
                  {colors.map(color => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Category name"
                  className="flex-1 px-2 py-1 text-sm bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-500"
                  autoFocus
                />
                <button
                  onClick={handleAddCategory}
                  className="text-xs text-green-600 hover:text-green-700"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsAdding(false)
                    setNewCategoryName("")
                  }}
                  className="text-xs text-gray-600 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAdding(true)}
                className="w-full p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:border-purple-500 hover:text-purple-600 transition-colors"
              >
                + Add New Category
              </button>
            )}
          </div>
        </div>
      </div>
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