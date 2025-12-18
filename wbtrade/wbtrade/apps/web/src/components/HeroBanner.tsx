import Link from 'next/link';

export default function HeroBanner() {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
      {/* Main Banner */}
      <div className="lg:col-span-2 relative rounded-2xl overflow-hidden bg-gradient-to-r from-amber-100 to-orange-100 min-h-[300px] lg:min-h-[350px]">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800')] bg-cover bg-center opacity-30"></div>
        <div className="relative p-8 lg:p-12 h-full flex flex-col justify-center">
          <span className="inline-block bg-primary-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-4 w-fit">
            MEGA WYPRZEDAŻ
          </span>
          <h1 className="text-3xl lg:text-5xl font-bold text-secondary-900 mb-3">
            Letnia<br />Promocja
          </h1>
          <p className="text-secondary-600 mb-6 max-w-md">
            Do 70% zniżki na wybrane produkty z mody i elektroniki. Darmowa dostawa dla członków.
          </p>
          <Link 
            href="/products?sale=true"
            className="inline-flex items-center gap-2 bg-white text-secondary-900 font-semibold px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors w-fit shadow-sm"
          >
            Kupuj teraz
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Side Banners */}
      <div className="flex flex-col gap-4">
        {/* Top Side Banner */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-slate-100 to-gray-100 flex-1 min-h-[160px]">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400')] bg-cover bg-right opacity-40"></div>
          <div className="relative p-6 h-full flex flex-col justify-center">
            <h3 className="text-xl font-bold text-secondary-900 mb-1">Nowości Tech</h3>
            <p className="text-sm text-secondary-500">Odkryj przyszłość</p>
          </div>
        </div>

        {/* Bottom Side Banner */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-emerald-50 to-teal-50 flex-1 min-h-[160px]">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400')] bg-cover bg-right opacity-30"></div>
          <div className="relative p-6 h-full flex flex-col justify-center">
            <h3 className="text-xl font-bold text-secondary-900 mb-1">Odmów Dom</h3>
            <p className="text-sm text-secondary-500">Przytulne wnętrza</p>
          </div>
        </div>
      </div>
    </section>
  );
}
