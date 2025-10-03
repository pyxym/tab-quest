# 상태 관리 (State Management)

## 개요

TabQuest는 Zustand를 사용하여 전역 상태를 관리합니다. Zustand는 가볍고 사용하기 쉬운 상태 관리 라이브러리로, React Hook 기반으로 동작합니다.

## Store 구조

### 1. Category Store (`categoryStore.ts`)

카테고리 관리와 도메인 매핑을 담당합니다.

```typescript
interface CategoryStore {
  // State
  categories: Category[];
  categoryMapping: Record<string, string>;

  // Actions
  loadCategories: () => Promise<void>;
  addCategory: (category: Category) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  reorderCategories: (categories: Category[]) => Promise<void>;
  setCategoryMapping: (domain: string, categoryId: string) => Promise<void>;
  getCategoryForDomain: (domain: string) => string;
  removeDomainFromCategories: (domain: string) => Promise<void>;
}
```

#### 카테고리 데이터 구조
```typescript
interface Category {
  id: string;
  name: string;
  icon: string;
  color: chrome.tabGroups.ColorEnum;
  domains: string[];
  order?: number;
}
```

#### 주요 메서드

##### loadCategories()
```typescript
loadCategories: async () => {
  const saved = await storageUtils.getCategories();
  const mapping = await storageUtils.getCategoryMapping();

  if (saved && saved.length > 0) {
    set({ categories: saved, categoryMapping: mapping });
  } else {
    // 기본 카테고리 초기화
    const defaults = getDefaultCategories();
    await storageUtils.saveCategories(defaults);
    set({ categories: defaults, categoryMapping: {} });
  }
}
```

##### getCategoryForDomain()
```typescript
getCategoryForDomain: (domain: string) => {
  const state = get();

  // 1. 사용자 매핑 확인
  if (state.categoryMapping[domain]) {
    return state.categoryMapping[domain];
  }

  // 2. 카테고리 도메인 확인
  for (const category of state.categories) {
    if (category.domains.some(d =>
      domain === d || domain.endsWith(`.${d}`)
    )) {
      return category.id;
    }
  }

  return 'uncategorized';
}
```

### 2. Tab Store (`tabStore.ts`)

현재 탭 목록과 관련 작업을 관리합니다.

```typescript
interface TabStore {
  // State
  tabs: TabInfo[];

  // Actions
  setTabs: (tabs: TabInfo[]) => void;
  updateTab: (tabId: number, updates: Partial<TabInfo>) => void;
  removeTab: (tabId: number) => void;
  getTabsByCategory: (categoryId: string) => TabInfo[];
  getTabsByDomain: (domain: string) => TabInfo[];
}
```

#### 탭 데이터 구조
```typescript
interface TabInfo {
  id: number;
  title: string;
  url: string;
  favIconUrl?: string;
  groupId?: number;
  lastAccessed: number;
  domain?: string;
  categoryId?: string;
}
```

#### 유용한 셀렉터
```typescript
// 카테고리별 탭 가져오기
const workTabs = useTabStore(state =>
  state.getTabsByCategory('work')
);

// 특정 도메인 탭 개수
const githubTabCount = useTabStore(state =>
  state.tabs.filter(tab =>
    tab.domain === 'github.com'
  ).length
);
```

### 3. AI Store (`aiStore.ts`)

AI 인사이트와 생산성 점수를 관리합니다.

```typescript
interface AIStore {
  // State
  insights: AIInsight[];
  productivityScore: number;
  learningProgress: number;

  // Actions
  addInsight: (insight: AIInsight) => void;
  removeInsight: (id: string) => void;
  clearInsights: () => void;
  setProductivityScore: (score: number) => void;
  updateLearningProgress: () => void;
  loadAIStats: () => Promise<void>;
  saveAIStats: () => Promise<void>;
}
```

#### 인사이트 구조
```typescript
interface AIInsight {
  id: string;
  type: 'tip' | 'alert' | 'achievement' | 'warning';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: number;
  actionable?: {
    label: string;
    action: () => void | Promise<void>;
  };
  expiresAt?: number;
}
```

#### 인사이트 관리
```typescript
// 인사이트 추가 (중복 방지)
addInsight: (insight) => {
  set(state => {
    const exists = state.insights.some(i => i.id === insight.id);
    if (exists) return state;

    return {
      insights: [...state.insights, insight]
        .sort((a, b) => {
          // 우선순위별 정렬
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        })
    };
  });
}

// 만료된 인사이트 자동 제거
const cleanExpiredInsights = () => {
  const now = Date.now();
  set(state => ({
    insights: state.insights.filter(i =>
      !i.expiresAt || i.expiresAt > now
    )
  }));
};
```

## Chrome Storage와의 동기화

### Storage Utils (`storage.ts`)

