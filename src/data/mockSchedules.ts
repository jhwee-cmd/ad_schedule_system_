
/**
 * @file Hardcoded mock data for ad schedules and campaigns.
 * @description This refactored version provides a single, unified data structure
 * (`spreadsheetLayout`) that directly maps to the desired UI layout,
 * simplifying rendering logic immensely.
 */

import { Campaign, AdScheduleWithDetails } from '@/types/database';
import { format, addDays } from 'date-fns';

const today = new Date();
const formatDate = (date: Date): string => format(date, 'yyyy-MM-dd');

// =================================================================
// ▼▼▼ NEW: UNIFIED SPREADSHEET LAYOUT DATA ▼▼▼
// =================================================================

/**
 * @interface Slot
 * @description 개별 광고 구좌(표의 가장 마지막 레벨 행)를 정의합니다.
 * @param name - 구좌명 (e.g., "1순위", "타겟 1")
 * @param banner_id - 이 구좌와 매칭되는 고유 ID. 실제 광고 데이터를 연결하는 키.
 */
interface Slot {
  name: string;
  banner_id: string;
}

/**
 * @interface Placement
 * @description 지면(중분류)을 정의합니다. 여러 구좌(Slot)를 가집니다.
 * @param name - 지면명 (e.g., "메인홈팝업")
 * @param slots - 해당 지면에 속한 구좌 목록
 */
interface Placement {
  name: string;
  slots: Slot[];
}

/**
 * @interface Category
 * @description 최상위 구분(대분류)을 정의합니다. 여러 지면(Placement)을 가집니다.
 * @param name - 구분명 (e.g., "개별 상품")
 * @param placements - 해당 구분에 속한 지면 목록
 */
interface Category {
  name: string;
  placements: Placement[];
}

/**
 * UI 렌더링을 위한 통합 데이터 구조.
 * 이 배열을 순서대로 순회하면서 `rowspan`을 계산하면 스크린샷과 동일한 UI를 쉽게 만들 수 있습니다.
 */
