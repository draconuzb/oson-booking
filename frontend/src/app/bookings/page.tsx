'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { api } from '@/lib/api';

interface Booking {
  id: string;
  client_name: string;
  client_phone: string;
  barber_name_uz: string;
  shop_name_uz: string;
  booking_date: string;
  booking_time: string;
  status: string;
  services: { name_uz: string; price: number }[];
  total_price: number;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    const filters: { status?: string; date?: string } = {};
    if (statusFilter) filters.status = statusFilter;
    if (dateFilter) filters.date = dateFilter;
    api.getBookings(filters).then(setBookings).catch((err: Error) => { console.error(err); setError('Bronlarni yuklashda xatolik'); });
  };

  useEffect(() => { load(); }, [statusFilter, dateFilter]);

  // L5 fix: Format date nicely
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5); // "14:00:00" → "14:00"
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await api.updateBookingStatus(id, status);
      load();
    } catch (err) {
      console.error(err);
      setError('Holatni o\'zgartirishda xatolik');
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-700',
      completed: 'bg-blue-100 text-blue-700',
    };
    const labels: Record<string, string> = {
      pending: 'Kutilmoqda',
      confirmed: 'Tasdiqlangan',
      rejected: 'Rad etilgan',
      cancelled: 'Bekor qilingan',
      completed: 'Tugallangan',
    };
    return <span className={`px-2 py-1 rounded-full text-xs ${styles[status] || ''}`}>{labels[status] || status}</span>;
  };

  return (
    <AdminLayout>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Bronlar</h2>

      <div className="flex gap-4 mb-6">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg bg-white">
          <option value="">Barcha holatlar</option>
          <option value="pending">Kutilmoqda</option>
          <option value="confirmed">Tasdiqlangan</option>
          <option value="rejected">Rad etilgan</option>
          <option value="cancelled">Bekor qilingan</option>
          <option value="completed">Tugallangan</option>
        </select>
        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="px-3 py-2 border rounded-lg" />
        {(statusFilter || dateFilter) && (
          <button onClick={() => { setStatusFilter(''); setDateFilter(''); }} className="text-gray-500 hover:text-gray-700">Tozalash</button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4">{error}</div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Sana</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Vaqt</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Mijoz</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Sartarosh</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Xizmatlar</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Jami</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Holat</th>
              <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {bookings.map((bk) => (
              <tr key={bk.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">{formatDate(bk.booking_date)}</td>
                <td className="px-6 py-4">{formatTime(bk.booking_time)}</td>
                <td className="px-6 py-4">
                  <div className="font-medium">{bk.client_name || 'Noma\'lum'}</div>
                  <div className="text-sm text-gray-500">{bk.client_phone || ''}</div>
                </td>
                <td className="px-6 py-4">
                  <div>{bk.barber_name_uz}</div>
                  <div className="text-sm text-gray-500">{bk.shop_name_uz}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {bk.services?.map(s => s.name_uz).join(', ') || '-'}
                </td>
                <td className="px-6 py-4 font-medium">{bk.total_price?.toLocaleString() || 0} so'm</td>
                <td className="px-6 py-4">{statusBadge(bk.status)}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  {bk.status === 'confirmed' && (
                    <button onClick={() => handleStatusChange(bk.id, 'completed')}
                      className="text-blue-600 hover:underline text-sm">Tugallangan</button>
                  )}
                  {bk.status === 'pending' && (
                    <>
                      <button onClick={() => handleStatusChange(bk.id, 'confirmed')}
                        className="text-green-600 hover:underline text-sm">Tasdiqlash</button>
                      <button onClick={() => handleStatusChange(bk.id, 'rejected')}
                        className="text-red-600 hover:underline text-sm">Rad etish</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">Bronlar yo'q</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
