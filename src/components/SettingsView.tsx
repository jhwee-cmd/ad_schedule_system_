'use client'

import { useState } from 'react'
import { Category, SlotType, Country } from '@/types/database'
import { Plus, Edit, Trash2, Save, X } from 'lucide-react'

interface SettingsViewProps {
  categories: Category[]
  slotTypes: SlotType[]
  countries: Country[]
  onUpdateCategories: (categories: Category[]) => void
  onUpdateSlotTypes: (slotTypes: SlotType[]) => void
  onUpdateCountries: (countries: Country[]) => void
  onResetSettings: () => void
}

export default function SettingsView({
  categories,
  slotTypes,
  countries,
  onUpdateCategories,
  onUpdateSlotTypes,
  onUpdateCountries,
  onResetSettings
}: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<'categories' | 'slots' | 'countries'>('categories')
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingSlot, setEditingSlot] = useState<SlotType | null>(null)
  const [editingCountry, setEditingCountry] = useState<Country | null>(null)
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [isAddingSlot, setIsAddingSlot] = useState(false)
  const [isAddingCountry, setIsAddingCountry] = useState(false)

  // 카테고리 관리
  const handleAddCategory = () => {
    const newCategory: Category = {
      id: `category-${Date.now()}`,
      name: '',
      color: '#3B82F6'
    }
    setEditingCategory(newCategory)
    setIsAddingCategory(true)
  }

  const handleSaveCategory = () => {
    if (!editingCategory || !editingCategory.name.trim()) return

    if (isAddingCategory) {
      onUpdateCategories([...categories, editingCategory])
    } else {
      onUpdateCategories(
        categories.map(cat => 
          cat.id === editingCategory.id ? editingCategory : cat
        )
      )
    }

    setEditingCategory(null)
    setIsAddingCategory(false)
  }

  const handleDeleteCategory = (id: string) => {
    onUpdateCategories(categories.filter(cat => cat.id !== id))
  }

  // 슬롯 타입 관리
  const handleAddSlot = () => {
    const newSlot: SlotType = {
      id: `slot-${Date.now()}`,
      name: '',
      max_exposure: 0,
      ctr: 0,
      price: 0
    }
    setEditingSlot(newSlot)
    setIsAddingSlot(true)
  }

  const handleSaveSlot = () => {
    if (!editingSlot || !editingSlot.name.trim()) return

    if (isAddingSlot) {
      onUpdateSlotTypes([...slotTypes, editingSlot])
    } else {
      onUpdateSlotTypes(
        slotTypes.map(slot => 
          slot.id === editingSlot.id ? editingSlot : slot
        )
      )
    }

    setEditingSlot(null)
    setIsAddingSlot(false)
  }

  const handleDeleteSlot = (id: string) => {
    onUpdateSlotTypes(slotTypes.filter(slot => slot.id !== id))
  }

  // 국가 관리
  const handleAddCountry = () => {
    const newCountry: Country = {
      code: '',
      name: '',
      continent: 'Asia'
    }
    setEditingCountry(newCountry)
    setIsAddingCountry(true)
  }

  const handleSaveCountry = () => {
    if (!editingCountry || !editingCountry.code.trim() || !editingCountry.name.trim()) return

    if (isAddingCountry) {
      onUpdateCountries([...countries, editingCountry])
    } else {
      onUpdateCountries(
        countries.map(country => 
          country.code === editingCountry.code ? editingCountry : country
        )
      )
    }

    setEditingCountry(null)
    setIsAddingCountry(false)
  }

  const handleDeleteCountry = (code: string) => {
    onUpdateCountries(countries.filter(country => country.code !== code))
  }

  const continents = ['Asia', 'North America', 'Europe', 'South America', 'Africa', 'Oceania']

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* 헤더 */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">설정 관리</h2>
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b">
        <nav className="flex space-x-8 px-4">
          {[
            { id: 'categories', label: '카테고리' },
            { id: 'slots', label: '슬롯 타입' },
            { id: 'countries', label: '국가' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="p-4">
        {/* 카테고리 탭 */}
        {activeTab === 'categories' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-md font-medium text-gray-900">카테고리 관리</h3>
              <button
                onClick={handleAddCategory}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} />
                새 카테고리
              </button>
            </div>

            <div className="space-y-2">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="font-medium">{category.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingCategory(category)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 카테고리 편집 모달 */}
            {editingCategory && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-96">
                  <h3 className="text-lg font-medium mb-4">
                    {isAddingCategory ? '새 카테고리 추가' : '카테고리 편집'}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        이름
                      </label>
                      <input
                        type="text"
                        value={editingCategory.name}
                        onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        색상
                      </label>
                      <input
                        type="color"
                        value={editingCategory.color}
                        onChange={(e) => setEditingCategory({ ...editingCategory, color: e.target.value })}
                        className="w-full h-10 border rounded-md"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={handleSaveCategory}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => {
                        setEditingCategory(null)
                        setIsAddingCategory(false)
                      }}
                      className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    >
                      취소
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 슬롯 타입 탭 */}
        {activeTab === 'slots' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-md font-medium text-gray-900">슬롯 타입 관리</h3>
              <button
                onClick={handleAddSlot}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} />
                새 슬롯 타입
              </button>
            </div>

            <div className="space-y-2">
              {slotTypes.map((slot) => (
                <div key={slot.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{slot.name}</div>
                    <div className="text-sm text-gray-500">
                      최대 노출: {slot.max_exposure.toLocaleString()} | 
                      CTR: {(slot.ctr * 100).toFixed(1)}% | 
                      가격: {slot.price.toLocaleString()}원
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingSlot(slot)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteSlot(slot.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 슬롯 타입 편집 모달 */}
            {editingSlot && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-96">
                  <h3 className="text-lg font-medium mb-4">
                    {isAddingSlot ? '새 슬롯 타입 추가' : '슬롯 타입 편집'}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        이름
                      </label>
                      <input
                        type="text"
                        value={editingSlot.name}
                        onChange={(e) => setEditingSlot({ ...editingSlot, name: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        최대 노출수
                      </label>
                      <input
                        type="number"
                        value={editingSlot.max_exposure}
                        onChange={(e) => setEditingSlot({ ...editingSlot, max_exposure: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CTR (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={editingSlot.ctr * 100}
                        onChange={(e) => setEditingSlot({ ...editingSlot, ctr: parseFloat(e.target.value) / 100 })}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        가격 (원)
                      </label>
                      <input
                        type="number"
                        value={editingSlot.price}
                        onChange={(e) => setEditingSlot({ ...editingSlot, price: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={handleSaveSlot}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => {
                        setEditingSlot(null)
                        setIsAddingSlot(false)
                      }}
                      className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    >
                      취소
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 국가 탭 */}
        {activeTab === 'countries' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-md font-medium text-gray-900">국가 관리</h3>
              <button
                onClick={handleAddCountry}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} />
                새 국가
              </button>
            </div>

            <div className="space-y-2">
              {countries.map((country) => (
                <div key={country.code} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{country.name}</div>
                    <div className="text-sm text-gray-500">
                      {country.code} • {country.continent}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingCountry(country)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteCountry(country.code)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 국가 편집 모달 */}
            {editingCountry && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-96">
                  <h3 className="text-lg font-medium mb-4">
                    {isAddingCountry ? '새 국가 추가' : '국가 편집'}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        국가 코드
                      </label>
                      <input
                        type="text"
                        value={editingCountry.code}
                        onChange={(e) => setEditingCountry({ ...editingCountry, code: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 border rounded-md"
                        maxLength={2}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        국가명
                      </label>
                      <input
                        type="text"
                        value={editingCountry.name}
                        onChange={(e) => setEditingCountry({ ...editingCountry, name: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        대륙
                      </label>
                      <select
                        value={editingCountry.continent}
                        onChange={(e) => setEditingCountry({ ...editingCountry, continent: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        {continents.map(continent => (
                          <option key={continent} value={continent}>
                            {continent}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={handleSaveCountry}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => {
                        setEditingCountry(null)
                        setIsAddingCountry(false)
                      }}
                      className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    >
                      취소
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 설정 초기화 버튼 */}
      <div className="p-4 border-t">
        <button
          onClick={onResetSettings}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          설정 초기화
        </button>
      </div>
    </div>
  )
} 