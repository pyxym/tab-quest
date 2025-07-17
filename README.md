# TabAI - AI-Powered Tab Assistant

## 🚀 개요

TabAI는 인공지능을 활용하여 브라우저 탭을 자동으로 정리하고 관리하는 Chrome/Edge 확장 프로그램입니다. 사용자의 브라우징 패턴을 학습하여 탭을 스마트하게 분류하고, 생산성을 향상시키는 인사이트를 제공합니다.

## 🏗️ 아키텍처

### 기술 스택
- **프레임워크**: Plasmo Framework (Browser Extension 개발)
- **프론트엔드**: React 18 + TypeScript
- **상태 관리**: Zustand
- **스타일링**: Tailwind CSS + Glass Morphism UI
- **빌드 시스템**: Plasmo CLI
- **확장 프로그램**: Chrome Extension Manifest V3

### 프로젝트 구조
```
tabai/
├── src/
│   ├── components/        # React 컴포넌트
│   │   ├── AILogo.tsx          # AI 브랜드 로고
│   │   ├── AIInsightCard.tsx   # AI 인사이트 카드
│   │   ├── CategoryManager.tsx  # 카테고리 관리
│   │   ├── TabList.tsx         # 탭 목록 및 할당
│   │   └── ...
│   ├── store/            # Zustand 상태 스토어
│   │   ├── tabStore.ts         # 탭 데이터 관리
│   │   ├── aiStore.ts          # AI 인사이트 관리
│   │   └── categoryStore.ts    # 카테고리 관리
│   ├── utils/            # 유틸리티 함수
│   │   ├── tabAnalyzer.ts      # 탭 분석 로직
│   │   └── directOrganizer.ts  # 탭 그룹화 로직
│   └── types/            # TypeScript 타입 정의
├── background.ts         # 백그라운드 서비스 워커
├── popup.tsx            # 메인 팝업 UI
├── style.css            # 글로벌 스타일
└── manifest.json        # 확장 프로그램 매니페스트
```

## 🔄 데이터 흐름

### 1. 확장 프로그램 초기화
```
사용자가 확장 프로그램 클릭
    ↓
popup.tsx 로드
    ↓
초기 데이터 로드 (loadTabsAndAnalyze)
    ├── Chrome API로 현재 탭 정보 가져오기
    ├── 카테고리 데이터 로드 (Chrome Storage)
    └── AI 분석 실행
```

### 2. 탭 분석 프로세스
```
현재 탭 목록
    ↓
tabAnalyzer.ts
    ├── 중복 탭 감지
    ├── 도메인별 그룹화
    ├── 카테고리 매칭
    └── 생산성 점수 계산
    ↓
AI Insights 생성
```

### 3. 스마트 정리 (Smart Organize)
```
사용자가 Smart Organize 클릭
    ↓
directOrganizer.ts
    ├── 모든 탭 그룹 해제
    ├── 카테고리별 탭 분류
    ├── Chrome Tab Groups API로 그룹 생성
    └── 카테고리 순서대로 그룹 정렬
```

## 📦 주요 컴포넌트

### Popup.tsx (메인 UI)
- 확장 프로그램의 메인 인터페이스
- 탭 통계, AI 인사이트, 빠른 액션 제공
- Glass morphism 디자인 적용

### CategoryManager.tsx
- 카테고리 생성/수정/삭제
- 드래그 앤 드롭으로 순서 변경
- 시스템 카테고리(미분류) 보호

### TabList.tsx
- 현재 열린 탭 목록 표시
- 탭을 카테고리에 할당
- 도메인 기반 자동 매칭

### AIInsightCard.tsx
- AI가 생성한 인사이트 표시
- 실행 가능한 액션 제공 (중복 제거, 정리 등)
- 우선순위별 색상 구분

## 🧠 AI 기능

### 1. 탭 패턴 분석
- 도메인별 사용 빈도 측정
- 카테고리별 탭 분포 분석
- 중복 탭 자동 감지

