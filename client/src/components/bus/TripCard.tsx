"use client";
import { useAppDispatch } from "@/hooks/redux";
import { calculateDuration, formatCurrency, formatTime } from "@/lib/utils";
import { setSelectedTrip } from "@/store/slices/bookingSlice";
import { Trip } from "@/types";
import { Armchair, Clock, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  trip: Trip;
}

const AMENITY_ICONS: Record<string, string> = {
  WiFi: "📶",
  AC: "❄️",
  "USB Charging": "🔌",
  Entertainment: "🎵",
  Blanket: "🛏️",
};

export function TripCard({ trip }: Props) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const bus = trip.bus;
  const seatsLeft =
    typeof trip.availableSeatCount === "number"
      ? trip.availableSeatCount
      : trip.availableSeats.length;

  const handleSelect = () => {
    dispatch(setSelectedTrip(trip));
    router.push(`/booking/select-seats?tripId=${trip._id}`);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-bold text-gray-900 text-base">
                {bus?.busName}
              </p>
              <p className="text-xs text-gray-500">
                {bus?.busNumber} · {bus?.type}
              </p>
            </div>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                bus?.type === "AC"
                  ? "bg-blue-50 text-blue-700"
                  : bus?.type === "Sleeper"
                    ? "bg-purple-50 text-purple-700"
                    : "bg-gray-100 text-gray-600"
              }`}
            >
              {bus?.type}
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">
                {formatTime(trip.departureTime)}
              </p>
              <p className="text-xs text-gray-500 flex items-center gap-0.5 mt-0.5">
                <MapPin className="w-3 h-3" />
                {trip.route.from}
              </p>
            </div>
            <div className="flex-1 text-center">
              <div className="flex items-center gap-1">
                <div className="h-0.5 flex-1 bg-gray-200"></div>
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <div className="h-0.5 flex-1 bg-gray-200"></div>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {calculateDuration(trip.departureTime, trip.arrivalTime)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">
                {formatTime(trip.arrivalTime)}
              </p>
              <p className="text-xs text-gray-500 flex items-center gap-0.5 mt-0.5">
                <MapPin className="w-3 h-3" />
                {trip.route.to}
              </p>
            </div>
          </div>

          {bus?.amenities?.length > 0 && (
            <div className="flex gap-1.5 mt-3 flex-wrap">
              {bus.amenities.slice(0, 4).map((a) => (
                <span
                  key={a}
                  className="text-xs bg-gray-50 border border-gray-100 rounded px-2 py-0.5 text-gray-600"
                >
                  {AMENITY_ICONS[a] || "•"} {a}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex sm:flex-col items-center sm:items-end gap-4 sm:gap-2 pt-4 sm:pt-0 border-t sm:border-t-0 sm:border-l border-gray-100 sm:pl-5">
          <div className="text-right">
            <p className="text-2xl font-bold text-primary-600">
              {formatCurrency(trip.fare)}
            </p>
            <p className="text-xs text-gray-400">per seat</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-green-600">
            <Armchair className="w-3.5 h-3.5" />
            <span>{seatsLeft} seats left</span>
          </div>
          <button
            onClick={handleSelect}
            className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap"
          >
            Select Seats
          </button>
        </div>
      </div>
    </div>
  );
}
