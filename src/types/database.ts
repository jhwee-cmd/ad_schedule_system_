export interface Campaign {
  campaign_id: string
  advertiser_name: string
  sales_owner: string
  status: 'draft' | 'proposed' | 'confirmed' | 'cancelled'
  budget: number
  description: string
  created_at?: string
  updated_at?: string
}

export interface AdSchedule {
  ad_schedule_id: string
  campaign_id: string
  banner_id: string
  start_date: string
  end_date: string
  guaranteed_exposure: number
  memo: string
  is_bundle: boolean
  bundle_name: string
  created_at?: string
  updated_at?: string
}

export interface AdScheduleTarget {
  id: string
  ad_schedule_id: string
  country_code: string
  created_at?: string
}

export interface AdScheduleWithDetails extends AdSchedule {
  campaign: Campaign
  targets: AdScheduleTarget[]
}

// 하드코딩된 마스터 데이터 타입
export interface Category {
  id: string
  name: string
  color: string
}

export interface SlotType {
  id: string
  name: string
  max_exposure: number
  ctr: number
  price: number
}

export interface Country {
  code: string
  name: string
  continent: string
} 