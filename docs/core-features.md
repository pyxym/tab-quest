# 핵심 기능 상세 설명

## 1. 스마트 탭 정리 (Smart Tab Organization)

### 개요
사용자의 탭을 도메인 및 카테고리 기반으로 자동 그룹화하여 브라우저를 체계적으로 정리합니다.

### 핵심 로직

#### UnifiedOrganizer (`unifiedOrganizer.ts`)
```typescript
export async function organizeTabsUnified(categories: Category[]) {
  // 1. 현재 윈도우의 모든 탭 가져오기
  const tabs = await chrome.tabs.query({ currentWindow: true });

  // 2. 모든 탭 언그룹
  await chrome.tabs.ungroup(allTabIds);

  // 3. 카테고리별로 탭 분류
  for (const tab of tabs) {
    const domain = new URL(tab.url).hostname;
    const categoryId = getCategoryForDomain(domain);
    categorizedTabs.get(categoryId).push(tab);
  }

  // 4. 카테고리 순서대로 탭 재정렬
  for (const category of categories) {
    const tabIds = categorizedTabs.get(category.id);
    await chrome.tabs.move(tabIds, { index: currentPosition });
  }

  // 5. 그룹 생성
  for (const category of categories) {
    const groupId = await chrome.tabs.group({ tabIds });
    await chrome.tabGroups.update(groupId, {
      title: category.abbreviation,
      color: category.color,
      collapsed: false
    });
  }
}
```

### 특징
- **도메인 정규화**: `www.` 제거, 서브도메인 처리
- **시스템 URL 제외**: `chrome://`, `edge://` 탭은 그룹화하지 않음
- **카테고리 우선순위**: 사용자 매핑 > 카테고리 도메인 > 미분류

## 2. 탭 사용량 추적 (Tab Usage Tracking)

### 개요
각 탭의 사용 시간을 실시간으로 추적하고 통계 데이터를 생성합니다.

### TabTracker 클래스 (`tabTracker.ts`)

#### 추적 이벤트
1. **탭 활성화** (`chrome.tabs.onActivated`)
2. **URL 변경** (`chrome.tabs.onUpdated`)
3. **윈도우 포커스** (`chrome.windows.onFocusChanged`)
4. **주기적 업데이트** (`chrome.alarms` - 6초마다)

#### 데이터 구조
```typescript
interface TabUsageData {
  url: string;
  domain: string;
  title: string;
  category: string;
  firstSeen: number;
  lastAccessed: number;
  totalTimeSpent: number; // 밀리초
  accessCount: number;
  activations: number;
}

interface DailyStats {
  date: string; // YYYY-MM-DD
  totalTabs: number;
  totalTimeSpent: number;
  categoryBreakdown: Record<string, number>;
  domainBreakdown: Record<string, number>;
  productivityScore: number;
}
```

### 추적 플로우
```
사용자가 탭 전환
    ↓
handleTabChange() 호출
    ↓
이전 탭 시간 계산 & 저장
    ↓
새 탭 추적 시작
    ↓
6초마다 자동 업데이트
```

## 3. 카테고리 시스템 (Category System)

### 개요
탭을 의미 있는 그룹으로 분류하기 위한 카테고리 관리 시스템입니다.

### 기본 카테고리
```typescript
const DEFAULT_CATEGORIES = [
  {
    id: 'work',
    name: 'Work',
    color: 'blue',
    icon: '💼',
    domains: ['github.com', 'gitlab.com', 'bitbucket.org']
  },
  {
    id: 'productivity',
    name: 'Productivity',
    color: 'green',
    icon: '⚡',
    domains: ['notion.so', 'trello.com', 'asana.com']
  },
  // ...
];
```

### 카테고리 매핑 로직
```typescript
getCategoryForDomain(domain: string): string {
  // 1. 사용자 정의 매핑 확인
  if (categoryMapping[domain]) {
    return categoryMapping[domain];
  }

  // 2. 카테고리 도메인 리스트 확인
  for (const category of categories) {
    if (category.domains.includes(domain)) {
      return category.id;
    }
  }

  // 3. 패턴 매칭 (서브도메인)
  // mail.google.com → google.com 카테고리 확인

  // 4. 미분류
  return 'uncategorized';
}
```

## 4. AI 인사이트 시스템

### 개요
사용자의 브라우징 패턴을 분석하여 생산성 향상을 위한 제안을 생성합니다.

### 인사이트 타입
```typescript
type InsightType = 'tip' | 'alert' | 'achievement' | 'warning';

interface AIInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: number;
  actionable?: {
    label: string;
    action: () => void;
  };
}
```

### 인사이트 생성 조건

#### 중복 탭 경고
```typescript
if (duplicates.length > 0) {
  addInsight({
    type: 'alert',
    title: `${totalDuplicates}개의 중복 탭 발견`,
    description: '중복된 탭을 정리하여 메모리를 절약하세요',
    actionable: {
      label: '중복 제거',
      action: removeDuplicates
    }
  });
}
```

#### 생산성 팁
```typescript
if (productivityScore < 50) {
  addInsight({
    type: 'warning',
    title: '생산성 개선 필요',
    description: '엔터테인먼트 탭이 너무 많습니다'
  });
}
```

## 5. 중복 탭 감지 및 제거

### 중복 감지 알고리즘
```typescript
function detectDuplicates(tabs: chrome.tabs.Tab[]) {
  const urlMap = new Map<string, chrome.tabs.Tab[]>();

  for (const tab of tabs) {
    // URL 정규화
    const normalizedUrl = tab.url
      .replace(/\/$/, '')  // 끝 슬래시 제거
      .split('#')[0]       // 해시 제거
      .split('?')[0];      // 쿼리 파라미터 제거

    urlMap.get(normalizedUrl).push(tab);
  }

  // 2개 이상인 URL만 필터링
  return Array.from(urlMap.entries())
    .filter(([_, tabs]) => tabs.length > 1);
}
```

### 제거 전략
- 가장 오래된 탭 유지 (탭 ID가 작은 것)
- 나머지 중복 탭 일괄 제거
- 새 탭(chrome://newtab/) 특별 처리

## 6. 생산성 점수 계산

### 계산 로직 (`tabAnalyzer.ts`)
```typescript
function calculateProductivityScore(tabs: chrome.tabs.Tab[]): number {
  let score = 100;

  // 탭 개수 페널티
  if (tabs.length > 20) score -= 10;
  if (tabs.length > 30) score -= 20;

  // 카테고리별 가중치
  const weights = {
    work: +2,
    productivity: +1,
    entertainment: -1,
    social: -2
  };

  for (const tab of tabs) {
    const category = getCategoryForDomain(domain);
    score += weights[category] || 0;
  }

  return Math.max(0, Math.min(100, score));
}
```

## 7. 다국어 지원 (i18n)

### 지원 언어
- 🇺🇸 영어 (en)
- 🇰🇷 한국어 (ko)
- 🇯🇵 일본어 (ja)

### 구현 방식
```typescript
// i18n 초기화
i18n.init({
  resources: { en, ko, ja },
  lng: savedLanguage || 'en',
  fallbackLng: 'en'
});

// 사용 예시
const { t } = useTranslation();
<h1>{t('dashboard.title')}</h1>
```

### 언어별 번역 파일 구조
```json
{
  "dashboard": {
    "title": "Dashboard",
    "totalTabs": "Total Tabs",
    "productivity": "Productivity Score"
  },
  "insights": {
    "duplicates": {
      "title": "{{count}} duplicate tabs found",
      "description": "Clean up duplicate tabs to save memory",
      "action": "Remove Duplicates"
    }
  }
}
```