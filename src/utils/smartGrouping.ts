// Smart grouping algorithms for tabs

interface SmartGroup {
  name: string;
  icon: string;
  tabIds: number[];
  confidence: number;
}

// Detect related tabs based on content and context
export function detectSmartGroups(tabs: chrome.tabs.Tab[]): SmartGroup[] {
  const smartGroups: SmartGroup[] = [];
  const processedTabs = new Set<number>();

  // 1. Search Context Detection
  const searchGroups = detectSearchContext(tabs, processedTabs);
  smartGroups.push(...searchGroups);

  // 2. Documentation Context
  const docGroups = detectDocumentationContext(tabs, processedTabs);
  smartGroups.push(...docGroups);

  // 3. Shopping Context
  const shoppingGroups = detectShoppingContext(tabs, processedTabs);
  smartGroups.push(...shoppingGroups);

  // 4. Research Context
  const researchGroups = detectResearchContext(tabs, processedTabs);
  smartGroups.push(...researchGroups);

  // 5. Project Context (GitHub/GitLab repos)
  const projectGroups = detectProjectContext(tabs, processedTabs);
  smartGroups.push(...projectGroups);

  // 6. Communication Context (Email, Messages)
  const commGroups = detectCommunicationContext(tabs, processedTabs);
  smartGroups.push(...commGroups);

  // 7. Media Context (Videos, Music)
  const mediaGroups = detectMediaContext(tabs, processedTabs);
  smartGroups.push(...mediaGroups);

  // 8. Task Management Context
  const taskGroups = detectTaskContext(tabs, processedTabs);
  smartGroups.push(...taskGroups);

  return smartGroups.filter((group) => group.tabIds.length > 1);
}

// Detect search-related tabs (Google + Stack Overflow + GitHub issues)
function detectSearchContext(tabs: chrome.tabs.Tab[], processed: Set<number>): SmartGroup[] {
  const groups: SmartGroup[] = [];
  // Find all search tabs
  const searchTabs = tabs.filter((tab) => {
    if (!tab.url || !tab.id || processed.has(tab.id)) return false;
    return tab.url?.includes('google.com/search') || tab.url?.includes('stackoverflow.com/questions') || false;
  });

  // Group by search query similarity
  searchTabs.forEach((searchTab) => {
    if (!searchTab.id || !searchTab.url) return;

    const relatedTabs = [searchTab.id];
    processed.add(searchTab.id);

    // Find related solution/discussion tabs
    tabs.forEach((tab) => {
      if (!tab.id || !tab.url || processed.has(tab.id)) return;

      // Check if this tab might be related to the search
      if (tab.title && searchTab.title) {
        const searchKeywords = extractKeywords(searchTab.title);
        const tabKeywords = extractKeywords(tab.title);
        const overlap = calculateKeywordOverlap(searchKeywords, tabKeywords);

        if (overlap > 0.3) {
          relatedTabs.push(tab.id);
          processed.add(tab.id);
        }
      }
    });

    if (relatedTabs.length > 1) {
      groups.push({
        name: '🔍 Search: ' + extractMainKeyword(searchTab.title || ''),
        icon: '🔍',
        tabIds: relatedTabs,
        confidence: 0.8,
      });
    }
  });

  return groups;
}

// Detect documentation reading context
function detectDocumentationContext(tabs: chrome.tabs.Tab[], processed: Set<number>): SmartGroup[] {
  const groups: SmartGroup[] = [];
  const docDomains = ['docs.', 'developer.', 'api.', 'wiki.', 'readthedocs.', '/docs/', '/documentation/', 'npmjs.com', 'pypi.org'];

  const docTabs = tabs.filter((tab) => {
    if (!tab.url || !tab.id || processed.has(tab.id)) return false;
    return tab.url ? docDomains.some((pattern) => tab.url!.includes(pattern)) : false;
  });

  // Group by technology/framework
  const techGroups = new Map<string, number[]>();

  docTabs.forEach((tab) => {
    if (!tab.id || !tab.title) return;

    const tech = extractTechnology(tab.title, tab.url || '');
    if (tech) {
      if (!techGroups.has(tech)) {
        techGroups.set(tech, []);
      }
      techGroups.get(tech)!.push(tab.id);
      processed.add(tab.id);
    }
  });

  techGroups.forEach((tabIds, tech) => {
    if (tabIds.length > 1) {
      groups.push({
        name: `📚 ${tech} Docs`,
        icon: '📚',
        tabIds,
        confidence: 0.9,
      });
    }
  });

  return groups;
}

