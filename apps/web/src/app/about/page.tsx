import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Image from 'next/image';

export const metadata = {
  title: 'O nas - WB Trade',
  description: 'Poznaj historię WB Trade - Twojej zaufanej platformy e-commerce',
};

export default function AboutPage() {
  const stats = [
    { value: 'tysiące', label: 'Zadowolonych klientów' },
    { value: '>20tyś+', label: 'Produktów w ofercie' },
  ];

  const values = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: 'Zaufanie',
      description: 'Budujemy długotrwałe relacje oparte na\u00A0uczciwości i\u00A0transparentności.',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: 'Innowacyjność',
      description: 'Stale rozwijamy naszą platformę, aby zapewnić najlepsze doświadczenie zakupowe.',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: 'Społeczność',
      description: 'Tworzymy przestrzeń, gdzie kupujący mają szeroki wybór produktów.',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Zrównoważony rozwój',
      description: 'Dbamy o\u00A0środowisko i\u00A0promujemy odpowiedzialne zakupy.',
    },
  ];

  return (
    <div className="min-h-screen bg-secondary-50">
      <Header />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20 lg:py-32">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556761175-b413da4baf72?w=1920')] bg-cover bg-center opacity-10"></div>
        <div className="container-custom relative">
          <div className="max-w-3xl">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6">
              Tworzymy przyszłość <span className="text-primary-200">e-commerce</span>
            </h1>
            <p className="text-xl text-primary-100 leading-relaxed">
              WB Trade to&nbsp;więcej niż platforma zakupowa. To&nbsp;społeczność tysięcy użytkowników, 
              którzy każdego dnia ufają nam swoje zakupy online.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="container-custom">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl lg:text-5xl font-bold text-primary-600 mb-2">
                  {stat.value}
                </div>
                <div className="text-secondary-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16 lg:py-24">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-secondary-900 mb-6">
                Nasza historia
              </h2>
              <div className="space-y-4 text-secondary-600 leading-relaxed">
                <p>
                  WB Trade powstało w&nbsp;2025&nbsp;roku z&nbsp;prostej idei – stworzyć miejsce, gdzie każdy 
                  może bezpiecznie i&nbsp;wygodnie kupować online. Zaczęliśmy jako mały startup 
                  z&nbsp;zespołem pięciu osób i&nbsp;marzeniem o&nbsp;zmianie sposobu, w&nbsp;jaki Polacy robią zakupy.
                </p>
                <p>
                  Dziś jesteśmy bardzo szybko rozwijającym się sklepem e-commerce w&nbsp;Polsce. 
                  Na&nbsp;naszej platformie znajdziesz ponad 20&nbsp;000 sprawdzonych produktów .
                </p>
                <p>
                  Sukces zawdzięczamy przede wszystkim naszym klientom i&nbsp;partnerom, którzy 
                  zaufali nam i&nbsp;wspierają nas na&nbsp;każdym kroku. To&nbsp;dla Was nieustannie się rozwijamy 
                  i&nbsp;wprowadzamy innowacje.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl">
                <Image
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=600&fit=crop"
                  alt="Zespół WB Trade"
                  width={600}
                  height={600}
                  className="object-cover w-full h-full"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-primary-500 text-white p-6 rounded-xl shadow-lg">
                <div className="text-3xl font-bold">2025</div>
                <div className="text-primary-100">Rok założenia</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-secondary-900 mb-4">
              Nasze wartości
            </h2>
            <p className="text-secondary-600 max-w-2xl mx-auto">
              Wartości, które nas definiują i którymi kierujemy się każdego dnia.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div key={index} className="bg-secondary-50 rounded-2xl p-6 hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600 mb-4">
                  {value.icon}
                </div>
                <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                  {value.title}
                </h3>
                <p className="text-secondary-600">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-primary-600 to-primary-700">
        <div className="container-custom text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Dołącz do naszej społeczności
          </h2>
          <p className="text-primary-100 mb-8 max-w-2xl mx-auto">
            Zostań częścią WB Trade i&nbsp;odkryj nowy wymiar zakupów online.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/register"
              className="inline-flex items-center justify-center px-8 py-3 bg-white text-primary-600 font-semibold rounded-xl hover:bg-primary-50 transition-colors"
            >
              Załóż konto
            </a>
            <a
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-3 border-2 border-white text-white font-semibold rounded-xl hover:bg-white/10 transition-colors"
            >
              Skontaktuj się z nami
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
