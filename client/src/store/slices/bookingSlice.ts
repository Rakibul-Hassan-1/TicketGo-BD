import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Trip, Passenger } from '@/types';

interface BookingState {
  selectedTrip: Trip | null;
  selectedSeats: string[];
  lockedSeats: string[];
  passengers: Passenger[];
  searchParams: { from: string; to: string; date: string; passengers: number } | null;
}

const initialState: BookingState = {
  selectedTrip: null,
  selectedSeats: [],
  lockedSeats: [],
  passengers: [],
  searchParams: null,
};

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setSelectedTrip(state, action: PayloadAction<Trip>) {
      state.selectedTrip = action.payload;
      state.selectedSeats = [];
    },
    toggleSeat(state, action: PayloadAction<string>) {
      const seat = action.payload;
      if (state.selectedSeats.includes(seat)) {
        state.selectedSeats = state.selectedSeats.filter(s => s !== seat);
      } else {
        state.selectedSeats.push(seat);
      }
    },
    setLockedSeats(state, action: PayloadAction<string[]>) {
      state.lockedSeats = action.payload;
    },
    addLockedSeat(state, action: PayloadAction<string[]>) {
      state.lockedSeats = [...new Set([...state.lockedSeats, ...action.payload])];
    },
    removeLockedSeat(state, action: PayloadAction<string[]>) {
      state.lockedSeats = state.lockedSeats.filter(s => !action.payload.includes(s));
    },
    setPassengers(state, action: PayloadAction<Passenger[]>) {
      state.passengers = action.payload;
    },
    setSearchParams(state, action: PayloadAction<BookingState['searchParams']>) {
      state.searchParams = action.payload;
    },
    resetBooking(state) {
      state.selectedTrip = null;
      state.selectedSeats = [];
      state.passengers = [];
    },
  },
});

export const {
  setSelectedTrip, toggleSeat, setLockedSeats, addLockedSeat,
  removeLockedSeat, setPassengers, setSearchParams, resetBooking,
} = bookingSlice.actions;
export default bookingSlice.reducer;
