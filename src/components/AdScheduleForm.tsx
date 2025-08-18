'use client'

import { useState, useMemo, useTransition, useEffect } from 'react';
import { Campaign } from '@/types/database';
import { slotTypes, countries, continents } from '@/data/masterData';
import { continentCountryMap } from '@/data/RegionCountry';
import MultiSelectCheckbox from './MultiSelectCheckbox';
import { Save, X } from 'lucide-react';
import { createBooking, createBookingRange } from '@/app/actions/createBooking';
import { createBookingsBulk } from '@/app/actions/createBookingsBulk';
import { DayPicker, type DateRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format, addDays, startOfDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import dynamic from 'next/dynamic';
import { useDateRangeStore } from '@/state/dateRangeStore';

const MediaMixDropzone = dynamic(() => import('./MediaMixDropzone'), { ssr: false });

const NON_TARGET_VALUE = 'non-target';

interface AdScheduleFormProps {
  onSave: (formData: any, targets: any[]) => Promise<void>;
  onCancel: () => void;
  campaigns: Campaign[];
  onBookingCreated?: () => Promise<void>;
}

export default function AdScheduleForm({ onSave, onCancel, campaigns, onBookingCreated }: AdScheduleFormProps) {
  // 커밋된 값(폼에서 실제 사용)
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfDay(new Date('2025-08-18')), // 기본값 예시
    to: startOfDay(new Date('2025-09-07')),
  });

  // 팝오버 열림 + 드래프트 범위
  const [openCal, setOpenCal] = useState(false);
  const [draftRange, setDraftRange] = useState<DateRange | null>(null);
  
  // 미디어믹스 업로드 모달
  const [openImport, setOpenImport] = useState(false);

  // 열기 버튼
  const openCalendar = () => {
    setDraftRange(dateRange);        // 현재 커밋값을 드래프트로 복사
    setOpenCal(true);
  };

  // 확인/취소
  const confirmRange = () => {
    if (!draftRange?.from || !draftRange?.to) return;
    setDateRange(draftRange);
    useDateRangeStore.getState().commit(draftRange); // ✅ 확정
    setOpenCal(false);
    setDraftRange(null);
  };
  const cancelRange = () => {
    setOpenCal(false);
    setDraftRange(null);
  };

  const rangeLabel =
    dateRange.from && dateRange.to
      ? `${format(dateRange.from, 'yyyy. MM. dd')} ~ ${format(dateRange.to, 'yyyy. MM. dd')}`
      : '기간 선택';

  const startDate = dateRange.from ?? startOfDay(new Date());
  const endDate = dateRange.to ?? dateRange.from ?? startDate;

  const [formData, setFormData] = useState({
    advertiser_name: '',
    guaranteed_exposure: 0,
    memo: '',
    status: '제안',
  });
  const [selectedBanners, setSelectedBanners] = useState<string[]>([]);
  const [selectedContinents, setSelectedContinents] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  // Esc로 닫기
  useEffect(() => {
    if (!openCal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelRange();
      if (e.key === 'Enter' && draftRange?.from && draftRange?.to) confirmRange();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openCal, draftRange]);

  const continentOptions = useMemo(() => [
      { value: NON_TARGET_VALUE, label: '논타겟' },
      ...continents.map(c => ({ value: c, label: c }))
    ], 
  []);

  const countryOptions = useMemo(() => [
      { value: NON_TARGET_VALUE, label: '논타겟' },
      ...countries.map(c => ({ value: c.code, label: `${c.name} (${c.code})` }))
    ],
  []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dateRange?.from || !dateRange?.to) {
      alert('기간을 선택해 주세요.');
      return;
    }

    const selectedCampaign = campaigns.find(c => c.advertiser_name === formData.advertiser_name);

    if (!selectedCampaign || selectedBanners.length === 0) {
        alert('필수 항목(광고주, 지면)을 모두 입력해주세요.');
        return;
    }

    setLoading(true);
    try {
      const finalSelectedCountries = selectedCountries.filter(c => c !== NON_TARGET_VALUE);
      const finalSelectedContinents = selectedContinents.filter(c => c !== NON_TARGET_VALUE);

      const continentCountryCodes = continentCountryMap
        .filter(c => finalSelectedContinents.includes(c.korean_name))
        .flatMap(c => c.countries.map(country => country.code));
      
      const allSelectedCountryCodes = Array.from(new Set([...continentCountryCodes, ...finalSelectedCountries]));
      const targets = allSelectedCountryCodes.map(code => ({ country_code: code }));
      
      const { advertiser_name, ...restOfFormData } = formData;

          // Convert dates to string format (커밋 상태만 사용)
    const startYmd = format(dateRange.from!, 'yyyy-MM-dd');
    const endYmd = format(dateRange.to!, 'yyyy-MM-dd');

      // 여러 지면을 선택했을 경우, 각 지면에 대해 onSave를 호출
      for (const banner_id of selectedBanners) {
        const finalFormData = { 
          ...restOfFormData, 
          campaign_id: selectedCampaign.campaign_id, 
          banner_id,
          start_date: startYmd,
          end_date: endYmd
        };
        await onSave(finalFormData, targets);
      }

    } catch (error) {
      console.error('광고 스케줄 저장 중 오류:', error);
      alert('저장에 실패했습니다. 콘솔을 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // Quick booking creator based on current form selection
  const createBookingQuick = () => {
    if (!dateRange?.from) {
      alert('기간을 선택하세요.');
      return;
    }
    if (selectedBanners.length === 0) {
      alert('지면을 1개 이상 선택하세요.');
      return;
    }

    const finalSelectedCountries = selectedCountries.filter(c => c !== NON_TARGET_VALUE);
    const finalSelectedContinents = selectedContinents.filter(c => c !== NON_TARGET_VALUE);
    const continentCountryCodes = continentCountryMap
      .filter(c => finalSelectedContinents.includes(c.korean_name))
      .flatMap(c => c.countries.map(country => country.code));
    const allSelectedCountryCodes = Array.from(new Set([...continentCountryCodes, ...finalSelectedCountries]));

    // Check if it's a single date or range
    const isRange = dateRange.from && dateRange.to && dateRange.from.getTime() !== dateRange.to.getTime();
    
    if (isRange) {
      // Create booking range
      const payload = {
        start_date: format(dateRange.from!, 'yyyy-MM-dd'),
        end_date: format(dateRange.to!, 'yyyy-MM-dd'),
        screen_id: selectedBanners[0],
        country_nm: allSelectedCountryCodes.join(','),
        guaranteed_exposure: formData.guaranteed_exposure || 0,
      };

      startTransition(async () => {
        try {
          const result = await createBookingRange(payload);
          alert(`Booking 범위 저장 완료 (${result?.length || 0}일)`);
          if (onBookingCreated) {
            await onBookingCreated();
          }
        } catch (err: any) {
          alert(`Booking 범위 저장 실패: ${err?.message || err}`);
          console.error('[createBookingRange]', err);
        }
      });
    } else {
      // Create single booking
      const payload = {
        basis_dt: format(dateRange.from!, 'yyyy-MM-dd'),
        screen_id: selectedBanners[0],
        country_nm: allSelectedCountryCodes.join(','),
        guaranteed_exposure: formData.guaranteed_exposure || 0,
      };

      startTransition(async () => {
        try {
          await createBooking(payload);
          alert('Booking 저장 완료');
          if (onBookingCreated) {
            await onBookingCreated();
          }
        } catch (err: any) {
          alert(`Booking 저장 실패: ${err?.message || err}`);
          console.error('[createBooking]', err);
        }
      });
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 스프레드시트의 전체 행 목록에서 base → 실제 screen_id[] 만들기
  function buildRowIdsByBase(allRows: Array<{ banner_id: string }>) {
    const m: Record<string, string[]> = {};
    for (const r of allRows) {
      const sid = r.banner_id; // 예: checklist_t1
      const base = sid.replace(/(_t\d+|[-_.]?v\d+|-\d+)$/,'').toLowerCase();
      (m[base] ||= []).push(sid);
    }
    return m; // 표시 순서 유지
  }

  // 저장 호출(실제 bookings 배열은 폼에서 만든 값 사용)
  async function saveBookings(bookings: Array<{ basis_dt:string; screen_id:string; country_nm?:string|null; guaranteed_exposure?:number|null }>, allRows: Array<{ banner_id: string }>) {
    const mapping = buildRowIdsByBase(allRows);
    try {
      const res = await createBookingsBulk(bookings, { rowIdsByBase: mapping, revalidateTarget: '/' });
      alert(`Booking ${res.upserted}건 저장 완료`);
      if (onBookingCreated) {
        await onBookingCreated();
      }
    } catch (e: any) {
      if (e?.code === 'CAPACITY_EXCEEDED') {
        const details = (e.failures ?? []).map((f: any) =>
          `• ${f.basis_dt} / ${f.base} : ${f.reason}${f.capacity ? ` (행수 ${f.capacity})` : ''}`
        ).join('\n');
        alert(`저장 실패: 행 수 초과 또는 점유 중입니다.\n\n${details}`);
      } else {
        alert(`저장 실패: ${e?.message ?? e}`);
      }
    }
  }

  return (
    <div className="bg-blue-50 border-t border-b border-blue-200 p-6 my-4 animate-fade-in-down">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800">새 광고 스케줄 등록</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
            onClick={() => setOpenImport(true)}
          >
            미디어믹스 업로드
          </button>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label htmlFor="advertiser_name" className="block text-sm font-bold text-gray-700 mb-1">광고주 *</label>
            <input
              id="advertiser_name"
              type="text"
              list="advertisers"
              value={formData.advertiser_name}
              onChange={(e) => updateFormData('advertiser_name', e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-white"
              placeholder="광고주 이름 검색 또는 입력"
              required
            />
            <datalist id="advertisers">
              {campaigns.map(c => <option key={c.campaign_id} value={c.advertiser_name} />)}
            </datalist>
          </div>
          
          {/* 일정 입력 */}
          <div className="relative">
            <label className="text-sm font-bold text-gray-700">일정 *</label>
            <button
              type="button"
              onClick={openCalendar}
              className="w-[360px] h-10 rounded-md border px-3 text-left hover:border-gray-400"
            >
              {rangeLabel}
            </button>

            {/* 팝오버: fixed로 띄워 부모 overflow 영향 제거 */}
            {openCal && (
              <div className="fixed z-[100] left-1/2 top-24 -translate-x-1/2 rounded-md border bg-white p-3 shadow-xl">
                <DayPicker
                  mode="range"
                  numberOfMonths={2}
                  locale={ko}
                  showOutsideDays
                  selected={draftRange ?? undefined}         // ★ 드래프트로 묶기
                  onSelect={(r) => {
                    const range = r?.from && r?.to ? r : r ?? null;
                    setDraftRange(range);
                    useDateRangeStore.getState().setDraft(range);  // ✅ 스토어 갱신
                  }}
                  onDayClick={(day) => {
                    // ✅ 완성된 범위(from+to)가 있는 상태에서 아무 날짜를 클릭하면
                    //    "그 날짜를 시작점(from)"으로 새 범위를 시작하게 강제
                    if (draftRange?.from && draftRange?.to) {
                      setDraftRange({ from: startOfDay(day) });
                    }
                  }}
                  defaultMonth={(draftRange?.from ?? dateRange.from) ?? new Date()}
                />

                <div className="mt-2 flex justify-end gap-2">
                  <button type="button" className="rounded border px-3 py-1" onClick={cancelRange}>
                    취소
                  </button>
                  <button
                    type="button"
                    className="rounded bg-blue-600 px-3 py-1 text-white disabled:opacity-50"
                    onClick={confirmRange}
                    disabled={!draftRange?.from || !draftRange?.to}
                  >
                    확인
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-bold text-gray-700 mb-1">상태 *</label>
            <select
                id="status"
                value={formData.status}
                onChange={(e) => updateFormData('status', e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-white"
                required
            >
                <option value="제안">제안</option>
                <option value="확정">확정</option>
            </select>
          </div>
        </div>

        <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">지면 선택 *</label>
            <div className="p-4 bg-white border rounded-md grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-60 overflow-y-auto">
                {slotTypes.map(s => (
                    <div key={s.id} className="flex items-center">
                        <input
                            type="checkbox"
                            id={`banner-${s.id}`}
                            value={s.id}
                            checked={selectedBanners.includes(s.id)}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    setSelectedBanners([...selectedBanners, s.id]);
                                } else {
                                    setSelectedBanners(selectedBanners.filter(id => id !== s.id));
                                }
                            }}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor={`banner-${s.id}`} className="ml-3 text-sm text-gray-700">{s.name}</label>
                    </div>
                ))}
            </div>
        </div>

        <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">타겟 설정</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MultiSelectCheckbox
                options={continentOptions}
                selectedValues={selectedContinents}
                onChange={setSelectedContinents}
                placeholder="대륙 선택"
                exclusiveValue={NON_TARGET_VALUE}
              />
              <MultiSelectCheckbox
                options={countryOptions}
                selectedValues={selectedCountries}
                onChange={setSelectedCountries}
                placeholder="개별 국가 선택"
                exclusiveValue={NON_TARGET_VALUE}
              />
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="memo" className="block text-sm font-bold text-gray-700 mb-1">특이사항</label>
              <textarea
                id="memo"
                value={formData.memo}
                onChange={(e) => updateFormData('memo', e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                rows={3}
                placeholder="광고 관련 특이사항을 입력하세요."
              />
            </div>
            <div className="space-y-4">
                <div>
                  <label htmlFor="guaranteed_exposure" className="block text-sm font-bold text-gray-700 mb-1">보장 노출수</label>
                  <input
                      id="guaranteed_exposure"
                      type="number"
                      value={formData.guaranteed_exposure}
                      onChange={(e) => updateFormData('guaranteed_exposure', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="0"
                      min="0"
                  />
                </div>
            </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            <X size={16} />
            취소
          </button>
          <button
            type="button"
            onClick={createBookingQuick}
            disabled={pending}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50"
          >
            {pending ? 'Booking 저장 중...' : 'Booking 저장'}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Save size={16} />
            {loading ? '저장 중...' : '스케줄 저장'}
          </button>
        </div>
      </form>

      {/* 미디어믹스 업로드 모달 */}
      {openImport && (
        <div className="fixed inset-0 z-[200] grid place-items-center bg-black/30">
          <div className="w-[880px] max-h-[90vh] overflow-y-auto rounded bg-white p-4 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-lg font-semibold">미디어믹스 업로드</h3>
              <button 
                onClick={() => setOpenImport(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <MediaMixDropzone onDone={() => setOpenImport(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
