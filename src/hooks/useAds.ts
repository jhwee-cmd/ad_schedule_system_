import { useState, useEffect, useCallback } from 'react'
import { AdService } from '@/services/adService'
import { Campaign, AdSchedule, AdScheduleTarget, AdScheduleWithDetails } from '@/types/database'
import { mockCampaigns, mockAdSchedules } from '../data/mockSchedules';

export function useAds() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns)
  const [adSchedules, setAdSchedules] = useState<AdScheduleWithDetails[]>(mockAdSchedules)
  const [loading, setLoading] = useState(false) // 데이터가 하드코딩되어 있으므로 로딩 상태는 항상 false
  const [error, setError] = useState<string | null>(null)

  // DB 로직은 주석 처리 (하드코딩 데이터 사용)
  // useEffect(() => {
  //   loadData()
  //   const subscription = AdService.subscribeToAdSchedules(loadData)
  //   return () => subscription.unsubscribe()
  // }, [])

  // const loadData = useCallback(async () => { ... })

  // --- 메모리 내 CRUD 로직 ---

  const createCampaign = useCallback(async (campaignData: Omit<Campaign, 'campaign_id' | 'created_at' | 'updated_at'>) => {
    const newCampaign: Campaign = {
      ...campaignData,
      campaign_id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setCampaigns(prev => [newCampaign, ...prev])
    return newCampaign
  }, [])

  const updateCampaign = useCallback(async (campaignId: string, updates: Partial<Campaign>) => {
    let updatedCampaign: Campaign | undefined;
    setCampaigns(prev => prev.map(c => {
      if (c.campaign_id === campaignId) {
        updatedCampaign = { ...c, ...updates, updated_at: new Date().toISOString() };
        return updatedCampaign;
      }
      return c;
    }));
    return updatedCampaign!;
  }, [])

  const deleteCampaign = useCallback(async (campaignId: string) => {
    setCampaigns(prev => prev.filter(c => c.campaign_id !== campaignId))
    setAdSchedules(prev => prev.filter(s => s.campaign_id !== campaignId))
  }, [])

  const createAdSchedule = useCallback(async (
    scheduleData: Omit<AdSchedule, 'ad_schedule_id' | 'created_at' | 'updated_at'>,
    targetsData: Omit<AdScheduleTarget, 'id' | 'ad_schedule_id' | 'created_at'>[]
  ) => {
    const newScheduleId = crypto.randomUUID();
    const linkedCampaign = campaigns.find(c => c.campaign_id === scheduleData.campaign_id);
    if (!linkedCampaign) {
      throw new Error('Campaign not found');
    }

    const newSchedule: AdScheduleWithDetails = {
      ...scheduleData,
      ad_schedule_id: newScheduleId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      campaign: linkedCampaign,
      targets: targetsData.map((t, i) => ({
        ...t,
        id: crypto.randomUUID(),
        ad_schedule_id: newScheduleId,
        created_at: new Date().toISOString(),
      }))
    };

    setAdSchedules(prev => [...prev, newSchedule]);
    return newSchedule;
  }, [campaigns]);

  const updateAdSchedule = useCallback(async (
    scheduleId: string,
    updates: Partial<AdSchedule>,
    targetsData?: Omit<AdScheduleTarget, 'id' | 'ad_schedule_id' | 'created_at'>[]
  ) => {
    let updatedSchedule: AdScheduleWithDetails | undefined;
    setAdSchedules(prev => prev.map(s => {
      if (s.ad_schedule_id === scheduleId) {
        const campaignId = updates.campaign_id || s.campaign_id;
        const linkedCampaign = campaigns.find(c => c.campaign_id === campaignId);
        
        updatedSchedule = {
          ...s,
          ...updates,
          campaign: linkedCampaign || s.campaign,
          updated_at: new Date().toISOString(),
        };
        
        if (targetsData) {
          updatedSchedule.targets = targetsData.map(t => ({
            ...t,
            id: crypto.randomUUID(),
            ad_schedule_id: scheduleId,
            created_at: new Date().toISOString(),
          }));
        }
        return updatedSchedule;
      }
      return s;
    }));
    return updatedSchedule!;
  }, [campaigns]);

  const deleteAdSchedule = useCallback(async (scheduleId: string) => {
    setAdSchedules(prev => prev.filter(s => s.ad_schedule_id !== scheduleId));
  }, []);

  return {
    campaigns,
    adSchedules,
    loading,
    error,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    createAdSchedule,
    updateAdSchedule,
    deleteAdSchedule,
  }
}
