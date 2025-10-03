import { create } from 'zustand';
import { ErrorBoundary, DataValidator } from '../utils/errorBoundary';

export interface TabInfo {
  id: number;
  title: string;
  url: string;
  favIconUrl?: string;
  groupId?: number;
  lastAccessed: number;
  aiScore?: number;
  category?: string;
}

export interface TabGroup {
  id: string;
  name: string;
  color: string;
  tabIds: number[];
  createdAt: number;
  aiGenerated?: boolean;
}

interface TabStore {
  tabs: TabInfo[];
  groups: TabGroup[];
  activeTabId: number | null;
  isLoading: boolean;

  setTabs: (tabs: TabInfo[]) => void;
  addTab: (tab: TabInfo) => void;
  removeTab: (tabId: number) => void;
  updateTab: (tabId: number, updates: Partial<TabInfo>) => void;

  setGroups: (groups: TabGroup[]) => void;
  addGroup: (group: TabGroup) => void;
  removeGroup: (groupId: string) => void;
  updateGroup: (groupId: string, updates: Partial<TabGroup>) => void;

  setActiveTab: (tabId: number | null) => void;
  setLoading: (isLoading: boolean) => void;
}

export const useTabStore = create<TabStore>((set, get) => ({
  tabs: [],
  groups: [],
  activeTabId: null,
  isLoading: false,

  setTabs: (tabs) =>
    ErrorBoundary.wrapSync(
      () => {
        // Validate all tabs
        const validTabs = tabs.filter((tab) => {
          if (!DataValidator.validateTab(tab)) {
            console.warn('Invalid tab data:', tab);
            return false;
          }
          return true;
        });
        set({ tabs: validTabs });
      },
      undefined,
      'tabStore.setTabs',
    ),

  addTab: (tab) =>
    ErrorBoundary.wrapSync(
      () => {
        if (!DataValidator.validateTab(tab)) {
          console.error('Invalid tab data:', tab);
          return;
        }
        // Prevent duplicate tabs
        const state = get();
        if (state.tabs.some((t) => t.id === tab.id)) {
          console.warn('Tab already exists:', tab.id);
          return;
        }
        set((state) => ({ tabs: [...state.tabs, tab] }));
      },
      undefined,
      'tabStore.addTab',
    ),

  removeTab: (tabId) =>
    ErrorBoundary.wrapSync(
      () => {
        if (typeof tabId !== 'number') {
          console.error('Invalid tabId:', tabId);
          return;
        }
        set((state) => ({
          tabs: state.tabs.filter((tab) => tab.id !== tabId),
        }));
      },
      undefined,
      'tabStore.removeTab',
    ),

  updateTab: (tabId, updates) =>
    ErrorBoundary.wrapSync(
      () => {
        if (typeof tabId !== 'number') {
          console.error('Invalid tabId:', tabId);
          return;
        }
        // Sanitize URL if provided
        if (updates.url) {
          updates.url = DataValidator.sanitizeUrl(updates.url);
        }
        // Sanitize title if provided
        if (updates.title) {
          updates.title = DataValidator.sanitizeString(updates.title, 500);
        }
        set((state) => ({
          tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, ...updates } : tab)),
        }));
      },
      undefined,
      'tabStore.updateTab',
    ),

  setGroups: (groups) =>
    ErrorBoundary.wrapSync(
      () => {
        // Validate groups
        const validGroups = groups.filter((group) => {
          if (!group.id || !group.name || !Array.isArray(group.tabIds)) {
            console.warn('Invalid group data:', group);
            return false;
          }
          return true;
        });
        set({ groups: validGroups });
      },
      undefined,
      'tabStore.setGroups',
    ),

  addGroup: (group) =>
    ErrorBoundary.wrapSync(
      () => {
        if (!group.id || !group.name || !Array.isArray(group.tabIds)) {
          console.error('Invalid group data:', group);
          return;
        }
        // Prevent duplicate groups
        const state = get();
        if (state.groups.some((g) => g.id === group.id)) {
          console.warn('Group already exists:', group.id);
          return;
        }
        set((state) => ({ groups: [...state.groups, group] }));
      },
      undefined,
      'tabStore.addGroup',
    ),

  removeGroup: (groupId) =>
    ErrorBoundary.wrapSync(
      () => {
        if (typeof groupId !== 'string') {
          console.error('Invalid groupId:', groupId);
          return;
        }
        set((state) => ({
          groups: state.groups.filter((group) => group.id !== groupId),
        }));
      },
      undefined,
      'tabStore.removeGroup',
    ),

  updateGroup: (groupId, updates) =>
    ErrorBoundary.wrapSync(
      () => {
        if (typeof groupId !== 'string') {
          console.error('Invalid groupId:', groupId);
          return;
        }
        // Sanitize name if provided
        if (updates.name) {
          updates.name = DataValidator.sanitizeString(updates.name, 100);
        }
        set((state) => ({
          groups: state.groups.map((group) => (group.id === groupId ? { ...group, ...updates } : group)),
        }));
      },
      undefined,
      'tabStore.updateGroup',
    ),

  setActiveTab: (activeTabId) =>
    ErrorBoundary.wrapSync(
      () => {
        if (activeTabId !== null && typeof activeTabId !== 'number') {
          console.error('Invalid activeTabId:', activeTabId);
          return;
        }
        set({ activeTabId });
      },
      undefined,
      'tabStore.setActiveTab',
    ),

  setLoading: (isLoading) => set({ isLoading }),
}));
