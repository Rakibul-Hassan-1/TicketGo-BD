'use client';
import { useEffect, useState } from 'react';
import { useAppSelector } from '@/hooks/redux';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import api from '@/lib/axios';
import { Booking } from '@/types';
import { formatDate, formatTime, formatCurrency } from '@/lib/utils';
import { Ticket, Clock, CheckCircle2, XCircle, Loader2, Download } from 'lucide-react';
import Link from 'next/link';

const statusColor: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700',
};
const paymentColor: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
};

export default function DashboardPage() {
  const { user } = useAppSelector(s => s.auth);
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return; }
    api.get('/bookings').then(r => setBookings(r.data.data.bookings)).catch(() => {}).finally(() => setLoading(false));
  }, [user, router]);

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter(b => b.bookingStatus === 'confirmed').length,
    pending: bookings.filter(b => b.bookingStatus === 'pending').length,
    spent: bookings.filter(b => b.paymentStatus === 'paid').reduce((s, b) => s + b.totalAmount, 0),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-gray-500 text-sm">Welcome back, {user?.name}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Bookings', value: stats.total, icon: Ticket, color: 'text-blue-600 bg-blue-50' },
            { label: 'Confirmed', value: stats.confirmed, icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
            { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-yellow-600 bg-yellow-50' },
            { label: 'Total Spent', value: formatCurrency(stats.spent), icon: Ticket, color: 'text-purple-600 bg-purple-50' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border p-5">
              <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-3`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border">
          <div className="p-5 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">My Bookings</h2>
            <Link href="/buses/search" className="text-xs bg-primary-600 text-white px-3 py-1.5 rounded-lg hover:bg-primary-700">+ New Booking</Link>
          </div>
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary-600" /></div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Ticket className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No bookings yet</p>
              <Link href="/buses/search" className="text-sm text-primary-600 mt-2 inline-block">Book your first trip →</Link>
            </div>
          ) : (
            <div className="divide-y">
              {bookings.map(b => {
                const trip = b.trip as any;
                return (
                  <div key={b._id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{trip?.route?.from} → {trip?.route?.to}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{b.bookingId} · {trip?.bus?.busName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{trip?.departureTime ? formatDate(trip.departureTime) + ' · ' + formatTime(trip.departureTime) : ''}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Seats: {b.seats?.join(', ')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold text-gray-900 text-sm">{formatCurrency(b.totalAmount)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${paymentColor[b.paymentStatus] || 'bg-gray-100 text-gray-600'}`}>{b.paymentStatus}</span>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor[b.bookingStatus] || 'bg-gray-100 text-gray-600'}`}>{b.bookingStatus}</span>
                      {b.ticketUrl && (
                        <a href={b.ticketUrl} download className="p-2 text-gray-400 hover:text-primary-600 transition-colors" title="Download ticket">
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
