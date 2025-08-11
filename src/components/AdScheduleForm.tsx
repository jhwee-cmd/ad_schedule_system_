'use client'

import { useState, useMemo } from 'react';
import { Campaign } from '@/types/database';
import { slotTypes, countries, continents } from '@/data/masterData';
import { continentCountryMap } from '@/data/RegionCountry';
import MultiSelectCheckbox from './MultiSelectCheckbox';
import { Save, X } from 'lucide-react';

const NON_TARGET_VALUE = 'non-target';

interface AdScheduleFormProps {
  onSave: (formData: any, targets: any[]) => Promise<void>;
  onCancel: () => void;
  campaigns: Campaign[];
}

export default function AdScheduleForm({ onSave, onCancel, campaigns }: AdScheduleFormProps) {
  const [formData, setFormData] = useState({
    advertiser_name: '',
    start_date: '',
    end_date: '',
    guaranteed_exposure: 0,
    memo: '',
    status: '제안', // '상태' 필드 추가 및 기본값 '제안' 설정
  });
  const [selectedBanners, setSelectedBanners] = useState<string[]>([]);
  const [selectedContinents, setSelectedContinents] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

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

    const selectedCampaign = campaigns.find(c => c.advertiser_name === formData.advertiser_name);

    if (!selectedCampaign || selectedBanners.length === 0 || !formData.start_date || !formData.end_date) {
        alert('필수 항목(광고주, 지면, 시작일, 종료일)을 모두 입력해주세요.');
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

      // 여러 지면을 선택했을 경우, 각 지면에 대해 onSave를 호출
      for (const banner_id of selectedBanners) {
        const finalFormData = { ...restOfFormData, campaign_id: selectedCampaign.campaign_id, banner_id };
        await onSave(finalFormData, targets);
      }

    } catch (error) {
      console.error('광고 스케줄 저장 중 오류:', error);
      alert('저장에 실패했습니다. 콘솔을 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-blue-50 border-t border-b border-blue-200 p-6 my-4 animate-fade-in-down">
      <h3 className="text-lg font-bold text-gray-800 mb-4">새 광고 스케줄 등록</h3>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          <div>
            <label htmlFor="start_date" className="block text-sm font-bold text-gray-700 mb-1">시작일 *</label>
            <input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => updateFormData('start_date', e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
            />
          </div>
          <div>
            <label htmlFor="end_date" className="block text-sm font-bold text-gray-700 mb-1">종료일 *</label>
            <input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => updateFormData('end_date', e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
            />
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
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Save size={16} />
            {loading ? '저장 중...' : '스케줄 저장'}
          </button>
        </div>
      </form>
    </div>
  );
}
