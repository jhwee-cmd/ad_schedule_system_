'use client'

import { AdScheduleWithDetails, Campaign, SlotType } from '@/types/database'
import { slotTypes } from '@/data/masterData'
import { spreadsheetLayout } from '@/data/mockSchedules'
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, addDays, startOfDay, parse, isSameDay, getDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useState, useMemo, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { buildDailySummary, Span } from '@/lib/summary'
import AdScheduleForm from './AdScheduleForm'
import { ChevronLeft, ChevronRight, Plus, Search, X } from 'lucide-react'
import CellPill from '@/components/calendar/CellPill'
import { buildCellRuns, Booking } from '@/lib/cell-builder'
import { useDateRangeStore } from '@/state/dateRangeStore'

type BookingItem = { 
  basis_dt: string; 
  screen_id: string; 
  country_nm?: string | null; 
  guaranteed_exposure?: number | null 
}

interface SpreadsheetViewProps {
  adSchedules: AdScheduleWithDetails[]
  campaigns: Campaign[]
  externalBookings?: BookingItem[]
  onCreateSchedule: (schedule: any, targets: any[]) => Promise<void>
  onUpdateSchedule: (id: string, updates: any, targets?: any[]) => Promise<void>
  onDeleteSchedule: (id: string) => Promise<void>
  onAdClick: (schedule: AdScheduleWithDetails) => void
  onBookingCreated: () => Promise<void>
  loading?: boolean
}

const summaryConfig: { [key: string]: ('country' | 'exposure')[] } = {
  // 개별 상품
  'checklist_t1': ['country'],
  'checklist_t2': ['country'],
  'checklist_t3': ['country'],
  
  // 퍼널 패키지
  'funnel_search_t1': ['country'],
  'funnel_search_t2': ['country'],
  'funnel_search_t3': ['country'],
  'funnel_domestic_t1': ['country'],
  'funnel_domestic_t2': ['country'],
  'funnel_domestic_t3': ['country'],
  'funnel_overseas_t1': ['country'],
  'funnel_overseas_t2': ['country'],
  'funnel_overseas_t3': ['country'],
  'funnel_traveler_t1': ['country'],
  'funnel_traveler_t2': ['country'],
  'funnel_traveler_t3': ['country'],
  
  // 메인 퍼널
  'main_home_t1': ['country'],
  'main_home_t2': ['country'],
  'main_home_t3': ['country'],
  'main_home_front_t1': ['country'],
  'main_home_front_t2': ['country'],
  'main_home_front_t3': ['country'],
  'interactive_t1': ['exposure'],
  'interactive_t2': ['exposure'],
  'interactive_t3': ['exposure'],
  'interactive_t4': ['exposure'],
  'interactive_t5': ['exposure'],
  'interactive_t6': ['exposure'],
  'interactive_t7': ['exposure'],
};

// screen_id ↔ banner_id 매칭 함수 단일화(팝업 포함)
const normBase = (s?: string | null) => {
  const v = String(s ?? '').toLowerCase().replace(/\s+/g, '');
  const base = v.replace(/(_t\d+|[-_.]?v\d+|-\d+)$/, '');
  return base
    .replace(/^mainhomepopup.*$/, 'main_home_popup')  // ← 팝업 포함
    .replace(/^mainhomefront$/, 'main_home_front')
    .replace(/^mainhomebanner$/, 'main_home_banner')
    .replace(/^mainhome$/, 'main_home')
    .replace(/^checklist$/, 'checklist')
    .replace(/^interactive.*$/, 'interactive')
    .replace(/^funnelsearch.*$/, 'funnel_search')
    .replace(/^funneldomestic.*$/, 'funnel_domestic')
    .replace(/^funne(l)?over(sea|seas).*$/, 'funnel_oversea')
    .replace(/^funneltraveler.*$/, 'funnel_traveler');
};

const isSameSlot = (bannerId: string, screenId: string) => normBase(bannerId) === normBase(screenId);

// 날짜 비교를 로컬 00:00 기준으로 통일
const parseYmd = (ymd: string) => parse(ymd, 'yyyy-MM-dd', new Date()); // 절대 new Date(ymd) 금지

const dropdownOptions = ['전체 보기', ...spreadsheetLayout.map(category => category.name)];

