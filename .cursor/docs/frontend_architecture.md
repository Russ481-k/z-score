# 프론트엔드 아키텍처 설계서

## 1. 개요

본 문서는 Next.js 기반으로 구축되는 캠샤프트 불량률 예측 시스템 프론트엔드의 아키텍처를 정의합니다. 사용자가 데이터를 효과적으로 탐색하고, 분석 결과를 직관적으로 이해하며, 실시간 알람에 신속하게 대응할 수 있도록 하는 것을 목표로 합니다.

## 2. 기술 스택 및 라이브러리

- **Core Framework:** Next.js (App Router)
- **언어:** TypeScript
- **상태 관리 및 데이터 페칭:** React Query (`@tanstack/react-query`)
- **데이터 그리드:** AG-Grid
- **데이터 시각화 (차트):** Recharts 또는 Chart.js
- **스타일링:** SCSS (Sass)
- **API 클라이언트:** Axios

## 3. 폴더 구조 (Directory Structure)

```
/src
|-- /app                 # Next.js App Router
|   |-- /dashboard       # 대시보드 페이지
|   |   |-- page.tsx
|   |-- layout.tsx
|   `-- page.tsx
|-- /components          # 재사용 가능한 UI 컴포넌트
|   |-- /common
|   |-- /charts
|   |-- /grid
|   |   |-- ProductsGrid.tsx   # 제품 목록 그리드
|   |   `-- MeasurementsGrid.tsx # 상세 측정치 그리드
|   `-- /layout
|-- /hooks
|-- /lib
|   |-- axios.ts
|   |-- react-query.ts
|   `-- utils.ts
|-- /queries             # React Query 관련 훅
|   |-- useProductsQuery.ts
|   |-- useMeasurementsQuery.ts
|   `-- useAnalysisQuery.ts
`-- /styles
    |-- _variables.scss
    |-- _mixins.scss
    `-- globals.scss
```

## 4. 핵심 기능 구현 방안

### 4.1. 데이터 조회 및 표시 (Master-Detail View)

- **Master View (제품 목록):**
  - `useProductsQuery` 훅을 사용하여 `/api/data/products` API를 호출하고, 제품 목록을 가져옵니다.
  - `components/grid/ProductsGrid.tsx` 컴포넌트는 이 데이터를 받아 AG-Grid로 렌더링합니다.
  - 서버사이드 페이징, 정렬, 필터링을 지원하며, 사용자의 조작에 따라 `useProductsQuery`의 파라미터를 변경하여 데이터를 다시 가져옵니다.
- **Detail View (상세 측정치):**
  - 사용자가 `ProductsGrid`에서 특정 행(제품)을 선택하면, 해당 `product_id`가 전역 상태 또는 URL 파라미터를 통해 관리됩니다.
  - `useMeasurementsQuery` 훅은 선택된 `product_id`를 사용하여 `/api/data/measurements/{product_id}` API를 호출합니다.
  - `components/grid/MeasurementsGrid.tsx` 컴포넌트는 조회된 9개 캠의 상세 측정 데이터를 별도의 그리드나 팝업 형태로 표시합니다.

### 4.2. 데이터 시각화 (차트)

- **분포 차트:**
  - 사용자가 'angle' 또는 'torque' 같은 분석 지표를 선택할 수 있는 UI를 제공합니다.
  - `useAnalysisQuery` 훅은 선택된 지표와 기간을 파라미터로 `/api/analysis/distribution` API를 호출합니다.
  - Recharts의 `AreaChart`를 사용하여 캠별 Z-score 분포를 시각화합니다.
- **기울기 추이 차트:**
  - `/api/prediction/slope` API를 주기적으로 폴링(polling)하여 `LineChart`로 실시간 변화를 시각화합니다.

### 4.3. 서버 상태 관리 (React Query)

- **데이터 캐싱 및 동기화:**
  - **`useProductsQuery`**: `staleTime`을 적절히 설정하여 캐시를 활용하되, 필터나 페이지 변경 시에는 `invalidateQueries`를 통해 데이터를 새로 고칩니다.
  - **`useMeasurementsQuery`**: `product_id`를 쿼리 키의 일부로 사용(`['measurements', productId]`)하여, 제품 선택이 바뀔 때마다 해당 제품의 상세 데이터를 자동으로 가져옵니다. 이 쿼리는 사용자가 다른 제품을 선택할 때까지 캐시된 상태로 유지될 수 있습니다.
- **쿼리 키 팩토리:** 쿼리 키의 일관성을 유지하기 위해 `queries/keys.ts`와 같은 파일에서 쿼리 키 생성 함수를 중앙에서 관리하는 것을 고려합니다.

### 4.4. 실시간 알람

- `useAlarmsQuery` 훅에서 `refetchInterval`을 사용하여 새로운 알람을 주기적으로 확인합니다.
- 수신된 알람은 `react-hot-toast` 등을 사용해 사용자에게 즉시 알리고, 필요한 경우 관련 제품 정보를 함께 표시하여 사용자가 문제 상황을 빠르게 인지하고 드릴다운할 수 있도록 돕습니다.

## 5. UI/UX 고려사항

- **반응형 디자인:** 다양한 화면 크기에 맞춰 최적의 레이아웃을 제공합니다.
- **로딩 상태:** `useQuery`에서 반환하는 `isLoading`, `isFetching` 상태를 활용하여 컴포넌트별로 스켈레톤 UI 또는 스피너를 표시합니다.
- **오류 상태:** API 요청 실패 시, 사용자에게 친절한 오류 메시지를 보여주고 재시도 옵션을 제공합니다.
