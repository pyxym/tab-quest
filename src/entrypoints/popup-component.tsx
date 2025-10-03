import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AILogo } from '../components/AILogo';
import { AIInsightCard } from '../components/AIInsightCard';
import { ProductivityScore } from '../components/ProductivityScore';
import { CategoryManager } from '../components/CategoryManager';
import { TabList } from '../components/TabList';
import { DashboardModal } from '../components/DashboardModal';
import { InfoTooltip } from '../components/InfoTooltip';
import { HelpModal } from '../components/HelpModal';
import { AILearningStatus } from '../components/AILearningStatus';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useTabStore } from '../store/tabStore';
import { useAIStore } from '../store/aiStore';
import { useCategoryStore } from '../store/categoryStore';
import { calculateProductivityScore } from '../utils/tabAnalyzer';
import { organizeTabsUnified } from '../utils/unifiedOrganizer';
import { storageUtils } from '../utils/storage';
import '../styles/popup.css';

function IndexPopup() {
  const { t, ready } = useTranslation();
  const { tabs, setTabs } = useTabStore();
  const { insights, productivityScore, addInsight, removeInsight, setProductivityScore } = useAIStore();
  const { categories, loadCategories } = useCategoryStore();
  const [analysis, setAnalysis] = useState<any>(null);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showTabList, setShowTabList] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);

  useEffect(() => {
    async function init() {
      await loadCategories();
      await loadTabsAndAnalyze();
      checkFirstTimeUser();
    }
    init();
  }, [loadCategories]);

  async function checkFirstTimeUser() {
    const hasSeenWelcome = await storageUtils.getHasSeenWelcome();
    if (!hasSeenWelcome && t) {
      // Show welcome message for first-time users
      addInsight({
        id: 'welcome-message',
        type: 'tip',
        title: t('insights.welcome.title'),
        description: t('insights.welcome.description'),
        priority: 'high',
        timestamp: Date.now(),
        actionable: {
          label: t('insights.welcome.action'),
          action: () => setShowHelp(true),
        },
      });

      await storageUtils.setHasSeenWelcome(true);
    }
  }

  async function loadTabsAndAnalyze() {
    // Load current tabs
    const currentTabs = await chrome.tabs.query({});
    setTabs(
      currentTabs.map((tab) => ({
        id: tab.id!,
        title: tab.title || '',
        url: tab.url || '',
        favIconUrl: tab.favIconUrl,
        lastAccessed: Date.now(),
      })),
    );

    // Get analysis from background
    const response = await chrome.runtime.sendMessage({ action: 'getTabsAnalysis' });
    setAnalysis(response);

    // Calculate and set productivity score
    const score = calculateProductivityScore(currentTabs);
    setProductivityScore(score);

    // Generate insights based on analysis
    generateInsights(currentTabs, response);
  }

  function generateInsights(tabs: chrome.tabs.Tab[], analysis: any) {
    // Clear existing insights
    insights.forEach((insight) => removeInsight(insight.id));

    // Add duplicate tabs insight
    if (analysis.duplicates.length > 0) {
      const totalDuplicates = analysis.duplicates.reduce((sum: number, d: any) => sum + d.count - 1, 0);
      addInsight({
        id: 'duplicates',
        type: 'alert',
        title: t('insights.duplicates.title', { count: totalDuplicates }),
        description: t('insights.duplicates.description'),
        priority: 'high',
        timestamp: Date.now(),
        actionable: {
          label: t('insights.duplicates.action'),
          action: async () => {
            try {
              console.log('[TabQuest] Starting duplicate removal...');

              // Get all tabs in current window
              const tabs = await chrome.tabs.query({ currentWindow: true });
              console.log(`[TabQuest] Found ${tabs.length} total tabs`);

              const urlMap = new Map<string, chrome.tabs.Tab[]>();

              // Group tabs by URL
              tabs.forEach((tab) => {
                if (tab.url && !tab.url.startsWith('chrome-extension://')) {
                  let normalizedUrl: string;

                  // Treat all new tabs as the same
                  if (
                    tab.url === 'chrome://newtab/' ||
                    tab.url === 'edge://newtab/' ||
                    tab.url === 'about:blank' ||
                    tab.url === 'about:newtab' ||
                    tab.url.startsWith('chrome://newtab') ||
                    tab.url.startsWith('edge://newtab')
                  ) {
                    normalizedUrl = '__newtab__';
                  } else if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
                    // Skip other system pages
                    return;
                  } else {
                    // Normalize regular URLs - remove trailing slash, fragments, and query params
                    normalizedUrl = tab.url.replace(/\/$/, '').split('#')[0].split('?')[0];
                  }

                  if (!urlMap.has(normalizedUrl)) {
                    urlMap.set(normalizedUrl, []);
                  }
                  urlMap.get(normalizedUrl)!.push(tab);
                }
              });

              console.log(
                '[TabQuest] URL groups:',
                Array.from(urlMap.entries()).map(([url, tabs]) => `${url}: ${tabs.length}`),
              );

              // Find and close duplicates
              let closedCount = 0;
              const tabsToClose: number[] = [];

              for (const [url, tabGroup] of urlMap) {
                if (tabGroup.length > 1) {
                  console.log(`[TabQuest] Found ${tabGroup.length} tabs for ${url}`);

                  // Sort by id to keep the oldest tab
                  tabGroup.sort((a, b) => (a.id || 0) - (b.id || 0));

                  // Keep the first tab, mark others for closing
                  for (let i = 1; i < tabGroup.length; i++) {
                    const tabId = tabGroup[i].id;
                    if (tabId !== undefined) {
                      tabsToClose.push(tabId);
                      closedCount++;
                    }
                  }
                }
              }

              console.log(`[TabQuest] Will close ${closedCount} duplicate tabs`);

              // Close all duplicate tabs at once
              if (tabsToClose.length > 0) {
                await chrome.tabs.remove(tabsToClose);

                // Remove the duplicate warning first
                removeInsight('duplicates');

                // Then show success message
                addInsight({
                  id: `duplicates-removed-${Date.now()}`,
                  type: 'tip',
                  title: t('insights.duplicatesRemoved.title'),
                  description: t('insights.duplicatesRemoved.description', { count: closedCount }),
                  priority: 'medium',
                  timestamp: Date.now(),
                });
              } else {
                console.log('[TabQuest] No duplicates found to remove');
              }

              // Reload tabs and analysis
              setTimeout(() => {
                loadTabsAndAnalyze();
              }, 500);
            } catch (error) {
              console.error('[TabQuest] Failed to remove duplicates:', error);
              alert('Failed to remove duplicate tabs. Please check console for details.');
            }
          },
        },
      });
    }

    // Add high tab count insight
    if (tabs.length > 20) {
      addInsight({
        id: 'high-tab-count',
        type: 'suggestion',
        title: t('insights.highTabCount.title', { count: tabs.length }),
        description: t('insights.highTabCount.description'),
        priority: tabs.length > 30 ? 'high' : 'medium',
        timestamp: Date.now(),
        actionable: {
          label: t('insights.highTabCount.action'),
          action: handleSmartOrganize,
        },
      });
    }

    // Add category insight
    if (analysis.categoryCounts) {
      const topCategory = Object.entries(analysis.categoryCounts).sort(([, a], [, b]) => (b as number) - (a as number))[0];

      if (topCategory && (topCategory[1] as number) > 5) {
        addInsight({
          id: 'category-focus',
          type: 'pattern',
          title: t('insights.categoryFocus.title', { category: topCategory[0] }),
          description: t('insights.categoryFocus.description', {
            count: topCategory[1],
            category: topCategory[0],
          }),
          priority: 'low',
          timestamp: Date.now(),
        });
      }
    }
  }

  async function handleSmartOrganize() {
    setIsOrganizing(true);
    try {
      const result = await chrome.runtime.sendMessage({
        action: 'organizeByCategories',
        categories: categories,
      });
      if (result.success) {
        addInsight({
          id: `organize-success-${Date.now()}`,
          type: 'tip',
          title: '✨ Smart Organization Complete!',
          description: result.message || `Created ${result.groupsCreated} groups`,
          priority: 'medium',
          timestamp: Date.now(),
        });

        // Add specific insights based on actions taken
        if (result.closedDuplicates > 0) {
          addInsight({
            id: `duplicates-closed-${Date.now()}`,
            type: 'tip',
            title: '🗑️ Duplicates Removed',
            description: `Closed ${result.closedDuplicates} duplicate tabs to reduce clutter`,
            priority: 'low',
            timestamp: Date.now() + 1,
          });
        }
      }
    } catch (error) {
      console.error('Failed to organize tabs:', error);
    } finally {
      setIsOrganizing(false);
      loadTabsAndAnalyze();
    }
  }

  async function handleViewDashboard() {
    setShowDashboard(true);
  }

  async function handleAIOrganize() {
    console.log('[TabQuest] handleAIOrganize called, current isOrganizing:', isOrganizing);
    if (isOrganizing) {
      console.log('[TabQuest] Already organizing, skipping...');
      return;
    }

    setIsOrganizing(true);
    console.log('[TabQuest] Set isOrganizing to true');

    try {
      console.log('[TabQuest] Starting Smart organization...');
      console.log('[TabQuest] Categories available:', categories?.length || 0);

      // Use the unified organization function
      const result = await organizeTabsUnified(categories);

      console.log('[TabQuest] Organization result:', result);

      if (!result) {
        throw new Error('No response from background script');
      }

      if (result.success) {
        // Create detailed insight about AI organization
        let description = result.message;
        if ((result as any).details && (result as any).details.length > 0) {
          description += '\n\nAI Classification Summary:';
          (result as any).details.forEach((group: any) => {
            description += `\n• ${group.category}: ${group.tabCount} tabs (avg confidence: ${group.avgConfidence})`;
          });
        }

        addInsight({
          id: `ai-organize-${Date.now()}`,
          type: 'tip',
          title: '🤖 Smart Organization Complete!',
          description,
          priority: 'high',
          timestamp: Date.now(),
        });

        // Add learning insight
        if ((result as any).aiInsights?.learningEnabled) {
          addInsight({
            id: `ai-learning-${Date.now()}`,
            type: 'pattern',
            title: '🧠 AI is learning your preferences',
            description: `AI has learned from ${(result as any).aiInsights.totalDomains || 0} domains. The more you use it, the smarter it gets!`,
            priority: 'low',
            timestamp: Date.now() + 1000,
          });
        }
      } else {
        addInsight({
          id: `ai-organize-error-${Date.now()}`,
          type: 'alert',
          title: '❌ Smart Organization Failed',
          description: result.message,
          priority: 'high',
          timestamp: Date.now(),
        });
      }

      // Delay reload to ensure state is properly updated
      setTimeout(() => {
        loadTabsAndAnalyze();
      }, 500);
    } catch (error: any) {
      console.error('Smart organization failed:', error);

      // Check if it's a timeout error
      if (error.message?.includes('Timeout') || error.message?.includes('timeout')) {
        // Try fallback to smartOrganize
        console.log('[TabQuest] Timeout occurred, trying smartOrganize as fallback');
        try {
          const fallbackResult = await chrome.runtime.sendMessage({
            action: 'smartOrganize',
          });
          if (fallbackResult?.success) {
            handleOrganizeResult(fallbackResult);
            return;
          }
        } catch (fallbackError) {
          console.error('[TabQuest] Fallback also failed:', fallbackError);
        }

        addInsight({
          id: `ai-organize-timeout-${Date.now()}`,
          type: 'alert',
          title: '⏱️ Organization Timeout',
          description: 'The operation took too long. Please try again.',
          priority: 'high',
          timestamp: Date.now(),
        });
      } else {
        addInsight({
          id: `ai-organize-error-${Date.now()}`,
          type: 'alert',
          title: '❌ Error',
          description: `Smart organization failed: ${error.message || error}`,
          priority: 'high',
          timestamp: Date.now(),
        });
      }
    } finally {
      console.log('[TabQuest] Finally block: setting isOrganizing to false');
      // Ensure state is reset
      setIsOrganizing(false);
      // Reload data
      setTimeout(() => {
        loadTabsAndAnalyze();
      }, 500);
    }
  }

  function handleOrganizeResult(result: any) {
    if (result && result.success) {
      addInsight({
        id: `organize-success-${Date.now()}`,
        type: 'tip',
        title: '✨ Organization Complete!',
        description: result.message || 'Tabs organized successfully',
        priority: 'high',
        timestamp: Date.now(),
      });
    } else {
      addInsight({
        id: `organize-error-${Date.now()}`,
        type: 'alert',
        title: '❌ Organization Failed',
        description: result?.message || 'Failed to organize tabs',
        priority: 'high',
        timestamp: Date.now(),
      });
    }
  }

  if (!ready) {
    return (
      <div className="w-[480px] h-[600px] flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="w-[480px] h-[600px] relative overflow-hidden">
        {/* Dynamic gradient background - dark theme */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900"></div>

        {/* Animated gradient orbs - subtle for dark theme */}
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-600 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-600 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-600 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
        {/* Glass container */}
        <div className="absolute inset-0 p-4">
          <div className="h-full glass-main rounded-[24px] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-white/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AILogo size="medium" />
                  <div>
                    <h1 className="font-bold text-lg ai-gradient-text">TabQuest</h1>
                    <p className="text-xs glass-text opacity-70">{t('header.subtitle')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowHelp(true)} className="glass-card p-2 transition-all hover:scale-105" title="Help & Guide">
                    <svg className="w-4 h-4 glass-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => setShowTabList(true)}
                    className="glass-card p-2 transition-all hover:scale-105"
                    title="Assign Tabs to Categories"
                  >
                    <svg className="w-4 h-4 glass-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => setShowCategoryManager(true)}
                    className="glass-card p-2 transition-all hover:scale-105"
                    title="Manage Categories"
                  >
                    <svg className="w-4 h-4 glass-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                      />
                    </svg>
                  </button>
                  <div className="relative">
                    <button
                      className="glass-card p-2 transition-all hover:scale-105"
                      title="Settings"
                      onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                    >
                      <svg className="w-4 h-4 glass-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    {/* Settings Dropdown */}
                    {showSettingsDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowSettingsDropdown(false)} />
                        <div className="absolute right-0 mt-2 w-48 glass-card rounded-lg shadow-xl z-50 border border-white/20">
                          <LanguageSwitcher inDropdown={true} onLanguageChange={() => setShowSettingsDropdown(false)} />
                          <div className="border-t border-white/10 mx-2"></div>
                          <button
                            onClick={async () => {
                              if (confirm(t('settings.clearData.confirm'))) {
                                await storageUtils.clearLocalStorage();
                                loadTabsAndAnalyze();
                                addInsight({
                                  id: `data-cleared-${Date.now()}`,
                                  type: 'tip',
                                  title: t('settings.clearData.success.title'),
                                  description: t('settings.clearData.success.description'),
                                  priority: 'low',
                                  timestamp: Date.now(),
                                });
                              }
                              setShowSettingsDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm glass-text hover:bg-white/20 transition-colors flex items-center gap-2 rounded-lg"
                          >
                            <span>🗑️</span>
                            <span>{t('settings.clearData.label')}</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Stats - Reduced padding */}
            <div className="px-4 py-2">
              <div className="grid grid-cols-3 gap-3 mb-2">
                <div className="glass-card !py-2 text-center">
                  <p className="text-2xl font-bold glass-text">{tabs.length}</p>
                  <p className="text-xs glass-text opacity-70">{t('stats.activeTabs')}</p>
                </div>
                <div className="glass-card !py-2 text-center">
                  <p className="text-2xl font-bold glass-text">
                    {analysis?.categoryCounts ? Object.keys(analysis.categoryCounts).length : 0}
                  </p>
                  <p className="text-xs glass-text opacity-70">{t('stats.categories')}</p>
                </div>
                <div className="glass-card !py-2 text-center">
                  <p className="text-2xl font-bold glass-text">
                    {analysis?.duplicates ? analysis.duplicates.reduce((sum: number, d: any) => sum + d.count - 1, 0) : 0}
                  </p>
                  <p className="text-xs glass-text opacity-70">{t('stats.duplicates')}</p>
                </div>
              </div>

              {/* AI Learning Status and Productivity Score */}
              <div className="grid grid-cols-2 gap-3">
                <AILearningStatus compact />
                <ProductivityScore score={productivityScore} trend="up" compact />
              </div>
            </div>

            {/* AI Insights - Expanded section */}
            <div className="px-4 py-2 flex-1 overflow-hidden flex flex-col min-h-[150px]">
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🤖</span>
                  <h2 className="font-semibold text-base glass-text">{t('insights.title')}</h2>
                </div>
                <InfoTooltip
                  title={t('tooltips.insights.title')}
                  description={t('tooltips.insights.description')}
                  features={[t('tooltips.insights.features.0'), t('tooltips.insights.features.1'), t('tooltips.insights.features.2')]}
                  position="bottom-left"
                />
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent">
                <div className="space-y-3 pr-2">
                  {insights.length === 0 ? (
                    <div className="flex items-center justify-center h-full min-h-[120px]">
                      <div className="text-center space-y-2">
                        <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-purple-400/20 to-pink-400/20 flex items-center justify-center">
                          <span className="text-xl animate-pulse">🧠</span>
                        </div>
                        <div>
                          <p className="text-sm glass-text font-medium">{t('insights.analyzing.title')}</p>
                          <p className="text-xs glass-text opacity-60">{t('insights.analyzing.description')}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    insights.map((insight) => <AIInsightCard key={insight.id} insight={insight} onDismiss={removeInsight} />)
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions - Compact */}
            <div className="border-t border-white/20 px-4 py-3">
              <div className="space-y-2">
                {/* Main Actions with Info */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs glass-text opacity-60">{t('actions.quickActions')}</span>
                  <InfoTooltip
                    title={t('tooltips.smartOrganize.title')}
                    description={t('tooltips.smartOrganize.description')}
                    features={[
                      t('tooltips.smartOrganize.features.0'),
                      t('tooltips.smartOrganize.features.1'),
                      t('tooltips.smartOrganize.features.2'),
                    ]}
                    position="auto"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className="glass-button-primary text-sm disabled:opacity-50 glass-text flex items-center justify-center gap-2 py-2.5"
                    onClick={handleAIOrganize}
                    disabled={isOrganizing || tabs.length < 2}
                  >
                    {isOrganizing ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        <span>{t('actions.organizing')}</span>
                      </>
                    ) : (
                      <>🤖 {t('actions.smartOrganize')}</>
                    )}
                  </button>
                  <button
                    className="glass-button-primary text-sm glass-text flex items-center justify-center gap-2 py-2.5"
                    onClick={handleViewDashboard}
                  >
                    📊 {t('actions.viewAnalytics')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCategoryManager && <CategoryManager onClose={() => setShowCategoryManager(false)} />}

      {showTabList && <TabList onClose={() => setShowTabList(false)} />}

      {showDashboard && <DashboardModal onClose={() => setShowDashboard(false)} />}

      {showHelp && <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />}
    </>
  );
}

export default IndexPopup;
