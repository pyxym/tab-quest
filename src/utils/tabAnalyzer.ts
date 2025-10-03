export interface TabAnalysis {
  domain: string;
  category: string;
  importance: number;
  duplicateOf?: number;
  memoryEstimate: number;
  lastAccessed: number;
  accessCount: number;
}

export interface DuplicateGroup {
  url: string;
  tabs: chrome.tabs.Tab[];
  count: number;
  recommendation: string;
}

// Analyze a single tab
export function analyzeTab(tab: chrome.tabs.Tab): TabAnalysis {
  const domain = tab.url ? new URL(tab.url).hostname : '';
  const category = categorizeByDomain(domain);
  const importance = calculateImportance(tab);
  const memoryEstimate = estimateMemoryUsage(tab);

  return {
    domain,
    category,
    importance,
    memoryEstimate,
    lastAccessed: Date.now(),
    accessCount: 1,
  };
}

// Categorize tabs by domain
export function categorizeByDomain(domain: string): string {
  const categories = {
    work: ['github.com', 'gitlab.com', 'stackoverflow.com', 'localhost', 'vercel.app', 'netlify.app'],
    social: ['twitter.com', 'x.com', 'facebook.com', 'instagram.com', 'linkedin.com', 'discord.com'],
    entertainment: ['youtube.com', 'netflix.com', 'twitch.tv', 'spotify.com'],
    shopping: ['amazon.com', 'ebay.com', 'aliexpress.com', 'shopify.com'],
    news: ['cnn.com', 'bbc.com', 'reddit.com', 'hackernews.com'],
    education: ['coursera.org', 'udemy.com', 'khanacademy.org', 'medium.com'],
    ai: ['openai.com', 'anthropic.com', 'claude.ai', 'chatgpt.com', 'gemini.google.com'],
    productivity: ['notion.so', 'trello.com', 'asana.com', 'jira.com'],
    email: ['gmail.com', 'outlook.com', 'mail.yahoo.com'],
    docs: ['docs.google.com', 'drive.google.com', 'dropbox.com'],
  };

  for (const [category, domains] of Object.entries(categories)) {
    if (domains.some((d) => domain.includes(d))) {
      return category;
    }
  }

  // Additional keyword-based categorization
  if (domain.includes('shop') || domain.includes('store')) return 'shopping';
  if (domain.includes('news') || domain.includes('blog')) return 'news';
  if (domain.includes('video') || domain.includes('watch')) return 'entertainment';

  return 'other';
}

// Calculate tab importance score (0-100)
export function calculateImportance(tab: chrome.tabs.Tab): number {
  let score = 50; // Base score

  // Active tab gets bonus
  if (tab.active) score += 20;

  // Pinned tabs are important
  if (tab.pinned) score += 30;

  // Audio playing tabs
  if (tab.audible) score += 10;

  // Recently accessed (mock for now)
  // In real implementation, this would check lastAccessed from storage

  // Tab with form data or unsaved changes would get bonus
  // (requires content script to detect)

  return Math.min(100, score);
}

// Estimate memory usage in MB
export function estimateMemoryUsage(tab: chrome.tabs.Tab): number {
  let baseMemory = 50; // Base memory for any tab

  if (!tab.url) return baseMemory;

  const domain = new URL(tab.url).hostname;

  // Heavy sites
  const heavySites = {
    'youtube.com': 200,
    'netflix.com': 250,
    'facebook.com': 180,
    'gmail.com': 150,
    'docs.google.com': 120,
    'twitter.com': 100,
    'discord.com': 180,
  };

  for (const [site, memory] of Object.entries(heavySites)) {
    if (domain.includes(site)) {
      return memory;
    }
  }

  // Media sites generally use more memory
  if (tab.audible || domain.includes('video') || domain.includes('stream')) {
    return 150;
  }

  return baseMemory;
}

// Find duplicate tabs
export function findDuplicates(tabs: chrome.tabs.Tab[]): DuplicateGroup[] {
  const urlMap = new Map<string, chrome.tabs.Tab[]>();
  const duplicates: DuplicateGroup[] = [];

  // Group tabs by normalized URL
  tabs.forEach((tab) => {
    if (tab.url) {
      // Normalize URL (remove trailing slash, fragments, and common tracking params)
      const normalizedUrl = normalizeUrl(tab.url);

      if (!urlMap.has(normalizedUrl)) {
        urlMap.set(normalizedUrl, []);
      }
      urlMap.get(normalizedUrl)!.push(tab);
    }
  });

  // Create duplicate groups
  urlMap.forEach((tabList, url) => {
    if (tabList.length > 1) {
      duplicates.push({
        url,
        tabs: tabList,
        count: tabList.length,
        recommendation: generateDuplicateRecommendation(tabList),
      });
    }
  });

  return duplicates;
}

// Normalize URL for duplicate detection
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);

    // Remove common tracking parameters
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid'];
    trackingParams.forEach((param) => urlObj.searchParams.delete(param));

    // Remove fragment
    urlObj.hash = '';

    // Remove trailing slash
    let normalized = urlObj.toString().replace(/\/$/, '');

    // Remove www subdomain for comparison
    normalized = normalized.replace('://www.', '://');

    return normalized;
  } catch {
    return url;
  }
}

// Generate recommendation for duplicate tabs
function generateDuplicateRecommendation(tabs: chrome.tabs.Tab[]): string {
  // Find the most recently accessed or active tab
  const activeTab = tabs.find((t) => t.active);
  const pinnedTab = tabs.find((t) => t.pinned);

  if (pinnedTab && !activeTab) {
    return `Keep the pinned tab and close ${tabs.length - 1} duplicates`;
  }

  if (activeTab) {
    return `Keep the active tab and close ${tabs.length - 1} duplicates`;
  }

  return `Close ${tabs.length - 1} duplicate tabs`;
}

// Calculate productivity score based on tabs
export function calculateProductivityScore(tabs: chrome.tabs.Tab[]): number {
  let score = 100;

  // Too many tabs reduces productivity
  if (tabs.length > 30) score -= 20;
  else if (tabs.length > 20) score -= 10;
  else if (tabs.length > 15) score -= 5;

  // Count categories
  const categories = new Set(
    tabs.map((tab) => {
      if (tab.url) {
        const domain = new URL(tab.url).hostname;
        return categorizeByDomain(domain);
      }
      return 'other';
    }),
  );

  // Penalty for too many entertainment/social tabs
  const socialEntertainmentCount = tabs.filter((tab) => {
    if (tab.url) {
      const domain = new URL(tab.url).hostname;
      const category = categorizeByDomain(domain);
      return category === 'social' || category === 'entertainment';
    }
    return false;
  }).length;

  const socialRatio = socialEntertainmentCount / tabs.length;
  if (socialRatio > 0.5) score -= 20;
  else if (socialRatio > 0.3) score -= 10;

  // Bonus for work/productivity tabs
  const productivityCount = tabs.filter((tab) => {
    if (tab.url) {
      const domain = new URL(tab.url).hostname;
      const category = categorizeByDomain(domain);
      return category === 'work' || category === 'productivity' || category === 'docs';
    }
    return false;
  }).length;

  const productivityRatio = productivityCount / tabs.length;
  if (productivityRatio > 0.5) score += 10;

  // Penalty for many duplicates
  const duplicates = findDuplicates(tabs);
  if (duplicates.length > 5) score -= 15;
  else if (duplicates.length > 3) score -= 10;
  else if (duplicates.length > 0) score -= 5;

  return Math.max(0, Math.min(100, score));
}
