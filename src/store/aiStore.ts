import { create } from 'zustand'

export interface AIInsight {
  id: string
  type: 'suggestion' | 'pattern' | 'alert' | 'tip'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  timestamp: number
  actionable?: {
    label: string
    action: () => void
  }
}

export interface BrowsingPattern {
  id: string
  name: string
  description: string
  frequency: number
  lastOccurred: number
  suggestedAction?: string
}

interface AIStore {
  insights: AIInsight[]
  patterns: BrowsingPattern[]
  productivityScore: number
  isAnalyzing: boolean
  lastAnalysis: number | null
  
  addInsight: (insight: AIInsight) => void
  removeInsight: (insightId: string) => void
  clearInsights: () => void
  
  setPatterns: (patterns: BrowsingPattern[]) => void
  updatePattern: (patternId: string, updates: Partial<BrowsingPattern>) => void
  
  setProductivityScore: (score: number) => void
  setAnalyzing: (isAnalyzing: boolean) => void
  setLastAnalysis: (timestamp: number) => void
}

export const useAIStore = create<AIStore>((set) => ({
  insights: [],
  patterns: [],
  productivityScore: 0,
  isAnalyzing: false,
  lastAnalysis: null,
  
  addInsight: (insight) => set((state) => ({ 
    insights: [insight, ...state.insights].slice(0, 10) // Keep only latest 10
  })),
  removeInsight: (insightId) => set((state) => ({ 
    insights: state.insights.filter(i => i.id !== insightId) 
  })),
  clearInsights: () => set({ insights: [] }),
  
  setPatterns: (patterns) => set({ patterns }),
  updatePattern: (patternId, updates) => set((state) => ({
    patterns: state.patterns.map(pattern => 
      pattern.id === patternId ? { ...pattern, ...updates } : pattern
    )
  })),
  
  setProductivityScore: (productivityScore) => set({ productivityScore }),
  setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setLastAnalysis: (lastAnalysis) => set({ lastAnalysis }),
}))