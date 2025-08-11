'use client'

import { useState } from 'react'
import { Campaign } from '@/types/database'
import { Plus, Edit, Trash2, Eye } from 'lucide-react'
import CampaignModal from './CampaignModal'

interface CampaignViewProps {
  campaigns: Campaign[]
  onCreateCampaign: (campaign: Omit<Campaign, 'campaign_id' | 'created_at' | 'updated_at'>) => Promise<void>
  onUpdateCampaign: (id: string, updates: Partial<Campaign>) => Promise<void>
  onDeleteCampaign: (id: string) => Promise<void>
  loading?: boolean
}

export default function CampaignView({
  campaigns,
  onCreateCampaign,
  onUpdateCampaign,
  onDeleteCampaign,
  loading = false
}: CampaignViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')

  const handleCreateCampaign = () => {
    setEditingCampaign(null)
    setModalMode('create')
    setIsModalOpen(true)
  }

  const handleEditCampaign = (campaign: Campaign) => {
    setEditingCampaign(campaign)
    setModalMode('edit')
    setIsModalOpen(true)
  }

  const handleDeleteCampaign = async (id: string) => {
    if (confirm('정말로 이 캠페인을 삭제하시겠습니까? 관련된 모든 광고 스케줄도 함께 삭제됩니다.')) {
      await onDeleteCampaign(id)
    }
  }

  const handleSaveCampaign = async (campaignData: Omit<Campaign, 'campaign_id' | 'created_at' | 'updated_at'>) => {
    if (modalMode === 'create') {
      await onCreateCampaign(campaignData)
    } else if (editingCampaign) {
      await onUpdateCampaign(editingCampaign.campaign_id, campaignData)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'proposed':
        return 'bg-yellow-100 text-yellow-800'
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft':
        return '초안'
      case 'proposed':
        return '제안'
      case 'confirmed':
        return '확정'
      case 'cancelled':
        return '취소'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* 헤더 */}
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">캠페인 관리</h2>
        <button
          onClick={handleCreateCampaign}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          새 캠페인
        </button>
      </div>

      {/* 캠페인 목록 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                광고주
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                담당자
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                예산
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                설명
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                액션
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  캠페인이 없습니다. 새 캠페인을 추가해보세요.
                </td>
              </tr>
            ) : (
              campaigns.map((campaign) => (
                <tr key={campaign.campaign_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {campaign.advertiser_name}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-900">
                      {campaign.sales_owner}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(campaign.status)}`}>
                      {getStatusText(campaign.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-900">
                      {campaign.budget.toLocaleString()}원
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-900 truncate max-w-32 block">
                      {campaign.description || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditCampaign(campaign)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="편집"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteCampaign(campaign.campaign_id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="삭제"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 캠페인 모달 */}
      <CampaignModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveCampaign}
        campaign={editingCampaign}
        mode={modalMode}
      />
    </div>
  )
} 