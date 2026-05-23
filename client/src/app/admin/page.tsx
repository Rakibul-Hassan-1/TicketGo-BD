"use client";
import { Navbar } from "@/components/layout/Navbar";
import { useAppSelector } from "@/hooks/redux";
import api from "@/lib/axios";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import {
  BookOpen,
  Bus,
  Check,
  LayoutDashboard,
  Loader2,
  Pencil,
  Plus,
  Route,
  Trash2,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

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

// ── Modal ──────────────────────────────────────────────────────────────────
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

const inp =
  "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300";

// ── Sidebar Tab ──────────────────────────────────────────────────────────
function SideTab({ icon: Icon, label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${active ? "bg-primary-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"}`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {label}
    </button>
  );
}

// ── Status Badge ────────────────────────────────────────────────────────
function Badge({ value, map }: { value: string; map: Record<string, string> }) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[value] || "bg-gray-100 text-gray-600"}`}
    >
      {value.charAt(0).toUpperCase() + value.slice(1)}
    </span>
  );
}

export default function AdminPage() {
  const { user } = useAppSelector((s) => s.auth);
  const router = useRouter();
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  // Data
  const [stats, setStats] = useState<any>(null);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [tripSearch, setTripSearch] = useState("");
  const [selectedTripIds, setSelectedTripIds] = useState<string[]>([]);

  // Modals
  const [busModal, setBusModal] = useState<any>(null);
  const [tripModal, setTripModal] = useState<any>(null);
  const [userModal, setUserModal] = useState<any>(null);

  // Forms
  const emptyBus = {
    busName: "",
    busNumber: "",
    type: "AC",
    totalSeats: 40,
    amenities: "",
    operatorId: "",
  };
  const emptyTrip = {
    busId: "",
    from: "",
    to: "",
    distance: "",
    stops: "",
    departureTime: "",
    arrivalTime: "",
    fare: "",
    boardingPoints: [] as string[],
    droppingPoints: [] as string[],
    boardingInput: "",
    droppingInput: "",
  };
  const [busForm, setBusForm] = useState(emptyBus);
  const [tripForm, setTripForm] = useState(emptyTrip);
  const [saving, setSaving] = useState(false);
  const [initialDepartureMs, setInitialDepartureMs] = useState<number | null>(
    null,
  );
  const [initialArrivalMs, setInitialArrivalMs] = useState<number | null>(null);
  const [departureTouched, setDepartureTouched] = useState(false);
  const [arrivalTouched, setArrivalTouched] = useState(false);
  const [approvingBookingId, setApprovingBookingId] = useState<string | null>(
    null,
  );
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(
    null,
  );
  const [schedules, setSchedules] = useState<any[]>([]);
  const [scheduleModal, setScheduleModal] = useState<any>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(
    null,
  );
  const [scheduleForm, setScheduleForm] = useState<any>({
    title: "",
    bus: "",
    route: { from: "", to: "", distance: "" },
    daysOfWeek: [] as number[],
    departureTime: "15:00",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    timezone: "Asia/Dhaka",
    meta: { fare: 0 },
  });

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
      return;
    }
    if (user.role !== "admin") {
      router.push("/dashboard");
      return;
    }
    loadDashboard();
  }, [user]);

  const loadDashboard = () => {
    Promise.all([
      api.get("/admin/dashboard"),
      api.get("/admin/users"),
      api.get("/buses"),
      api.get("/operator/my-trips"),
      api.get("/admin/bookings"),
      api.get("/admin/recurrings"),
    ])
      .then(([d, u, b, t, bk, rs]) => {
        setStats(d.data.data.stats);
        setRecentBookings(
          d.data.data.recentBookings.filter(
            (x: any) => x.bookingStatus !== "cancelled",
          ),
        );
        setUsers(u.data.data.users);
        setBuses(b.data.data.buses);
        setTrips(t.data.data.trips);
        setBookings(
          bk.data.data.bookings.filter(
            (x: any) => x.bookingStatus !== "cancelled",
          ),
        );
        setSchedules(rs.data.data.list || []);
        setOperators(
          u.data.data.users.filter((x: any) => x.role === "operator"),
        );
      })
      .finally(() => setLoading(false));
  };

  // ── BUS CRUD ──────────────────────────────────────────────────────────
  const openAddBus = () => {
    setBusForm(emptyBus);
    setBusModal("add");
  };
  const openEditBus = (b: any) => {
    setBusForm({
      busName: b.busName,
      busNumber: b.busNumber,
      type: b.type,
      totalSeats: b.totalSeats,
      amenities: b.amenities?.join(", ") || "",
      operatorId: b.operator?._id || "",
    });
    setBusModal(b);
  };

  const saveBus = async () => {
    setSaving(true);
    try {
      const seats = Array.from({ length: busForm.totalSeats }, (_, i) => ({
        number: `${Math.floor(i / 4) + 1}${["A", "B", "C", "D"][i % 4]}`,
        type: i % 4 < 2 ? "window" : "aisle",
        deck: "lower",
      }));
      const payload = {
        busName: busForm.busName,
        busNumber: busForm.busNumber,
        type: busForm.type,
        totalSeats: Number(busForm.totalSeats),
        seats,
        amenities: busForm.amenities
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        operator: busForm.operatorId || user?._id,
      };
      if (busModal === "add") {
        const res = await api.post("/buses", payload);
        setBuses((p) => [res.data.data.bus, ...p]);
        toast.success("Bus added!");
      } else {
        const res = await api.patch(`/buses/${busModal._id}`, payload);
        setBuses((p) =>
          p.map((x) => (x._id === busModal._id ? res.data.data.bus : x)),
        );
        toast.success("Bus updated!");
      }
      setBusModal(null);
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Error");
    } finally {
      setSaving(false);
    }
  };

  const deleteBus = async (id: string) => {
    if (!confirm("Deactivate this bus?")) return;
    await api.delete(`/buses/${id}`);
    setBuses((p) => p.filter((x) => x._id !== id));
    toast.success("Bus deactivated");
  };

  // ── TRIP CRUD ─────────────────────────────────────────────────────────
  const openAddTrip = () => {
    setTripForm(emptyTrip);
    setTripModal("add");
    setDepartureTouched(false);
    setArrivalTouched(false);
  };
  const openEditTrip = (t: any) => {
    setTripForm({
      busId: t.bus?._id || "",
      from: t.route?.from || "",
      to: t.route?.to || "",
      distance: t.route?.distance || "",
      stops: (t.route?.stops || []).join("\n"),
      boardingPoints: (t.route?.stops || []).slice(
        0,
        Math.ceil((t.route?.stops || []).length / 2),
      ),
      droppingPoints: (t.route?.stops || []).slice(
        Math.ceil((t.route?.stops || []).length / 2),
      ),
      boardingInput: "",
      droppingInput: "",
      fare: t.fare || "",
      departureTime: t.departureTime
        ? new Date(t.departureTime).toISOString().slice(0, 16)
        : "",
      arrivalTime: t.arrivalTime
        ? new Date(t.arrivalTime).toISOString().slice(0, 16)
        : "",
    });
    setTripModal(t);
    setInitialDepartureMs(
      t.departureTime ? new Date(t.departureTime).getTime() : null,
    );
    setInitialArrivalMs(
      t.arrivalTime ? new Date(t.arrivalTime).getTime() : null,
    );
    setDepartureTouched(false);
    setArrivalTouched(false);
  };

  const saveTrip = async () => {
    setSaving(true);
    try {
      const stopsArr = Array.from(
        new Set(
          [
            ...(tripForm.boardingPoints || []),
            ...(tripForm.droppingPoints || []),
          ]
            .map((s: any) => String(s).trim())
            .filter(Boolean),
        ),
      );

      const payload: any = {
        busId: tripForm.busId,
        from: tripForm.from,
        to: tripForm.to,
        stops: stopsArr,
        boardingStops: tripForm.boardingPoints || [],
        droppingStops: tripForm.droppingPoints || [],
        distance: Number(tripForm.distance),
        fare: Number(tripForm.fare),
        departureTime: tripForm.departureTime
          ? new Date(tripForm.departureTime).toISOString()
          : undefined,
        arrivalTime: tripForm.arrivalTime
          ? new Date(tripForm.arrivalTime).toISOString()
          : undefined,
      };
      // When editing, only send departure/arrival if the user modified them.
      if (tripModal && tripModal !== "add") {
        if (!departureTouched) delete payload.departureTime;
        if (!arrivalTouched) delete payload.arrivalTime;
      }

      if (tripModal === "add") {
        const res = await api.post("/trips", payload);
        setTrips((p) => [res.data.data.trip, ...p]);
        toast.success("Trip added!");
        // notify other tabs/clients in this browser window as a fallback
        try {
          window.dispatchEvent(
            new CustomEvent("trip:changed", { detail: res.data.data.trip }),
          );
          try {
            localStorage.setItem(
              "tgb_trip_changed",
              JSON.stringify({ id: res.data.data.trip._id, t: Date.now() }),
            );
          } catch {}
        } catch {}
      } else {
        const res = await api.patch(`/trips/${tripModal._id}`, payload);
        setTrips((p) =>
          p.map((x) => (x._id === tripModal._id ? res.data.data.trip : x)),
        );
        toast.success("Trip updated!");
        try {
          window.dispatchEvent(
            new CustomEvent("trip:changed", { detail: res.data.data.trip }),
          );
          try {
            localStorage.setItem(
              "tgb_trip_changed",
              JSON.stringify({ id: res.data.data.trip._id, t: Date.now() }),
            );
          } catch {}
        } catch {}
      }
      setTripModal(null);
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Error");
    } finally {
      setSaving(false);
    }
  };

  const deleteTrip = async (id: string) => {
    if (!confirm("Delete this trip permanently?")) return;
    try {
      await api.delete(`/trips/${id}`);
      setTrips((p) => p.filter((x) => x._id !== id));
      setSelectedTripIds((p) => p.filter((tripId) => tripId !== id));
      toast.success("Trip deleted");
      try {
        window.dispatchEvent(
          new CustomEvent("trip:deleted", { detail: { tripId: id } }),
        );
        try {
          localStorage.setItem(
            "tgb_trip_changed",
            JSON.stringify({ id, t: Date.now(), deleted: true }),
          );
        } catch {}
      } catch {}
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to delete trip");
    }
  };

  const batchDeleteTrips = async () => {
    if (!selectedTripIds.length) {
      toast.error("Select at least one trip");
      return;
    }

    if (!confirm(`Delete ${selectedTripIds.length} selected trips?`)) return;

    try {
      await api.post("/trips/batch-delete", { ids: selectedTripIds });
      setTrips((p) => p.filter((trip) => !selectedTripIds.includes(trip._id)));
      setSelectedTripIds([]);
      toast.success("Selected trips deleted");
    } catch (e: any) {
      toast.error(
        e.response?.data?.message || "Failed to delete selected trips",
      );
    }
  };

  const toggleTripSelection = (id: string) => {
    setSelectedTripIds((p) =>
      p.includes(id) ? p.filter((tripId) => tripId !== id) : [...p, id],
    );
  };

  const visibleTrips = trips
    .filter((trip) => trip.status !== "cancelled")
    .filter((trip) => {
      const q = tripSearch.trim().toLowerCase();
      if (!q) return true;
      return [
        trip.route?.from,
        trip.route?.to,
        trip.bus?.busName,
        trip.bus?.busNumber,
        trip.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });

  // ── USER MANAGEMENT ───────────────────────────────────────────────────
  const toggleUser = async (u: any) => {
    await api.patch(`/admin/users/${u._id}/toggle-status`);
    setUsers((p) =>
      p.map((x) => (x._id === u._id ? { ...x, isActive: !x.isActive } : x)),
    );
    toast.success(u.isActive ? "User deactivated" : "User activated");
  };

  const changeRole = async (u: any, role: string) => {
    await api.patch(`/admin/users/${u._id}/toggle-status`, { role });
    setUsers((p) => p.map((x) => (x._id === u._id ? { ...x, role } : x)));
    toast.success("Role updated");
  };

  // ── BOOKING MANAGEMENT ────────────────────────────────────────────────
  const approveBooking = async (booking: any) => {
    setApprovingBookingId(booking._id);
    try {
      const res = await api.patch(`/admin/bookings/${booking._id}/approve`);
      const updated = res.data.data.booking;
      setBookings((p) => p.map((x) => (x._id === booking._id ? updated : x)));
      setRecentBookings((p) =>
        p.map((x) => (x._id === booking._id ? updated : x)),
      );
      toast.success("Booking approved");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to approve booking");
    } finally {
      setApprovingBookingId(null);
    }
  };

  const cancelBooking = async (booking: any) => {
    if (!confirm("Cancel this booking? This cannot be undone.")) return;
    setCancellingBookingId(booking._id);
    try {
      await api.patch(`/admin/bookings/${booking._id}/cancel`);
      setBookings((p) => p.filter((x) => x._id !== booking._id));
      setRecentBookings((p) => p.filter((x) => x._id !== booking._id));
      toast.success("Booking cancelled");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to cancel booking");
    } finally {
      setCancellingBookingId(null);
    }
  };

  // ── RECURRENCE SCHEDULES ─────────────────────────────────────────────
  const openAddSchedule = () => {
    setEditingScheduleId(null);
    setScheduleForm({
      title: "",
      bus: "",
      route: { from: "", to: "", distance: "" },
      daysOfWeek: [],
      departureTime: "15:00",
      startDate: new Date().toISOString().slice(0, 10),
      endDate: "",
      timezone: "Asia/Dhaka",
      meta: { fare: 0 },
    });
    setScheduleModal("add");
  };

  const openEditSchedule = (schedule: any) => {
    setEditingScheduleId(schedule._id);
    setScheduleForm({
      title: schedule.title || "",
      bus: schedule.bus?._id || schedule.bus || "",
      route: {
        from: schedule.route?.from || "",
        to: schedule.route?.to || "",
        distance: schedule.route?.distance ?? "",
      },
      daysOfWeek: schedule.daysOfWeek || [],
      departureTime: schedule.departureTime || "15:00",
      startDate: schedule.startDate
        ? new Date(schedule.startDate).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      endDate: schedule.endDate
        ? new Date(schedule.endDate).toISOString().slice(0, 10)
        : "",
      timezone: schedule.timezone || "Asia/Dhaka",
      meta: { fare: schedule.meta?.fare || 0 },
    });
    setScheduleModal("edit");
  };

  const toggleDay = (d: number) => {
    setScheduleForm((s: any) => {
      const set = new Set(s.daysOfWeek || []);
      if (set.has(d)) set.delete(d);
      else set.add(d);
      return { ...s, daysOfWeek: Array.from(set) };
    });
  };

  const saveSchedule = async () => {
    try {
      setSaving(true);
      const isEditing = Boolean(editingScheduleId);
      const payload = {
        ...scheduleForm,
        route: {
          ...scheduleForm.route,
          distance: Number(scheduleForm.route.distance),
        },
        startDate: scheduleForm.startDate,
        endDate: scheduleForm.endDate || undefined,
        meta: {
          ...scheduleForm.meta,
          fare: Number(scheduleForm.meta?.fare || 0),
        },
      };
      if (isEditing) {
        const res = await api.patch(
          `/admin/recurrings/${editingScheduleId}`,
          payload,
        );
        const updated = res.data.data.recurring;
        setSchedules((p) =>
          p.map((item) => (item._id === editingScheduleId ? updated : item)),
        );
      } else {
        const res = await api.post("/admin/recurrings", payload);
        const created = res.data.data.recurring;
        setSchedules((p) => [created, ...p]);
      }
      setScheduleModal(null);
      setEditingScheduleId(null);
      toast.success(
        isEditing
          ? "Recurring schedule updated"
          : "Recurring schedule created and generated",
      );
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const deleteSchedule = async (schedule: any) => {
    if (!confirm(`Delete schedule \"${schedule.title}\"?`)) return;
    try {
      await api.delete(`/admin/recurrings/${schedule._id}`);
      setSchedules((p) => p.filter((item) => item._id !== schedule._id));
      toast.success("Recurring schedule deleted");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed");
    }
  };

  const materializeNow = async (id: string) => {
    try {
      await api.post(`/admin/recurrings/${id}/apply?months=1`);
      toast.success("Materialized for next month");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed");
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );

  const tabs = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "buses", label: "Buses", icon: Bus },
    { id: "trips", label: "Trips & Routes", icon: Route },
    { id: "schedules", label: "Schedules", icon: TrendingUp },
    { id: "users", label: "Users", icon: Users },
    { id: "bookings", label: "Bookings", icon: BookOpen },
  ];
  const visibleBookings = bookings.filter(
    (b: any) => b.bookingStatus !== "cancelled",
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row gap-4 md:gap-6">
        {/* Sidebar */}
        <aside className="w-52 flex-shrink-0 hidden md:block">
          <div className="bg-white rounded-2xl border p-3 sticky top-20">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">
              Admin Panel
            </p>
            <div className="space-y-1">
              {tabs.map((t) => (
                <SideTab
                  key={t.id}
                  icon={t.icon}
                  label={t.label}
                  active={tab === t.id}
                  onClick={() => setTab(t.id)}
                />
              ))}
            </div>
          </div>
        </aside>

        {/* Mobile tabs */}
        <div className="md:hidden w-full">
          <select
            value={tab}
            onChange={(e) => setTab(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm shadow-sm"
          >
            {tabs.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0 w-full">
          {/* ── OVERVIEW ── */}
          {tab === "overview" && (
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-5">
                Dashboard Overview
              </h1>
              {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
                  {[
                    {
                      label: "Users",
                      value: stats.totalUsers,
                      icon: Users,
                      color: "text-blue-600 bg-blue-50",
                    },
                    {
                      label: "Buses",
                      value: stats.totalBuses,
                      icon: Bus,
                      color: "text-green-600 bg-green-50",
                    },
                    {
                      label: "Trips",
                      value: stats.totalTrips,
                      icon: Route,
                      color: "text-purple-600 bg-purple-50",
                    },
                    {
                      label: "Bookings",
                      value: stats.totalBookings,
                      icon: BookOpen,
                      color: "text-yellow-600 bg-yellow-50",
                    },
                    {
                      label: "Revenue",
                      value: formatCurrency(stats.totalRevenue),
                      icon: TrendingUp,
                      color: "text-emerald-600 bg-emerald-50",
                    },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-white rounded-xl border p-4">
                      <div
                        className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-3`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <p className="text-xl font-bold text-gray-900">{value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="bg-white rounded-xl border">
                <div className="p-4 border-b">
                  <h2 className="font-semibold text-gray-900 text-sm">
                    Recent Bookings
                  </h2>
                </div>
                <div className="divide-y">
                  {recentBookings.map((b: any) => (
                    <div
                      key={b._id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between text-sm gap-3"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {b.bookingId}
                        </p>
                        <p className="text-xs text-gray-500">
                          {b.user?.name} · {b.trip?.route?.from} →{" "}
                          {b.trip?.route?.to}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(b.totalAmount)}
                        </p>
                        <Badge
                          value={b.paymentStatus}
                          map={{
                            paid: "bg-green-100 text-green-700",
                            pending: "bg-yellow-100 text-yellow-700",
                            failed: "bg-red-100 text-red-700",
                          }}
                        />
                        <Badge
                          value={b.bookingStatus}
                          map={{
                            hold: "bg-amber-100 text-amber-700",
                            confirmed: "bg-green-100 text-green-700",
                            pending: "bg-yellow-100 text-yellow-700",
                            cancelled: "bg-red-100 text-red-700",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── BUSES ── */}
          {tab === "buses" && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <h1 className="text-xl font-bold text-gray-900">
                  Manage Buses
                </h1>
                <button
                  onClick={openAddBus}
                  className="flex items-center gap-1.5 bg-primary-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Bus
                </button>
              </div>
              <div className="bg-white rounded-xl border divide-y">
                {buses.length === 0 ? (
                  <p className="text-center py-12 text-gray-400 text-sm">
                    No buses yet
                  </p>
                ) : (
                  buses.map((b: any) => (
                    <div
                      key={b._id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">
                          {b.busName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {b.busNumber} · {b.type} · {b.totalSeats} seats
                        </p>
                        <p className="text-xs text-gray-400">
                          {b.amenities?.join(", ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          value={b.isActive ? "Active" : "Inactive"}
                          map={{
                            Active: "bg-green-100 text-green-700",
                            Inactive: "bg-red-100 text-red-700",
                          }}
                        />
                        <button
                          onClick={() => openEditBus(b)}
                          className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteBus(b._id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── TRIPS ── */}
          {tab === "trips" && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <h1 className="text-xl font-bold text-gray-900">
                  Manage Trips & Routes
                </h1>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <input
                    value={tripSearch}
                    onChange={(e) => setTripSearch(e.target.value)}
                    placeholder="Search route, bus, status..."
                    className="w-full sm:w-72 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={batchDeleteTrips}
                      disabled={!selectedTripIds.length}
                      className="flex items-center gap-1.5 bg-red-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" /> Delete Selected
                    </button>
                    <button
                      onClick={openAddTrip}
                      className="flex items-center gap-1.5 bg-primary-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Add Trip
                    </button>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border divide-y">
                {visibleTrips.length === 0 ? (
                  <p className="text-center py-12 text-gray-400 text-sm">
                    No trips found
                  </p>
                ) : (
                  <>
                    <div className="p-3 border-b flex items-center justify-between text-xs text-gray-500">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={
                            visibleTrips.length > 0 &&
                            selectedTripIds.length === visibleTrips.length
                          }
                          onChange={(e) => {
                            setSelectedTripIds(
                              e.target.checked
                                ? visibleTrips.map((trip: any) => trip._id)
                                : [],
                            );
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        Select all visible
                      </label>
                      <span>Showing {visibleTrips.length} trip(s)</span>
                    </div>
                    {visibleTrips.map((t: any) => (
                      <div
                        key={t._id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={selectedTripIds.includes(t._id)}
                            onChange={() => toggleTripSelection(t._id)}
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 text-sm">
                              {t.route?.from} → {t.route?.to}
                            </p>
                            <p className="text-xs text-gray-500">
                              {t.bus?.busName} · {t.bus?.type} ·{" "}
                              {formatCurrency(t.fare)}/seat
                            </p>
                            <p className="text-xs text-gray-400">
                              {t.departureTime
                                ? formatDate(t.departureTime) +
                                  " " +
                                  formatTime(t.departureTime)
                                : ""}{" "}
                              · {t.availableSeats?.length} seats left
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            value={t.status}
                            map={{
                              scheduled: "bg-blue-100 text-blue-700",
                              departed: "bg-yellow-100 text-yellow-700",
                              cancelled: "bg-red-100 text-red-700",
                              arrived: "bg-gray-100 text-gray-600",
                            }}
                          />
                          <button
                            onClick={() => openEditTrip(t)}
                            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteTrip(t._id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── SCHEDULES ── */}
          {tab === "schedules" && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <h1 className="text-xl font-bold text-gray-900">
                  Recurring Schedules
                </h1>
                <div className="flex items-center gap-2">
                  <button
                    onClick={openAddSchedule}
                    className="flex items-center gap-2 bg-primary-600 text-white px-3 py-2 rounded-lg text-sm"
                  >
                    <Plus className="w-4 h-4" /> Add Schedule
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border divide-y">
                {schedules.length === 0 ? (
                  <p className="text-center py-12 text-gray-400 text-sm">
                    No schedules yet
                  </p>
                ) : (
                  schedules.map((s: any) => (
                    <div
                      key={s._id}
                      className="p-4 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">{s.title}</p>
                        <p className="text-xs text-gray-500">
                          {s.route?.from} → {s.route?.to} · {s.departureTime}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditSchedule(s)}
                          className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:text-primary-600 hover:border-primary-300"
                          title="Edit schedule"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => materializeNow(s._id)}
                          className="text-sm px-3 py-1 rounded-lg border"
                        >
                          Materialize
                        </button>
                        <button
                          onClick={() => deleteSchedule(s)}
                          className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:text-red-600 hover:border-red-300"
                          title="Delete schedule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {scheduleModal && (
                <Modal
                  title={
                    scheduleModal === "add"
                      ? "Add Recurring Schedule"
                      : "Edit Recurring Schedule"
                  }
                  onClose={() => {
                    setScheduleModal(null);
                    setEditingScheduleId(null);
                  }}
                >
                  <div className="space-y-3">
                    <Field label="Title">
                      <input
                        value={scheduleForm.title}
                        onChange={(e) =>
                          setScheduleForm((p: any) => ({
                            ...p,
                            title: e.target.value,
                          }))
                        }
                        className={inp}
                      />
                    </Field>
                    <Field label="Bus">
                      <select
                        value={scheduleForm.bus}
                        onChange={(e) =>
                          setScheduleForm((p: any) => ({
                            ...p,
                            bus: e.target.value,
                          }))
                        }
                        className={inp}
                      >
                        <option value="">Select bus</option>
                        {buses.map((b: any) => (
                          <option key={b._id} value={b._id}>
                            {b.busName} - {b.busNumber}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Route From/To">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <select
                          value={scheduleForm.route.from}
                          onChange={(e) =>
                            setScheduleForm((p: any) => ({
                              ...p,
                              route: { ...p.route, from: e.target.value },
                            }))
                          }
                          className={inp}
                        >
                          <option value="">Select departure city</option>
                          {BD_CITIES.map((city) => (
                            <option key={`from-${city}`} value={city}>
                              {city}
                            </option>
                          ))}
                        </select>
                        <select
                          value={scheduleForm.route.to}
                          onChange={(e) =>
                            setScheduleForm((p: any) => ({
                              ...p,
                              route: { ...p.route, to: e.target.value },
                            }))
                          }
                          className={inp}
                        >
                          <option value="">Select destination city</option>
                          {BD_CITIES.filter(
                            (city) => city !== scheduleForm.route.from,
                          ).map((city) => (
                            <option key={`to-${city}`} value={city}>
                              {city}
                            </option>
                          ))}
                        </select>
                      </div>
                    </Field>
                    <Field label="Distance (km)">
                      <input
                        value={scheduleForm.route.distance}
                        onChange={(e) =>
                          setScheduleForm((p: any) => ({
                            ...p,
                            route: { ...p.route, distance: e.target.value },
                          }))
                        }
                        className={inp}
                        placeholder="320"
                        type="number"
                        min="0"
                      />
                    </Field>
                    <Field label="Fare">
                      <input
                        value={scheduleForm.meta?.fare || ""}
                        onChange={(e) =>
                          setScheduleForm((p: any) => ({
                            ...p,
                            meta: { ...p.meta, fare: e.target.value },
                          }))
                        }
                        className={inp}
                        placeholder="1200"
                        type="number"
                        min="0"
                      />
                    </Field>
                    <Field label="Days">
                      <div className="flex gap-2 flex-wrap text-sm">
                        <button
                          onClick={() => toggleDay(0)}
                          className={`px-2 py-1 rounded ${scheduleForm.daysOfWeek?.includes(0) ? "bg-primary-600 text-white" : "bg-gray-100"}`}
                        >
                          Sun
                        </button>
                        <button
                          onClick={() => toggleDay(1)}
                          className={`px-2 py-1 rounded ${scheduleForm.daysOfWeek?.includes(1) ? "bg-primary-600 text-white" : "bg-gray-100"}`}
                        >
                          Mon
                        </button>
                        <button
                          onClick={() => toggleDay(2)}
                          className={`px-2 py-1 rounded ${scheduleForm.daysOfWeek?.includes(2) ? "bg-primary-600 text-white" : "bg-gray-100"}`}
                        >
                          Tue
                        </button>
                        <button
                          onClick={() => toggleDay(3)}
                          className={`px-2 py-1 rounded ${scheduleForm.daysOfWeek?.includes(3) ? "bg-primary-600 text-white" : "bg-gray-100"}`}
                        >
                          Wed
                        </button>
                        <button
                          onClick={() => toggleDay(4)}
                          className={`px-2 py-1 rounded ${scheduleForm.daysOfWeek?.includes(4) ? "bg-primary-600 text-white" : "bg-gray-100"}`}
                        >
                          Thu
                        </button>
                        <button
                          onClick={() => toggleDay(5)}
                          className={`px-2 py-1 rounded ${scheduleForm.daysOfWeek?.includes(5) ? "bg-primary-600 text-white" : "bg-gray-100"}`}
                        >
                          Fri
                        </button>
                        <button
                          onClick={() => toggleDay(6)}
                          className={`px-2 py-1 rounded ${scheduleForm.daysOfWeek?.includes(6) ? "bg-primary-600 text-white" : "bg-gray-100"}`}
                        >
                          Sat
                        </button>
                      </div>
                    </Field>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Field label="Departure time">
                        <input
                          value={scheduleForm.departureTime}
                          onChange={(e) =>
                            setScheduleForm((p: any) => ({
                              ...p,
                              departureTime: e.target.value,
                            }))
                          }
                          className={inp}
                          type="time"
                        />
                      </Field>
                      <Field label="Start date">
                        <input
                          value={scheduleForm.startDate}
                          onChange={(e) =>
                            setScheduleForm((p: any) => ({
                              ...p,
                              startDate: e.target.value,
                            }))
                          }
                          className={inp}
                          type="date"
                        />
                      </Field>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => setScheduleModal(null)}
                        className="px-3 py-2 rounded border"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveSchedule}
                        className="px-3 py-2 rounded bg-primary-600 text-white"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </Modal>
              )}
            </div>
          )}

          {/* ── USERS ── */}
          {tab === "users" && (
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-5">
                Manage Users
              </h1>
              <div className="bg-white rounded-xl border divide-y">
                {users.map((u: any) => (
                  <div
                    key={u._id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold text-sm flex-shrink-0">
                        {u.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {u.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {u.email} · {u.phone}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-300"
                      >
                        <option value="user">User</option>
                        <option value="operator">Operator</option>
                        <option value="admin">Admin</option>
                      </select>
                      <Badge
                        value={u.isActive ? "Active" : "Inactive"}
                        map={{
                          Active: "bg-green-100 text-green-700",
                          Inactive: "bg-red-100 text-red-700",
                        }}
                      />
                      <button
                        onClick={() => toggleUser(u)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${u.isActive ? "border-red-200 text-red-600 hover:bg-red-50" : "border-green-200 text-green-600 hover:bg-green-50"}`}
                      >
                        {u.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── BOOKINGS ── */}
          {tab === "bookings" && (
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-5">
                All Bookings
              </h1>
              <div className="bg-white rounded-xl border divide-y">
                {visibleBookings.length === 0 ? (
                  <p className="text-center py-12 text-gray-400 text-sm">
                    No bookings yet
                  </p>
                ) : (
                  visibleBookings.map((b: any) => (
                    <div
                      key={b._id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">
                          {b.bookingId}
                        </p>
                        <p className="text-xs text-gray-500">
                          {b.user?.name} ({b.user?.email})
                        </p>
                        <p className="text-xs text-gray-400">
                          {b.trip?.route?.from} → {b.trip?.route?.to} · Seats:{" "}
                          {b.seats?.join(", ")}
                        </p>
                        <p className="text-xs text-gray-400">
                          {b.trip?.departureTime
                            ? formatDate(b.trip.departureTime)
                            : ""}
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1.5">
                        <p className="font-bold text-gray-900 text-sm">
                          {formatCurrency(b.totalAmount)}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase tracking-wide text-gray-400">
                            Payment
                          </span>
                          <Badge
                            value={b.paymentStatus}
                            map={{
                              paid: "bg-green-100 text-green-700",
                              pending: "bg-yellow-100 text-yellow-700",
                              failed: "bg-red-100 text-red-700",
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase tracking-wide text-gray-400">
                            Booking
                          </span>
                          <Badge
                            value={b.bookingStatus}
                            map={{
                              hold: "bg-amber-100 text-amber-700",
                              confirmed: "bg-green-100 text-green-700",
                              pending: "bg-yellow-100 text-yellow-700",
                              cancelled: "bg-red-100 text-red-700",
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          {/* Approve — only when paid and not yet confirmed/cancelled */}
                          {b.paymentStatus === "paid" &&
                            b.bookingStatus !== "confirmed" &&
                            b.bookingStatus !== "cancelled" && (
                              <button
                                onClick={() => approveBooking(b)}
                                disabled={
                                  approvingBookingId === b._id ||
                                  cancellingBookingId === b._id
                                }
                                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-60 transition-colors"
                              >
                                {approvingBookingId === b._id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                Approve
                              </button>
                            )}
                          {/* Cancel — hidden once already cancelled */}
                          {b.bookingStatus !== "cancelled" && (
                            <button
                              onClick={() => cancelBooking(b)}
                              disabled={
                                cancellingBookingId === b._id ||
                                approvingBookingId === b._id
                              }
                              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60 transition-colors"
                            >
                              {cancellingBookingId === b._id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <X className="w-3.5 h-3.5" />
                              )}
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── BUS MODAL ── */}
      {busModal !== null && (
        <Modal
          title={busModal === "add" ? "Add New Bus" : "Edit Bus"}
          onClose={() => setBusModal(null)}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bus Name">
                <input
                  className={inp}
                  value={busForm.busName}
                  onChange={(e) =>
                    setBusForm((p) => ({ ...p, busName: e.target.value }))
                  }
                  placeholder="e.g. Green Line"
                />
              </Field>
              <Field label="Bus Number">
                <input
                  className={inp}
                  value={busForm.busNumber}
                  onChange={(e) =>
                    setBusForm((p) => ({ ...p, busNumber: e.target.value }))
                  }
                  placeholder="e.g. DHA-1234"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select
                  className={inp}
                  value={busForm.type}
                  onChange={(e) =>
                    setBusForm((p) => ({ ...p, type: e.target.value }))
                  }
                >
                  {["AC", "Non-AC", "Sleeper", "Semi-Sleeper"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Total Seats">
                <input
                  type="number"
                  className={inp}
                  value={busForm.totalSeats}
                  min={10}
                  max={80}
                  onChange={(e) =>
                    setBusForm((p) => ({ ...p, totalSeats: +e.target.value }))
                  }
                />
              </Field>
            </div>
            <Field label="Amenities (comma separated)">
              <input
                className={inp}
                value={busForm.amenities}
                onChange={(e) =>
                  setBusForm((p) => ({ ...p, amenities: e.target.value }))
                }
                placeholder="AC, WiFi, USB Charging, Blanket"
              />
            </Field>
            <Field label="Assign Operator">
              <select
                className={inp}
                value={busForm.operatorId}
                onChange={(e) =>
                  setBusForm((p) => ({ ...p, operatorId: e.target.value }))
                }
              >
                <option value="">-- Self (Admin) --</option>
                {operators.map((o: any) => (
                  <option key={o._id} value={o._id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setBusModal(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveBus}
                disabled={saving}
                className="flex-1 bg-primary-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {busModal === "add" ? "Add Bus" : "Save Changes"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── TRIP MODAL ── */}
      {tripModal !== null && (
        <Modal
          title={tripModal === "add" ? "Add New Trip" : "Edit Trip"}
          onClose={() => setTripModal(null)}
        >
          <div className="space-y-4">
            <Field label="Select Bus">
              <select
                className={inp}
                value={tripForm.busId}
                onChange={(e) =>
                  setTripForm((p) => ({ ...p, busId: e.target.value }))
                }
              >
                <option value="">-- Select Bus --</option>
                {buses
                  .filter((b) => b.isActive)
                  .map((b: any) => (
                    <option key={b._id} value={b._id}>
                      {b.busName} ({b.busNumber}) · {b.type}
                    </option>
                  ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From (Departure City)">
                <select
                  className={inp}
                  value={tripForm.from}
                  onChange={(e) =>
                    setTripForm((p) => ({ ...p, from: e.target.value }))
                  }
                >
                  <option value="">Select city</option>
                  {BD_CITIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="To (Destination)">
                <select
                  className={inp}
                  value={tripForm.to}
                  onChange={(e) =>
                    setTripForm((p) => ({ ...p, to: e.target.value }))
                  }
                >
                  <option value="">Select city</option>
                  {BD_CITIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Distance (km)">
                <input
                  type="number"
                  className={inp}
                  value={tripForm.distance}
                  onChange={(e) =>
                    setTripForm((p) => ({ ...p, distance: e.target.value }))
                  }
                  placeholder="250"
                />
              </Field>
              <Field label="Fare per Seat (৳)">
                <input
                  type="number"
                  className={inp}
                  value={tripForm.fare}
                  onChange={(e) =>
                    setTripForm((p) => ({ ...p, fare: e.target.value }))
                  }
                  placeholder="600"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Boarding Points">
                <div className="flex gap-2">
                  <input
                    className={inp}
                    value={tripForm.boardingInput || ""}
                    onChange={(e) =>
                      setTripForm((p) => ({
                        ...p,
                        boardingInput: e.target.value,
                      }))
                    }
                    placeholder="Enter boarding point"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const v = String(tripForm.boardingInput || "").trim();
                      if (!v) return;
                      setTripForm((p) => ({
                        ...p,
                        boardingPoints: Array.from(
                          new Set([...(p.boardingPoints || []), v]),
                        ),
                        boardingInput: "",
                      }));
                    }}
                    className="bg-primary-600 text-white px-3 rounded-lg"
                  >
                    Add
                  </button>
                </div>
                <div className="flex gap-2 flex-wrap mt-2">
                  {(tripForm.boardingPoints || []).map(
                    (bp: string, i: number) => (
                      <span
                        key={bp + i}
                        className="flex items-center gap-2 bg-gray-100 px-2 py-1 rounded-full text-sm"
                      >
                        <span className="max-w-xs truncate">{bp}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setTripForm((p) => ({
                              ...p,
                              boardingPoints: (p.boardingPoints || []).filter(
                                (_, idx) => idx !== i,
                              ),
                            }))
                          }
                          className="text-red-500"
                        >
                          ×
                        </button>
                      </span>
                    ),
                  )}
                </div>
              </Field>

              <Field label="Dropping Points">
                <div className="flex gap-2">
                  <input
                    className={inp}
                    value={tripForm.droppingInput || ""}
                    onChange={(e) =>
                      setTripForm((p) => ({
                        ...p,
                        droppingInput: e.target.value,
                      }))
                    }
                    placeholder="Enter dropping point"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const v = String(tripForm.droppingInput || "").trim();
                      if (!v) return;
                      setTripForm((p) => ({
                        ...p,
                        droppingPoints: Array.from(
                          new Set([...(p.droppingPoints || []), v]),
                        ),
                        droppingInput: "",
                      }));
                    }}
                    className="bg-primary-600 text-white px-3 rounded-lg"
                  >
                    Add
                  </button>
                </div>
                <div className="flex gap-2 flex-wrap mt-2">
                  {(tripForm.droppingPoints || []).map(
                    (dp: string, i: number) => (
                      <span
                        key={dp + i}
                        className="flex items-center gap-2 bg-gray-100 px-2 py-1 rounded-full text-sm"
                      >
                        <span className="max-w-xs truncate">{dp}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setTripForm((p) => ({
                              ...p,
                              droppingPoints: (p.droppingPoints || []).filter(
                                (_, idx) => idx !== i,
                              ),
                            }))
                          }
                          className="text-red-500"
                        >
                          ×
                        </button>
                      </span>
                    ),
                  )}
                </div>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Departure Time">
                <input
                  type="datetime-local"
                  className={inp}
                  value={tripForm.departureTime}
                  onChange={(e) => {
                    setTripForm((p) => ({
                      ...p,
                      departureTime: e.target.value,
                    }));
                    setDepartureTouched(true);
                  }}
                />
              </Field>
              <Field label="Arrival Time">
                <input
                  type="datetime-local"
                  className={inp}
                  value={tripForm.arrivalTime}
                  onChange={(e) => {
                    setTripForm((p) => ({ ...p, arrivalTime: e.target.value }));
                    setArrivalTouched(true);
                  }}
                />
              </Field>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setTripModal(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveTrip}
                disabled={saving}
                className="flex-1 bg-primary-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {tripModal === "add" ? "Add Trip" : "Save Changes"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
