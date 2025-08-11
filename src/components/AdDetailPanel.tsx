'use client';

import { useState, useEffect } from 'react';
import { AdScheduleWithDetails } from '@/types/database';
import { Save, X, Edit, Trash2 } from 'lucide-react';

interface AdDetailPanelProps {
  schedule: AdScheduleWithDetails | null;
  onClose: () => void;
  onSave: (id: string, updates: any, targets?: any[]) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function AdDetailPanel({ schedule, onClose, onSave, onDelete }: AdDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  
  useEffect(() => {
    if (schedule) {
      setFormData({
        start_date: schedule.start_date.split('T')[0],
        end_date: schedule.end_date.split('T')[0],
        guaranteed_exposure: schedule.guaranteed_exposure,
        cpm: schedule.cpm,
        status: schedule.status || '제안',
        memo: schedule.memo || '',
        // target countries would need a more complex state if editable
      });
      setIsEditing(false); // Reset editing state when a new schedule is selected
    }
  }, [schedule]);

  if (!schedule) return null;

  const handleSave = async () => {
    // Omitting target updates for now for simplicity
    await onSave(schedule.ad_schedule_id, formData);
    setIsEditing(false);
  };
  
  const handleDelete = async () => {
    if (window.confirm(`'${schedule.campaign.advertiser_name}' 광고를 정말 삭제하시겠습니까?`)) {
        await onDelete(schedule.ad_schedule_id);
        onClose();
    }
  };

  const InfoField = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
      <p className="text-sm font-bold text-gray-500">{label}</p>
      <p className="text-md text-gray-800">{value}</p>
    </div>
  );

  const EditField = ({ label, name, type, value, onChange }: { label:string, name:string, type:string, value:any, onChange:(e:any)=>void }) => (
     <div>
        <label htmlFor={name} className="block text-sm font-bold text-gray-700 mb-1">{label}</label>
        <input
            type={type}
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            className="w-full px-3 py-2 border rounded-md"
        />
     </div>
  );

  return (
    <div className="fixed top-0 right-0 h-full w-96 bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out translate-x-0">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-bold">광고 상세 정보</h2>
          <div>
            {!isEditing && (
              <button onClick={() => setIsEditing(true)} className="p-2 hover:bg-gray-100 rounded-full">
                <Edit size={20} />
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full ml-2">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex-grow overflow-y-auto space-y-6">
          {!isEditing ? (
            <>
              <InfoField label="광고주" value={schedule.campaign.advertiser_name} />
              <InfoField label="지면" value={schedule.banner_id} />
              <InfoField label="기간" value={`${formData.start_date} ~ ${formData.end_date}`} />
              <InfoField label="타겟 국가" value={schedule.targets.map(t => t.country_code).join(', ') || 'N/A'} />
              <InfoField label="보장 노출 수" value={formData.guaranteed_exposure?.toLocaleString()} />
              <InfoField label="단가(CPM)" value={formData.cpm?.toLocaleString()} />
              <InfoField label="상태" value={formData.status} />
              <InfoField label="비고" value={formData.memo || '-'} />
            </>
          ) : (
            <>
              <EditField label="시작일" name="start_date" type="date" value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} />
              <EditField label="종료일" name="end_date" type="date" value={formData.end_date} onChange={(e) => setFormData({...formData, end_date: e.target.value})} />
              <EditField label="보장 노출 수" name="guaranteed_exposure" type="number" value={formData.guaranteed_exposure} onChange={(e) => setFormData({...formData, guaranteed_exposure: parseInt(e.target.value) || 0})} />
              <EditField label="단가(CPM)" name="cpm" type="number" value={formData.cpm} onChange={(e) => setFormData({...formData, cpm: parseInt(e.target.value) || 0})} />
              <div>
                <label htmlFor="status" className="block text-sm font-bold text-gray-700 mb-1">상태</label>
                <select id="status" name="status" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border rounded-md">
                    <option value="제안">제안</option>
                    <option value="확정">확정</option>
                </select>
              </div>
              <div>
                 <label htmlFor="memo" className="block text-sm font-bold text-gray-700 mb-1">비고</label>
                 <textarea id="memo" name="memo" value={formData.memo} onChange={(e) => setFormData({...formData, memo: e.target.value})} className="w-full px-3 py-2 border rounded-md" rows={4}></textarea>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t mt-auto">
          {isEditing ? (
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-gray-200 rounded-md">취소</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-md">
                <Save size={16} className="inline mr-1"/> 저장
              </button>
            </div>
          ) : (
             <button onClick={handleDelete} className="w-full px-4 py-2 bg-red-600 text-white rounded-md flex items-center justify-center gap-2">
                <Trash2 size={16} /> 삭제하기
              </button>
          )}
        </div>
      </div>
    </div>
  );
}