// Detect shopping context
function detectShoppingContext(tabs: chrome.tabs.Tab[], processed: Set<number>): SmartGroup[] {
  const groups: SmartGroup[] = [];
  const shoppingDomains = ['amazon.', 'ebay.', 'aliexpress.', 'shopify.', 'etsy.'];

  const shoppingTabs = tabs.filter((tab) => {
    if (!tab.url || !tab.id || processed.has(tab.id)) return false;
    return tab.url ? shoppingDomains.some((domain) => tab.url!.includes(domain)) : false;
  });

  // Group by product search
  const productGroups = new Map<string, number[]>();

  shoppingTabs.forEach((tab) => {
    if (!tab.id || !tab.title) return;

    const product = extractProductCategory(tab.title);
    if (product) {
      if (!productGroups.has(product)) {
        productGroups.set(product, []);
      }
      productGroups.get(product)!.push(tab.id);
      processed.add(tab.id);
    }
  });

  productGroups.forEach((tabIds, product) => {
    if (tabIds.length > 1) {
      groups.push({
        name: `🛒 Shopping: ${product}`,
        icon: '🛒',
        tabIds,
        confidence: 0.7,
      });
    }
  });

  return groups;
}

// Detect research context (Wikipedia + academic papers + blogs)
function detectResearchContext(tabs: chrome.tabs.Tab[], processed: Set<number>): SmartGroup[] {
  const groups: SmartGroup[] = [];
  const researchDomains = ['wikipedia.org', 'arxiv.org', 'scholar.google', 'medium.com', 'dev.to'];

  const researchTabs = tabs.filter((tab) => {
    if (!tab.url || !tab.id || processed.has(tab.id)) return false;
    return tab.url ? researchDomains.some((domain) => tab.url!.includes(domain)) : false;
  });

  // Group by topic similarity
  const topicGroups = new Map<string, number[]>();

  researchTabs.forEach((tab) => {
    if (!tab.id || !tab.title) return;

    const topic = extractResearchTopic(tab.title);
    if (topic) {
      if (!topicGroups.has(topic)) {
        topicGroups.set(topic, []);
      }
      topicGroups.get(topic)!.push(tab.id);
      processed.add(tab.id);
    }
  });

  topicGroups.forEach((tabIds, topic) => {
    if (tabIds.length > 1) {
      groups.push({
        name: `🔬 Research: ${topic}`,
        icon: '🔬',
        tabIds,
        confidence: 0.6,
      });
    }
  });

  return groups;
}

// Helper functions
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'from',
    'is',
    'was',
    'are',
    'were',
  ]);
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

function calculateKeywordOverlap(keywords1: string[], keywords2: string[]): number {
  const set1 = new Set(keywords1);
  const set2 = new Set(keywords2);
  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

function extractMainKeyword(title: string): string {
  const keywords = extractKeywords(title);
  return keywords.slice(0, 3).join(' ');
}

function extractTechnology(title: string, url: string): string | null {
  const technologies = [
    'React',
    'Vue',
    'Angular',
    'Node.js',
    'Python',
    'JavaScript',
    'TypeScript',
    'Docker',
    'Kubernetes',
    'AWS',
    'Azure',
    'Git',
    'MongoDB',
    'PostgreSQL',
    'Redis',
    'GraphQL',
    'REST API',
  ];

  const text = (title + ' ' + url).toLowerCase();
  for (const tech of technologies) {
    if (text.includes(tech.toLowerCase())) {
      return tech;
    }
  }

  return null;
}

function extractProductCategory(title: string): string | null {
  const categories = {
    laptop: ['laptop', 'notebook', 'macbook', 'thinkpad'],
    phone: ['phone', 'iphone', 'samsung', 'pixel', 'mobile'],
    headphones: ['headphones', 'earbuds', 'airpods', 'audio'],
    monitor: ['monitor', 'display', 'screen', '4k', 'ultrawide'],
    keyboard: ['keyboard', 'mechanical', 'keys', 'typing'],
    mouse: ['mouse', 'gaming', 'wireless', 'bluetooth'],
  };

  const lowerTitle = title.toLowerCase();
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some((keyword) => lowerTitle.includes(keyword))) {
      return category;
    }
  }

  return null;
}

function extractResearchTopic(title: string): string | null {
  const keywords = extractKeywords(title);
  if (keywords.length > 0) {
    return keywords.slice(0, 2).join(' ');
  }
  return null;
}

