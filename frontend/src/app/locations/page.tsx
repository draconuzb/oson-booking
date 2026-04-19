'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { api } from '@/lib/api';

interface Location {
  id: string;
  name_uz: string;
  name_ru: string;
  name_kz: string;
  name_uz_cyrl: string;
  is_active: boolean;
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [form, setForm] = useState({ name_uz: '', name_ru: '', name_kz: '', name_uz_cyrl: '' });

  const load = () => api.getLocations().then(setLocations).catch(console.error);
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await api.updateLocation(editing.id, form);
    } else {
      await api.createLocation(form);
    }
    setShowForm(false);
    setEditing(null);
    setForm({ name_uz: '', name_ru: '', name_kz: '', name_uz_cyrl: '' });
    load();
  };

  const handleEdit = (loc: Location) => {
    setEditing(loc);
    setForm({ name_uz: loc.name_uz, name_ru: loc.name_ru || '', name_kz: loc.name_kz || '', name_uz_cyrl: loc.name_uz_cyrl || '' });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Haqiqatan o\'chirmoqchimisiz?')) return;
    await api.deleteLocation(id);
    load();
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Joylashuvlar</h2>
        <button onClick={() => { setShowForm(true); setEditing(null); setForm({ name_uz: '', name_ru: '', name_kz: '', name_uz_cyrl: '' }); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          + Qo'shish
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nomi (O'zbek)</label>
              <input value={form.name_uz} onChange={(e) => setForm({ ...form, name_uz: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nomi (Rus)</label>
              <input value={form.name_ru} onChange={(e) => setForm({ ...form, name_ru: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nomi (Qozoq)</label>
              <input value={form.name_kz} onChange={(e) => setForm({ ...form, name_kz: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nomi (Kirill)</label>
              <input value={form.name_uz_cyrl} onChange={(e) => setForm({ ...form, name_uz_cyrl: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
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
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Nomi (UZ)</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Nomi (RU)</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Holat</th>
              <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {locations.map((loc) => (
              <tr key={loc.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">{loc.name_uz}</td>
                <td className="px-6 py-4 text-gray-500">{loc.name_ru || '-'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${loc.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {loc.is_active ? 'Faol' : 'Nofaol'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleEdit(loc)} className="text-blue-600 hover:underline mr-3">Tahrirlash</button>
                  <button onClick={() => handleDelete(loc.id)} className="text-red-600 hover:underline">O'chirish</button>
                </td>
              </tr>
            ))}
            {locations.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Joylashuvlar yo'q</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