```typescript
export const storageUtils = {
  // Categories
  async saveCategories(categories: Category[]) {
    await chrome.storage.sync.set({ categories });
  },

  async getCategories(): Promise<Category[]> {
    const result = await chrome.storage.sync.get('categories');
    return result.categories || [];
  },

  // Category Mapping
  async saveCategoryMapping(mapping: Record<string, string>) {
    await chrome.storage.sync.set({ categoryMapping: mapping });
  },

  async getCategoryMapping(): Promise<Record<string, string>> {
    const result = await chrome.storage.sync.get('categoryMapping');
    return result.categoryMapping || {};
  },

  // Tab Usage Data
  async saveTabUsageData(data: TabUsageData) {
    await chrome.storage.local.set({ tabUsageData: data });
  },

  async getTabUsageData(): Promise<TabUsageData> {
    const result = await chrome.storage.local.get('tabUsageData');
    return result.tabUsageData || {};
  }
};
```

### 동기화 패턴

```typescript
// Store → Storage (쓰기)
updateCategory: async (id, updates) => {
  set(state => ({
    categories: state.categories.map(cat =>
      cat.id === id ? { ...cat, ...updates } : cat
    )
  }));

  // Storage에 저장
  const { categories } = get();
  await storageUtils.saveCategories(categories);
}

// Storage → Store (읽기)
loadCategories: async () => {
  const categories = await storageUtils.getCategories();
  set({ categories });
}
```

## 성능 최적화

### 1. 선택적 구독 (Selective Subscribe)

```typescript
// 나쁜 예: 전체 상태 구독
const state = useTabStore();

// 좋은 예: 필요한 부분만 구독
const tabCount = useTabStore(state => state.tabs.length);
const workTabs = useTabStore(state =>
  state.tabs.filter(t => t.categoryId === 'work')
);
```

### 2. 메모이제이션

```typescript
// useMemo로 연산 결과 캐싱
const categoryStats = useMemo(() => {
  const stats: Record<string, number> = {};

  tabs.forEach(tab => {
    const category = getCategoryForDomain(tab.domain);
    stats[category] = (stats[category] || 0) + 1;
  });

  return stats;
}, [tabs]);
```

### 3. 배치 업데이트

```typescript
// 나쁜 예: 개별 업데이트
tabs.forEach(tab => {
  updateTab(tab.id, { categoryId: 'work' });
});

// 좋은 예: 배치 업데이트
set(state => ({
  tabs: state.tabs.map(tab => ({
    ...tab,
    categoryId: 'work'
  }))
}));
```

## 디버깅

### Store 상태 확인

```typescript
// 개발자 콘솔에서 현재 상태 확인
const debugStore = () => {
  console.log('Categories:', useCategoryStore.getState());
  console.log('Tabs:', useTabStore.getState());
  console.log('AI:', useAIStore.getState());
};

// React DevTools에서 확인
// Zustand store는 Hook으로 표시됨
```

### Storage 확인

```typescript
// Chrome Storage 내용 확인
chrome.storage.sync.get(null, (data) => {
  console.log('Sync Storage:', data);
});

chrome.storage.local.get(null, (data) => {
  console.log('Local Storage:', data);
});
```

## 테스팅

### Store 테스트 예시

```typescript
describe('CategoryStore', () => {
  beforeEach(() => {
    // Store 초기화
    useCategoryStore.setState({
      categories: [],
      categoryMapping: {}
    });
  });

  test('카테고리 추가', async () => {
    const store = useCategoryStore.getState();

    await store.addCategory({
      id: 'test',
      name: 'Test',
      icon: '🧪',
      color: 'blue',
      domains: ['test.com']
    });

    expect(store.categories).toHaveLength(1);
    expect(store.categories[0].id).toBe('test');
  });

  test('도메인 매핑', () => {
    const store = useCategoryStore.getState();

    store.setCategoryMapping('github.com', 'work');

    expect(store.getCategoryForDomain('github.com')).toBe('work');
  });
});
```

## Best Practices

### 1. Store 분리 원칙
- 각 Store는 단일 책임 원칙을 따름
- 관련 있는 상태와 액션만 포함
- Store 간 직접 참조 최소화

### 2. 비동기 처리
```typescript
// Loading 상태 관리
interface Store {
  isLoading: boolean;
  error: string | null;

  fetchData: async () => {
    set({ isLoading: true, error: null });

    try {
      const data = await api.getData();
      set({ data, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  }
}
```

### 3. 타입 안정성
```typescript
// Store 타입 정의
type CategoryStore = {
  categories: Category[];
  addCategory: (category: Category) => Promise<void>;
}

// 사용 시 타입 추론
const categories = useCategoryStore(state => state.categories);
// categories: Category[] 자동 추론
```