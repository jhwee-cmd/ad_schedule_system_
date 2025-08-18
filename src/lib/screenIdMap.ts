// 제품명 → base screen key (필요 시 계속 보강)
export const PRODUCT_TO_BASE: Record<string, string> = {
  '인터랙티브 배너': 'interactive',
  '메인홈 전면배너': 'main_home_front',
  '메인홈 배너': 'main_home_banner',
  '메인 홈': 'main_home',
  '체크리스트': 'checklist',
  '검색 퍼널': 'funnel_search',
  '국내 여행 퍼널': 'funnel_domestic',
  '해외 여행 퍼널': 'funnel_oversea',
  '여행자 퍼널': 'funnel_traveler',
  '친구톡': 'friend_talk',
  '프모페': 'promo_fe',
};

// 드롭다운용 제품명 목록
export const PRODUCT_OPTIONS = Object.keys(PRODUCT_TO_BASE).map(name => ({
  value: name,
  label: name
}));

// base → 최종 screen_id 생성 규칙(프로젝트 규칙에 맞게 수정 가능)
export const resolveScreenId = (base: string) => `${base}_t1`;
