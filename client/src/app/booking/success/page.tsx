"use client";
import { CheckCircle2, Clock3 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SuccessContent() {
  const params = useSearchParams();
  const id = params.get("id");
  const status = params.get("status");
  const isHold = status === "hold";
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border p-10 max-w-md w-full text-center">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isHold ? "bg-amber-100" : "bg-green-100"}`}
        >
          {isHold ? (
            <Clock3 className="w-8 h-8 text-amber-600" />
          ) : (
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          )}
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {isHold ? "Payment Received" : "Booking Confirmed!"}
        </h1>
        <p className="text-gray-500 mb-2">
          {isHold
            ? "Your payment is received. Admin approval is pending before the ticket is finalized."
            : "Your ticket has been booked successfully."}
        </p>
        {id && (
          <p className="text-sm text-gray-400 mb-6">
            Booking ID:{" "}
            <span className="font-mono font-semibold text-gray-700">{id}</span>
          </p>
        )}
        <p className="text-xs text-gray-400 mb-8">
          {isHold
            ? "You will receive the e-ticket after admin approval."
            : "Check your email for the e-ticket PDF."}
        </p>
        <div className="flex gap-3">
          <Link
            href="/dashboard"
            className="flex-1 bg-primary-600 text-white font-semibold py-3 rounded-lg text-sm hover:bg-primary-700 transition-colors"
          >
            View Bookings
          </Link>
          <Link
            href="/"
            className="flex-1 border border-gray-200 text-gray-700 font-semibold py-3 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
