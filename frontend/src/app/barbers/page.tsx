'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { api } from '@/lib/api';

interface Barber {
  id: string;
  name_uz: string;
  shop_name_uz: string;
  user_phone: string;
  user_status: string;
  is_active: boolean;
  telegram_id: string;
}

interface Shop {
  id: string;
  name_uz: string;
  location_name_uz: string;
}

interface Location {
  id: string;
  name_uz: string;
}

export default function BarbersPage() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showNewShop, setShowNewShop] = useState(false);
  const [form, setForm] = useState({ shop_id: '', name_uz: '', phone: '', telegram_id: '' });
  const [newShop, setNewShop] = useState({ location_id: '', name_uz: '', address: '', phone: '' });

  const load = () => {
    api.getAllBarbers().then(setBarbers).catch(console.error);
    api.getShops().then(setShops).catch(console.error);
    api.getLocations().then(setLocations).catch(console.error);
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createBarber(form);
    setShowForm(false);
    setForm({ shop_id: '', name_uz: '', phone: '', telegram_id: '' });
    load();
  };

  const handleAddShop = async () => {
    if (!newShop.location_id || !newShop.name_uz) return;
    const created = await api.createShop(newShop);
    setShops([...shops, created]);
    setForm({ ...form, shop_id: created.id });
    setNewShop({ location_id: '', name_uz: '', address: '', phone: '' });
    setShowNewShop(false);
  };

  const handleApprove = async (id: string) => {
    await api.updateBarberStatus(id, 'active');
    load();
  };

  const handleReject = async (id: string) => {
    await api.updateBarberStatus(id, 'rejected');
    load();
  };

  const handleBlock = async (id: string) => {
    await api.updateBarberStatus(id, 'blocked');
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Haqiqatan o\'chirmoqchimisiz?')) return;
    await api.deleteBarber(id);
    load();
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      rejected: 'bg-red-100 text-red-700',
      blocked: 'bg-gray-100 text-gray-700',
    };
    const labels: Record<string, string> = {
      active: 'Faol',
      pending: 'Kutilmoqda',
      rejected: 'Rad etilgan',
      blocked: 'Bloklangan',
    };
    return <span className={`px-2 py-1 rounded-full text-xs ${styles[status] || ''}`}>{labels[status] || status}</span>;
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Sartaroshlar</h2>
        <button onClick={() => { setShowForm(true); setShowNewShop(false); setForm({ shop_id: '', name_uz: '', phone: '', telegram_id: '' }); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          + Qo'shish
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Sartaroshxona</label>
              <div className="flex gap-2">
                <select value={form.shop_id} onChange={(e) => setForm({ ...form, shop_id: e.target.value })} className="flex-1 px-3 py-2 border rounded-lg" required>
                  <option value="">Tanlang...</option>
                  {shops.map((s) => <option key={s.id} value={s.id}>{s.name_uz} — {s.location_name_uz}</option>)}
                </select>
                <button type="button" onClick={() => setShowNewShop(!showNewShop)}
                  className="px-3 py-2 bg-green-50 text-green-600 border border-green-200 rounded-lg hover:bg-green-100 whitespace-nowrap">
                  + Yangi sartaroshxona
                </button>
              </div>

              {showNewShop && (
                <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
                  <p className="text-sm font-medium text-green-700">Yangi sartaroshxona qo'shish</p>
                  <div className="grid grid-cols-2 gap-3">
                    <select value={newShop.location_id} onChange={(e) => setNewShop({ ...newShop, location_id: e.target.value })}
                      className="px-3 py-2 border rounded-lg text-sm" required>
                      <option value="">Joylashuv tanlang...</option>
                      {locations.map((l) => <option key={l.id} value={l.id}>{l.name_uz}</option>)}
                    </select>
                    <input placeholder="Nomi *" value={newShop.name_uz} onChange={(e) => setNewShop({ ...newShop, name_uz: e.target.value })}
                      className="px-3 py-2 border rounded-lg text-sm" />
                    <input placeholder="Manzil" value={newShop.address} onChange={(e) => setNewShop({ ...newShop, address: e.target.value })}
                      className="px-3 py-2 border rounded-lg text-sm" />
                    <input placeholder="Telefon" value={newShop.phone} onChange={(e) => setNewShop({ ...newShop, phone: e.target.value })}
                      className="px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleAddShop} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Qo'shish</button>
                    <button type="button" onClick={() => setShowNewShop(false)} className="px-3 py-1.5 bg-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-300">Bekor</button>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ism</label>
              <input value={form.name_uz} onChange={(e) => setForm({ ...form, name_uz: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="+998 90 123 45 67" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telegram ID</label>
              <input value={form.telegram_id} onChange={(e) => setForm({ ...form, telegram_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="123456789" />
              <p className="text-xs text-gray-400 mt-1">Ixtiyoriy — sartarosh botga kirganda avtomatik ulanadi</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Qo'shish</button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Bekor qilish</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Ism</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Sartaroshxona</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Telefon</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Holat</th>
              <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {barbers.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{b.name_uz}</td>
                <td className="px-6 py-4 text-gray-500">{b.shop_name_uz}</td>
                <td className="px-6 py-4 text-gray-500">{b.user_phone || '-'}</td>
                <td className="px-6 py-4">{statusBadge(b.user_status)}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  {b.user_status === 'pending' && (
                    <>
                      <button onClick={() => handleApprove(b.id)} className="text-green-600 hover:underline">Tasdiqlash</button>
                      <button onClick={() => handleReject(b.id)} className="text-red-600 hover:underline">Rad etish</button>
                    </>
                  )}
                  {b.user_status === 'active' && (
                    <button onClick={() => handleBlock(b.id)} className="text-orange-600 hover:underline">Bloklash</button>
                  )}
                  {b.user_status === 'blocked' && (
                    <button onClick={() => handleApprove(b.id)} className="text-green-600 hover:underline">Faollashtirish</button>
                  )}
                  <button onClick={() => handleDelete(b.id)} className="text-red-600 hover:underline">O'chirish</button>
                </td>
              </tr>
            ))}
            {barbers.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Sartaroshlar yo'q</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
