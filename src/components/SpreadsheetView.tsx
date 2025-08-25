'use client'

import { AdScheduleWithDetails, Campaign, SlotType } from '@/types/database'
import { slotTypes } from '@/data/masterData'
import { spreadsheetLayout } from '@/data/mockSchedules'
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, addDays, startOfDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useState, useMemo, useRef, useEffect } from 'react'
import type { ReactNode } from 'react'
import { buildDailySummary, Span } from '@/lib/summary'
import AdScheduleForm from './AdScheduleForm'
import { ChevronLeft, ChevronRight, Plus, Search, X } from 'lucide-react'

interface SpreadsheetViewProps {
  adSchedules: AdScheduleWithDetails[]
  campaigns: Campaign[]
  onCreateSchedule: (schedule: any, targets: any[]) => Promise<void>
  onUpdateSchedule: (id: string, updates: any, targets?: any[]) => Promise<void>
  onDeleteSchedule: (id: string) => Promise<void>
  onAdClick: (schedule: AdScheduleWithDetails) => void
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

const dropdownOptions = ['전체 보기', ...spreadsheetLayout.map(category => category.name)];

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
  onCreateSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
  onAdClick,
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
  const [startDate, setStartDate] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [visibleDays, setVisibleDays] = useState(CHUNK_DAYS * 6);
  const days = useMemo(() => Array.from({ length: visibleDays }, (_, i) => addDays(startDate, i)), [startDate, visibleDays]);

  const scRef = useRef<HTMLDivElement | null>(null);
  const isLoadingRef = useRef(false);
  const lastLeftRef = useRef(0);

