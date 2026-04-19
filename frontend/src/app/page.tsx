'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { api } from '@/lib/api';

interface Stats {
  total_bookings: number;
  today_bookings: number;
  pending_bookings: number;
  confirmed_bookings: number;
  total_clients: number;
  total_barbers: number;
  pending_barbers: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getStats().then(setStats).catch((err: Error) => { console.error(err); setError('Ma\'lumotlarni yuklashda xatolik'); });
  }, []);

  const cards = stats
    ? [
        { label: 'Bugungi bronlar', value: stats.today_bookings, color: 'blue', icon: '📅' },
        { label: 'Kutilayotgan', value: stats.pending_bookings, color: 'yellow', icon: '⏳' },
        { label: 'Tasdiqlangan', value: stats.confirmed_bookings, color: 'green', icon: '✅' },
        { label: 'Jami bronlar', value: stats.total_bookings, color: 'purple', icon: '📋' },
        { label: 'Mijozlar', value: stats.total_clients, color: 'indigo', icon: '👥' },
        { label: 'Sartaroshlar', value: stats.total_barbers, color: 'teal', icon: '✂️' },
        { label: 'Kutilayotgan sartaroshlar', value: stats.pending_barbers, color: 'orange', icon: '📩' },
      ]
    : [];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    teal: 'bg-teal-50 text-teal-600 border-teal-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
  };

  return (
    <AdminLayout>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Boshqaruv paneli</h2>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4">{error}</div>
      )}

      {!stats ? (
        <div className="text-gray-500">Yuklanmoqda...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className={`p-6 rounded-xl border ${colorMap[card.color]} transition-transform hover:scale-105`}
            >
              <div className="text-3xl mb-2">{card.icon}</div>
              <div className="text-3xl font-bold">{card.value}</div>
              <div className="text-sm mt-1 opacity-80">{card.label}</div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
