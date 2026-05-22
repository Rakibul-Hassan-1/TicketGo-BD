"use client";
import { TripCard } from "@/components/bus/TripCard";
import { Navbar } from "@/components/layout/Navbar";
import api from "@/lib/axios";
import {
  connectSocket,
  getSocket,
  joinTripRoom,
  leaveTripRoom,
} from "@/lib/socket";
import { Trip } from "@/types";
import { Loader2, SearchX } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function SearchResults() {
  const params = useSearchParams();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const tripIdsKey = trips
    .map((trip) => trip._id)
    .sort()
    .join(",");

  useEffect(() => {
    const from = params.get("from");
    const to = params.get("to");
    const date = params.get("date");
    const passengers = params.get("passengers") || "1";
    if (!from || !to || !date) {
      setLoading(false);
      return;
    }
    api
      .get(
        `/trips/search?from=${from}&to=${to}&date=${date}&passengers=${passengers}`,
      )
      .then((r) => setTrips(r.data.data.trips))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params]);

  useEffect(() => {
    if (!trips.length) return;

    connectSocket();
    const socket = getSocket();

    trips.forEach((trip) => joinTripRoom(trip._id));

    const applySeatUpdate =
      (updater: (trip: Trip, seats: string[]) => Trip) =>
      (payload: { tripId: string; seats: string[] }) => {
        setTrips((current) =>
          current.map((trip) =>
            trip._id === payload.tripId ? updater(trip, payload.seats) : trip,
          ),
        );
      };

    const onSeatsBooked = applySeatUpdate((trip, seats) => {
      const bookedSeats = Array.from(
        new Set([...(trip.bookedSeats || []), ...seats]),
      );
      const availableSeats = (trip.availableSeats || []).filter(
        (seat) => !seats.includes(seat),
      );
      return {
        ...trip,
        bookedSeats,
        availableSeats,
        availableSeatCount: Math.max(
          Number(trip.bus?.totalSeats || 0) - bookedSeats.length,
          0,
        ),
      };
    });

    const onSeatsUnbooked = applySeatUpdate((trip, seats) => {
      const bookedSeats = (trip.bookedSeats || []).filter(
        (seat) => !seats.includes(seat),
      );
      const availableSeats = Array.from(
        new Set([...(trip.availableSeats || []), ...seats]),
      );
      return {
        ...trip,
        bookedSeats,
        availableSeats,
        availableSeatCount: Math.max(
          Number(trip.bus?.totalSeats || 0) - bookedSeats.length,
          0,
        ),
      };
    });

    const onSeatLocked = applySeatUpdate((trip, seats) => {
      const availableSeats = (trip.availableSeats || []).filter(
        (seat) => !seats.includes(seat),
      );
      return {
        ...trip,
        availableSeats,
        availableSeatCount: availableSeats.length,
      };
    });

    const onSeatUnlocked = applySeatUpdate((trip, seats) => {
      const availableSeats = Array.from(
        new Set([...(trip.availableSeats || []), ...seats]),
      );
      return {
        ...trip,
        availableSeats,
        availableSeatCount: availableSeats.length,
      };
    });

    socket.on("seats:booked", onSeatsBooked);
    socket.on("seats:unbooked", onSeatsUnbooked);
    socket.on("seat:locked", onSeatLocked);
    socket.on("seat:unlocked", onSeatUnlocked);

    return () => {
      trips.forEach((trip) => leaveTripRoom(trip._id));
      socket.off("seats:booked", onSeatsBooked);
      socket.off("seats:unbooked", onSeatsUnbooked);
      socket.off("seat:locked", onSeatLocked);
      socket.off("seat:unlocked", onSeatUnlocked);
    };
  }, [tripIdsKey]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">
          {params.get("from")} to {params.get("to")}
        </h1>
        <p className="text-sm text-gray-500">
          {params.get("date")} · {params.get("passengers")} passenger(s)
        </p>
      </div>
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : trips.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <SearchX className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No buses found for this route</p>
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map((t) => (
            <TripCard key={t._id} trip={t} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Suspense
        fallback={
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        }
      >
        <SearchResults />
      </Suspense>
    </div>
  );
}
