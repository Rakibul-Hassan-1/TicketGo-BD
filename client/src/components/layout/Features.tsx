import { Search, CreditCard, Download, Shield } from 'lucide-react';

const features = [
  { icon: Search, title: 'Smart Search', desc: 'Find buses across all routes in seconds with real-time availability.' },
  { icon: CreditCard, title: 'Secure Payment', desc: 'Pay safely via SSLCommerz — the trusted gateway in Bangladesh.' },
  { icon: Download, title: 'Instant E-Ticket', desc: 'Get your PDF ticket instantly. Download or print anytime.' },
  { icon: Shield, title: 'Seat Lock', desc: 'Your selected seats are locked for 5 minutes while you pay.' },
];

export function Features() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Why TicketGo BD?</h2>
        <p className="text-gray-500 text-center mb-10 text-sm">Everything you need for a smooth journey</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-6 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-primary-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1.5 text-sm">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
