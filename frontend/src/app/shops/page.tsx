'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { api } from '@/lib/api';

interface Shop {
  id: string;
  location_id: string;
  name_uz: string;
  name_ru: string;
  name_kz: string;
  name_uz_cyrl: string;
  address: string;
  phone: string;
  is_active: boolean;
  location_name_uz: string;
}

interface Location {
  id: string;
  name_uz: string;
}

export default function ShopsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showNewLocation, setShowNewLocation] = useState(false);
  const [editing, setEditing] = useState<Shop | null>(null);
  const [form, setForm] = useState({ location_id: '', name_uz: '', name_ru: '', name_kz: '', name_uz_cyrl: '', address: '', phone: '' });
  const [newLocation, setNewLocation] = useState({ name_uz: '', name_ru: '', name_kz: '', name_uz_cyrl: '' });

  const load = () => {
    api.getShops().then(setShops).catch(console.error);
    api.getLocations().then(setLocations).catch(console.error);
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await api.updateShop(editing.id, form);
    } else {
      await api.createShop(form);
    }
    setShowForm(false);
    setEditing(null);
    setForm({ location_id: '', name_uz: '', name_ru: '', name_kz: '', name_uz_cyrl: '', address: '', phone: '' });
    load();
  };

  const handleAddLocation = async () => {
    if (!newLocation.name_uz) return;
    const created = await api.createLocation(newLocation);
    setLocations([...locations, created]);
    setForm({ ...form, location_id: created.id });
    setNewLocation({ name_uz: '', name_ru: '', name_kz: '', name_uz_cyrl: '' });
    setShowNewLocation(false);
  };

  const handleEdit = (shop: Shop) => {
    setEditing(shop);
    setForm({
      location_id: shop.location_id,
      name_uz: shop.name_uz, name_ru: shop.name_ru || '', name_kz: shop.name_kz || '', name_uz_cyrl: shop.name_uz_cyrl || '',
      address: shop.address || '', phone: shop.phone || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Haqiqatan o\'chirmoqchimisiz?')) return;
    await api.deleteShop(id);
    load();
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Sartaroshxonalar</h2>
        <button onClick={() => { setShowForm(true); setEditing(null); setShowNewLocation(false); setForm({ location_id: '', name_uz: '', name_ru: '', name_kz: '', name_uz_cyrl: '', address: '', phone: '' }); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          + Qo'shish
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Joylashuv</label>
              <div className="flex gap-2">
                <select value={form.location_id} onChange={(e) => setForm({ ...form, location_id: e.target.value })} className="flex-1 px-3 py-2 border rounded-lg" required>
                  <option value="">Tanlang...</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name_uz}</option>)}
                </select>
                <button type="button" onClick={() => setShowNewLocation(!showNewLocation)}
                  className="px-3 py-2 bg-green-50 text-green-600 border border-green-200 rounded-lg hover:bg-green-100 whitespace-nowrap">
                  + Yangi joylashuv
                </button>
              </div>

              {showNewLocation && (
                <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
                  <p className="text-sm font-medium text-green-700">Yangi joylashuv qo'shish</p>
                  <div className="grid grid-cols-2 gap-3">
                    <input placeholder="Nomi (O'zbek) *" value={newLocation.name_uz} onChange={(e) => setNewLocation({ ...newLocation, name_uz: e.target.value })}
                      className="px-3 py-2 border rounded-lg text-sm" />
                    <input placeholder="Nomi (Rus)" value={newLocation.name_ru} onChange={(e) => setNewLocation({ ...newLocation, name_ru: e.target.value })}
                      className="px-3 py-2 border rounded-lg text-sm" />
                    <input placeholder="Nomi (Qozoq)" value={newLocation.name_kz} onChange={(e) => setNewLocation({ ...newLocation, name_kz: e.target.value })}
                      className="px-3 py-2 border rounded-lg text-sm" />
                    <input placeholder="Nomi (Kirill)" value={newLocation.name_uz_cyrl} onChange={(e) => setNewLocation({ ...newLocation, name_uz_cyrl: e.target.value })}
                      className="px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleAddLocation} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Qo'shish</button>
                    <button type="button" onClick={() => setShowNewLocation(false)} className="px-3 py-1.5 bg-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-300">Bekor</button>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nomi (O'zbek)</label>
              <input value={form.name_uz} onChange={(e) => setForm({ ...form, name_uz: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nomi (Rus)</label>
              <input value={form.name_ru} onChange={(e) => setForm({ ...form, name_ru: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Manzil</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              {editing ? 'Yangilash' : 'Qo\'shish'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">
              Bekor qilish
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Nomi</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Joylashuv</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Manzil</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Telefon</th>
              <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {shops.map((shop) => (
              <tr key={shop.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{shop.name_uz}</td>
                <td className="px-6 py-4 text-gray-500">{shop.location_name_uz}</td>
                <td className="px-6 py-4 text-gray-500">{shop.address || '-'}</td>
                <td className="px-6 py-4 text-gray-500">{shop.phone || '-'}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleEdit(shop)} className="text-blue-600 hover:underline mr-3">Tahrirlash</button>
                  <button onClick={() => handleDelete(shop.id)} className="text-red-600 hover:underline">O'chirish</button>
                </td>
              </tr>
            ))}
            {shops.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Sartaroshxonalar yo'q</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
