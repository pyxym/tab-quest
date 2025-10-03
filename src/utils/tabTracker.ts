// Tab usage tracking utility
import { storageUtils } from './storage';
interface TabUsageData {
  url: string;
  domain: string;
  title: string;
  category: string;
  firstSeen: number;
  lastAccessed: number;
  totalTimeSpent: number; // in milliseconds
  accessCount: number;
  activations: number; // number of times tab was activated
}

interface DailyStats {
  date: string; // YYYY-MM-DD format
  totalTabs: number;
  totalTimeSpent: number;
  categoryBreakdown: Record<string, number>; // time spent per category
  domainBreakdown: Record<string, number>; // time spent per domain
  productivityScore: number;
}

export class TabTracker {
  private static activeTabId: number | null = null;
  private static activeStartTime: number | null = null;
  private static updateInterval: NodeJS.Timeout | null = null;

  // Initialize tracking
  static async initialize() {
    console.log('[TabTracker] Initializing...');

    try {
      // Track tab activation
      chrome.tabs.onActivated.addListener(async (activeInfo) => {
        console.log('[TabTracker] Tab activated:', activeInfo.tabId);
        await this.handleTabChange(activeInfo.tabId);
      });

      // Track tab updates (URL changes)
      chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
        if (changeInfo.url && tabId === this.activeTabId) {
          console.log('[TabTracker] Tab URL changed:', tabId, changeInfo.url);
          await this.handleTabChange(tabId);
        }
      });

      // Track window focus changes
      chrome.windows.onFocusChanged.addListener(async (windowId) => {
        if (windowId === chrome.windows.WINDOW_ID_NONE) {
          // Browser lost focus
          console.log('[TabTracker] Browser lost focus');
          await this.stopTracking();
        } else {
          // Browser gained focus, resume tracking active tab
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (activeTab?.id) {
            console.log('[TabTracker] Browser gained focus, active tab:', activeTab.id);
            await this.handleTabChange(activeTab.id);
          }
        }
      });

      // Service Worker에서는 setInterval이 작동하지 않으므로 chrome.alarms API 사용
      chrome.alarms.create('tabTrackerUpdate', { periodInMinutes: 0.1 }); // 6초마다

      chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === 'tabTrackerUpdate') {
          this.updateActiveTabTime();
        }
      });

      // Track the currently active tab on initialization
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab?.id) {
        console.log('[TabTracker] Initial active tab:', activeTab.id);
        await this.handleTabChange(activeTab.id);
      }

      console.log('[TabTracker] Initialization complete');
    } catch (error) {
      console.error('[TabTracker] Initialization error:', error);
      throw error;
    }
  }

  // Handle tab change - MUST BE PUBLIC for event listeners
  static async handleTabChange(newTabId: number) {
    console.log('[TabTracker] Handling tab change to:', newTabId);

    try {
      // Stop tracking previous tab
      await this.stopTracking();

      // Start tracking new tab
      const tab = await chrome.tabs.get(newTabId);
      console.log('[TabTracker] Tab details:', { url: tab.url, title: tab.title });

      if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('edge://')) {
        this.activeTabId = newTabId;
        this.activeStartTime = Date.now();
        console.log('[TabTracker] Now tracking tab:', newTabId, 'at', new Date(this.activeStartTime).toISOString());

        // Update access count
        await this.incrementTabAccess(tab);
      } else {
        console.log('[TabTracker] Skipping system tab:', tab.url);
      }
    } catch (error) {
      console.error('[TabTracker] Error in handleTabChange:', error);
    }
  }

  // Stop tracking current tab - MUST BE PUBLIC for event listeners
  static async stopTracking() {
    if (this.activeTabId && this.activeStartTime) {
      const timeSpent = Date.now() - this.activeStartTime;
      console.log('[TabTracker] Stopping tracking for tab:', this.activeTabId, 'Time spent:', timeSpent, 'ms');
      await this.updateTabUsage(this.activeTabId, timeSpent);
    }

    this.activeTabId = null;
    this.activeStartTime = null;
  }

  // Update time for active tab - MUST BE PUBLIC for setInterval
  static async updateActiveTabTime() {
    if (this.activeTabId && this.activeStartTime) {
      const timeSpent = Date.now() - this.activeStartTime;
      console.log('[TabTracker] Periodic update for tab:', this.activeTabId, 'Time spent:', timeSpent, 'ms');
      await this.updateTabUsage(this.activeTabId, timeSpent);
      this.activeStartTime = Date.now(); // Reset start time
    }
  }

  // Update tab usage data
  private static async updateTabUsage(tabId: number, timeSpent: number) {
    console.log('[TabTracker] updateTabUsage called for tab:', tabId, 'timeSpent:', timeSpent);

    try {
      const tab = await chrome.tabs.get(tabId);
      if (!tab.url) {
        console.log('[TabTracker] Tab has no URL, skipping');
        return;
      }

      const domain = new URL(tab.url).hostname.replace(/^www\./, '');
      console.log('[TabTracker] Processing domain:', domain);

      // Get category using the same logic as CategoryStore
      const categoryMapping = await storageUtils.getCategoryMapping();
      const categories = await storageUtils.getCategories();

      // First check user-assigned category
      let category = categoryMapping[domain];

      // If not found, check category domains
      if (!category) {
        for (const cat of categories) {
          if (
            cat.domains &&
            cat.domains.some((d: string) => {
              const catDomain = d.toLowerCase();
              return domain === catDomain || domain.endsWith(`.${catDomain}`);
            })
          ) {
            category = cat.id;
            break;
          }
        }
      }

      // Default to uncategorized
      if (!category) {
        category = 'uncategorized';
      }

      console.log('[TabTracker] Category for domain:', domain, '->', category);

      // Get existing data
      const tabUsageData = await storageUtils.getTabUsageData();
      console.log('[TabTracker] Current tabUsageData keys:', Object.keys(tabUsageData));

      const key = domain; // Use domain as key for aggregation
      const existing = tabUsageData[key] || {
        url: tab.url,
        domain: domain,
        title: tab.title || '',
        category: category,
        firstSeen: Date.now(),
        lastAccessed: Date.now(),
        totalTimeSpent: 0,
        accessCount: 0,
        activations: 0,
      };

      // Update data
      const oldTimeSpent = existing.totalTimeSpent;
      existing.lastAccessed = Date.now();
      existing.totalTimeSpent += timeSpent;
      existing.title = tab.title || existing.title; // Update title if changed
      existing.category = category; // Update category if changed

      tabUsageData[key] = existing;
      await storageUtils.setTabUsageData(tabUsageData);

      console.log('[TabTracker] Updated usage data for', domain, '- Total time:', oldTimeSpent, '->', existing.totalTimeSpent);

      // Update daily stats
      await this.updateDailyStats(category, domain, timeSpent);
    } catch (error) {
      console.error('[TabTracker] Error updating tab usage:', error);
    }
  }

  // Increment tab access count
  private static async incrementTabAccess(tab: chrome.tabs.Tab) {
    console.log('[TabTracker] incrementTabAccess called for:', tab.url);

    try {
      if (!tab.url) {
        console.log('[TabTracker] Tab has no URL, skipping increment');
        return;
      }

      const domain = new URL(tab.url).hostname.replace(/^www\./, '');
      const tabUsageData = await storageUtils.getTabUsageData();

      const key = domain;
      if (tabUsageData[key]) {
        tabUsageData[key].accessCount++;
        tabUsageData[key].activations++;
        console.log('[TabTracker] Incremented access count for', domain, 'to', tabUsageData[key].accessCount);
      } else {
        console.log('[TabTracker] No existing data for domain:', domain, '- will be created on first update');
      }

      await storageUtils.setTabUsageData(tabUsageData);
    } catch (error) {
      console.error('[TabTracker] Error incrementing tab access:', error);
    }
  }

  // Update daily statistics
  private static async updateDailyStats(category: string, domain: string, timeSpent: number) {
    console.log('[TabTracker] Updating daily stats - category:', category, 'domain:', domain, 'time:', timeSpent);

    const today = new Date().toISOString().split('T')[0];
    const dailyStats = await storageUtils.getDailyStats();

    if (!dailyStats[today]) {
      console.log('[TabTracker] Creating new daily stats for:', today);
      dailyStats[today] = {
        date: today,
        totalTabs: 0,
        totalTimeSpent: 0,
        categoryBreakdown: {},
        domainBreakdown: {},
        productivityScore: 0,
      };
    }

    const todayStats = dailyStats[today];
    const oldTotalTime = todayStats.totalTimeSpent;
    todayStats.totalTimeSpent += timeSpent;
    todayStats.categoryBreakdown[category] = (todayStats.categoryBreakdown[category] || 0) + timeSpent;
    todayStats.domainBreakdown[domain] = (todayStats.domainBreakdown[domain] || 0) + timeSpent;

    // Calculate productivity score
    const productiveTime = (todayStats.categoryBreakdown['work'] || 0) + (todayStats.categoryBreakdown['productivity'] || 0);
    const distractingTime = (todayStats.categoryBreakdown['social'] || 0) + (todayStats.categoryBreakdown['entertainment'] || 0);
    const totalCategorizedTime = productiveTime + distractingTime;

    if (totalCategorizedTime > 0) {
      todayStats.productivityScore = Math.round((productiveTime / totalCategorizedTime) * 100);
    } else {
      todayStats.productivityScore = 50; // neutral
    }

    dailyStats[today] = todayStats;
    await storageUtils.setDailyStats(dailyStats);

    console.log('[TabTracker] Daily stats updated - Total time today:', oldTotalTime, '->', todayStats.totalTimeSpent);
  }

  // Get usage data for dashboard
  static async getUsageData() {
    const tabUsageData = await storageUtils.getTabUsageData();
    const dailyStats = await storageUtils.getDailyStats();

    // Get last 7 days of data
    const last7Days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      last7Days.push(
        dailyStats[dateStr] || {
          date: dateStr,
          totalTabs: 0,
          totalTimeSpent: 0,
          categoryBreakdown: {},
          domainBreakdown: {},
          productivityScore: 50,
        },
      );
    }

    return {
      tabUsageData: Object.values(tabUsageData),
      dailyStats: last7Days.reverse(),
      todayStats: dailyStats[new Date().toISOString().split('T')[0]],
    };
  }

  // Clean up old data (keep last 30 days)
  static async cleanupOldData() {
    const dailyStats = await storageUtils.getDailyStats();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const cleaned: Record<string, DailyStats> = {};
    Object.entries(dailyStats).forEach(([date, stats]) => {
      if (new Date(date) >= thirtyDaysAgo) {
        cleaned[date] = stats as DailyStats;
      }
    });

    await storageUtils.setDailyStats(cleaned);
  }
}
