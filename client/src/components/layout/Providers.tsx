'use client';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { useEffect } from 'react';
import { fetchMe } from '@/store/slices/authSlice';
import { useAppDispatch } from '@/hooks/redux';

function AuthInit({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  useEffect(() => {
    const token = localStorage.getItem('tgb_token');
    if (token) dispatch(fetchMe());
  }, [dispatch]);
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AuthInit>{children}</AuthInit>
    </Provider>
  );
}
