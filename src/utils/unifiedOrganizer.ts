// Unified tab organization logic used by both Smart Organize and Apply Grouping
import { useCategoryStore } from '../store/categoryStore';

export async function organizeTabsUnified(categories: any[]) {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });

    // First, ungroup all tabs
    const allTabIds = tabs.map((tab) => tab.id).filter((id): id is number => id !== undefined);

    if (allTabIds.length > 0) {
      try {
        await chrome.tabs.ungroup(allTabIds);
      } catch (e) {
        // Some tabs already ungrouped
      }
    }

    // Get the category store instance
    const { getCategoryForDomain } = useCategoryStore.getState();

    // Step 1: Analyze and categorize all tabs
    const categorizedTabs = new Map<string, chrome.tabs.Tab[]>();

    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue;

      // Skip system URLs but not extension URLs
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
        continue;
      }

      let categoryId = 'uncategorized';

      try {
        const domain = new URL(tab.url).hostname.replace(/^www\./, '');
        // Use the store's getCategoryForDomain which checks both mappings and category domains
        categoryId = getCategoryForDomain(domain);
      } catch (error) {
        categoryId = 'uncategorized';
      }

      if (!categorizedTabs.has(categoryId)) {
        categorizedTabs.set(categoryId, []);
      }
      categorizedTabs.get(categoryId)!.push(tab);
    }

    // Step 2: Reorganize tabs by moving them in category order
    // This ensures tabs are physically arranged in the correct order before grouping
    let currentPosition = 0;
    const reorderedTabIds: number[] = [];

    for (const category of categories) {
      const categoryTabs = categorizedTabs.get(category.id);
      if (!categoryTabs || categoryTabs.length === 0) continue;

      for (const tab of categoryTabs) {
        if (tab.id) {
          reorderedTabIds.push(tab.id);
        }
      }
    }

    // Move all tabs to their correct positions
    for (let i = 0; i < reorderedTabIds.length; i++) {
      try {
        await chrome.tabs.move(reorderedTabIds[i], { index: i });
      } catch (error) {
        // Failed to move tab, continue with others
      }
    }

    // Step 3: Create groups in order (tabs are already in correct positions)
    let groupsCreated = 0;
    let tabsProcessed = 0;

    for (const category of categories) {
      const categoryTabs = categorizedTabs.get(category.id);
      if (!categoryTabs || categoryTabs.length === 0) continue;

      const tabIds = categoryTabs.map((t) => t.id).filter((id): id is number => id !== undefined);

      try {
        const groupId = await chrome.tabs.group({ tabIds });
        // Create abbreviation for category name
        const abbreviation = category.name
          .split(' ')
          .map((word: string) => word.charAt(0).toUpperCase())
          .join('')
          .slice(0, 3); // Max 3 characters

        await chrome.tabGroups.update(groupId, {
          title: abbreviation,
          color: category.color as chrome.tabGroups.ColorEnum,
          collapsed: false,
        });

        groupsCreated++;
        tabsProcessed += tabIds.length;
      } catch (error) {
        // Failed to create group, continue with others
      }
    }

    const message = groupsCreated > 0 ? `Successfully organized ${tabsProcessed} tabs into ${groupsCreated} groups` : 'No groups created';

    return {
      success: true,
      message,
      groupsCreated,
      tabsProcessed: tabs.length,
    };
  } catch (error) {
    throw error;
  }
}
