import { useState, useEffect } from 'react'
import { categories, slotTypes, countries } from '@/data/masterData'
import { Category, SlotType, Country } from '@/types/database'

interface Settings {
  categories: Category[]
  slotTypes: SlotType[]
  countries: Country[]
  uiSettings: {
    showBundleOnly: boolean
    defaultView: 'calendar' | 'spreadsheet'
    colorScheme: 'light' | 'dark'
  }
}

const defaultSettings: Settings = {
  categories,
  slotTypes,
  countries,
  uiSettings: {
    showBundleOnly: false,
    defaultView: 'spreadsheet',
    colorScheme: 'light'
  }
}

const STORAGE_KEY = 'calendar-ad-manager-settings'

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [loading, setLoading] = useState(true)

  // localStorage에서 설정 로드
  const loadSettings = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setSettings({ ...defaultSettings, ...parsed })
      }
    } catch (error) {
      console.error('설정 로드 중 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  // localStorage에 설정 저장
  const saveSettings = (newSettings: Settings) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings))
      setSettings(newSettings)
    } catch (error) {
      console.error('설정 저장 중 오류:', error)
    }
  }

  // 초기 로드
  useEffect(() => {
    loadSettings()
  }, [])

  // 카테고리 관리
  const updateCategories = (newCategories: Category[]) => {
    const newSettings = { ...settings, categories: newCategories }
    saveSettings(newSettings)
  }

  const addCategory = (category: Category) => {
    const newCategories = [...settings.categories, category]
    updateCategories(newCategories)
  }

  const updateCategory = (id: string, updates: Partial<Category>) => {
    const newCategories = settings.categories.map(cat =>
      cat.id === id ? { ...cat, ...updates } : cat
    )
    updateCategories(newCategories)
  }

  const deleteCategory = (id: string) => {
    const newCategories = settings.categories.filter(cat => cat.id !== id)
    updateCategories(newCategories)
  }

  // 슬롯 타입 관리
  const updateSlotTypes = (newSlotTypes: SlotType[]) => {
    const newSettings = { ...settings, slotTypes: newSlotTypes }
    saveSettings(newSettings)
  }

  const addSlotType = (slotType: SlotType) => {
    const newSlotTypes = [...settings.slotTypes, slotType]
    updateSlotTypes(newSlotTypes)
  }

  const updateSlotType = (id: string, updates: Partial<SlotType>) => {
    const newSlotTypes = settings.slotTypes.map(slot =>
      slot.id === id ? { ...slot, ...updates } : slot
    )
    updateSlotTypes(newSlotTypes)
  }

  const deleteSlotType = (id: string) => {
    const newSlotTypes = settings.slotTypes.filter(slot => slot.id !== id)
    updateSlotTypes(newSlotTypes)
  }

  // 국가 관리
  const updateCountries = (newCountries: Country[]) => {
    const newSettings = { ...settings, countries: newCountries }
    saveSettings(newSettings)
  }

  const addCountry = (country: Country) => {
    const newCountries = [...settings.countries, country]
    updateCountries(newCountries)
  }

  const updateCountry = (code: string, updates: Partial<Country>) => {
    const newCountries = settings.countries.map(country =>
      country.code === code ? { ...country, ...updates } : country
    )
    updateCountries(newCountries)
  }

  const deleteCountry = (code: string) => {
    const newCountries = settings.countries.filter(country => country.code !== code)
    updateCountries(newCountries)
  }

  // UI 설정 관리
  const updateUISettings = (updates: Partial<Settings['uiSettings']>) => {
    const newSettings = {
      ...settings,
      uiSettings: { ...settings.uiSettings, ...updates }
    }
    saveSettings(newSettings)
  }

  // 설정 초기화
  const resetSettings = () => {
    saveSettings(defaultSettings)
  }

  return {
    settings,
    loading,
    
    // 카테고리 관리
    updateCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    
    // 슬롯 타입 관리
    updateSlotTypes,
    addSlotType,
    updateSlotType,
    deleteSlotType,
    
    // 국가 관리
    updateCountries,
    addCountry,
    updateCountry,
    deleteCountry,
    
    // UI 설정 관리
    updateUISettings,
    
    // 기타
    resetSettings
  }
} 