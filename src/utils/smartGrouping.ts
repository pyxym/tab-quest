// Smart grouping algorithms for tabs

interface TabContext {
  id: number
  url: string
  title: string
  domain: string
}

interface SmartGroup {
  name: string
  icon: string
  tabIds: number[]
  confidence: number
}

// Detect related tabs based on content and context
export function detectSmartGroups(tabs: chrome.tabs.Tab[]): SmartGroup[] {
  const smartGroups: SmartGroup[] = []
  const processedTabs = new Set<number>()
  
  // 1. Search Context Detection
  const searchGroups = detectSearchContext(tabs, processedTabs)
  smartGroups.push(...searchGroups)
  
  // 2. Documentation Context
  const docGroups = detectDocumentationContext(tabs, processedTabs)
  smartGroups.push(...docGroups)
  
  // 3. Shopping Context
  const shoppingGroups = detectShoppingContext(tabs, processedTabs)
  smartGroups.push(...shoppingGroups)
  
  // 4. Research Context
  const researchGroups = detectResearchContext(tabs, processedTabs)
  smartGroups.push(...researchGroups)
  
  return smartGroups.filter(group => group.tabIds.length > 1)
}

// Detect search-related tabs (Google + Stack Overflow + GitHub issues)
function detectSearchContext(tabs: chrome.tabs.Tab[], processed: Set<number>): SmartGroup[] {
  const groups: SmartGroup[] = []
  const searchPatterns = [
    { domain: 'google.com', type: 'search' },
    { domain: 'stackoverflow.com', type: 'solution' },
    { domain: 'github.com/.*/(issues|discussions)', type: 'discussion' },
    { domain: 'reddit.com', type: 'discussion' },
  ]
  
  // Find all search tabs
  const searchTabs = tabs.filter(tab => {
    if (!tab.url || !tab.id || processed.has(tab.id)) return false
    return tab.url.includes('google.com/search') || tab.url.includes('stackoverflow.com/questions')
  })
  
  // Group by search query similarity
  searchTabs.forEach(searchTab => {
    if (!searchTab.id || !searchTab.url) return
    
    const relatedTabs = [searchTab.id]
    processed.add(searchTab.id)
    
    // Find related solution/discussion tabs
    tabs.forEach(tab => {
      if (!tab.id || !tab.url || processed.has(tab.id)) return
      
      // Check if this tab might be related to the search
      if (tab.title && searchTab.title) {
        const searchKeywords = extractKeywords(searchTab.title)
        const tabKeywords = extractKeywords(tab.title)
        const overlap = calculateKeywordOverlap(searchKeywords, tabKeywords)
        
        if (overlap > 0.3) {
          relatedTabs.push(tab.id)
          processed.add(tab.id)
        }
      }
    })
    
    if (relatedTabs.length > 1) {
      groups.push({
        name: '🔍 Search: ' + extractMainKeyword(searchTab.title || ''),
        icon: '🔍',
        tabIds: relatedTabs,
        confidence: 0.8
      })
    }
  })
  
  return groups
}

// Detect documentation reading context
function detectDocumentationContext(tabs: chrome.tabs.Tab[], processed: Set<number>): SmartGroup[] {
  const groups: SmartGroup[] = []
  const docDomains = [
    'docs.',
    'developer.',
    'api.',
    'wiki.',
    'readthedocs.',
    '/docs/',
    '/documentation/',
    'npmjs.com',
    'pypi.org'
  ]
  
  const docTabs = tabs.filter(tab => {
    if (!tab.url || !tab.id || processed.has(tab.id)) return false
    return docDomains.some(pattern => tab.url.includes(pattern))
  })
  
  // Group by technology/framework
  const techGroups = new Map<string, number[]>()
  
  docTabs.forEach(tab => {
    if (!tab.id || !tab.title) return
    
    const tech = extractTechnology(tab.title, tab.url!)
    if (tech) {
      if (!techGroups.has(tech)) {
        techGroups.set(tech, [])
      }
      techGroups.get(tech)!.push(tab.id)
      processed.add(tab.id)
    }
  })
  
  techGroups.forEach((tabIds, tech) => {
    if (tabIds.length > 1) {
      groups.push({
        name: `📚 ${tech} Docs`,
        icon: '📚',
        tabIds,
        confidence: 0.9
      })
    }
  })
  
  return groups
}

