import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-BD', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('en-BD', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export function formatCurrency(amount: number): string {
  return `৳${amount.toLocaleString('en-BD')}`;
}

export function calculateDuration(from: string | Date, to: string | Date): string {
  const diff = new Date(to).getTime() - new Date(from).getTime();
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}