function renderRowCells(row: { banner_id: string }, weekDays: Date[], bookings: Booking[]) {
  const runs = buildCellRuns({ rowBannerId: row.banner_id, weekDays, bookings });

  return runs.map((r, idx) => {
    if (!r.labelTop && !r.labelBottom) {
      return <td key={`empty-${idx}`} className="grid-cell" />;
    }
    return (
      <td key={`run-${idx}`} colSpan={r.span} className="grid-cell p-0"
          style={{ "--cell-h": "3rem" } as React.CSSProperties}>
        <CellPill labelTop={r.labelTop} labelBottom={r.labelBottom} />
      </td>
    );
  });
}

const formatAdInfo = (schedule: AdScheduleWithDetails): React.ReactNode => {
  const salesOwner = schedule.campaign?.sales_owner || '담당자 미지정';
  const advertiserName = schedule.campaign?.advertiser_name || '광고주 미지정';
  const targetCountries = schedule.targets.map(t => t.country_code).join('+');
  const dailyExposure = schedule.guaranteed_exposure > 0 
    ? `(일노출 ${(schedule.guaranteed_exposure / 10000).toLocaleString()}만)` 
    : '';

  return (
    <div className="break-words text-left px-1">
      <span className="font-semibold">[광고 {salesOwner}] {advertiserName}</span>
      {targetCountries && <span className="text-gray-600"> - {targetCountries}</span>}
      {dailyExposure && <span className="text-gray-500 ml-1">{dailyExposure}</span>}
    </div>
  );
};

