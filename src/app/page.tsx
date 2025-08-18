'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { AdScheduleWithDetails } from '@/types/database'
import { useAds } from '@/hooks/useAds'
import { useSettings } from '@/hooks/useSettings'
import SpreadsheetView from '@/components/SpreadsheetView'
import SettingsView from '@/components/SettingsView'
import CampaignView from '@/components/CampaignView'
import NotificationPanel, { UpcomingAd } from '@/components/NotificationPanel'
import AdDetailPanel from '@/components/AdDetailPanel' // AdDetailPanel 임포트
import { Settings, BarChart3, Users, Bell } from 'lucide-react'
import { startOfTomorrow, startOfWeek, endOfWeek, addDays, parseISO, isWithinInterval, format } from 'date-fns'
import { getBookingsByRange } from './actions/getBookings'

export default function Home() {
  const [activeView, setActiveView] = useState<'spreadsheet' | 'campaigns' | 'settings'>('spreadsheet')
  const [selectedSchedule, setSelectedSchedule] = useState<AdScheduleWithDetails | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  
  const {
    campaigns,
    adSchedules,
    loading,
    error,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    createAdSchedule,
    updateAdSchedule,
    deleteAdSchedule
  } = useAds()

  const {
    settings,
    updateCategories,
    updateSlotTypes,
    updateCountries,
    resetSettings
  } = useSettings()

  // Fetch bookings data for current week
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const startOfWeekDate = startOfWeek(new Date(), { weekStartsOn: 1 });
        const endOfWeekDate = endOfWeek(new Date(), { weekStartsOn: 1 });
        const startYmd = format(startOfWeekDate, 'yyyy-MM-dd');
        const endYmd = format(endOfWeekDate, 'yyyy-MM-dd');
        
        // DB에서 주간 범위 읽기
        const dbBookings = await getBookingsByRange(startYmd, endYmd);
        setBookings(dbBookings);
      } catch (error) {
        console.error('Failed to fetch bookings:', error);
      }
    };
    
    fetchBookings();
  }, []);

  const { adsStartingTomorrow, adsStartingNextWeek } = useMemo(() => {
    const tomorrow = startOfTomorrow();
    const nextWeekStart = startOfWeek(addDays(new Date(), 7), { weekStartsOn: 1 });
    const nextWeekEnd = endOfWeek(addDays(new Date(), 7), { weekStartsOn: 1 });

    const startingTomorrow: AdScheduleWithDetails[] = [];
    const startingNextWeek: AdScheduleWithDetails[] = [];

    adSchedules.forEach(ad => {
        if (!ad.start_date) return;
        try {
            const startDate = parseISO(ad.start_date);
            if (format(startDate, 'yyyy-MM-dd') === format(tomorrow, 'yyyy-MM-dd')) {
                startingTomorrow.push(ad);
            }
            if (isWithinInterval(startDate, { start: nextWeekStart, end: nextWeekEnd })) {
                startingNextWeek.push(ad);
            }
        } catch(e) {
            console.error("Error parsing date: ", ad.start_date);
        }
    });
    
    const groupAds = (ads: AdScheduleWithDetails[]): UpcomingAd[] => {
        const grouped = new Map<string, { banners: Set<string>; start_date: string; countries: Set<string> }>();
        ads.forEach(ad => {
          const advertiser = ad.campaign?.advertiser_name || '알 수 없음';
          if (!grouped.has(advertiser)) {
            grouped.set(advertiser, { banners: new Set(), start_date: ad.start_date, countries: new Set() });
          }
          const entry = grouped.get(advertiser)!;
          const bannerInfo = settings.slotTypes.find(st => st.id === ad.banner_id);
          entry.banners.add(bannerInfo?.name || ad.banner_id);
          ad.targets.forEach(t => entry.countries.add(t.country_code));
        });
        return Array.from(grouped.entries()).map(([advertiser_name, data]) => ({
          advertiser_name,
          banners: Array.from(data.banners),
          start_date: data.start_date,
          countries: Array.from(data.countries).join(', '),
        }));
      };
      
    return {
      adsStartingTomorrow: groupAds(startingTomorrow),
      adsStartingNextWeek: groupAds(startingNextWeek),
    };
  }, [adSchedules, settings.slotTypes]);

  const handleCreateSchedule = async (scheduleData: any, targets: any[]) => await createAdSchedule(scheduleData, targets)
  const handleUpdateSchedule = async (id: string, updates: any, targets?: any[]) => {
    await updateAdSchedule(id, updates, targets);
    // After updating, refresh the selected schedule data if it's open
    if (selectedSchedule && selectedSchedule.ad_schedule_id === id) {
        const updatedSchedule = adSchedules.find(s => s.ad_schedule_id === id);
        if(updatedSchedule) {
           const reloadedSchedule = { ...updatedSchedule, ...updates };
           setSelectedSchedule(reloadedSchedule);
        } else {
           setSelectedSchedule(null);
        }
    }
  }
  const handleDeleteSchedule = async (id: string) => await deleteAdSchedule(id)
  
  const handleAdClick = (schedule: AdScheduleWithDetails) => {
    setSelectedSchedule(schedule);
  }

  // Refresh bookings after successful creation
  const handleBookingCreated = async () => {
    try {
      const startOfWeekDate = startOfWeek(new Date(), { weekStartsOn: 1 });
      const endOfWeekDate = endOfWeek(new Date(), { weekStartsOn: 1 });
      const startYmd = format(startOfWeekDate, 'yyyy-MM-dd');
      const endYmd = format(endOfWeekDate, 'yyyy-MM-dd');
      
      const data = await getBookingsByRange(startYmd, endYmd);
      setBookings(data);
    } catch (error) {
      console.error('Failed to refresh bookings:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">캘린더 광고 관리 시스템</h1>
            <nav className="flex space-x-4">
              <button
                onClick={() => setActiveView('spreadsheet')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'spreadsheet'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <BarChart3 size={16} />
                스프레드시트
              </button>
              <button
                onClick={() => setActiveView('campaigns')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'campaigns'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Users size={16} />
                캠페인
              </button>
              <button
                onClick={() => setActiveView('settings')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'settings'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Settings size={16} />
                설정
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <h3 className="text-sm font-medium text-red-800">오류가 발생했습니다</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        )}

        {activeView === 'spreadsheet' && (
            <div className="space-y-4 mb-8">
                <NotificationPanel 
                    title="내일 시작될 광고"
                    upcomingAds={adsStartingTomorrow}
                    icon={<Bell size={20} />}
                />
                <NotificationPanel 
                    title="다음주 시작될 광고"
                    upcomingAds={adsStartingNextWeek}
                    icon={<Bell size={20} />}
                />
            </div>
        )}

        {activeView === 'spreadsheet' && (
          <SpreadsheetView
            adSchedules={adSchedules}
            campaigns={campaigns}
            externalBookings={bookings}
            onCreateSchedule={handleCreateSchedule}
            onUpdateSchedule={handleUpdateSchedule}
            onDeleteSchedule={handleDeleteSchedule}
            onAdClick={handleAdClick}
            onBookingCreated={handleBookingCreated}
            loading={loading}
          />
        )}
        {activeView === 'campaigns' && (
          <CampaignView
            campaigns={campaigns}
            onCreateCampaign={createCampaign}
            onUpdateCampaign={updateCampaign}
            onDeleteCampaign={deleteCampaign}
            loading={loading}
          />
        )}
        {activeView === 'settings' && (
          <SettingsView
            categories={settings.categories}
            slotTypes={settings.slotTypes}
            countries={settings.countries}
            onUpdateCategories={updateCategories}
            onUpdateSlotTypes={updateSlotTypes}
            onUpdateCountries={updateCountries}
            onResetSettings={resetSettings}
          />
        )}
      </main>

      <AdDetailPanel
        schedule={selectedSchedule}
        onClose={() => setSelectedSchedule(null)}
        onSave={handleUpdateSchedule}
        onDelete={handleDeleteSchedule}
      />
    </div>
  )
}
