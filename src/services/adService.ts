import { supabase } from '@/lib/supabase'
import { Campaign, AdSchedule, AdScheduleTarget, AdScheduleWithDetails } from '@/types/database'

export class AdService {
  // 캠페인 관련
  static async getCampaigns(): Promise<Campaign[]> {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  }

  static async createCampaign(campaign: Omit<Campaign, 'campaign_id' | 'created_at' | 'updated_at'>): Promise<Campaign> {
    const { data, error } = await supabase
      .from('campaigns')
      .insert([campaign])
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  static async updateCampaign(campaignId: string, updates: Partial<Campaign>): Promise<Campaign> {
    const { data, error } = await supabase
      .from('campaigns')
      .update(updates)
      .eq('campaign_id', campaignId)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  static async deleteCampaign(campaignId: string): Promise<void> {
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('campaign_id', campaignId)
    
    if (error) throw error
  }

  // 광고 스케줄 관련
  static async getAdSchedules(): Promise<AdScheduleWithDetails[]> {
    const { data, error } = await supabase
      .from('ad_schedules')
      .select(`
        *,
        campaign:campaigns(*),
        targets:ad_schedule_targets(*)
      `)
      .order('start_date', { ascending: true })
    
    if (error) throw error
    return data || []
  }

  static async createAdSchedule(
    adSchedule: Omit<AdSchedule, 'ad_schedule_id' | 'created_at' | 'updated_at'>,
    targets: Omit<AdScheduleTarget, 'id' | 'created_at'>[]
  ): Promise<AdScheduleWithDetails> {
    // 트랜잭션으로 광고 스케줄과 타겟을 함께 생성
    const { data: scheduleData, error: scheduleError } = await supabase
      .from('ad_schedules')
      .insert([adSchedule])
      .select()
      .single()
    
    if (scheduleError) throw scheduleError

    if (targets.length > 0) {
      const targetsWithScheduleId = targets.map(target => ({
        ...target,
        ad_schedule_id: scheduleData.ad_schedule_id
      }))

      const { error: targetsError } = await supabase
        .from('ad_schedule_targets')
        .insert(targetsWithScheduleId)
      
      if (targetsError) throw targetsError
    }

    // 생성된 데이터를 다시 조회하여 반환
    return this.getAdScheduleById(scheduleData.ad_schedule_id)
  }

  static async updateAdSchedule(
    adScheduleId: string, 
    updates: Partial<AdSchedule>,
    targets?: Omit<AdScheduleTarget, 'id' | 'created_at'>[]
  ): Promise<AdScheduleWithDetails> {
    const { error: scheduleError } = await supabase
      .from('ad_schedules')
      .update(updates)
      .eq('ad_schedule_id', adScheduleId)
    
    if (scheduleError) throw scheduleError

    if (targets) {
      // 기존 타겟 삭제
      const { error: deleteError } = await supabase
        .from('ad_schedule_targets')
        .delete()
        .eq('ad_schedule_id', adScheduleId)
      
      if (deleteError) throw deleteError

      // 새로운 타겟 추가
      if (targets.length > 0) {
        const targetsWithScheduleId = targets.map(target => ({
          ...target,
          ad_schedule_id: adScheduleId
        }))

        const { error: insertError } = await supabase
          .from('ad_schedule_targets')
          .insert(targetsWithScheduleId)
        
        if (insertError) throw insertError
      }
    }

    return this.getAdScheduleById(adScheduleId)
  }

  static async deleteAdSchedule(adScheduleId: string): Promise<void> {
    // 타겟 먼저 삭제
    const { error: targetsError } = await supabase
      .from('ad_schedule_targets')
      .delete()
      .eq('ad_schedule_id', adScheduleId)
    
    if (targetsError) throw targetsError

    // 광고 스케줄 삭제
    const { error: scheduleError } = await supabase
      .from('ad_schedules')
      .delete()
      .eq('ad_schedule_id', adScheduleId)
    
    if (scheduleError) throw scheduleError
  }

  static async getAdScheduleById(adScheduleId: string): Promise<AdScheduleWithDetails> {
    const { data, error } = await supabase
      .from('ad_schedules')
      .select(`
        *,
        campaign:campaigns(*),
        targets:ad_schedule_targets(*)
      `)
      .eq('ad_schedule_id', adScheduleId)
      .single()
    
    if (error) throw error
    return data
  }

  // 실시간 구독
  static subscribeToAdSchedules(callback: (payload: any) => void) {
    return supabase
      .channel('ad_schedules_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ad_schedules' }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ad_schedule_targets' }, callback)
      .subscribe()
  }
} 