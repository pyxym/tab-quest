// Simplified tab organization logic with better error handling

import type { Category } from '../types/category'

interface OrganizedGroups {
  categoryGroups: Map<string, number[]>
  projectGroups: Map<string, number[]>
  smartGroups: Array<{ name: string; tabIds: number[] }>
}

// Project patterns for code repositories
const PROJECT_PATTERNS = [
  { pattern: /github\.com\/([^\/]+)\/([^\/]+)/, name: (m: RegExpMatchArray) => `GH: ${m[2]}` },
  { pattern: /gitlab\.com\/([^\/]+)\/([^\/]+)/, name: (m: RegExpMatchArray) => `GL: ${m[2]}` },
  { pattern: /bitbucket\.org\/([^\/]+)\/([^\/]+)/, name: (m: RegExpMatchArray) => `BB: ${m[2]}` },
  { pattern: /stackoverflow\.com\/questions\/(\d+)/, name: () => 'Stack Overflow' },
  { pattern: /codepen\.io\/([^\/]+)\/pen/, name: () => 'CodePen' },
  { pattern: /codesandbox\.io\/s\//, name: () => 'CodeSandbox' },
  { pattern: /jsfiddle\.net\/([\w]+)/, name: () => 'JSFiddle' }
]

// Common domain patterns for quick categorization
const DOMAIN_PATTERNS: Record<string, string[]> = {
  'work': ['slack', 'teams', 'zoom', 'meet', 'jira', 'confluence', 'notion', 'asana', 'trello'],
  'social': ['facebook', 'twitter', 'instagram', 'linkedin', 'reddit', 'discord', 'whatsapp'],
  'entertainment': ['youtube', 'netflix', 'twitch', 'spotify', 'hulu', 'disney', 'vimeo'],
  'shopping': ['amazon', 'ebay', 'etsy', 'shopify', 'alibaba', 'walmart', 'target'],
  'news': ['cnn', 'bbc', 'reuters', 'nytimes', 'wsj', 'guardian', 'bloomberg'],
  'development': ['github', 'gitlab', 'stackoverflow', 'npm', 'pypi', 'docker', 'dev.to'],
  'education': ['coursera', 'udemy', 'edx', 'khanacademy', 'udacity', 'pluralsight']
}

export async function organizeTabs(
  tabs: chrome.tabs.Tab[],
  categories: Category[],
  userMappings: Record<string, string>
): Promise<OrganizedGroups> {
  const result: OrganizedGroups = {
    categoryGroups: new Map(),
    projectGroups: new Map(),
    smartGroups: []
  }
  
  const processedTabs = new Set<number>()
  
  // Step 1: Process special tabs (projects, etc.)
  for (const tab of tabs) {
    if (!tab.id || !tab.url) continue
    
    // Skip internal pages
    if (tab.url.startsWith('chrome://') || 
        tab.url.startsWith('chrome-extension://') ||
        tab.url.startsWith('edge://')) {
      processedTabs.add(tab.id)
      continue
    }
    
    // Check for project patterns
    for (const projectPattern of PROJECT_PATTERNS) {
      const match = tab.url.match(projectPattern.pattern)
      if (match) {
        const projectName = projectPattern.name(match)
        if (!result.projectGroups.has(projectName)) {
          result.projectGroups.set(projectName, [])
        }
        result.projectGroups.get(projectName)!.push(tab.id)
        processedTabs.add(tab.id)
        break
      }
    }
  }
  
  // Step 2: Process remaining tabs by category
  for (const tab of tabs) {
    if (!tab.id || !tab.url || processedTabs.has(tab.id)) continue
    
    try {
      const url = new URL(tab.url)
      const domain = url.hostname.toLowerCase().replace(/^www\./, '')
      
      // Check user mappings first
      let category = userMappings[domain]
      
      // If no user mapping, check category domains
      if (!category) {
        for (const cat of categories) {
          if (cat.domains?.some(d => domain.includes(d.toLowerCase()))) {
            category = cat.id
            break
          }
        }
      }
      
      // If still no category, check common patterns
      if (!category) {
        for (const [catId, patterns] of Object.entries(DOMAIN_PATTERNS)) {
          if (patterns.some(p => domain.includes(p))) {
            category = catId
            break
          }
        }
      }
      
      // Default to 'other'
      if (!category) {
        category = 'other'
      }
      
      // Add to category group
      if (!result.categoryGroups.has(category)) {
        result.categoryGroups.set(category, [])
      }
      result.categoryGroups.get(category)!.push(tab.id)
      processedTabs.add(tab.id)
      
    } catch (error) {
      console.error('Error processing tab:', error)
      // Add to 'other' category on error
      if (!result.categoryGroups.has('other')) {
        result.categoryGroups.set('other', [])
      }
      result.categoryGroups.get('other')!.push(tab.id)
      processedTabs.add(tab.id)
    }
  }
  
  // Step 3: Detect smart groups (shopping, research, etc.)
  result.smartGroups = detectContextualGroups(tabs.filter(t => !processedTabs.has(t.id!)))
  
  return result
}

function detectContextualGroups(tabs: chrome.tabs.Tab[]): Array<{ name: string; tabIds: number[] }> {
  const groups: Array<{ name: string; tabIds: number[] }> = []
  
  // Shopping context
  const shoppingTabs = tabs.filter(tab => 
    tab.url && /\b(cart|checkout|product|item|buy)\b/i.test(tab.url + ' ' + (tab.title || ''))
  )
  if (shoppingTabs.length >= 2) {
    groups.push({
      name: '🛒 Shopping',
      tabIds: shoppingTabs.map(t => t.id!).filter(id => id !== undefined)
    })
  }
  
  // Research context
  const researchTabs = tabs.filter(tab =>
    tab.url && (
      tab.url.includes('wikipedia.org') ||
      tab.url.includes('scholar.google') ||
      tab.url.includes('arxiv.org') ||
      /\b(research|paper|study|journal)\b/i.test(tab.title || '')
    )
  )
  if (researchTabs.length >= 2) {
    groups.push({
      name: '📚 Research',
      tabIds: researchTabs.map(t => t.id!).filter(id => id !== undefined)
    })
  }
  
  return groups
}