import React, { useState, useEffect } from "react"
import { useTranslation } from 'react-i18next'
import { useCategoryStore } from "../store/categoryStore"
import { FavIcon } from "./FavIcon"
import { InfoTooltip } from "./InfoTooltip"
import type { Category } from "../types/category"
import { organizeTabsUnified } from "../utils/unifiedOrganizer"

/**
 * 탭 목록 컴포넌트의 Props
 */
interface TabListProps {
  onClose: () => void  // 모달 닫기 핸들러
}

/**
 * 카테고리가 포함된 탭 타입
 */
interface TabWithCategory extends chrome.tabs.Tab {
  category?: string  // 탭이 속한 카테고리 ID
}

/**
 * 탭 목록 컴포넌트
 * 현재 창의 모든 탭을 카테고리별로 분류하여 표시
 * 탭을 선택하여 카테고리 변경 가능
 *
 * @component
 * @param {TabListProps} props - 컴포넌트 속성
 */
export const TabList: React.FC<TabListProps> = ({ onClose }) => {
  const { t } = useTranslation()
  const { categories, getCategoryForDomain, assignDomainToCategory, loadCategories } = useCategoryStore()

  // 컴포넌트 상태 관리
  const [tabs, setTabs] = useState<TabWithCategory[]>([])      // 탭 목록
  const [selectedTab, setSelectedTab] = useState<number | null>(null)  // 선택된 탭
  const [isUpdating, setIsUpdating] = useState(false)          // 업데이트 중 상태
  const [isOrganizing, setIsOrganizing] = useState(false)      // 정리 중 상태

  // 컴포넌트 마운트 시 카테고리와 탭 로드
  useEffect(() => {
    loadCategories()
    loadTabs()
  }, [loadCategories])

  /**
   * 현재 창의 모든 탭을 로드하고 카테고리 정보 추가
   */
  const loadTabs = async () => {
    const allTabs = await chrome.tabs.query({ currentWindow: true })
    const tabsWithCategories = allTabs.map(tab => {
      if (tab.url) {
        try {
          // 도메인 추출 및 카테고리 확인
          const domain = new URL(tab.url).hostname.replace(/^www\./, '')
          const category = getCategoryForDomain(domain)
          return { ...tab, category }
        } catch {
          return { ...tab, category: "uncategorized" }
        }
      }
      return { ...tab, category: "uncategorized" }
    })

    // 카테고리 순서대로 탭 정렬
    const categoryOrder = categories.map(c => c.id)
    const sortedTabs = tabsWithCategories.sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a.category || 'uncategorized')
      const bIndex = categoryOrder.indexOf(b.category || 'uncategorized')
      return aIndex - bIndex
    })

    setTabs(sortedTabs)
  }

  /**
   * 탭의 카테고리를 변경하는 핸들러
   * 동일한 도메인의 모든 탭에 적용됨
   */
  const handleCategoryChange = async (tabId: number, tabUrl: string, newCategoryId: string) => {
    if (!tabUrl) return

    setIsUpdating(true)
    try {
      // URL에서 도메인 추출
      const domain = new URL(tabUrl).hostname.replace(/^www\./, '')
      // 도메인을 새 카테고리에 할당
      await assignDomainToCategory(domain, newCategoryId)

      // 로컬 상태 업데이트 - 같은 도메인의 모든 탭
      setTabs(tabs.map(tab => {
        if (tab.url) {
          try {
            const tabDomain = new URL(tab.url).hostname.replace(/^www\./, '')
            if (tabDomain === domain) {
              return { ...tab, category: newCategoryId }
            }
          } catch {
            // 잘못된 URL은 무시
          }
        }
        return tab
      }))

      // AI 학습은 추후 버전에서 구현 예정
      // TODO: AI 학습 기능 구현

      // 자동 정리는 하지 않음 - 사용자가 "그룹화 적용" 버튼 클릭 시에만
      // 성공 피드백 표시
      setSelectedTab(tabId)
      setTimeout(() => setSelectedTab(null), 1500)

      // 업데이트된 카테고리를 표시하기 위해 탭 다시 로드
      await loadTabs()
    } catch (error) {
      console.error("카테고리 업데이트 실패:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  /**
   * 카테고리별로 탭을 그룹화하는 함수
   * Chrome Tab Groups API를 사용하여 탭을 정리
   */
  const organizeTabsByCategory = async () => {
    if (isOrganizing) return

    try {
      console.log('[TabQuest] 통합 정리 기능 사용 중...')
      setIsOrganizing(true)

      // 통합 정리 함수 사용
      const result = await organizeTabsUnified(categories)

      console.log('[TabQuest] 탭 정리 완료:', result)

      // 정리 후 탭 목록 새로고침
      setTimeout(() => {
        loadTabs()
      }, 500)
    } catch (error) {
      console.error('[TabQuest] 탭 정리 실패:', error)
    } finally {
      setIsOrganizing(false)
    }
  }

  /**
   * 카테고리 ID로 색상 코드를 가져오는 함수
   * @param {string} categoryId - 카테고리 ID
   * @returns {string} HEX 색상 코드
   */
  const getCategoryColor = (categoryId: string): string => {
    const category = categories.find(c => c.id === categoryId)
    return category ? getColorHex(category.color) : "#6B7280"
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
      {/* 모달 배경 오버레이 */}
      {/* 모달 메인 컨테이너 */}
      <div className="glass-main rounded-[24px] w-full max-w-2xl h-[90vh] max-h-[90vh] flex flex-col">
        {/* 헤더 영역 */}
        <div className="px-4 py-4 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold ai-gradient-text">
                {t('modal.tabAssignment.assignTabsToCategories')}
              </h2>
              {/* 정보 툴팁 */}
              <InfoTooltip
                title={t('modal.tabAssignment.title')}
                description={t('modal.tabAssignment.description')}
                features={t('modal.tabAssignment.features', { returnObjects: true }) as string[]}
                position="bottom"
              />
            </div>
            <div className="flex items-center gap-2">
              {/* 그룹화 적용 버튼 */}
              <button
                onClick={organizeTabsByCategory}
                className="glass-button-primary py-2 px-3 text-sm"
                disabled={isOrganizing || isUpdating}
                title={t('modal.tabAssignment.applyButtonTooltip')}
              >
                {isOrganizing ? `⏳ ${t('modal.tabAssignment.applying')}` : `🎯 ${t('modal.tabAssignment.applyGrouping')}`}
              </button>
              {/* 닫기 버튼 */}
              <button
                onClick={onClose}
                className="glass-button-primary p-2 px-3"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* 탭 목록 영역 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={`glass-card py-2 px-3 transition-all ${
                  selectedTab === tab.id ? 'ring-2 ring-green-500' : ''  // 선택된 탭 하이라이트
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* 파비콘 */}
                  <FavIcon url={tab.favIconUrl || tab.url} size={18} className="flex-shrink-0" />

                  {/* 탭 제목 (한 줄) */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm glass-text truncate" title={`${tab.title} - ${tab.url}`}>
                      {tab.title || t('modal.tabAssignment.untitled')}
                      <span className="opacity-50 ml-2 text-xs">
                        {tab.url ? `• ${new URL(tab.url).hostname}` : ''}
                      </span>
                    </p>
                  </div>

                  {/* 카테고리 선택자 */}
                  <div className="flex items-center gap-2">
                    {/* 카테고리 색상 표시 */}
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getCategoryColor(tab.category || "other") }}
                    />
                    {/* 카테고리 드롭다운 */}
                    <select
                      value={tab.category || "other"}
                      onChange={(e) => handleCategoryChange(tab.id!, tab.url!, e.target.value)}
                      disabled={isUpdating || !tab.url}
                      className="px-2 py-1 text-xs glass-card border-none outline-none focus:ring-2 focus:ring-purple-500/50 min-w-[100px] glass-text"
                    >
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>

                    {/* 성공 표시 */}
                    {selectedTab === tab.id && (
                      <span className="text-green-500 text-sm">✓</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 하단 도움말 영역 */}
        <div className="px-4 py-4 border-t border-white/20">
          <p className="text-xs glass-text opacity-80">
            💡 Tip: {t('modal.tabAssignment.tip')}
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Chrome 탭 그룹 색상을 HEX 색상 코드로 변환하는 헬퍼 함수
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