'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/axios';
import { Trip } from '@/types';
import { TripCard } from '@/components/bus/TripCard';
import { Navbar } from '@/components/layout/Navbar';
import { Loader2, SearchX } from 'lucide-react';

function SearchResults() {
  const params = useSearchParams();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const from = params.get('from');
    const to = params.get('to');
    const date = params.get('date');
    const passengers = params.get('passengers') || '1';
    if (!from || !to || !date) { setLoading(false); return; }
    api.get(`/trips/search?from=${from}&to=${to}&date=${date}&passengers=${passengers}`)
      .then(r => setTrips(r.data.data.trips))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">{params.get('from')} to {params.get('to')}</h1>
        <p className="text-sm text-gray-500">{params.get('date')} · {params.get('passengers')} passenger(s)</p>
      </div>
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>
      ) : trips.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <SearchX className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No buses found for this route</p>
        </div>
      ) : (
        <div className="space-y-4">{trips.map(t => <TripCard key={t._id} trip={t} />)}</div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>}>
        <SearchResults />
      </Suspense>
    </div>
  );
}
