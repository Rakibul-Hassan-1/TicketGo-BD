import Link from 'next/link';
import { Bus } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-dark text-gray-400 py-12 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-primary-600 p-1.5 rounded-lg"><Bus className="w-5 h-5 text-white" /></div>
              <span className="text-white font-bold text-lg">TicketGo BD</span>
            </div>
            <p className="text-sm leading-relaxed">Bangladesh&apos;s fastest online bus ticket booking platform. Book your journey instantly, anytime, anywhere.</p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/buses/search" className="hover:text-white transition-colors">Search Buses</Link></li>
              <li><Link href="/auth/login" className="hover:text-white transition-colors">Login</Link></li>
              <li><Link href="/auth/register" className="hover:text-white transition-colors">Register</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li>support@ticketgobd.com</li>
              <li>+880 1800-000000</li>
              <li>Chattogram, Bangladesh</li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-800 text-center text-xs">
          © 2025 TicketGo BD. All rights reserved by Rakibul Hassan.
        </div>
      </div>
    </footer>
  );
}
