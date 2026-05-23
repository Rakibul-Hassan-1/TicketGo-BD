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
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const BD_CITIES = [
  "Dhaka",
  "Chittagong",
  "Sylhet",
  "Rajshahi",
  "Khulna",
  "Barishal",
  "Rangpur",
  "Mymensingh",
  "Cox's Bazar",
  "Comilla",
  "Jessore",
  "Bogura",
  "Narayanganj",
  "Gazipur",
  "Tangail",
];

function SearchResults() {
  const params = useSearchParams();
  const router = useRouter();
  const [fromInput, setFromInput] = useState(params.get("from") || "");
  const [toInput, setToInput] = useState(params.get("to") || "");
  const [dateInput, setDateInput] = useState(params.get("date") || "");
  const [passengersInput, setPassengersInput] = useState(
    params.get("passengers") || "1",
  );
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBoardingPoints, setSelectedBoardingPoints] = useState<
    string[]
  >([]);
  const [selectedDroppingPoints, setSelectedDroppingPoints] = useState<
    string[]
  >([]);
  const [selectedBusTypes, setSelectedBusTypes] = useState<string[]>([]);
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
    const fetchTrips = () => {
      setLoading(true);
      // add cache-busting timestamp to prevent 304 responses from caches
      const url = `/trips/search?from=${from}&to=${to}&date=${date}&passengers=${passengers}&ts=${Date.now()}`;
      return api
        .get(url)
        .then((r) => setTrips(r.data.data.trips))
        .catch(() => {})
        .finally(() => setLoading(false));
    };

    fetchTrips();

    // Listen for trip changes and refetch when they occur (socket + window fallback)
    connectSocket();
    const s = getSocket();
    const onTripChanged = (_payload: any) => {
      fetchTrips();
    };
    const onTripDeleted = (_payload: any) => {
      fetchTrips();
    };
    s.on("trip:changed", onTripChanged);
    s.on("trip:deleted", onTripDeleted);

    const onWindowChanged = (e: any) => fetchTrips();
    const onWindowDeleted = (e: any) => fetchTrips();
    window.addEventListener("trip:changed", onWindowChanged as any);
    window.addEventListener("trip:deleted", onWindowDeleted as any);

    // cross-tab updates via localStorage
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === "tgb_trip_changed") {
        fetchTrips();
      }
    };
    window.addEventListener("storage", onStorage as any);

    return () => {
      s.off("trip:changed", onTripChanged);
      s.off("trip:deleted", onTripDeleted);
      window.removeEventListener("trip:changed", onWindowChanged as any);
      window.removeEventListener("trip:deleted", onWindowDeleted as any);
      window.removeEventListener("storage", onStorage as any);
    };
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
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!fromInput || !toInput || !dateInput) return;
              router.push(
                `/buses/search?from=${encodeURIComponent(fromInput)}&to=${encodeURIComponent(
                  toInput,
                )}&date=${encodeURIComponent(dateInput)}&passengers=${encodeURIComponent(
                  passengersInput,
                )}`,
              );
            }}
            className="flex flex-col md:flex-row gap-3 md:items-center"
          >
            <select
              className="border rounded px-3 py-2 text-sm w-full md:w-48"
              value={fromInput}
              onChange={(e) => setFromInput(e.target.value)}
            >
              <option value="">From</option>
              {BD_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              className="border rounded px-3 py-2 text-sm w-full md:w-48"
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
            >
              <option value="">To</option>
              {BD_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <input
              type="date"
              className="border rounded px-3 py-2 text-sm w-full md:w-40"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
            />

            <select
              className="border rounded px-3 py-2 text-sm w-full md:w-24"
              value={passengersInput}
              onChange={(e) => setPassengersInput(e.target.value)}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>

            <div className="flex-shrink-0">
              <button className="bg-primary-600 text-white px-4 py-2 rounded text-sm">
                Search
              </button>
            </div>
          </form>
        </div>

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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar filters */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-xl border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Filters</h3>
                <button
                  onClick={() => {
                    setSelectedBoardingPoints([]);
                    setSelectedDroppingPoints([]);
                    setSelectedBusTypes([]);
                  }}
                  className="text-sm text-primary-600"
                >
                  RESET
                </button>
              </div>

              <div>
                <p className="text-xs font-semibold text-red-600 mb-2">
                  BUS TYPE
                </p>
                {(() => {
                  const types = Array.from(
                    new Set(trips.map((t) => t.bus?.type).filter(Boolean)),
                  ).sort();
                  if (!types.length)
                    return <p className="text-xs text-gray-400">No types</p>;
                  return types.map((type) => (
                    <label
                      key={type}
                      className="flex items-center gap-2 text-sm mb-1"
                    >
                      <input
                        type="checkbox"
                        checked={selectedBusTypes.includes(type)}
                        onChange={() => {
                          setSelectedBusTypes((prev) =>
                            prev.includes(type)
                              ? prev.filter((x) => x !== type)
                              : [...prev, type],
                          );
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600"
                      />
                      <span>{type}</span>
                    </label>
                  ));
                })()}
              </div>

              <div>
                <p className="text-xs font-semibold text-red-600 mb-2">
                  BOARDING POINT
                </p>
                <div className="max-h-40 overflow-auto pr-2">
                  {(() => {
                    const points = Array.from(
                      new Set(
                        trips
                          .flatMap((t) => {
                            const arr: string[] = [];
                            if (t.route?.from) arr.push(t.route.from);
                            if (
                              Array.isArray(t.route?.boardingStops) &&
                              t.route.boardingStops.length
                            )
                              arr.push(...t.route.boardingStops);
                            else if (Array.isArray(t.route?.stops))
                              arr.push(...t.route.stops);
                            return arr;
                          })
                          .filter(Boolean),
                      ),
                    )
                      .filter(Boolean)
                      .sort();

                    if (!points.length)
                      return (
                        <p className="text-xs text-gray-400">
                          No boarding points
                        </p>
                      );

                    return points.map((point) => (
                      <label
                        key={point}
                        className="flex items-start gap-2 text-sm mb-2"
                      >
                        <input
                          type="checkbox"
                          checked={selectedBoardingPoints.includes(point)}
                          onChange={() => {
                            setSelectedBoardingPoints((prev) =>
                              prev.includes(point)
                                ? prev.filter((x) => x !== point)
                                : [...prev, point],
                            );
                          }}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600"
                        />
                        <div className="text-sm leading-snug">{point}</div>
                      </label>
                    ));
                  })()}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-red-600 mb-2">
                  DROPPING POINT
                </p>
                <div className="max-h-40 overflow-auto pr-2">
                  {(() => {
                    const points = Array.from(
                      new Set(
                        trips
                          .flatMap((t) => {
                            const arr: string[] = [];
                            if (t.route?.to) arr.push(t.route.to);
                            if (
                              Array.isArray(t.route?.droppingStops) &&
                              t.route.droppingStops.length
                            )
                              arr.push(...t.route.droppingStops);
                            else if (Array.isArray(t.route?.stops))
                              arr.push(...t.route.stops);
                            return arr;
                          })
                          .filter(Boolean),
                      ),
                    )
                      .filter(Boolean)
                      .sort();

                    if (!points.length)
                      return (
                        <p className="text-xs text-gray-400">
                          No dropping points
                        </p>
                      );

                    return points.map((point) => (
                      <label
                        key={point}
                        className="flex items-start gap-2 text-sm mb-2"
                      >
                        <input
                          type="checkbox"
                          checked={selectedDroppingPoints.includes(point)}
                          onChange={() => {
                            setSelectedDroppingPoints((prev) =>
                              prev.includes(point)
                                ? prev.filter((x) => x !== point)
                                : [...prev, point],
                            );
                          }}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600"
                        />
                        <div className="text-sm leading-snug">{point}</div>
                      </label>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </aside>

          {/* Results */}
          <div className="lg:col-span-3">
            <div className="space-y-4">
              {trips
                .filter((trip) => {
                  if (
                    selectedBusTypes.length &&
                    !selectedBusTypes.includes(trip.bus?.type || "")
                  )
                    return false;
                  if (selectedBoardingPoints.length) {
                    const points = [
                      trip.route.from,
                      ...(trip.route.stops || []),
                    ];
                    if (!selectedBoardingPoints.some((p) => points.includes(p)))
                      return false;
                  }
                  if (selectedDroppingPoints.length) {
                    const points = [trip.route.to, ...(trip.route.stops || [])];
                    if (!selectedDroppingPoints.some((p) => points.includes(p)))
                      return false;
                  }
                  return true;
                })
                .map((t) => (
                  <TripCard key={t._id} trip={t} />
                ))}
            </div>
          </div>
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
