import { Category, SlotType, Country } from '@/types/database'
import { continentCountryMap } from './RegionCountry'
import bannerInformation from './BannerInformation'

export const categories: Category[] = [
  { id: 'main-home', name: '메인홈', color: '#3B82F6' },
  { id: 'checklist', name: '체크리스트', color: '#10B981' },
  { id: 'shortcut', name: '숏컷', color: '#F59E0B' },
  { id: 'interactive', name: '인터랙티브', color: '#8B5CF6' },
  { id: 'in-app-page', name: '인앱페이지', color: '#EF4444' }
]

export const slotTypes: SlotType[] = bannerInformation.map(banner => ({
  id: banner.id,
  name: banner.name,
  max_exposure: banner.max_imp,
  ctr: 0, // 기본값, 필요시 BannerInformation.ts에 추가 가능
  price: banner.cpm,
}));

export const countries: Country[] = continentCountryMap.flatMap(continent => 
  continent.countries.map(country => ({
    code: country.code,
    name: country.korean_name,
    continent: continent.korean_name,
  }))
);

export const continents: string[] = continentCountryMap.map(c => c.korean_name);
