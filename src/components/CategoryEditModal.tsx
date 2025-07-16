import React, { useState, useEffect } from "react"
import { ColorPicker } from "./ColorPicker"
import type { Category } from "../types/category"

interface CategoryEditModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, color: chrome.tabGroups.ColorEnum) => void
  category?: Category | null
  title?: string
}

export const CategoryEditModal: React.FC<CategoryEditModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  category,
  title = "Edit Category"
}) => {
  const [name, setName] = useState("")
  const [color, setColor] = useState<chrome.tabGroups.ColorEnum>("blue")
  
  useEffect(() => {
    if (category) {
      setName(category.name)
      setColor(category.color)
    } else {
      setName("")
      setColor("blue")
    }
  }, [category])
  
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      return () => document.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, onClose])
  
  if (!isOpen) return null
  
  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim(), color)
      onClose()
    }
  }
  
  return (
    <div 
      className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[10000] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="glass-main rounded-[20px] w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold glass-text">{title}</h3>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white/80 transition-colors"
            title="Close"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-4">
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
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>
          
          <div>
            <label className="block text-sm glass-text opacity-70 mb-2">
              Color
            </label>
            <ColorPicker 
              value={color}
              onChange={setColor}
            />
          </div>
          
          <div className="flex gap-3 justify-end mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 glass-button text-sm hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 glass-button-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!name.trim()}
            >
              {category ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}