export default function SpreadsheetView({
  adSchedules,
  campaigns,
  externalBookings,
  onCreateSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
  onAdClick,
  onBookingCreated,
  loading = false
}: SpreadsheetViewProps) {
  const SUMMARY_PLACEMENT: 'top' | 'bottom' = 'top'
  const PLACE_SUMMARY_TOP = SUMMARY_PLACEMENT === 'top'
  const [currentDate, setCurrentDate] = useState(new Date())
  const [searchAdvertiser, setSearchAdvertiser] = useState('')
  const [openCreate, setOpenCreate] = useState(false)
  const [selectedPlacementGroup, setSelectedPlacementGroup] = useState('전체 보기');
  const [zoom, setZoom] = useState(1); // 0.8 ~ 1.6 권장
  type Density = 'compact' | 'cozy' | 'comfortable';
  const [density, setDensity] = useState<Density>('cozy');

  // Horizontal infinite scroll config
  const COL_PX = 128;
  const CHUNK_DAYS = 7;
  const MAX_WEEKS = 12;
  const [startDate, setStartDate] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [visibleDays, setVisibleDays] = useState(CHUNK_DAYS * 6);
  const days = useMemo(() => Array.from({ length: visibleDays }, (_, i) => addDays(startDate, i)), [startDate, visibleDays]);

  const scRef = useRef<HTMLDivElement | null>(null);
  const isLoadingRef = useRef(false);
  const lastLeftRef = useRef(0);

  const zoomVars = useMemo(() => ({ ['--z' as any]: zoom }), [zoom]);

  // 실시간 타이틀 갱신을 위한 스토어 사용
  const draft = useDateRangeStore(s => s.draft);



  // Sticky left offsets (px) computed from actual header cell widths
  const thRef1 = useRef<HTMLTableCellElement | null>(null); // 구분
  const thRef2 = useRef<HTMLTableCellElement | null>(null); // 지면명
  const thRef3 = useRef<HTMLTableCellElement | null>(null); // 구좌명
  const headRowRef = useRef<HTMLTableRowElement | null>(null);
  const dayRefs = useRef<(HTMLTableCellElement|null)[]>([]);

  // 주 스냅 관련 상태
  const WEEK_STARTS_ON = 1; // 월요일 시작
  const [weekIdxList, setWeekIdxList] = useState<number[]>([]);
  const [weekLefts, setWeekLefts] = useState<number[]>([]);
  const [visibleWeekIdx, setVisibleWeekIdx] = useState(0);
  const scrollEndTimer = useRef<number | null>(null);

  const [left1, setLeft1] = useState<number>(0);
  const [left2, setLeft2] = useState<number>(0);
  const [left3, setLeft3] = useState<number>(0);
  const [headH, setHeadH] = useState<number>(48);

  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => {
      const w1 = Math.round(thRef1.current?.offsetWidth ?? 0);
      const w2 = Math.round(thRef2.current?.offsetWidth ?? 0);
      const w3 = Math.round(thRef3.current?.offsetWidth ?? 0);
      setLeft1(w1);
      setLeft2(w1 + w2);
      setLeft3(w1 + w2 + w3);
      setHeadH(Math.round(headRowRef.current?.offsetHeight ?? 48));
    });
    return () => cancelAnimationFrame(id);
  }, [zoom, density, selectedPlacementGroup]);

  // 주 시작 인덱스 계산
  const getWeekStarts = useCallback(() => {
    const idx: number[] = [];
    days.forEach((d, i) => {
      if (getDay(d) === WEEK_STARTS_ON) idx.push(i);
    });
    // 첫 주가 주중에 시작했을 수 있으니 맨 앞(0) 보정
    if (idx[0] !== 0) idx.unshift(0);
    return idx;
  }, [days]);

  // 스크롤 기준 좌표: "해당 일자 헤더의 좌측 끝"을 sticky 블록 바로 오른쪽에 맞춤
  const measureWeekLefts = useCallback(() => {
    const anchors = getWeekStarts();
    const lefts = anchors.map(i => {
      const el = dayRefs.current[i];
      if (!el || !scRef.current) return 0;
      const headerLeft = el.offsetLeft;            // 테이블 내부 좌표
      return Math.max(0, headerLeft - left3);      // sticky 3열 너비만큼 보정
    });
    setWeekIdxList(anchors);
    setWeekLefts(lefts);
  }, [getWeekStarts, left3]);

  // 리사이즈/줌/밀도 변경 시 앵커 재계산
  useLayoutEffect(() => {
    const id = requestAnimationFrame(measureWeekLefts);
    return () => cancelAnimationFrame(id);
  }, [measureWeekLefts, zoom, density, selectedPlacementGroup, days]);

  // 스냅된 주 시작/끝
  const snappedStart = useMemo(() => {
    const idx = weekIdxList[visibleWeekIdx] ?? 0;
    return days[idx];
  }, [days, weekIdxList, visibleWeekIdx]);

  const weekStart = useMemo(() => {
    if (draft?.from && draft?.to) {
      return startOfWeek(draft.from, { weekStartsOn: WEEK_STARTS_ON });
    }
    return startOfWeek(snappedStart, { weekStartsOn: WEEK_STARTS_ON });
  }, [draft, snappedStart]);

  const weekEnd = useMemo(() => {
    return endOfWeek(weekStart, { weekStartsOn: WEEK_STARTS_ON });
  }, [weekStart]);

  const title = useMemo(() => {
    // 예: "8월 18일 주 (8/18 ~ 8/24)"
    return `${format(weekStart, 'M월 d일', { locale: ko })} 주 (${format(weekStart, 'M/d')} ~ ${format(weekEnd, 'M/d')})`;
  }, [weekStart, weekEnd]);

  const densityClass = {
    compact: 'text-[12px] leading-[18px] [&_td]:py-1 [&_th]:py-1',
    cozy: 'text-[13px] leading-[20px] [&_td]:py-1.5 [&_th]:py-1.5',
    comfortable: 'text-[14px] leading-[22px] [&_td]:py-2 [&_th]:py-2',
  }[density];

  const filteredSchedules = useMemo(() => {
    if (!searchAdvertiser) return adSchedules
    return adSchedules.filter(schedule => 
      schedule.campaign?.advertiser_name?.toLowerCase().includes(searchAdvertiser.toLowerCase())
    )
  }, [adSchedules, searchAdvertiser])

  // 내부(in-memory) 생성 대신, 외부가 오면 외부만 사용하도록 통일
  const bookings: BookingItem[] = useMemo(() => {
    if (externalBookings?.length) return externalBookings;
    
    // 기존 in-memory 로직 (fallback)
    const items: BookingItem[] = []
    
    // Add adSchedules data
    adSchedules.forEach((s) => {
      const start = parseISO(s.start_date)
      const end = parseISO(s.end_date)
      const allDays = eachDayOfInterval({ start, end })
      const countryList = s.targets?.map((t) => t.country_code).filter(Boolean) || []
      const country_nm = countryList.join(',')
      allDays.forEach((d) => {
        const ds = format(d, 'yyyy-MM-dd')
        items.push({
          basis_dt: ds,
          screen_id: s.banner_id,
          country_nm,
          guaranteed_exposure: s.guaranteed_exposure ?? 0,
        })
      })
    })
    
    return items
  }, [externalBookings, adSchedules])

  // Create booking map for visual display
  const bookingMap = useMemo(() => {
    const map = new Map<string, any[]>()
    bookings.forEach(booking => {
      const key = `${booking.basis_dt}:${booking.screen_id}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(booking)
    })
    return map
  }, [bookings])

  const scheduleMap = useMemo(() => {
    const map = new Map<string, AdScheduleWithDetails[]>()
    filteredSchedules.forEach(schedule => {
      const startDate = parseISO(schedule.start_date)
      const endDate = parseISO(schedule.end_date)
      const days = eachDayOfInterval({ start: startDate, end: endDate })
      days.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const key = `${dateStr}:${schedule.banner_id}`
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(schedule)
      })
    })
    return map
  }, [filteredSchedules])

  // 즉시 원인 파악용 진단 로그 추가(임시)
  useEffect(() => {
    if (!bookings.length) return;
    console.log('🔍 Booking 진단:', {
      totalBookings: bookings.length,
      externalBookings: externalBookings?.length || 0,
      sampleBookings: bookings.slice(0, 3).map(b => ({ basis_dt: b.basis_dt, screen_id: b.screen_id }))
    });
  }, [bookings, externalBookings]);

  // Determine which screen_ids (here banner_ids) belong to country vs impression summaries
  const SCREENS_COUNTRIES: string[] = useMemo(() =>
    Object.keys(summaryConfig).filter((k) => summaryConfig[k]?.includes('country')),
  [])
  const SCREENS_IMP: string[] = useMemo(() =>
    Object.keys(summaryConfig).filter((k) => summaryConfig[k]?.includes('exposure')),
  [])

  // Banner normalization for per-section summary
  const normBannerBase = (s?: string | null) => {
    const v = String(s ?? '').toLowerCase().replace(/\s+/g, '')
    const base = v.replace(/(_t\d+|[-_.]?v\d+|-\d+)$/, '')
    return base
      .replace(/^mainhomefront$/, 'main_home_front')
      .replace(/^mainhome$/, 'main_home')
      .replace(/^checklist$/, 'checklist')
      .replace(/^interactive.*$/, 'interactive')
      .replace(/^funnelsearch.*$/, 'funnel_search')
      .replace(/^funneldomestic.*$/, 'funnel_domestic')
      .replace(/^funne(l)?over(sea|seas).*$/, 'funnel_oversea')
      .replace(/^funneltraveler.*$/, 'funnel_traveler')
  }

  type SummarySpec =
    | { mode: 'countries'; label: '전체 타겟 국가'; bannerBases: string[]; rowClass: string }
    | { mode: 'impressions'; label: '총 보장 노출'; bannerBases: string[]; rowClass: string }

  function getSummarySpec(sectionBannerIds: string[]): SummarySpec | null {
    if (!sectionBannerIds.length) return null
    const bases = sectionBannerIds.map(normBannerBase)
    if (bases.includes('interactive')) {
      return {
        mode: 'impressions',
        label: '총 보장 노출',
        bannerBases: ['interactive'],
        rowClass: 'bg-blue-50/60 text-blue-700',
      }
    }
    return {
      mode: 'countries',
      label: '전체 타겟 국가',
      bannerBases: bases,
      rowClass: 'bg-amber-50/60 text-amber-800',
    }
  }

  const renderMerged = (
    spans: { start: string; span: number; value: string }[],
    byDate: Record<number, string | number>,
    tdClass = ''
  ) => {
    const startSet = new Set(spans.map((s) => +new Date(s.start)))
    const out: ReactNode[] = []
    for (let i = 0; i < days.length; i++) {
      const k = +startOfDay(days[i])
      if (!startSet.has(k)) continue
      const s = spans.find((x) => +new Date(x.start) === k)!
      out.push(
        <td key={k} colSpan={s.span} className={`text-center grid-cell ${tdClass}`}>
          {String(byDate[k] ?? '—')}
        </td>
      )
      i += s.span - 1
    }
    return out
  }
  
  const renderableGroups = useMemo(() => {
    const categoriesToShow = selectedPlacementGroup === '전체 보기'
      ? spreadsheetLayout
      : spreadsheetLayout.filter(category => category.name === selectedPlacementGroup);

    return categoriesToShow.map((category, categoryIdx) => {
      const processedPlacements = category.placements.map((placement, placementIdx) => {
        const processedSlots = placement.slots.map((slot, slotIndex) => {
          const summaryTypes = summaryConfig[slot.banner_id];
          let summaryData = null;

          if (summaryTypes) {
            const dailyData = days.map(day => {
              const schedules = scheduleMap.get(`${format(day, 'yyyy-MM-dd')}:${slot.banner_id}`) || [];
              let summaryText = '-';
              
              if (summaryTypes.includes('country')) {
                const countries = new Set(schedules.flatMap(s => s.targets.map(t => t.country_code)));
                if (countries.size > 0) {
                  summaryText = Array.from(countries).join(', ');
                }
              }
              if (summaryTypes.includes('exposure')) {
                const total = schedules.reduce((sum, s) => sum + s.guaranteed_exposure, 0);
                if (total > 0) {
                  summaryText = `${(total / 10000).toLocaleString()}만`;
                }
              }
              
              return { summaryText, date: day, colSpan: 1, skip: false };
            });
            
            // 셀 병합 로직: 동일한 값이 연속될 경우 병합
            for (let i = 0; i < dailyData.length; i++) {
              if (dailyData[i].skip) continue;
              let span = 1;
              for (let j = i + 1; j < dailyData.length; j++) {
                if (dailyData[j].summaryText === dailyData[i].summaryText && dailyData[i].summaryText !== '-') {
                  span++;
                  dailyData[j].skip = true;
                } else break;
              }
              dailyData[i].colSpan = span;
            }
            summaryData = dailyData;
          }

          const adData = days.map(day => ({
            schedules: scheduleMap.get(`${format(day, 'yyyy-MM-dd')}:${slot.banner_id}`) || [],
            date: day, colSpan: 1, skip: false
          }));
          
          // 광고 데이터 셀 병합 로직
          for (let i = 0; i < adData.length; i++) {
            if (adData[i].skip) continue;
            const firstAdId = adData[i].schedules[0]?.ad_schedule_id;
            if (!firstAdId || adData[i].schedules.length > 1) continue;
            let span = 1;
            for (let j = i + 1; j < adData.length; j++) {
              const nextFirstAdId = adData[j].schedules[0]?.ad_schedule_id;
              if (adData[j].schedules.length === 1 && nextFirstAdId === firstAdId) {
                span++;
                adData[j].skip = true;
              } else break;
            }
            adData[i].colSpan = span;
          }

          return {
            slot,
            summaryData,
            adData,
            __key: `${categoryIdx}-${placementIdx}-${slotIndex}-${slot.banner_id}`,
          };
        });

        return {
          placement,
          slots: processedSlots,
          __key: `${categoryIdx}-${placementIdx}-${placement.name}`,
        };
      });

      return {
        category,
        placements: processedPlacements,
        __key: `${categoryIdx}-${category.name}`,
      };
    });
  }, [selectedPlacementGroup, scheduleMap, days]);

  // 스크롤 종료 감지 → 가장 가까운 주로 스냅
  const snapToNearestWeek = useCallback(() => {
    const sc = scRef.current;
    if (!sc || !weekLefts.length) return;
    const x = sc.scrollLeft;
    // 가장 가까운 앵커 찾기
    let best = 0, bestDiff = Number.POSITIVE_INFINITY;
    weekLefts.forEach((L, i) => {
      const diff = Math.abs(L - x);
      if (diff < bestDiff) { bestDiff = diff; best = i; }
    });
    sc.scrollTo({ left: weekLefts[best], behavior: 'smooth' });
    setVisibleWeekIdx(best);
  }, [weekLefts]);

  // 좌/우 버튼으로 주 단위 이동
  const goWeek = (delta: number) => {
    if (!scRef.current || !weekLefts.length) return;
    const next = Math.min(
      weekLefts.length - 1,
      Math.max(0, visibleWeekIdx + delta),
    );
    scRef.current.scrollTo({ left: weekLefts[next], behavior: 'smooth' });
    setVisibleWeekIdx(next);
  };

  const goToPreviousWeek = () => goWeek(-1);
  const goToNextWeek = () => goWeek(1);

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const sc = scRef.current;
    if (!sc) return;

    const left = sc.scrollLeft;
    const dirRight = left > lastLeftRef.current;
    lastLeftRef.current = left;

    const nearRight = left + sc.clientWidth >= sc.scrollWidth - COL_PX * 2;
    const nearLeft = left <= COL_PX * 2;

    if (isLoadingRef.current) return;

    if (dirRight && nearRight) {
      isLoadingRef.current = true;
      setVisibleDays(v => {
        const maxDays = MAX_WEEKS * 7;
        const next = v + CHUNK_DAYS;
        if (next <= maxDays) {
          requestAnimationFrame(() => { isLoadingRef.current = false; });
          return next;
        }
        setStartDate(d => addDays(d, CHUNK_DAYS));
        requestAnimationFrame(() => {
          if (scRef.current) scRef.current.scrollLeft -= COL_PX * CHUNK_DAYS;
          isLoadingRef.current = false;
        });
        return maxDays;
      });
      return;
    }

    if (!dirRight && nearLeft) {
      isLoadingRef.current = true;
      setStartDate(d => addDays(d, -CHUNK_DAYS));
      setVisibleDays(v => Math.min(v + CHUNK_DAYS, MAX_WEEKS * 7));
      requestAnimationFrame(() => {
        if (scRef.current) scRef.current.scrollLeft += COL_PX * CHUNK_DAYS;
        isLoadingRef.current = false;
      });
    }

    // 스크롤 종료 시 주 스냅
    if (scrollEndTimer.current) window.clearTimeout(scrollEndTimer.current);
    scrollEndTimer.current = window.setTimeout(() => {
      snapToNearestWeek();
    }, 120); // 관성 스크롤 대기
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">광고사업팀 스케줄 관리</h2>
        <div className="flex items-center gap-4">
          <select 
            value={selectedPlacementGroup} 
            onChange={(e) => setSelectedPlacementGroup(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm font-semibold bg-white"
          >
            {dropdownOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="광고주 검색"
              value={searchAdvertiser}
              onChange={(e) => setSearchAdvertiser(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-md text-sm w-48"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">배율</label>
            <input
              type="range"
              min={0.8}
              max={1.6}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-28"
            />
            <span className="tabular-nums text-sm w-12 text-right">{Math.round(zoom * 100)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">밀도</label>
            <select
              value={density}
              onChange={(e) => setDensity(e.target.value as Density)}
              className="px-2 py-2 border rounded-md text-sm bg-white"
            >
              <option value="compact">컴팩트</option>
              <option value="cozy">보통</option>
              <option value="comfortable">넉넉</option>
            </select>
          </div>
          <button
            onClick={() => setOpenCreate(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-md transition-colors bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus size={16} />
            광고 등록
          </button>
        </div>
      </div>

      {/* Collapsible 등록 폼 패널 */}
      <div className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${openCreate ? 'max-h-[80vh] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-4 border-b bg-white">
          <AdScheduleForm
            campaigns={campaigns}
            onCancel={() => setOpenCreate(false)}
            onSave={onCreateSchedule}
            onBookingCreated={onBookingCreated}
          />
        </div>
      </div>

      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <button onClick={goToPreviousWeek} className="p-2 hover:bg-gray-200 rounded">
            <ChevronLeft size={20} />
          </button>
          <h3 className="text-lg font-semibold">
            {title}
          </h3>
          <button onClick={goToNextWeek} className="p-2 hover:bg-gray-200 rounded">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div
        ref={scRef}
        onScroll={handleScroll}
        className="overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x [scrollbar-gutter:stable_both-edges] [-webkit-overflow-scrolling:touch] relative smooth-scroll"
      >
        {/* ⬇⬇⬇ 추가: 헤더(날짜/라벨) 전체를 덮는 왼쪽 가림막 */}
        <div
          aria-hidden
          className="mask-left-header"
          style={{
            position: 'sticky',
            left: 0,
            top: 0,                        // 헤더 1단의 최상단부터 덮기
            width: left3,                  // 고정 3열 총 너비
            height: 'var(--head-total)',   // 헤더 2줄 높이 전체
            zIndex: 85,                    // 날짜 th(z-70) 위, 라벨 th(z-90) 아래
            background: '#fff',
            borderRight: '1px solid var(--grid)',
            pointerEvents: 'none',
          }}
        />

        {/* ⬇ 기존 바디 가림막은 헤더 총 높이에 맞춰 top/height 재설정 */}
        <div
          aria-hidden
          className="mask-left-body"
          style={{
            position: 'sticky',
            left: 0,
            top: 'var(--head-total)',
            width: left3,
            height: 'calc(100% - var(--head-total))',
            zIndex: 50,
            background: '#fff',
            pointerEvents: 'none',
          }}
        />

        <div className="inline-block min-w-max" style={zoomVars}>
                  <table className={`table-grid ${densityClass}`}>
          <thead>
            {/* 1단: 날짜 헤더(좌측 3칸 비워두고, 날짜는 여기서만 표시) */}
            <tr className="bg-white head-dates">
              {/* 비워두는 3칸 (sticky + 좌측 오프셋 적용) */}
              <th className="sticky top-0 left-0 z-[90] bg-white p-2 minw-col1 grid-head sticky-col" />
              <th className="sticky top-0 z-[90] bg-white p-2 minw-col2 grid-head sticky-col" style={{ left: left1 }} />
              <th className="sticky top-0 z-[90] bg-white p-2 minw-col3 grid-head sticky-col" style={{ left: left2 }} />
              {/* 날짜 헤더 (지도: days) */}
              {days.map((day, i) => (
                <th
                  key={day.toISOString()}
                  ref={(el) => { dayRefs.current[i] = el; }}
                  className="sticky top-0 z-[70] bg-white p-2 minw-day text-center grid-head grid-cell"
                >
                  {format(day, 'E M/d', { locale: ko })}
                </th>
              ))}
            </tr>

            {/* 2단: 고정열 라벨(구분/지면명/구좌명) + 날짜 칸은 빈칸(격자선만) */}
            <tr ref={headRowRef} className="bg-white head-labels">
              <th ref={thRef1} className="sticky z-[90] bg-white p-2 minw-col1 grid-head sticky-col" style={{ top: 'var(--head-h1)' }}>
                구분
              </th>
              <th ref={thRef2} className="sticky z-[90] bg-white p-2 minw-col2 grid-head sticky-col" style={{ left: left1, top: 'var(--head-h1)' }}>
                지면명
              </th>
              <th ref={thRef3} className="sticky z-[90] bg-white p-2 minw-col3 grid-head sticky-col" style={{ left: left2, top: 'var(--head-h1)' }}>
                구좌명
              </th>
              {/* 날짜 영역은 격자 정렬만 맞추고 내용은 없음 */}
              {days.map((day) => (
                <th key={`empty-${day.toISOString()}`} className="sticky z-[60] bg-white p-2 minw-day grid-head grid-cell" style={{ top: 'var(--head-h1)' }} />
              ))}
            </tr>
          </thead>
          <tbody>
            {renderableGroups.map(category => {
              const rows: ReactNode[] = [];
              let currentRowIndex = 0;
              
              // For each placement, we will render its body rows and optionally one summary row.
              // The category header cell will span all rows we push into `rows`.
              let totalRows = 0;
              
              // Render rows for each placement and slot
              category.placements.forEach((placement) => {
                // Section context
                const rowsInThisSection: string[] = placement.slots.map((s: any) => s.slot?.banner_id || '')
                const spec = getSummarySpec(rowsInThisSection)
                const bodyCount = placement.slots.length
                const hasSummary = !!spec
                const groupRowSpan = bodyCount + (hasSummary ? 1 : 0)

                // Optional TOP summary row
                if (PLACE_SUMMARY_TOP && spec) {
                  const summary = buildDailySummary(
                    bookings,
                    days,
                    spec.mode,
                    spec.bannerBases,
                    6,
                    normBannerBase
                  )
                  rows.push(
                    <tr key={`summary-top-${spec.mode}-${(category as any).__key}-${(placement as any).__key}`} className={`h-10 ${spec.rowClass}`}>
                      {/* 1st column: group cell spans body + summary */}
                                             <td rowSpan={groupRowSpan} className="sticky left-0 z-[90] bg-white p-2 sticky-col grid-cell" style={{ top: 'var(--head-total)' }}>
                        {category.category.name}
                      </td>
                      {/* 2nd column: label */}
                                             <td className={`sticky z-[80] ${spec.rowClass} font-medium p-2 sticky-col grid-cell`} style={{ left: left1, top: 'var(--head-total)' }}>
                        {spec.label}
                      </td>
                      {/* 3rd column: empty structural */}
                                             <td className={`sticky z-[80] ${spec.rowClass} sticky-col grid-cell`} style={{ left: left2, top: 'var(--head-total)' }} />
                      {renderMerged(summary.spans, summary.byDate, spec.mode === 'impressions' ? 'tabular-nums' : 'text-sm')}
                    </tr>
                  )
                  currentRowIndex++
                }

                // Body rows for this placement
                placement.slots.forEach((slot, slotIndex) => {
                  const isFirstRowOfPlacement = slotIndex === 0
                  rows.push(
                    <tr key={`${(category as any).__key}-${(placement as any).__key}-${(slot as any).__key}`} className="h-8 hover:bg-gray-50">
                      {/* 1st column: only when summary is at bottom and this is first body row */}
                      {!PLACE_SUMMARY_TOP && isFirstRowOfPlacement && (
                        <td rowSpan={groupRowSpan} className="sticky left-0 z-[90] bg-white p-2 sticky-col grid-cell" style={{ top: 'var(--head-total)' }}>
                          {category.category.name}
                        </td>
                      )}
                      {/* 2nd column: placement name (rowSpan across body rows only) */}
                      {isFirstRowOfPlacement && (
                        <td
                          rowSpan={bodyCount}
                          className="sticky z-[80] bg-white p-2 text-sm font-semibold align-top text-black sticky-col grid-cell"
                          style={{ left: left1, top: 'var(--head-total)' }}
                        >
                          {placement.placement?.name ?? ''}
                        </td>
                      )}
                      {/* 3rd column: slot name */}
                      <td
                        className="sticky z-[80] bg-white p-2 text-sm text-black pl-8 font-medium sticky-col grid-cell"
                        style={{ left: left2, top: 'var(--head-total)' }}
                      >
                        {slot.slot?.name ?? ''}
                      </td>
                      {slot.adData.map((data, dayIndex) => {
                        if (data.skip) return null
                        
                        // 기존 스케줄이 있으면 기존 로직 사용
                        if (data.schedules && data.schedules.length > 0) {
                          return (
                            <td
                              key={`${(category as any).__key}-${(placement as any).__key}-${(slot as any).__key}-${dayIndex}`}
                              colSpan={data.colSpan}
                              className="grid-cell p-1 text-xs relative align-middle minw-day text-center font-bold text-[0.95rem]"
                            >
                              <div
                                className={`p-1 rounded h-full flex flex-col justify-center text-center space-y-1 ${
                                  data.schedules.length > 1 ? 'bg-red-100' : 'bg-blue-100'
                                }`}
                              >
                                {data.schedules.map((ad: AdScheduleWithDetails) => (
                                  <div
                                    key={ad.ad_schedule_id}
                                    onClick={() => onAdClick(ad)}
                                    className="cursor-pointer hover:bg-blue-200 p-1 rounded"
                                  >
                                    {formatAdInfo(ad)}
                                  </div>
                                ))}
                              </div>
                            </td>
                          )
                        }
                        
                        // Booking이 있으면 새로운 CellPill 사용
                        const cellBookings = bookings.filter(
                          b => isSameDay(parseYmd(b.basis_dt), days[dayIndex]) && isSameSlot(slot.slot?.banner_id || '', b.screen_id)
                        );
                        
                        if (cellBookings.length > 0) {
                          // 새로운 buildCellRuns 사용
                          const weekDays = days;
                          const row = { banner_id: slot.slot?.banner_id || '' };
                          const cellRuns = buildCellRuns({ rowBannerId: row.banner_id, weekDays, bookings: bookings as Booking[] });
                          
                          // 해당 날짜의 셀만 렌더링
                          const dayCell = cellRuns[dayIndex];
                          if (dayCell) {
                            return (
                              <td
                                key={`${(category as any).__key}-${(placement as any).__key}-${(slot as any).__key}-${dayIndex}`}
                                colSpan={dayCell.span || 1}
                                className="grid-cell p-0"
                              >
                                <CellPill labelTop={dayCell.labelTop} labelBottom={dayCell.labelBottom} />
                              </td>
                            )
                          }
                        }
                        
                        // 빈 셀
                        return (
                          <td
                            key={`${(category as any).__key}-${(placement as any).__key}-${(slot as any).__key}-${dayIndex}`}
                            colSpan={data.colSpan}
                            className="grid-cell p-1 text-xs relative align-middle minw-day text-center"
                          >
                            <div className="h-full w-full flex items-center justify-center text-gray-300">-</div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                  currentRowIndex++
                })

                // Optional BOTTOM summary row
                if (!PLACE_SUMMARY_TOP && spec) {
                  const summary = buildDailySummary(
                    bookings,
                    days,
                    spec.mode,
                    spec.bannerBases,
                    6,
                    normBannerBase
                  )
                  rows.push(
                    <tr key={`summary-bottom-${spec.mode}-${(category as any).__key}-${(placement as any).__key}`} className={`h-10 ${spec.rowClass}`}>
                      {/* 1st column omitted; covered by rowSpan on first body row */}
                      <td className={`sticky z-[80] ${spec.rowClass} font-medium p-2 sticky-col grid-cell`} style={{ left: left1, top: 'var(--head-total)' }}>
                        {spec.label}
                      </td>
                      <td className={`sticky z-[80] ${spec.rowClass} sticky-col grid-cell`} style={{ left: left2, top: 'var(--head-total)' }} />
                      {renderMerged(summary.spans, summary.byDate, spec.mode === 'impressions' ? 'tabular-nums' : 'text-sm')}
                    </tr>
                  )
                  currentRowIndex++
                }
              })
              
              return rows;
            })}
          </tbody>
        </table>
        </div>
      </div>

      {false}
    </div>
  );
}
