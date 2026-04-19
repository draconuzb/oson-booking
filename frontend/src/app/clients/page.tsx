'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { api } from '@/lib/api';

interface Client {
  id: string;
  telegram_id: string;
  full_name: string;
  phone: string;
  language: string;
  created_at: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    // M2 fix: use api helper; H6: handle paginated response
    api.getClients()
      .then((data: any) => setClients(data.clients || data))
      .catch((err: Error) => { console.error(err); setError('Ma\'lumotlarni yuklashda xatolik'); });
  }, []);

  const langLabels: Record<string, string> = {
    uz: "O'zbek",
    ru: 'Русский',
    kz: 'Қазақ',
    uz_cyrl: 'Ўзбек',
  };

  return (
    <AdminLayout>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Mijozlar</h2>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4">{error}</div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Ism</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Telefon</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Til</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Ro'yxatdan o'tgan</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {clients.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{c.full_name || 'Noma\'lum'}</td>
                <td className="px-6 py-4 text-gray-500">{c.phone || '-'}</td>
                <td className="px-6 py-4 text-gray-500">{langLabels[c.language] || c.language}</td>
                <td className="px-6 py-4 text-gray-500">{new Date(c.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Mijozlar yo'q</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
