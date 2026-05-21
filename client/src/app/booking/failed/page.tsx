'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { XCircle } from 'lucide-react';

function FailedContent() {
  const params = useSearchParams();
  const reason = params.get('reason');
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment {reason === 'cancelled' ? 'Cancelled' : 'Failed'}</h1>
        <p className="text-gray-500 mb-8">Your booking was not completed. Your seat locks have been released.</p>
        <div className="flex gap-3">
          <Link href="/buses/search" className="flex-1 bg-primary-600 text-white font-semibold py-3 rounded-lg text-sm hover:bg-primary-700 transition-colors">Try Again</Link>
          <Link href="/" className="flex-1 border border-gray-200 text-gray-700 font-semibold py-3 rounded-lg text-sm hover:bg-gray-50 transition-colors">Home</Link>
        </div>
      </div>
    </div>
  );
}

export default function FailedPage() {
  return <Suspense><FailedContent /></Suspense>;
}
