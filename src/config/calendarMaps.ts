// 화면 라벨
export const LABEL_MAP = {
  "main_home_popup": "메인홈 팝업",
  "main_home_front": "메인홈 전면배너",
  "main_home_banner": "메인홈 배너",
  "main_home": "메인 홈",
  "interactive": "인터랙티브",
  "checklist": "체크리스트",
  "funnel_search": "검색 퍼널",
  "funnel_domestic": "국내 여행 퍼널",
  "funnel_oversea": "해외 여행 퍼널",
  "funnel_traveler": "여행자 퍼널",
  "friend_talk": "친구톡",
  "promo_fe": "프모페",
} as const;

// 타입/카테고리/표시 규칙
export const TYPE_RULE = {
  "interactive":     { type: "interactive", category: "인터랙티브", hasExposure: true,  hasCountry: false, color: "blue"  },
  "main_home_popup": { type: "banner",      category: "배너",         hasExposure: false, hasCountry: true,  color: "green" },
  "main_home_front": { type: "banner",      category: "배너",         hasExposure: false, hasCountry: true,  color: "green" },
  "main_home_banner":{ type: "banner",      category: "배너",         hasExposure: false, hasCountry: true,  color: "green" },
  "main_home":       { type: "banner",      category: "배너",         hasExposure: false, hasCountry: true,  color: "green" },
  "checklist":       { type: "funnel",      category: "퍼널",         hasExposure: false, hasCountry: true,  color: "purple"},
  "funnel_search":   { type: "funnel",      category: "퍼널",         hasExposure: false, hasCountry: true,  color: "purple"},
  "funnel_domestic": { type: "funnel",      category: "퍼널",         hasExposure: false, hasCountry: true,  color: "purple"},
  "funnel_oversea":  { type: "funnel",      category: "퍼널",         hasExposure: false, hasCountry: true,  color: "purple"},
  "funnel_traveler": { type: "funnel",      category: "퍼널",         hasExposure: false, hasCountry: true,  color: "purple"},
  "friend_talk":     { type: "alert",       category: "알림",         hasExposure: true,  hasCountry: false, color: "orange"},
  "promo_fe":        { type: "other",       category: "기타",         hasExposure: false, hasCountry: false, color: "gray"  },
} as const;

// 디자인 토큰(필요한 것만 사용)
export const TOKENS = {
  heights: { cell: "3rem" },
  colors: {
    primary: {50:"#EFF6FF",100:"#DBEAFE",500:"#3B82F6"},
    gray: {600:"#4B5563",200:"#E5E7EB"},
  },
  z: { booking: 10, summary: 30 }
} as const;