// Detect shopping context
function detectShoppingContext(tabs: chrome.tabs.Tab[], processed: Set<number>): SmartGroup[] {
  const groups: SmartGroup[] = []
  const shoppingDomains = ['amazon.', 'ebay.', 'aliexpress.', 'shopify.', 'etsy.']
  
  const shoppingTabs = tabs.filter(tab => {
    if (!tab.url || !tab.id || processed.has(tab.id)) return false
    return shoppingDomains.some(domain => tab.url.includes(domain))
  })
  
  // Group by product search
  const productGroups = new Map<string, number[]>()
  
  shoppingTabs.forEach(tab => {
    if (!tab.id || !tab.title) return
    
    const product = extractProductCategory(tab.title)
    if (product) {
      if (!productGroups.has(product)) {
        productGroups.set(product, [])
      }
      productGroups.get(product)!.push(tab.id)
      processed.add(tab.id)
    }
  })
  
  productGroups.forEach((tabIds, product) => {
    if (tabIds.length > 1) {
      groups.push({
        name: `🛒 Shopping: ${product}`,
        icon: '🛒',
        tabIds,
        confidence: 0.7
      })
    }
  })
  
  return groups
}

// Detect research context (Wikipedia + academic papers + blogs)
function detectResearchContext(tabs: chrome.tabs.Tab[], processed: Set<number>): SmartGroup[] {
  const groups: SmartGroup[] = []
  const researchDomains = ['wikipedia.org', 'arxiv.org', 'scholar.google', 'medium.com', 'dev.to']
  
  const researchTabs = tabs.filter(tab => {
    if (!tab.url || !tab.id || processed.has(tab.id)) return false
    return researchDomains.some(domain => tab.url.includes(domain))
  })
  
  // Group by topic similarity
  const topicGroups = new Map<string, number[]>()
  
  researchTabs.forEach(tab => {
    if (!tab.id || !tab.title) return
    
    const topic = extractResearchTopic(tab.title)
    if (topic) {
      if (!topicGroups.has(topic)) {
        topicGroups.set(topic, [])
      }
      topicGroups.get(topic)!.push(tab.id)
      processed.add(tab.id)
    }
  })
  
  topicGroups.forEach((tabIds, topic) => {
    if (tabIds.length > 1) {
      groups.push({
        name: `🔬 Research: ${topic}`,
        icon: '🔬',
        tabIds,
        confidence: 0.6
      })
    }
  })
  
  return groups
}

// Helper functions
function extractKeywords(text: string): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'was', 'are', 'were'])
  return text.toLowerCase()
    .split(/\W+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
}

function calculateKeywordOverlap(keywords1: string[], keywords2: string[]): number {
  const set1 = new Set(keywords1)
  const set2 = new Set(keywords2)
  const intersection = new Set([...set1].filter(x => set2.has(x)))
  const union = new Set([...set1, ...set2])
  return union.size > 0 ? intersection.size / union.size : 0
}

function extractMainKeyword(title: string): string {
  const keywords = extractKeywords(title)
  return keywords.slice(0, 3).join(' ')
}

function extractTechnology(title: string, url: string): string | null {
  const technologies = [
    'React', 'Vue', 'Angular', 'Node.js', 'Python', 'JavaScript', 
    'TypeScript', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'Git',
    'MongoDB', 'PostgreSQL', 'Redis', 'GraphQL', 'REST API'
  ]
  
  const text = (title + ' ' + url).toLowerCase()
  for (const tech of technologies) {
    if (text.includes(tech.toLowerCase())) {
      return tech
    }
  }
  
  return null
}

function extractProductCategory(title: string): string | null {
  const categories = {
    'laptop': ['laptop', 'notebook', 'macbook', 'thinkpad'],
    'phone': ['phone', 'iphone', 'samsung', 'pixel', 'mobile'],
    'headphones': ['headphones', 'earbuds', 'airpods', 'audio'],
    'monitor': ['monitor', 'display', 'screen', '4k', 'ultrawide'],
    'keyboard': ['keyboard', 'mechanical', 'keys', 'typing'],
    'mouse': ['mouse', 'gaming', 'wireless', 'bluetooth']
  }
  
  const lowerTitle = title.toLowerCase()
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => lowerTitle.includes(keyword))) {
      return category
    }
  }
  
  return null
}

function extractResearchTopic(title: string): string | null {
  const keywords = extractKeywords(title)
  if (keywords.length > 0) {
    return keywords.slice(0, 2).join(' ')
  }
  return null
}