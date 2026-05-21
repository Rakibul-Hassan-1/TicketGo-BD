'use client';
import { useEffect, useState } from 'react';
import { useAppSelector } from '@/hooks/redux';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import api from '@/lib/axios';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import { Bus, Route, TrendingUp, Loader2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OperatorPage() {
  const { user } = useAppSelector(s => s.auth);
  const router = useRouter();
  const [buses, setBuses] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'buses'|'trips'|'revenue'>('buses');
  const [showAddBus, setShowAddBus] = useState(false);
  const [busForm, setBusForm] = useState({ busName: '', busNumber: '', type: 'AC', totalSeats: 40 });

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return; }
    if (user.role !== 'operator' && user.role !== 'admin') { router.push('/dashboard'); return; }
    Promise.all([
      api.get('/operator/my-buses'),
      api.get('/operator/my-trips'),
      api.get('/operator/revenue'),
    ]).then(([b, t, r]) => {
      setBuses(b.data.data.buses);
      setTrips(t.data.data.trips);
      setRevenue(r.data.data);
    }).finally(() => setLoading(false));
  }, [user, router]);

  const addBus = async (e: any) => {
    e.preventDefault();
    const seats = Array.from({ length: busForm.totalSeats }, (_, i) => ({
      number: `${Math.floor(i / 4) + 1}${['A','B','C','D'][i % 4]}`,
      type: i % 4 < 2 ? 'window' : 'aisle',
      deck: 'lower',
    }));
    try {
      const res = await api.post('/buses', { ...busForm, seats });
      setBuses(prev => [res.data.data.bus, ...prev]);
      setShowAddBus(false);
      toast.success('Bus added!');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900">Operator Panel</h1><p className="text-sm text-gray-500">Manage your buses and trips</p></div>

        {revenue && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: 'My Buses', value: buses.length, icon: Bus, color: 'text-blue-600 bg-blue-50' },
              { label: 'My Trips', value: trips.length, icon: Route, color: 'text-purple-600 bg-purple-50' },
              { label: 'Revenue', value: formatCurrency(revenue.totalRevenue), icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-xl border p-4">
                <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-3`}><Icon className="w-4 h-4" /></div>
                <p className="text-xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 mb-6 border-b">
          {(['buses','trips','revenue'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t}</button>
          ))}
        </div>

        {tab === 'buses' && (
          <div className="bg-white rounded-xl border">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-semibold text-gray-900">My Buses</h2>
              <button onClick={() => setShowAddBus(!showAddBus)} className="flex items-center gap-1.5 bg-primary-600 text-white text-xs px-3 py-2 rounded-lg hover:bg-primary-700">
                <Plus className="w-3.5 h-3.5" /> Add Bus
              </button>
            </div>
            {showAddBus && (
              <form onSubmit={addBus} className="p-4 border-b bg-gray-50 grid grid-cols-2 gap-3">
                <input placeholder="Bus Name" value={busForm.busName} onChange={e => setBusForm(p => ({ ...p, busName: e.target.value }))} required className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
                <input placeholder="Bus Number (e.g. DHA-1234)" value={busForm.busNumber} onChange={e => setBusForm(p => ({ ...p, busNumber: e.target.value }))} required className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
                <select value={busForm.type} onChange={e => setBusForm(p => ({ ...p, type: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300">
                  {['AC','Non-AC','Sleeper','Semi-Sleeper'].map(t => <option key={t}>{t}</option>)}
                </select>
                <input type="number" placeholder="Total Seats" value={busForm.totalSeats} onChange={e => setBusForm(p => ({ ...p, totalSeats: +e.target.value }))} min={10} max={80} required className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
                <button type="submit" className="col-span-2 bg-primary-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-700">Save Bus</button>
              </form>
            )}
            <div className="divide-y">
              {buses.length === 0 ? <p className="text-center py-10 text-gray-400 text-sm">No buses yet</p> : buses.map((b: any) => (
                <div key={b._id} className="p-4 flex items-center justify-between text-sm">
                  <div><p className="font-medium text-gray-900">{b.busName}</p><p className="text-xs text-gray-500">{b.busNumber} · {b.type} · {b.totalSeats} seats</p></div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${b.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{b.isActive ? 'Active' : 'Inactive'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'trips' && (
          <div className="bg-white rounded-xl border">
            <div className="divide-y">
              {trips.length === 0 ? <p className="text-center py-10 text-gray-400 text-sm">No trips yet</p> : trips.map((t: any) => (
                <div key={t._id} className="p-4 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{t.route?.from} → {t.route?.to}</p>
                    <p className="text-xs text-gray-500">{t.bus?.busName} · {t.departureTime ? formatDate(t.departureTime) + ' ' + formatTime(t.departureTime) : ''}</p>
                    <p className="text-xs text-gray-400">{t.availableSeats?.length} seats left · {formatCurrency(t.fare)}/seat</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${t.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : t.status === 'departed' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{t.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'revenue' && revenue && (
          <div className="bg-white rounded-xl border p-6">
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="text-center p-4 bg-emerald-50 rounded-xl">
                <p className="text-3xl font-bold text-emerald-700">{formatCurrency(revenue.totalRevenue)}</p>
                <p className="text-sm text-emerald-600 mt-1">Total Revenue</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <p className="text-3xl font-bold text-blue-700">{revenue.totalBookings}</p>
                <p className="text-sm text-blue-600 mt-1">Paid Bookings</p>
              </div>
            </div>
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">Recent Transactions</h3>
            <div className="space-y-2">
              {revenue.bookings?.slice(0, 10).map((b: any) => (
                <div key={b._id} className="flex justify-between text-sm py-2 border-b last:border-0">
                  <span className="text-gray-600">{formatDate(b.createdAt)}</span>
                  <span className="font-medium text-gray-900">{formatCurrency(b.totalAmount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
