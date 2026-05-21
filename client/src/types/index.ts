export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: 'user' | 'admin' | 'operator';
  isActive: boolean;
  avatar?: string;
  createdAt: string;
}

export interface Seat {
  number: string;
  type: 'window' | 'aisle';
  deck: 'lower' | 'upper';
}

export interface Bus {
  _id: string;
  busName: string;
  busNumber: string;
  type: 'AC' | 'Non-AC' | 'Sleeper' | 'Semi-Sleeper';
  totalSeats: number;
  seats: Seat[];
  operator: { _id: string; name: string; phone?: string };
  amenities: string[];
}

export interface Route {
  from: string;
  to: string;
  distance: number;
  stops: string[];
}

export interface Trip {
  _id: string;
  bus: Bus;
  route: Route;
  departureTime: string;
  arrivalTime: string;
  fare: number;
  availableSeats: string[];
  bookedSeats: string[];
  status: 'scheduled' | 'departed' | 'arrived' | 'cancelled';
}

export interface Passenger {
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  seatNumber: string;
}

export interface Booking {
  _id: string;
  bookingId: string;
  user: User | string;
  trip: Trip;
  passengers: Passenger[];
  seats: string[];
  totalAmount: number;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  bookingStatus: 'pending' | 'confirmed' | 'cancelled';
  transactionId?: string;
  ticketUrl?: string;
  createdAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

export interface SearchParams {
  from: string;
  to: string;
  date: string;
  passengers: number;
}
