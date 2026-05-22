"use client";
import { Navbar } from "@/components/layout/Navbar";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import api from "@/lib/axios";
import {
  connectSocket,
  getSocket,
  joinTripRoom,
  leaveTripRoom,
} from "@/lib/socket";
import { formatCurrency, formatTime } from "@/lib/utils";
import {
  addLockedSeat,
  removeLockedSeat,
  setLockedSeats,
  toggleSeat,
} from "@/store/slices/bookingSlice";
import { Trip } from "@/types";
import { Loader2, MapPin, Clock, CreditCard, Users, AlertCircle, CheckCircle2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import toast from "react-hot-toast";

type SeatStatus = "available" | "selected" | "booked" | "locked";

type SeatBlock = {
  seat: Trip["bus"]["seats"][number] | null;
  colspan?: number;
};

type SeatRow = {
  left: SeatBlock[];
  right: SeatBlock[];
};

// ─── Seat shape SVG rendered as a real cushioned bus seat ───────────────────
function SeatIcon({ status, number }: { status: SeatStatus; number: string }) {
  const colors: Record<SeatStatus, { body: string; top: string; text: string; shadow: string }> = {
    available: {
      body: "#ffffff",
      top: "#e2e8f0",
      text: "#475569",
      shadow: "rgba(100,116,139,0.25)",
    },
    selected: {
      body: "#2563eb",
      top: "#1d4ed8",
      text: "#ffffff",
      shadow: "rgba(37,99,235,0.45)",
    },
    booked: {
      body: "#e2e8f0",
      top: "#cbd5e1",
      text: "#94a3b8",
      shadow: "none",
    },
    locked: {
      body: "#fef3c7",
      top: "#fde68a",
      text: "#92400e",
      shadow: "rgba(245,158,11,0.3)",
    },
  };

  const c = colors[status];

  return (
    <svg
      viewBox="0 0 44 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      style={{ filter: c.shadow !== "none" ? `drop-shadow(0 3px 6px ${c.shadow})` : "none" }}
    >
      {/* Seat back / headrest */}
      <rect x="4" y="2" width="36" height="18" rx="8" fill={c.top} />
      {/* Headrest cushion highlight */}
      <rect x="9" y="5" width="26" height="10" rx="5" fill={c.body} opacity="0.6" />
      {/* Seat cushion */}
      <rect x="2" y="22" width="40" height="22" rx="6" fill={c.body} />
      {/* Cushion crease lines */}
      <line x1="14" y1="26" x2="14" y2="40" stroke={c.top} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="30" y1="26" x2="30" y2="40" stroke={c.top} strokeWidth="1.5" strokeLinecap="round" />
      {/* Armrests */}
      <rect x="0" y="24" width="4" height="14" rx="2" fill={c.top} />
      <rect x="40" y="24" width="4" height="14" rx="2" fill={c.top} />
      {/* Seat number */}
      <text
        x="22"
        y="35"
        textAnchor="middle"
        dominantBaseline="middle"
        fill={c.text}
        fontSize="10"
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
      >
        {number}
      </text>
    </svg>
  );
}

// ─── Legend Item ─────────────────────────────────────────────────────────────
function LegendItem({ status, label }: { status: SeatStatus; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 flex-shrink-0">
        <SeatIcon status={status} number="" />
      </div>
      <span className="text-xs text-slate-500 font-medium">{label}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
function SeatSelector() {
  const params = useSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { selectedSeats, lockedSeats } = useAppSelector((s) => s.booking);
  const { user } = useAppSelector((s) => s.auth);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [locking, setLocking] = useState(false);
  const tripId = params.get("tripId")!;

  const orderedSeats = [...(trip?.bus.seats || [])].sort(
    (a, b) => Number(a.number) - Number(b.number),
  );
  const isBusinessLayout = trip?.bus.totalSeats === 30;

  const seatRows: SeatRow[] = [];

  if (trip) {
    if (isBusinessLayout) {
      for (let i = 0; i < orderedSeats.length; i += 3) {
        seatRows.push({
          left: [{ seat: orderedSeats[i] || null }],
          right: [
            { seat: orderedSeats[i + 1] || null },
            { seat: orderedSeats[i + 2] || null },
          ],
        });
      }
    } else {
      for (let i = 0; i < orderedSeats.length; i += 4) {
        seatRows.push({
          left: [
            { seat: orderedSeats[i] || null },
            { seat: orderedSeats[i + 1] || null },
          ],
          right: [
            { seat: orderedSeats[i + 2] || null },
            { seat: orderedSeats[i + 3] || null },
          ],
        });
      }
    }
  }

  useEffect(() => {
    if (!tripId) return;
    api
      .get(`/trips/${tripId}`)
      .then((r) => {
        setTrip(r.data.data.trip);
        dispatch(setLockedSeats(r.data.data.lockedSeats || []));
      })
      .finally(() => setLoading(false));
    connectSocket();
    joinTripRoom(tripId);
    const socket = getSocket();
    socket.on("seat:locked", (seats: string[]) => dispatch(addLockedSeat(seats)));
    socket.on("seat:unlocked", (seats: string[]) => dispatch(removeLockedSeat(seats)));
    socket.on("seats:locked", (seats: string[]) => dispatch(setLockedSeats(seats)));
    return () => {
      leaveTripRoom(tripId);
      socket.off("seat:locked");
      socket.off("seat:unlocked");
      socket.off("seats:locked");
    };
  }, [tripId, dispatch]);

  const getSeatStatus = (n: string): SeatStatus => {
    if (trip?.bookedSeats.includes(n)) return "booked";
    if (lockedSeats.includes(n)) return "locked";
    if (selectedSeats.includes(n)) return "selected";
    return "available";
  };

  const renderSeatButton = (seat: Trip["bus"]["seats"][number] | null, _colLabel?: string) => {
    if (!seat) return <div className="w-11 h-[52px]" />;
    const status = getSeatStatus(seat.number);
    const disabled = status === "booked" || status === "locked";

    return (
      <button
        key={seat.number}
        disabled={disabled}
        onClick={() => dispatch(toggleSeat(seat.number))}
        aria-label={`Seat ${seat.number} - ${status}`}
        className={[
          "relative w-11 h-[52px] transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-lg",
          status === "available" ? "hover:scale-110 hover:-translate-y-0.5 cursor-pointer" : "",
          status === "selected" ? "scale-105 cursor-pointer" : "",
          disabled ? "cursor-not-allowed opacity-80" : "",
        ].join(" ")}
      >
        <SeatIcon status={status} number={seat.number} />
        {status === "selected" && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
            <CheckCircle2 className="w-2.5 h-2.5 text-white" />
          </span>
        )}
        {status === "locked" && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-white flex items-center justify-center">
            <AlertCircle className="w-2.5 h-2.5 text-white" />
          </span>
        )}
      </button>
    );
  };

  const handleContinue = async () => {
    if (!user) {
      router.push("/auth/login");
      return;
    }
    if (!selectedSeats.length) {
      toast.error("Select at least one seat");
      return;
    }
    setLocking(true);
    try {
      await api.post("/bookings/lock-seats", { tripId, seats: selectedSeats });
      toast.success(`${selectedSeats.length} seat(s) locked for 5 minutes!`);
      router.push("/booking/passenger-details");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to lock seats");
    } finally {
      setLocking(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center py-32">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-sm text-slate-500 font-medium">Loading seat map…</p>
        </div>
      </div>
    );
  if (!trip) return null;

  const availableCount =
    (trip.bus.totalSeats || 0) -
    (trip.bookedSeats?.length || 0) -
    lockedSeats.length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* ── Trip Info Card ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Bus icon block */}
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-blue-600" stroke="currentColor" strokeWidth="1.8">
                <rect x="1" y="5" width="22" height="13" rx="3" />
                <path d="M1 10h22M7 18v2M17 18v2" />
                <circle cx="5.5" cy="15.5" r="1.5" fill="currentColor" />
                <circle cx="18.5" cy="15.5" r="1.5" fill="currentColor" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-slate-900 text-lg leading-tight">{trip.bus.busName}</p>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-blue-100 text-blue-700 uppercase">
                  {trip.bus.type}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-sm text-slate-500 flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {trip.route.from}
                  <span className="mx-1 text-slate-300">→</span>
                  {trip.route.to}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {formatTime(trip.departureTime)}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-green-600 font-medium">{availableCount}</span> seats left
                </span>
              </div>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-2xl font-extrabold text-blue-600 tracking-tight">{formatCurrency(trip.fare)}</p>
            <p className="text-xs text-slate-400 mt-0.5">per seat</p>
          </div>
        </div>
      </div>

      {/* ── Main Grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Seat Map Card ──────────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Card header */}
            <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-800 text-base">Choose Your Seats</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isBusinessLayout ? "1+2 Business Class layout" : "2+2 Economy layout"}
                </p>
              </div>
              {/* Legend */}
              <div className="hidden sm:flex items-center gap-3 flex-wrap justify-end">
                <LegendItem status="available" label="Available" />
                <LegendItem status="selected" label="Selected" />
                <LegendItem status="booked" label="Booked" />
                <LegendItem status="locked" label="Locked" />
              </div>
            </div>

            {/* Mobile legend */}
            <div className="flex sm:hidden items-center gap-3 px-6 pt-4 flex-wrap">
              <LegendItem status="available" label="Available" />
              <LegendItem status="selected" label="Selected" />
              <LegendItem status="booked" label="Booked" />
              <LegendItem status="locked" label="Locked" />
            </div>

            {/* Bus body */}
            <div className="px-4 pb-6 pt-4">
              {/* Bus outer shell */}
              <div
                className="relative rounded-3xl border-2 border-slate-200 bg-slate-50 overflow-hidden"
                style={{
                  background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
                  boxShadow: "inset 0 2px 12px rgba(0,0,0,0.04)",
                }}
              >

                {/* ── Driver / Front section ────────────────────────────── */}
                <div className="relative flex items-center justify-center pt-5 pb-4 border-b-2 border-dashed border-slate-200">
                  {/* Windshield hint */}
                  <div className="absolute inset-x-8 top-2 h-3 rounded-full bg-sky-100 border border-sky-200 opacity-60" />

                  {/* Door indicator left */}
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5">
                    <div className="w-5 h-8 rounded-sm border-2 border-slate-300 bg-slate-200 flex items-center justify-center">
                      <div className="w-1 h-4 bg-slate-400 rounded-full" />
                    </div>
                    <span className="text-[9px] text-slate-400 font-medium">DOOR</span>
                  </div>

                  {/* Steering wheel + driver */}
                  <div className="flex flex-col items-center gap-1 z-10">
                    <div className="w-12 h-12 rounded-full border-[3px] border-slate-400 bg-white shadow-md flex items-center justify-center relative">
                      <div className="w-4 h-4 rounded-full border-[2.5px] border-slate-400 bg-slate-100" />
                      <div className="absolute top-1/2 left-0 right-0 h-[2.5px] bg-slate-300 -translate-y-1/2 mx-1" />
                      <div className="absolute top-0 bottom-0 left-1/2 w-[2.5px] bg-slate-300 -translate-x-1/2 my-1" />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 tracking-widest uppercase">Driver</span>
                  </div>

                  {/* Emergency exit right */}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5">
                    <div className="w-5 h-8 rounded-sm border-2 border-orange-300 bg-orange-100 flex items-center justify-center">
                      <div className="w-1 h-4 bg-orange-400 rounded-full" />
                    </div>
                    <span className="text-[9px] text-orange-500 font-medium">EXIT</span>
                  </div>
                </div>

                {/* ── Column labels ─────────────────────────────────────── */}
                <div
                  className={`grid items-center gap-2 px-6 py-2 ${
                    isBusinessLayout
                      ? "grid-cols-[1fr_56px_1fr_1fr]"
                      : "grid-cols-[1fr_1fr_56px_1fr_1fr]"
                  }`}
                >
                  {isBusinessLayout ? (
                    <>
                      <span className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">A</span>
                      <span />
                      <span className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">B</span>
                      <span className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">C</span>
                    </>
                  ) : (
                    <>
                      <span className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">A</span>
                      <span className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">B</span>
                      <span />
                      <span className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">C</span>
                      <span className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">D</span>
                    </>
                  )}
                </div>

                {/* ── Seat rows ─────────────────────────────────────────── */}
                <div className="px-4 pb-4 space-y-2">
                  {seatRows.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex items-center gap-0">

                      {/* Row number */}
                      <div className="w-6 flex-shrink-0 text-center text-[10px] font-semibold text-slate-300">
                        {rowIndex + 1}
                      </div>

                      {/* Left seats */}
                      <div className={`flex gap-1.5 ${isBusinessLayout ? "flex-1" : "flex-[2]"} justify-end pr-1`}>
                        {row.left.map((block, i) =>
                          <div key={i} className="flex justify-center">
                            {renderSeatButton(block.seat)}
                          </div>
                        )}
                      </div>

                      {/* Aisle */}
                      <div className="w-14 flex-shrink-0 flex flex-col items-center justify-center self-stretch">
                        <div
                          className="w-full h-full min-h-[52px] rounded-md flex items-center justify-center"
                          style={{
                            background:
                              "repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(148,163,184,0.15) 4px, rgba(148,163,184,0.15) 5px)",
                          }}
                        >
                          <span
                            className="text-[8px] font-bold tracking-[0.25em] text-slate-300 uppercase"
                            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
                          >
                            AISLE
                          </span>
                        </div>
                      </div>

                      {/* Right seats */}
                      <div className={`flex gap-1.5 ${isBusinessLayout ? "flex-[2]" : "flex-[2]"} justify-start pl-1`}>
                        {row.right.map((block, i) =>
                          <div key={i} className="flex justify-center">
                            {renderSeatButton(block.seat)}
                          </div>
                        )}
                      </div>

                      {/* Spacer for row number balance */}
                      <div className="w-6 flex-shrink-0" />
                    </div>
                  ))}
                </div>

                {/* ── Rear bumper ───────────────────────────────────────── */}
                <div className="mx-4 mb-4 rounded-xl border border-dashed border-slate-200 bg-white/60 py-2.5 text-center">
                  <span className="text-[11px] font-semibold tracking-widest text-slate-400 uppercase">
                    {isBusinessLayout ? "✦ Business Class · 1+2 ✦" : "✦ Economy Class · 2+2 ✦"}
                  </span>
                </div>

              </div>
              {/* /Bus outer shell */}
            </div>
          </div>
        </div>

        {/* ── Summary Sidebar ────────────────────────────────────────────── */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sticky top-20">
            <h3 className="font-bold text-slate-800 mb-1">Booking Summary</h3>
            <p className="text-xs text-slate-400 mb-5">
              {selectedSeats.length > 0
                ? `${selectedSeats.length} seat${selectedSeats.length > 1 ? "s" : ""} selected`
                : "No seats selected yet"}
            </p>

            {!selectedSeats.length ? (
              <div className="rounded-xl border-2 border-dashed border-slate-100 bg-slate-50 py-8 text-center">
                <div className="w-12 h-12 mx-auto mb-3 opacity-30">
                  <SeatIcon status="available" number="" />
                </div>
                <p className="text-sm text-slate-400">Tap a seat on the map to select it</p>
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                {selectedSeats.map((s) => (
                  <div
                    key={s}
                    className="flex justify-between items-center bg-blue-50 rounded-xl px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-8">
                        <SeatIcon status="selected" number={s} />
                      </div>
                      <span className="text-sm font-semibold text-slate-700">Seat {s}</span>
                    </div>
                    <span className="text-sm font-bold text-blue-700">{formatCurrency(trip.fare)}</span>
                  </div>
                ))}
              </div>
            )}

            {selectedSeats.length > 0 && (
              <div className="border-t border-slate-100 pt-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Subtotal</span>
                  <span className="font-bold text-lg text-slate-900">
                    {formatCurrency(trip.fare * selectedSeats.length)}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={handleContinue}
              disabled={locking || !selectedSeats.length}
              className={[
                "w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200",
                selectedSeats.length && !locking
                  ? "bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-lg shadow-blue-200"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed",
              ].join(" ")}
            >
              {locking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Locking seats…
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Continue to Payment
                </>
              )}
            </button>

            <div className="mt-3 flex items-start gap-2 text-[11px] text-slate-400">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-400" />
              <span>Selected seats are locked for <strong className="text-slate-500">5 minutes</strong> while you complete payment.</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Page Wrapper ─────────────────────────────────────────────────────────────
export default function SelectSeatsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <Suspense
        fallback={
          <div className="flex justify-center items-center py-32">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
              <p className="text-sm text-slate-500 font-medium">Loading seat map…</p>
            </div>
          </div>
        }
      >
        <SeatSelector />
      </Suspense>
    </div>
  );
}