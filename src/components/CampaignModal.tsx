'use client'

import { useState, useEffect } from 'react'
import { Campaign } from '@/types/database'
import { X, Save } from 'lucide-react'

interface CampaignModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (campaign: Omit<Campaign, 'campaign_id' | 'created_at' | 'updated_at'>) => Promise<void>
  campaign?: Campaign | null
  mode: 'create' | 'edit'
}

export default function CampaignModal({
  isOpen,
  onClose,
  onSave,
  campaign,
  mode
}: CampaignModalProps) {
  const [formData, setFormData] = useState({
    advertiser_name: '',
    sales_owner: '',
    status: 'draft' as const,
    budget: 0,
    description: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (campaign && mode === 'edit') {
      setFormData({
        advertiser_name: campaign.advertiser_name,
        sales_owner: campaign.sales_owner,
        status: campaign.status,
        budget: campaign.budget,
        description: campaign.description
      })
    } else {
      setFormData({
        advertiser_name: '',
        sales_owner: '',
        status: 'draft',
        budget: 0,
        description: ''
      })
    }
  }, [campaign, mode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      await onSave(formData)
      onClose()
    } catch (error) {
      console.error('캠페인 저장 중 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {mode === 'create' ? '새 캠페인 추가' : '캠페인 편집'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              광고주명 *
            </label>
            <input
              type="text"
              value={formData.advertiser_name}
              onChange={(e) => updateFormData('advertiser_name', e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              담당자 *
            </label>
            <input
              type="text"
              value={formData.sales_owner}
              onChange={(e) => updateFormData('sales_owner', e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              상태
            </label>
            <select
              value={formData.status}
              onChange={(e) => updateFormData('status', e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="draft">초안</option>
              <option value="proposed">제안</option>
              <option value="confirmed">확정</option>
              <option value="cancelled">취소</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              예산 (원)
            </label>
            <input
              type="number"
              value={formData.budget}
              onChange={(e) => updateFormData('budget', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              설명
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => updateFormData('description', e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              {loading ? '저장 중...' : '저장'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 