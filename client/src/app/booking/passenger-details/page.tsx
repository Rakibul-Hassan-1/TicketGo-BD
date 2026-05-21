'use client';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppSelector, useAppDispatch } from '@/hooks/redux';
import { setPassengers } from '@/store/slices/bookingSlice';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import api from '@/lib/axios';
import { formatCurrency } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useState } from 'react';

const passengerSchema = z.object({
  name: z.string().min(2),
  age: z.coerce.number().min(1).max(120),
  gender: z.enum(['male', 'female', 'other']),
  seatNumber: z.string(),
});

const schema = z.object({ passengers: z.array(passengerSchema) });

export default function PassengerDetailsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { selectedTrip, selectedSeats } = useAppSelector(s => s.booking);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!selectedTrip || !selectedSeats.length) router.push('/'); }, [selectedTrip, selectedSeats, router]);

  const { register, control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { passengers: selectedSeats.map(s => ({ name: '', age: 25, gender: 'male', seatNumber: s })) },
  });
  const { fields } = useFieldArray({ control, name: 'passengers' });

  const onSubmit = async (data: any) => {
    if (!selectedTrip) return;
    setLoading(true);
    try {
      dispatch(setPassengers(data.passengers));
      const bookingRes = await api.post('/bookings', {
        tripId: selectedTrip._id,
        seats: selectedSeats,
        passengers: data.passengers,
      });
      const bookingId = bookingRes.data.data.booking.bookingId;
      const payRes = await api.post('/payment/initiate', { bookingId });
      window.location.href = payRes.data.data.url;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to proceed');
      setLoading(false);
    }
  };

  if (!selectedTrip) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Passenger Details</h1>
        <p className="text-sm text-gray-500 mb-6">{selectedTrip.route.from} → {selectedTrip.route.to} · Seats: {selectedSeats.join(', ')}</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {fields.map((field, i) => (
            <div key={field.id} className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Passenger {i + 1} — Seat {selectedSeats[i]}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input {...register(`passengers.${i}.name`)} placeholder="Full name"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                  <input type="number" {...register(`passengers.${i}.age`)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select {...register(`passengers.${i}.gender`)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300">
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seat</label>
                  <input readOnly value={selectedSeats[i]}
                    className="w-full border border-gray-100 bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-500" />
                </div>
              </div>
            </div>
          ))}
          <div className="bg-white rounded-xl border p-5 flex justify-between items-center">
            <div>
              <p className="font-semibold text-gray-900">Total: {formatCurrency(selectedTrip.fare * selectedSeats.length)}</p>
              <p className="text-xs text-gray-500">{selectedSeats.length} seat(s) × {formatCurrency(selectedTrip.fare)}</p>
            </div>
            <button type="submit" disabled={loading}
              className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-lg text-sm flex items-center gap-2 transition-colors">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Processing...</> : 'Pay Now →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
