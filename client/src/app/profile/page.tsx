'use client';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAppSelector, useAppDispatch } from '@/hooks/redux';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import api from '@/lib/axios';
import { fetchMe } from '@/store/slices/authSlice';
import { User, Phone, Mail, ShieldCheck, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useState } from 'react';

export default function ProfilePage() {
  const { user } = useAppSelector(s => s.auth);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, reset } = useForm({ defaultValues: { name: user?.name || '', phone: user?.phone || '' } });

  useEffect(() => { if (!user) router.push('/auth/login'); else reset({ name: user.name, phone: user.phone }); }, [user, router, reset]);

  const onSubmit = async (data: any) => {
    setSaving(true);
    try {
      await api.patch('/auth/profile', data);
      await dispatch(fetchMe());
      toast.success('Profile updated!');
    } catch { toast.error('Update failed'); } finally { setSaving(false); }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>
        <div className="bg-white rounded-2xl border p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="w-7 h-7 text-primary-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-lg">{user.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary-600" />
                <span className="text-xs capitalize text-primary-600 font-medium">{user.role}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 mb-4 text-sm">
            <div className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-lg">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{user.email}</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-lg">
              <Phone className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{user.phone}</span>
            </div>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input {...register('name')} className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
              <input {...register('phone')} className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
            </div>
            <button type="submit" disabled={saving}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