  const zoomVars = useMemo(() => ({ ['--z' as any]: zoom }), [zoom]);
  // CSS variable-based zoom; no transform scaling to avoid HiDPI export inflation

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })

  // Sticky left offsets (px) computed from actual header cell widths
  const thRef1 = useRef<HTMLTableCellElement | null>(null); // 구분
  const thRef2 = useRef<HTMLTableCellElement | null>(null); // 지면명
  const thRef3 = useRef<HTMLTableCellElement | null>(null); // 구좌명
  const headRowRef = useRef<HTMLTableRowElement | null>(null);

  const [left1, setLeft1] = useState<number>(0);
  const [left2, setLeft2] = useState<number>(0);
  const [left3, setLeft3] = useState<number>(0);
  const [headH, setHeadH] = useState<number>(48);

  useEffect(() => {
    const w1 = Math.round(thRef1.current?.offsetWidth ?? 0);
    const w2 = Math.round(thRef2.current?.offsetWidth ?? 0);
    const w3 = Math.round(thRef3.current?.offsetWidth ?? 0);
    setLeft1(Math.round(w1));
    setLeft2(Math.round(w1 + w2));
    setLeft3(Math.round(w1 + w2 + w3));
    setHeadH(Math.round(headRowRef.current?.offsetHeight ?? 48));
  }, [zoom, density, selectedPlacementGroup]);
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

  // Build bookings (daily) from adSchedules to feed summary util
  type BookingItemLocal = {
    basis_dt: string
    screen_id: string
    country_nm?: string | null
    guaranteed_exposure?: number | null
  }
  const bookings: BookingItemLocal[] = useMemo(() => {
    const items: BookingItemLocal[] = []
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
  }, [adSchedules])

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

    return categoriesToShow.map(category => {
      const processedPlacements = category.placements.map(placement => {
        const processedSlots = placement.slots.map(slot => {
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
            adData
          };
        });

        return {
          placement,
          slots: processedSlots
        };
      });

      return {
        category,
        placements: processedPlacements
      };
    });
  }, [selectedPlacementGroup, scheduleMap, days]);

  const goToPreviousWeek = () => setCurrentDate(prev => new Date(prev.setDate(prev.getDate() - 7)))
  const goToNextWeek = () => setCurrentDate(prev => new Date(prev.setDate(prev.getDate() + 7)))

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>

  const handleScroll = () => {
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
          />
        </div>
      </div>

      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <button onClick={goToPreviousWeek} className="p-2 hover:bg-gray-200 rounded">
            <ChevronLeft size={20} />
          </button>
          <h3 className="text-lg font-semibold">
            {format(weekStart, 'M월 d일', { locale: ko })} 주 ({format(weekStart, 'M/d')} ~ {format(weekEnd, 'M/d')})
          </h3>
          <button onClick={goToNextWeek} className="p-2 hover:bg-gray-200 rounded">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div
        ref={scRef}
        onScroll={handleScroll}
        className="overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x [scrollbar-gutter:stable_both-edges] [-webkit-overflow-scrolling:touch] relative"
      >
        {/* Left mask to prevent underlying date cells from bleeding under sticky cols */}
        <div
          aria-hidden
          className="sticky-left-mask"
          style={{
            position: 'sticky',
            left: 0,
            top: headH,
            width: left3,
            height: `calc(100% - ${headH}px)`,
            zIndex: 50,
            background: '#fff',
            pointerEvents: 'none',
          }}
        />

        {/* Right border of sticky block */}
        <div
          aria-hidden
          className="sticky"
          style={{
            position: 'sticky',
            left: left3,
            top: headH,
            height: `calc(100% - ${headH}px)`,
            width: 0,
            zIndex: 55,
            borderRight: '1px solid #DADADA',
            pointerEvents: 'none',
          }}
        />
        <div className="inline-block min-w-max" style={zoomVars}>
        <table className={`${densityClass}`} style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr ref={headRowRef} className="bg-white h-12 grid-first-row">
              <th ref={thRef1} className="sticky top-0 left-0 z-[90] bg-white p-2 min-w-[8rem] grid-head sticky-col">구분</th>
              <th ref={thRef2} className="sticky top-0 z-[90] bg-white p-2 min-w-[10rem] grid-head sticky-col" style={{ left: left1 }}>지면명</th>
              <th ref={thRef3} className="sticky top-0 z-[90] bg-white p-2 min-w-[8rem] grid-head sticky-col" style={{ left: left2 }}>구좌명</th>
              {days.map(day => (
                <th key={day.toISOString()} className="sticky top-0 z-[70] bg-white p-2 min-w-[8rem] text-center grid-head grid-cell">
                  {format(day, 'E M/d', { locale: ko })}
                </th>
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
                const rowsInThisSection: string[] = placement.slots.map((s: any) => s.slot.banner_id)
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
                    <tr key={`summary-top-${spec.mode}-${category.category.name}-${placement.placement.name}`} className={`h-10 ${spec.rowClass}`}>
                      {/* 1st column: group cell spans body + summary */}
                      <td rowSpan={groupRowSpan} className="sticky left-0 z-[90] bg-white p-2 sticky-col grid-cell">
                        {category.category.name}
                      </td>
                      {/* 2nd column: label */}
                      <td className={`sticky z-[80] ${spec.rowClass} font-medium p-2 sticky-col grid-cell`} style={{ left: left1 }}>
                        {spec.label}
                      </td>
                      {/* 3rd column: empty structural */}
                      <td className={`sticky z-[80] ${spec.rowClass} sticky-col grid-cell`} style={{ left: left2 }} />
                      {renderMerged(summary.spans, summary.byDate, spec.mode === 'impressions' ? 'tabular-nums' : 'text-sm')}
                    </tr>
                  )
                  currentRowIndex++
                }

                // Body rows for this placement
                placement.slots.forEach((slot, slotIndex) => {
                  const isFirstRowOfPlacement = slotIndex === 0
                  rows.push(
                    <tr key={`${category.category.name}-${placement.placement.name}-${slot.slot.name}`} className="h-8 hover:bg-gray-50">
                      {/* 1st column: only when summary is at bottom and this is first body row */}
                      {!PLACE_SUMMARY_TOP && isFirstRowOfPlacement && (
                        <td rowSpan={groupRowSpan} className="sticky left-0 z-[90] bg-white p-2 sticky-col grid-cell">
                          {category.category.name}
                        </td>
                      )}
                      {/* 2nd column: placement name (rowSpan across body rows only) */}
                      {isFirstRowOfPlacement && (
                        <td
                          rowSpan={bodyCount}
                          className="sticky z-[80] bg-white p-2 text-sm font-semibold align-top text-black sticky-col grid-cell"
                          style={{ left: left1 }}
                        >
                          {placement.placement.name}
                        </td>
                      )}
                      {/* 3rd column: slot name */}
                      <td
                        className="sticky z-[80] bg-white p-2 text-sm text-black pl-8 font-medium sticky-col grid-cell"
                        style={{ left: left2 }}
                      >
                        {slot.slot.name}
                      </td>
                      {slot.adData.map((data, dayIndex) => {
                        if (data.skip) return null
                        return (
                          <td
                            key={dayIndex}
                            colSpan={data.colSpan}
                            className={`grid-cell p-1 text-xs relative align-middle min-w-[8rem] text-center ${
                              data.schedules && data.schedules.length > 0 ? 'font-bold text-[0.95rem]' : ''
                            }`}
                          >
                            {data.schedules && data.schedules.length > 0 ? (
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
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-gray-300">-</div>
                            )}
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
                    <tr key={`summary-bottom-${spec.mode}-${category.category.name}-${placement.placement.name}`} className={`h-10 ${spec.rowClass}`}>
                      {/* 1st column omitted; covered by rowSpan on first body row */}
                      <td className={`sticky z-[80] ${spec.rowClass} font-medium p-2 sticky-col grid-cell`} style={{ left: left1 }}>
                        {spec.label}
                      </td>
                      <td className={`sticky z-[80] ${spec.rowClass} sticky-col grid-cell`} style={{ left: left2 }} />
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