// Detect project context (GitHub/GitLab repositories)
function detectProjectContext(tabs: chrome.tabs.Tab[], processed: Set<number>): SmartGroup[] {
  const groups: SmartGroup[] = [];
  const projectPatterns = [/github\.com\/([^\/]+)\/([^\/]+)/, /gitlab\.com\/([^\/]+)\/([^\/]+)/, /bitbucket\.org\/([^\/]+)\/([^\/]+)/];

  const projectTabs = new Map<string, number[]>();

  tabs.forEach((tab) => {
    if (!tab.url || !tab.id || processed.has(tab.id)) return;

    for (const pattern of projectPatterns) {
      const match = tab.url.match(pattern);
      if (match) {
        const projectKey = `${match[1]}/${match[2]}`;
        if (!projectTabs.has(projectKey)) {
          projectTabs.set(projectKey, []);
        }
        projectTabs.get(projectKey)!.push(tab.id);
        processed.add(tab.id);
        break;
      }
    }
  });

  projectTabs.forEach((tabIds, project) => {
    if (tabIds.length > 1) {
      groups.push({
        name: `💻 Project: ${project}`,
        icon: '💻',
        tabIds,
        confidence: 0.95,
      });
    }
  });

  return groups;
}

// Detect communication context
function detectCommunicationContext(tabs: chrome.tabs.Tab[], processed: Set<number>): SmartGroup[] {
  const groups: SmartGroup[] = [];
  const commDomains = ['gmail.com', 'mail.google.com', 'outlook.com', 'mail.yahoo.com', 'slack.com', 'discord.com', 'telegram.org'];

  const commTabs = tabs.filter((tab) => {
    if (!tab.url || !tab.id || processed.has(tab.id)) return false;
    return tab.url ? commDomains.some((domain) => tab.url!.includes(domain)) : false;
  });

  if (commTabs.length > 1) {
    groups.push({
      name: '💬 Communications',
      icon: '💬',
      tabIds: commTabs.map((tab) => tab.id!),
      confidence: 0.8,
    });
    commTabs.forEach((tab) => processed.add(tab.id!));
  }

  return groups;
}

// Detect media context
function detectMediaContext(tabs: chrome.tabs.Tab[], processed: Set<number>): SmartGroup[] {
  const groups: SmartGroup[] = [];
  const mediaDomains = ['youtube.com', 'netflix.com', 'spotify.com', 'soundcloud.com', 'twitch.tv', 'vimeo.com'];

  const mediaTabs = tabs.filter((tab) => {
    if (!tab.url || !tab.id || processed.has(tab.id)) return false;
    return tab.url ? mediaDomains.some((domain) => tab.url!.includes(domain)) : false;
  });

  // Group by media type
  const videoTabs = mediaTabs.filter(
    (tab) =>
      tab.url &&
      (tab.url.includes('youtube.com') ||
        tab.url.includes('netflix.com') ||
        tab.url.includes('twitch.tv') ||
        tab.url.includes('vimeo.com')),
  );

  const audioTabs = mediaTabs.filter((tab) => tab.url && (tab.url.includes('spotify.com') || tab.url.includes('soundcloud.com')));

  if (videoTabs.length > 1) {
    groups.push({
      name: '🎬 Video Streaming',
      icon: '🎬',
      tabIds: videoTabs.map((tab) => tab.id!),
      confidence: 0.85,
    });
    videoTabs.forEach((tab) => processed.add(tab.id!));
  }

  if (audioTabs.length > 1) {
    groups.push({
      name: '🎵 Music & Audio',
      icon: '🎵',
      tabIds: audioTabs.map((tab) => tab.id!),
      confidence: 0.85,
    });
    audioTabs.forEach((tab) => processed.add(tab.id!));
  }

  return groups;
}

// Detect task management context
function detectTaskContext(tabs: chrome.tabs.Tab[], processed: Set<number>): SmartGroup[] {
  const groups: SmartGroup[] = [];
  const taskDomains = ['trello.com', 'asana.com', 'todoist.com', 'notion.so', 'monday.com', 'clickup.com', 'jira.atlassian.com'];

  const taskTabs = tabs.filter((tab) => {
    if (!tab.url || !tab.id || processed.has(tab.id)) return false;
    return tab.url ? taskDomains.some((domain) => tab.url!.includes(domain)) : false;
  });

  if (taskTabs.length > 1) {
    groups.push({
      name: '📋 Task Management',
      icon: '📋',
      tabIds: taskTabs.map((tab) => tab.id!),
      confidence: 0.85,
    });
    taskTabs.forEach((tab) => processed.add(tab.id!));
  }

  return groups;
}
