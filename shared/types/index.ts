export const BD_CITIES = [
  'Dhaka','Chittagong','Sylhet','Rajshahi','Khulna','Barishal',
  'Rangpur','Mymensingh',"Cox's Bazar",'Comilla','Jessore','Bogura',
];

export const BUS_TYPES = ['AC','Non-AC','Sleeper','Semi-Sleeper'] as const;
export const USER_ROLES = ['user','admin','operator'] as const;
export const PAYMENT_STATUSES = ['pending','paid','failed','refunded'] as const;
export const BOOKING_STATUSES = ['pending','confirmed','cancelled'] as const;
export const SEAT_LOCK_TTL_SECONDS = 300;
