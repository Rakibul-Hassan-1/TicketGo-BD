'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Calendar, Users } from 'lucide-react';
import { useAppDispatch } from '@/hooks/redux';
import { setSearchParams } from '@/store/slices/bookingSlice';

const BD_CITIES = [
  'Dhaka','Chittagong','Sylhet','Rajshahi','Khulna','Barishal',
  'Rangpur','Mymensingh','Cox\'s Bazar','Comilla','Jessore',
  'Bogura','Narayanganj','Gazipur','Tangail',
];

const schema = z.object({
  from: z.string().min(1, 'Select departure city'),
  to: z.string().min(1, 'Select destination'),
  date: z.string().min(1, 'Select travel date'),
  passengers: z.coerce.number().min(1).max(10),
});

type FormData = z.infer<typeof schema>;

export function HeroSearch() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { passengers: 1, date: new Date().toISOString().split('T')[0] },
  });

  const onSubmit = (data: FormData) => {
    dispatch(setSearchParams(data));
    const q = new URLSearchParams({
      from: data.from, to: data.to, date: data.date, passengers: String(data.passengers),
    });
    router.push(`/buses/search?${q.toString()}`);
  };

  return (
    <section className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-600 py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
          Book Your Journey <span className="text-accent">Instantly</span>
        </h1>
        <p className="text-primary-100 text-lg mb-10">Search buses across Bangladesh — fast, easy, secure</p>

        <form onSubmit={handleSubmit(onSubmit)}
          className="bg-white rounded-2xl p-4 md:p-6 shadow-2xl grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-left">
            <label className="text-xs font-semibold text-gray-500 flex items-center gap-1 mb-1.5">
              <MapPin className="w-3 h-3" /> FROM
            </label>
            <select {...register('from')} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-300">
              <option value="">Select city</option>
              {BD_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.from && <p className="text-red-500 text-xs mt-1">{errors.from.message}</p>}
          </div>

          <div className="text-left">
            <label className="text-xs font-semibold text-gray-500 flex items-center gap-1 mb-1.5">
              <MapPin className="w-3 h-3" /> TO
            </label>
            <select {...register('to')} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-300">
              <option value="">Select city</option>
              {BD_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.to && <p className="text-red-500 text-xs mt-1">{errors.to.message}</p>}
          </div>

          <div className="text-left">
            <label className="text-xs font-semibold text-gray-500 flex items-center gap-1 mb-1.5">
              <Calendar className="w-3 h-3" /> DATE
            </label>
            <input type="date" {...register('date')}
              min={new Date().toISOString().split('T')[0]}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-300" />
          </div>

          <div className="text-left">
            <label className="text-xs font-semibold text-gray-500 flex items-center gap-1 mb-1.5">
              <Users className="w-3 h-3" /> PASSENGERS
            </label>
            <input type="number" {...register('passengers')} min={1} max={10}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-300" />
          </div>

          <button type="submit"
            className="md:col-span-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm">
            <Search className="w-4 h-4" /> Search Buses
          </button>
        </form>
      </div>
    </section>
  );
}