export const spreadsheetLayout: Category[] = [
  {
    name: '개별 상품',
    placements: [
      {
        name: '메인홈팝업',
        slots: [
          { name: '1순위', banner_id: 'main_home_popup_p1' },
          { name: '2순위', banner_id: 'main_home_popup_p2' },
        ],
      },
      {
        name: '체크리스트',
        slots: [
          { name: '타겟 1', banner_id: 'checklist_t1' },
          { name: '타겟 2', banner_id: 'checklist_t2' },
          { name: '타겟 3', banner_id: 'checklist_t3' },
        ],
      },
      { name: '숏컷', slots: [{ name: '-', banner_id: 'shortcut' }] },
      { name: '메인홈피드', slots: [{ name: '-', banner_id: 'main_home_feed' }] },
      { name: '메인 홈 탭', slots: [{ name: '-', banner_id: 'main_home_tab' }] },
      { name: '앱진입 스플래시 배너', slots: [{ name: '-', banner_id: 'app_splash' }] },
    ],
  },
  {
    name: '퍼널 패키지',
    placements: [
      {
        name: '검색 퍼널',
        slots: [
          { name: '타겟 1', banner_id: 'funnel_search_t1' },
          { name: '타겟 2', banner_id: 'funnel_search_t2' },
          { name: '타겟 3', banner_id: 'funnel_search_t3' },
          { name: '제안 1', banner_id: 'funnel_search_p1' },
          { name: '제안 2', banner_id: 'funnel_search_p2' },
        ],
      },
      {
        name: '국내 여행 퍼널',
        slots: [
          { name: '타겟 1', banner_id: 'funnel_domestic_t1' },
          { name: '타겟 2', banner_id: 'funnel_domestic_t2' },
          { name: '타겟 3', banner_id: 'funnel_domestic_t3' },
          { name: '제안 1', banner_id: 'funnel_domestic_p1' },
          { name: '제안 2', banner_id: 'funnel_domestic_p2' },
        ],
      },
      {
        name: '해외 여행 퍼널',
        slots: [
          { name: '타겟 1', banner_id: 'funnel_overseas_t1' },
          { name: '타겟 2', banner_id: 'funnel_overseas_t2' },
          { name: '타겟 3', banner_id: 'funnel_overseas_t3' },
          { name: '제안 1', banner_id: 'funnel_overseas_p1' },
          { name: '제안 2', banner_id: 'funnel_overseas_p2' },
        ],
      },
      {
        name: '여행자 퍼널',
        slots: [
          { name: '타겟 1', banner_id: 'funnel_traveler_t1' },
          { name: '타겟 2', banner_id: 'funnel_traveler_t2' },
          { name: '타겟 3', banner_id: 'funnel_traveler_t3' },
          { name: '제안 1', banner_id: 'funnel_traveler_p1' },
          { name: '제안 2', banner_id: 'funnel_traveler_p2' },
        ],
      },
    ],
  },
  {
    name: '메인 퍼널',
    placements: [
      {
        name: '인터랙티브',
        slots: [
          { name: '타겟 1', banner_id: 'interactive_t1' },
          { name: '타겟 2', banner_id: 'interactive_t2' },
          { name: '타겟 3', banner_id: 'interactive_t3' },
          { name: '타겟 4', banner_id: 'interactive_t4' },
          { name: '타겟 5', banner_id: 'interactive_t5' },
          { name: '타겟 6', banner_id: 'interactive_t6' },
          { name: '타겟 7', banner_id: 'interactive_t7' },
          { name: 'Biz-core', banner_id: 'interactive_b1' },
          { name: 'Biz-core', banner_id: 'interactive_b2' },
          { name: '제안 1', banner_id: 'interactive_p1' },
          { name: '제안 2', banner_id: 'interactive_p2' },
        ],
      },
      {
        name: '메인홈 전면배너',
        slots: [
          { name: '타겟 1', banner_id: 'main_home_front_t1' },
          { name: '타겟 2', banner_id: 'main_home_front_t2' },
          { name: '타겟 3', banner_id: 'main_home_front_t3' },
          { name: 'Biz-core', banner_id: 'main_home_front_b1' },
          { name: 'Biz-core', banner_id: 'main_home_front_b2' },
          { name: 'Biz-core', banner_id: 'main_home_front_b3' },
          { name: '제안 1', banner_id: 'main_home_front_p1' },
          { name: '제안 2', banner_id: 'main_home_front_p2' },
        ],
      },
      {
        name: '메인홈 배너',
        slots: [
          { name: '타겟 1', banner_id: 'main_home_t1' },
          { name: '타겟 2', banner_id: 'main_home_t2' },
          { name: '타겟 3', banner_id: 'main_home_t3' },
          { name: 'Biz-core', banner_id: 'main_home_b1' },
          { name: '제안 1', banner_id: 'main_home_p1' },
          { name: '제안 2', banner_id: 'main_home_p2' },
        ],
      },
    ],
  },
  {
    name: 'CRM 알람 광고',
    placements: [
      {
        name: 'friend_talk',
        slots: [
          { name: '캠페인 1', banner_id: 'friend_talk_c1' },
          { name: '캠페인 2', banner_id: 'friend_talk_c2' },
          { name: '캠페인 3', banner_id: 'friend_talk_c3' },
        ],
      },
      {
        name: 'alarm_ad',
        slots: [
          { name: '캠페인 1', banner_id: 'alarm_ad_c1' },
          { name: '캠페인 2', banner_id: 'alarm_ad_c2' },
          { name: '캠페인 3', banner_id: 'alarm_ad_c3' },
        ],
      },
      {
        name: 'message_ad',
        slots: [
          { name: '캠페인 1', banner_id: 'message_ad_c1' },
          { name: '캠페인 2', banner_id: 'message_ad_c2' },
          { name: '캠페인 3', banner_id: 'message_ad_c3' },
        ],
      },
    ],
  },
];

// =================================================================
// ▼▼▼ LEGACY MOCK DATA (for backward compatibility) ▼▼▼
// =================================================================

