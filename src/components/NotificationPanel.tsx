'use client'

import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export interface UpcomingAd {
    advertiser_name: string;
    banners: string[];
    start_date: string;
    countries: string;
}

interface NotificationPanelProps {
    title: string;
    upcomingAds: UpcomingAd[];
    icon: React.ReactNode;
}

export default function NotificationPanel({ title, upcomingAds, icon }: NotificationPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const displayedAds = showAll ? upcomingAds : upcomingAds.slice(0, 3);

    // Prevent hydration mismatch by not rendering until client-side
    if (!isClient) {
        return (
            <div className="bg-white overflow-hidden shadow-sm rounded-lg border">
                <div className="w-full flex items-center justify-between p-4 text-left">
                    <div className="flex items-center">
                        <span className="text-yellow-500 mr-3">{icon}</span>
                        <h3 className="text-md font-bold text-gray-800">{title} (0)</h3>
                    </div>
                    <ChevronRight size={20} />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 text-left"
            >
                <div className="flex items-center">
                    <span className="text-yellow-500 mr-3">{icon}</span>
                    <h3 className="text-md font-bold text-gray-800">{title} ({upcomingAds.length})</h3>
                </div>
                {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
            {isOpen && (
                <div className="p-4 border-t bg-gray-50">
                    {upcomingAds.length === 0 ? (
                        <p className="text-sm text-gray-500">해당하는 광고가 없습니다.</p>
                    ) : (
                        <ul className="space-y-2">
                            {displayedAds.map((ad, index) => (
                                <li key={index} className="text-sm text-gray-700">
                                    <span className="font-bold">{ad.advertiser_name}:</span> {ad.banners.join(', ')}
                                    <span className="text-gray-500 ml-2">({format(parseISO(ad.start_date), 'M/d')} 시작, {ad.countries || 'N/A'})</span>
                                </li>
                            ))}
                        </ul>
                    )}
                    {upcomingAds.length > 3 && !showAll && (
                        <button
                            onClick={() => setShowAll(true)}
                            className="text-sm text-blue-600 hover:underline mt-3"
                        >
                            더보기
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}