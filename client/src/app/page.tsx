import { Navbar } from '@/components/layout/Navbar';
import { HeroSearch } from '@/components/bus/HeroSearch';
import { PopularRoutes } from '@/components/bus/PopularRoutes';
import { Features } from '@/components/layout/Features';
import { Footer } from '@/components/layout/Footer';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar />
      <HeroSearch />
      <PopularRoutes />
      <Features />
      <Footer />
    </main>
  );
}
