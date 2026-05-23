"use client";
import api from "@/lib/axios";
import { ArrowRight, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Route {
  _id: { from: string; to: string };
  count: number;
  minFare: number;
  // optional stops for compatibility with shared Route type
  _route?: { boardingStops?: string[]; droppingStops?: string[] };
}

export function PopularRoutes() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const router = useRouter();

  useEffect(() => {
    api
      .get("/trips/popular-routes")
      .then((r) => setRoutes(r.data.data.routes))
      .catch(() => {});
  }, []);

  const handleRoute = (from: string, to: string) => {
    const date = new Date().toISOString().split("T")[0];
    router.push(
      `/buses/search?from=${from}&to=${to}&date=${date}&passengers=1`,
    );
  };

  if (!routes.length) return null;

  return (
    <section className="py-12 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-primary-600" />
          <h2 className="text-xl font-bold text-gray-900">Popular Routes</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {routes.slice(0, 10).map((r) => (
            <button
              key={`${r._id.from}-${r._id.to}`}
              onClick={() => handleRoute(r._id.from, r._id.to)}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-primary-300 hover:shadow-sm transition-all text-left"
            >
              <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 mb-1">
                <span>{r._id.from}</span>
                <ArrowRight className="w-3 h-3 text-primary-600 flex-shrink-0" />
                <span>{r._id.to}</span>
              </div>
              <p className="text-xs text-gray-500">From ৳{r.minFare}</p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