### 2. 스마트 인사이트
```typescript
// AI 인사이트 타입
type InsightType = 'tip' | 'alert' | 'suggestion' | 'pattern'

// 인사이트 예시
- 중복 탭 감지: "3개의 중복 탭이 발견되었습니다"
- 높은 탭 수: "20개 이상의 탭이 성능을 저하시킬 수 있습니다"
- 카테고리 집중: "개발 관련 탭이 많이 열려있습니다"
```

### 3. 생산성 점수
- 열린 탭 수, 중복 탭, 카테고리 분포를 기반으로 계산
- 0-100점 스케일
- 향상 추세 표시

## 🔧 Chrome APIs 사용

### Tabs API
```typescript
// 탭 정보 조회
chrome.tabs.query({}, (tabs) => {
  // 모든 탭 정보 처리
})

// 탭 제거
chrome.tabs.remove(tabIds)
```

### Tab Groups API
```typescript
// 탭 그룹 생성
const groupId = await chrome.tabs.group({ tabIds })

// 그룹 속성 설정
await chrome.tabGroups.update(groupId, {
  title: "Work",
  color: "blue",
  collapsed: false
})
```

### Storage API
```typescript
// 카테고리 저장
chrome.storage.sync.set({ categories })

// 설정 로드
chrome.storage.sync.get(['categories'], (result) => {
  // 데이터 사용
})
```

## 🚦 상태 관리 (Zustand)

### tabStore
```typescript
interface TabStore {
  tabs: Tab[]
  setTabs: (tabs: Tab[]) => void
  activeTab: Tab | null
  setActiveTab: (tab: Tab | null) => void
}
```

### categoryStore
```typescript
interface CategoryStore {
  categories: Category[]
  loadCategories: () => Promise<void>
  saveCategory: (category: Category) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  reorderCategories: (categories: Category[]) => Promise<void>
}
```

### aiStore
```typescript
interface AIStore {
  insights: Insight[]
  productivityScore: number
  addInsight: (insight: Insight) => void
  removeInsight: (id: string) => void
  setProductivityScore: (score: number) => void
}
```

## 🎨 UI/UX 특징

### Glass Morphism 디자인
- 반투명 배경 + 블러 효과
- 그라디언트 오버레이
- 애니메이션 블롭 배경

### 반응형 인터랙션
- 호버 효과
- 스케일 애니메이션
- 부드러운 전환 효과

### 접근성
- 명확한 아이콘 + 텍스트 라벨
- 툴팁으로 추가 정보 제공
- 키보드 네비게이션 지원

## 🐛 문제 해결

### Background Script 통신 문제
- Manifest V3의 Service Worker 특성상 장시간 대기 시 종료됨
- 해결: directOrganizer.ts로 직접 Chrome API 호출

### HMR (Hot Module Replacement) 충돌
- MetaMask 등 다른 확장 프로그램과 충돌
- 해결: 에러 이벤트 필터링으로 무시

### 탭 그룹 순서 문제
- Chrome API가 그룹 생성 순서를 보장하지 않음
- 해결: chrome.tabGroups.move()로 수동 정렬

## 🚀 설치 및 실행

### 개발 환경 설정
```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
```

### 확장 프로그램 로드
1. Chrome/Edge에서 `chrome://extensions` 접속
2. 개발자 모드 활성화
3. "압축 해제된 확장 프로그램 로드" 클릭
4. `build/chrome-mv3-dev` 폴더 선택

## 📝 사용 가이드

### 기본 사용법
1. 확장 프로그램 아이콘 클릭
2. AI 인사이트 확인
3. Smart Organize로 탭 자동 정리

### 카테고리 관리
1. 설정 → 카테고리 관리
2. 새 카테고리 추가
3. 도메인 할당
4. 드래그로 순서 변경

### 탭 할당
1. 탭 목록 보기
2. 각 탭의 카테고리 선택
3. Smart Organize로 적용

## 🔮 향후 계획

### 단기 목표
- [ ] 키워드 기반 탭 분류
- [ ] 세션 저장/복원 기능
- [ ] 탭 사용 시간 추적

### 장기 목표
- [ ] 머신러닝 기반 자동 분류
- [ ] 크로스 브라우저 지원
- [ ] 팀 협업 기능

## 📄 라이선스

MIT License

## 👥 기여하기

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

---

Made with ❤️ by TabAI Team