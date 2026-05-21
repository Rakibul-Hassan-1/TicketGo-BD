'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { Trip } from '@/types';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { toggleSeat, setLockedSeats, addLockedSeat, removeLockedSeat } from '@/store/slices/bookingSlice';
import { Navbar } from '@/components/layout/Navbar';
import { formatTime, formatCurrency, calculateDuration } from '@/lib/utils';
import { connectSocket, getSocket, joinTripRoom, leaveTripRoom } from '@/lib/socket';
import { Loader2, Armchair } from 'lucide-react';
import toast from 'react-hot-toast';

function SeatSelector() {
  const params = useSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { selectedSeats, lockedSeats } = useAppSelector(s => s.booking);
  const { user } = useAppSelector(s => s.auth);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [locking, setLocking] = useState(false);
  const tripId = params.get('tripId')!;

  useEffect(() => {
    if (!tripId) return;
    api.get(`/trips/${tripId}`).then(r => {
      setTrip(r.data.data.trip);
      dispatch(setLockedSeats(r.data.data.lockedSeats || []));
    }).finally(() => setLoading(false));
    connectSocket();
    joinTripRoom(tripId);
    const socket = getSocket();
    socket.on('seat:locked', (seats: string[]) => dispatch(addLockedSeat(seats)));
    socket.on('seat:unlocked', (seats: string[]) => dispatch(removeLockedSeat(seats)));
    socket.on('seats:locked', (seats: string[]) => dispatch(setLockedSeats(seats)));
    return () => { leaveTripRoom(tripId); socket.off('seat:locked'); socket.off('seat:unlocked'); socket.off('seats:locked'); };
  }, [tripId, dispatch]);

  const getSeatStatus = (n: string) => {
    if (trip?.bookedSeats.includes(n)) return 'booked';
    if (lockedSeats.includes(n)) return 'locked';
    if (selectedSeats.includes(n)) return 'selected';
    return 'available';
  };

  const handleContinue = async () => {
    if (!user) { router.push('/auth/login'); return; }
    if (!selectedSeats.length) { toast.error('Select at least one seat'); return; }
    setLocking(true);
    try {
      await api.post('/bookings/lock-seats', { tripId, seats: selectedSeats });
      toast.success(`${selectedSeats.length} seat(s) locked for 5 minutes!`);
      router.push('/booking/passenger-details');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to lock seats');
    } finally { setLocking(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>;
  if (!trip) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="bg-white rounded-xl border p-5 mb-6 flex justify-between items-center">
        <div>
          <p className="font-bold text-gray-900">{trip.bus.busName} · <span className="text-gray-400 font-normal">{trip.bus.type}</span></p>
          <p className="text-sm text-gray-500">{trip.route.from} → {trip.route.to} · {formatTime(trip.departureTime)}</p>
        </div>
        <p className="text-xl font-bold text-primary-600">{formatCurrency(trip.fare)}<span className="text-xs text-gray-400 font-normal">/seat</span></p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Select Seats</h2>
          <div className="flex gap-4 text-xs mb-5 flex-wrap">
            {[['bg-white border-2 border-gray-300','Available'],['bg-primary-600 border-2 border-primary-700','Selected'],['bg-gray-200 border-2 border-gray-300','Booked'],['bg-amber-100 border-2 border-amber-400','Locked']].map(([cls, label]) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded ${cls}`} />
                <span className="text-gray-500">{label}</span>
              </div>
            ))}
          </div>
          <div className="bg-gray-100 rounded-lg p-2 text-center text-xs text-gray-500 font-medium mb-4">🚌 FRONT / DRIVER</div>
          <div className="grid grid-cols-5 gap-2 max-w-xs mx-auto">
            {trip.bus.seats.map(seat => {
              const status = getSeatStatus(seat.number);
              return (
                <button key={seat.number} disabled={status === 'booked' || status === 'locked'}
                  onClick={() => dispatch(toggleSeat(seat.number))}
                  className={`w-10 h-10 rounded text-xs font-medium flex items-center justify-center transition-all
                    ${status === 'available' ? 'bg-white border-2 border-gray-300 hover:border-primary-600 hover:bg-primary-50 cursor-pointer' : ''}
                    ${status === 'selected' ? 'bg-primary-600 border-2 border-primary-700 text-white' : ''}
                    ${status === 'booked' ? 'bg-gray-200 border-2 border-gray-300 text-gray-400 cursor-not-allowed' : ''}
                    ${status === 'locked' ? 'bg-amber-100 border-2 border-amber-400 text-amber-700 cursor-not-allowed' : ''}
                  `}>{seat.number}</button>
              );
            })}
          </div>
        </div>
        <div className="bg-white rounded-xl border p-5 h-fit sticky top-20">
          <h3 className="font-semibold text-gray-800 mb-4">Summary</h3>
          {!selectedSeats.length ? (
            <p className="text-sm text-gray-400 text-center py-4">No seats selected</p>
          ) : (
            <>
              <div className="space-y-2 mb-4">
                {selectedSeats.map(s => (
                  <div key={s} className="flex justify-between text-sm">
                    <span className="text-gray-600">Seat {s}</span>
                    <span>{formatCurrency(trip.fare)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-3 flex justify-between font-bold">
                <span>Total</span>
                <span className="text-primary-600">{formatCurrency(trip.fare * selectedSeats.length)}</span>
              </div>
            </>
          )}
          <button onClick={handleContinue} disabled={locking || !selectedSeats.length}
            className="mt-4 w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors">
            {locking ? <><Loader2 className="w-4 h-4 animate-spin" />Locking...</> : 'Continue →'}
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">Seats locked 5 mins while you pay</p>
        </div>
      </div>
    </div>
  );
}

export default function SelectSeatsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>}>
        <SeatSelector />
      </Suspense>
    </div>
  );
}
