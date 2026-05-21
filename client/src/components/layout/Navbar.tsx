'use client';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { logout } from '@/store/slices/authSlice';
import { useRouter } from 'next/navigation';
import { Bus, LogOut, User, LayoutDashboard, Menu, X } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

export function Navbar() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user } = useAppSelector(s => s.auth);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Logged out successfully');
    router.push('/');
  };

  const dashboardPath = user?.role === 'admin' ? '/admin' : user?.role === 'operator' ? '/operator' : '/dashboard';

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-primary-600 text-white p-1.5 rounded-lg">
              <Bus className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-primary-600">TicketGo BD</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link href="/buses/search" className="text-gray-600 hover:text-primary-600 text-sm font-medium transition-colors">
              Search Buses
            </Link>
            {user ? (
              <>
                <Link href={dashboardPath} className="flex items-center gap-1.5 text-gray-600 hover:text-primary-600 text-sm font-medium">
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{user.name.split(' ')[0]}</span>
                  <button onClick={handleLogout} className="ml-2 text-gray-400 hover:text-red-500 transition-colors">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/auth/login" className="text-sm font-medium text-gray-600 hover:text-primary-600">Login</Link>
                <Link href="/auth/register" className="text-sm font-medium bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100 space-y-3">
            <Link href="/buses/search" className="block text-sm font-medium text-gray-700 py-2">Search Buses</Link>
            {user ? (
              <>
                <Link href={dashboardPath} className="block text-sm font-medium text-gray-700 py-2">Dashboard</Link>
                <button onClick={handleLogout} className="block text-sm font-medium text-red-500 py-2">Logout</button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="block text-sm font-medium text-gray-700 py-2">Login</Link>
                <Link href="/auth/register" className="block text-sm font-medium text-primary-600 py-2">Sign Up</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
