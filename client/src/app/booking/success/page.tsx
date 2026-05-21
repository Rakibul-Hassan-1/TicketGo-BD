'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

function SuccessContent() {
  const params = useSearchParams();
  const id = params.get('id');
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
        <p className="text-gray-500 mb-2">Your ticket has been booked successfully.</p>
        {id && <p className="text-sm text-gray-400 mb-6">Booking ID: <span className="font-mono font-semibold text-gray-700">{id}</span></p>}
        <p className="text-xs text-gray-400 mb-8">Check your email for the e-ticket PDF.</p>
        <div className="flex gap-3">
          <Link href="/dashboard" className="flex-1 bg-primary-600 text-white font-semibold py-3 rounded-lg text-sm hover:bg-primary-700 transition-colors">View Bookings</Link>
          <Link href="/" className="flex-1 border border-gray-200 text-gray-700 font-semibold py-3 rounded-lg text-sm hover:bg-gray-50 transition-colors">Home</Link>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return <Suspense><SuccessContent /></Suspense>;
}
