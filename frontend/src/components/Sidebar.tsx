'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menuItems = [
  { href: '/', label: 'Boshqaruv paneli', icon: '📊' },
  { href: '/locations', label: 'Joylashuvlar', icon: '📍' },
  { href: '/shops', label: 'Sartaroshxonalar', icon: '🏠' },
  { href: '/barbers', label: 'Sartaroshlar', icon: '✂️' },
  { href: '/bookings', label: 'Bronlar', icon: '📋' },
  { href: '/clients', label: 'Mijozlar', icon: '👥' },
];

export default function Sidebar() {
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <aside className="w-64 bg-white shadow-lg min-h-screen flex flex-col">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold text-blue-600">OsonBooking</h1>
        <p className="text-sm text-gray-500">Admin Panel</p>
      </div>

      <nav className="flex-1 p-4">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
              pathname === item.href
                ? 'bg-blue-50 text-blue-600 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
        >
          <span>🚪</span>
          <span>Chiqish</span>
        </button>
      </div>
    </aside>
  );
}
