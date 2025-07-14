import { create } from 'zustand'

export interface TabInfo {
  id: number
  title: string
  url: string
  favIconUrl?: string
  groupId?: number
  lastAccessed: number
  aiScore?: number
  category?: string
}

export interface TabGroup {
  id: string
  name: string
  color: string
  tabIds: number[]
  createdAt: number
  aiGenerated?: boolean
}

interface TabStore {
  tabs: TabInfo[]
  groups: TabGroup[]
  activeTabId: number | null
  isLoading: boolean
  
  setTabs: (tabs: TabInfo[]) => void
  addTab: (tab: TabInfo) => void
  removeTab: (tabId: number) => void
  updateTab: (tabId: number, updates: Partial<TabInfo>) => void
  
  setGroups: (groups: TabGroup[]) => void
  addGroup: (group: TabGroup) => void
  removeGroup: (groupId: string) => void
  updateGroup: (groupId: string, updates: Partial<TabGroup>) => void
  
  setActiveTab: (tabId: number | null) => void
  setLoading: (isLoading: boolean) => void
}

export const useTabStore = create<TabStore>((set) => ({
  tabs: [],
  groups: [],
  activeTabId: null,
  isLoading: false,
  
  setTabs: (tabs) => set({ tabs }),
  addTab: (tab) => set((state) => ({ tabs: [...state.tabs, tab] })),
  removeTab: (tabId) => set((state) => ({ 
    tabs: state.tabs.filter(tab => tab.id !== tabId) 
  })),
  updateTab: (tabId, updates) => set((state) => ({
    tabs: state.tabs.map(tab => 
      tab.id === tabId ? { ...tab, ...updates } : tab
    )
  })),
  
  setGroups: (groups) => set({ groups }),
  addGroup: (group) => set((state) => ({ groups: [...state.groups, group] })),
  removeGroup: (groupId) => set((state) => ({ 
    groups: state.groups.filter(group => group.id !== groupId) 
  })),
  updateGroup: (groupId, updates) => set((state) => ({
    groups: state.groups.map(group => 
      group.id === groupId ? { ...group, ...updates } : group
    )
  })),
  
  setActiveTab: (activeTabId) => set({ activeTabId }),
  setLoading: (isLoading) => set({ isLoading }),
}))