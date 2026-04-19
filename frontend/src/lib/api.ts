const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function fetchAPI(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  return res.json();
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    fetchAPI('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  // Stats
  getStats: () => fetchAPI('/api/stats'),

  // Locations
  getLocations: () => fetchAPI('/api/locations'),
  createLocation: (data: any) => fetchAPI('/api/locations', { method: 'POST', body: JSON.stringify(data) }),
  updateLocation: (id: string, data: any) => fetchAPI(`/api/locations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLocation: (id: string) => fetchAPI(`/api/locations/${id}`, { method: 'DELETE' }),

  // Shops
  getShops: (locationId?: string) => fetchAPI(`/api/shops${locationId ? `?location_id=${locationId}` : ''}`),
  createShop: (data: any) => fetchAPI('/api/shops', { method: 'POST', body: JSON.stringify(data) }),
  updateShop: (id: string, data: any) => fetchAPI(`/api/shops/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteShop: (id: string) => fetchAPI(`/api/shops/${id}`, { method: 'DELETE' }),

  // Barbers
  getBarbers: (shopId?: string) => fetchAPI(`/api/barbers${shopId ? `?shop_id=${shopId}` : ''}`),
  getAllBarbers: () => fetchAPI('/api/barbers/all'),
  createBarber: (data: any) => fetchAPI('/api/barbers', { method: 'POST', body: JSON.stringify(data) }),
  updateBarber: (id: string, data: any) => fetchAPI(`/api/barbers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateBarberStatus: (id: string, status: string) => fetchAPI(`/api/barbers/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  deleteBarber: (id: string) => fetchAPI(`/api/barbers/${id}`, { method: 'DELETE' }),

  // Services
  getServices: () => fetchAPI('/api/services'),
  getBarberServices: (barberId: string) => fetchAPI(`/api/services/barber/${barberId}`),

  // Bookings
  getBookings: (filters?: { status?: string; date?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.date) params.set('date', filters.date);
    return fetchAPI(`/api/bookings?${params}`);
  },
  updateBookingStatus: (id: string, status: string) =>
    fetchAPI(`/api/bookings/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  // M2 fix: Clients
  getClients: (page?: number) => fetchAPI(`/api/clients${page ? `?page=${page}` : ''}`),
};