export const mockCampaigns: Campaign[] = [
  {
    campaign_id: '11111111-1111-1111-1111-111111111111',
    advertiser_name: '삼성전자',
    sales_owner: '김철수',
    status: 'confirmed',
    budget: 5000000,
    description: '여름 맞이 특별 프로모션',
    created_at: today.toISOString(),
    updated_at: today.toISOString(),
  },
  {
    campaign_id: '22222222-2222-2222-2222-222222222222',
    advertiser_name: 'LG전자',
    sales_owner: '이영희',
    status: 'proposed',
    budget: 3000000,
    description: '신제품 런칭 캠페인',
    created_at: today.toISOString(),
    updated_at: today.toISOString(),
  },
  {
    campaign_id: '33333333-3333-3333-3333-333333333333',
    advertiser_name: '현대자동차',
    sales_owner: '박민수',
    status: 'confirmed',
    budget: 8000000,
    description: '신차 출시 캠페인',
    created_at: today.toISOString(),
    updated_at: today.toISOString(),
  },
];

export const mockAdSchedules: AdScheduleWithDetails[] = [
  {
    ad_schedule_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    campaign_id: '11111111-1111-1111-1111-111111111111',
    banner_id: 'main_home_popup_p1', // '1순위' 구좌
    start_date: formatDate(today),
    end_date: formatDate(addDays(today, 2)),
    guaranteed_exposure: 100000,
    memo: '메인홈 팝업 광고',
    is_bundle: false,
    bundle_name: '',
    campaign: mockCampaigns[0],
    targets: [{ id: '1', ad_schedule_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', country_code: 'KR', created_at: today.toISOString() }],
  },
  {
    ad_schedule_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    campaign_id: '11111111-1111-1111-1111-111111111111',
    banner_id: 'checklist_t1', // '타겟 1' 구좌
    start_date: formatDate(addDays(today, 1)),
    end_date: formatDate(addDays(today, 3)),
    guaranteed_exposure: 50000,
    memo: '체크리스트 타겟 광고',
    is_bundle: false,
    bundle_name: '',
    campaign: mockCampaigns[0],
    targets: [{ id: '2', ad_schedule_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', country_code: 'KR', created_at: today.toISOString() }],
  },
  {
    ad_schedule_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    campaign_id: '22222222-2222-2222-2222-222222222222',
    banner_id: 'shortcut',
    start_date: formatDate(today),
    end_date: formatDate(addDays(today, 5)),
    guaranteed_exposure: 75000,
    memo: 'LG 신제품 광고',
    is_bundle: false,
    bundle_name: '',
    campaign: mockCampaigns[1],
    targets: [{ id: '3', ad_schedule_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', country_code: 'US', created_at: today.toISOString() }],
  },
  {
    ad_schedule_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    campaign_id: '33333333-3333-3333-3333-333333333333',
    banner_id: 'main_home_t1',
    start_date: formatDate(addDays(today, 2)),
    end_date: formatDate(addDays(today, 4)),
    guaranteed_exposure: 120000,
    memo: '현대 신차 광고',
    is_bundle: false,
    bundle_name: '',
    campaign: mockCampaigns[2],
    targets: [
      { id: '4', ad_schedule_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', country_code: 'KR', created_at: today.toISOString() },
      { id: '5', ad_schedule_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', country_code: 'JP', created_at: today.toISOString() }
    ],
  },
  {
    ad_schedule_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    campaign_id: '11111111-1111-1111-1111-111111111111',
    banner_id: 'interactive_t1',
    start_date: formatDate(addDays(today, 3)),
    end_date: formatDate(addDays(today, 6)),
    guaranteed_exposure: 200000,
    memo: '삼성 인터랙티브 광고',
    is_bundle: false,
    bundle_name: '',
    campaign: mockCampaigns[0],
    targets: [],
  },
  {
    ad_schedule_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
    campaign_id: '22222222-2222-2222-2222-222222222222',
    banner_id: 'funnel_search_t1',
    start_date: formatDate(addDays(today, 1)),
    end_date: formatDate(addDays(today, 4)),
    guaranteed_exposure: 80000,
    memo: 'LG 검색 퍼널 광고',
    is_bundle: false,
    bundle_name: '',
    campaign: mockCampaigns[1],
    targets: [
      { id: '6', ad_schedule_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff', country_code: 'US', created_at: today.toISOString() },
      { id: '7', ad_schedule_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff', country_code: 'CA', created_at: today.toISOString() }
    ],
  },
];