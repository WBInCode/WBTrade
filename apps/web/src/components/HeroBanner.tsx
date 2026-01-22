import Link from 'next/link';

export default function HeroBanner() {
  return (
    <section className="mb-8">
      {/* Main Banner */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-amber-100 to-orange-100 min-h-[300px] lg:min-h-[350px]">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800')] bg-cover bg-center opacity-30"></div>
        <div className="relative p-8 lg:p-12 h-full flex flex-col justify-center">
          <span className="inline-block bg-primary-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-4 w-fit">
            Super Ceny
          </span>
          <h1 className="text-3xl lg:text-5xl font-bold text-secondary-900 mb-3">
            Niskie<br />Ceny
          </h1>
          <p className="text-secondary-600 mb-6 max-w-md">
            Najniższe ceny na rynku na tysiące produktów. Sprawdź nasze oferty i oszczędzaj więcej przy każdym zakupie.
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
    </section>
  );
}
