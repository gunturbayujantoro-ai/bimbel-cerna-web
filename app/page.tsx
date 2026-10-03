import Image from "next/image";
import Link from "next/link";

export default function LandingPage() {
  const whatsappUrl = `https://wa.me/628117873878?text=${encodeURIComponent("Halo Bimbel Cerna, saya ingin bertanya dan mendaftar layanan Privat. Mohon informasi pendaftaran dan paket yang tersedia.")}`;

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {/* --- NAVBAR --- */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo Kiri */}
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 md:w-12 md:h-12">
                <Image 
                  src="/logo.png" 
                  alt="Logo Bimbel Cerna" 
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-xl md:text-2xl font-extrabold tracking-tight text-blue-700">
                Bimbel<span className="text-orange-500">Cerna</span>
              </span>
            </div>

            {/* Tombol Kanan */}
            <Link 
              href="/login" 
              className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 transition shadow-md hover:shadow-lg text-sm md:text-base"
            >
              Masuk / Daftar
            </Link>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="pt-32 pb-20 px-4 text-center bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-4xl mx-auto">
          {/* Logo Besar di Tengah */}
          <div className="relative w-32 h-32 md:w-48 md:h-48 mx-auto mb-8 animate-fade-in-up">
            <Image 
              src="/logo.png" 
              alt="Logo Besar" 
              fill
              className="object-contain drop-shadow-xl"
              priority
            />
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
            Membangun Generasi <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-yellow-500">
              Cerdas & Bernalar
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Bimbingan belajar modern dengan fitur <strong>Jurnal Digital</strong> dan <strong>Rekaman Pembelajaran</strong>. Pantau perkembangan anak setiap hari, di mana saja.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a 
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="px-8 py-4 bg-orange-500 text-white font-bold rounded-xl text-lg hover:bg-orange-600 transition shadow-lg hover:shadow-orange-200 transform hover:-translate-y-1"
            >
              Daftar Sekarang
            </a>
            <a 
              href="#fitur" 
              className="px-8 py-4 bg-white text-gray-700 font-bold rounded-xl text-lg border border-gray-200 hover:bg-gray-50 transition"
            >
              Pelajari Dulu
            </a>
          </div>
        </div>
      </section>

      <section id="layanan" className="px-4 py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10 max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-wider text-orange-600">Layanan Bimbel Cerna</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">Belajar dengan cara yang paling nyaman</h2>
            <p className="mt-3 text-gray-600">Pilih layanan yang sesuai dengan kebutuhan dan rutinitas belajar anak.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <article className="flex flex-col border border-orange-200 bg-white p-7 shadow-sm md:p-9">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-orange-600">01 / Belajar di rumah</p>
                  <h3 className="mt-2 text-2xl font-bold text-gray-900">Privat</h3>
                </div>
                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">Tersedia</span>
              </div>
              <p className="mb-8 flex-1 leading-relaxed text-gray-600">
                Tentor datang langsung ke rumah siswa. Materi dan pendampingan belajar dapat disesuaikan dengan kebutuhan anak.
              </p>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center justify-center bg-orange-500 px-5 py-3 text-center font-bold text-white transition hover:bg-orange-600"
              >
                Daftar Sekarang via WhatsApp
              </a>
            </article>

            <article aria-disabled="true" className="flex flex-col border border-gray-200 bg-gray-100 p-7 text-gray-500 md:p-9">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-400">02 / Belajar bersama</p>
                  <h3 className="mt-2 text-2xl font-bold text-gray-500">Bimbel di Tempat Cerna</h3>
                </div>
                <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-bold text-gray-500">Belum aktif</span>
              </div>
              <p className="mb-8 flex-1 leading-relaxed text-gray-500">
                Kegiatan belajar bersama di tempat Bimbel Cerna. Layanan ini sedang disiapkan dan belum menerima pendaftaran.
              </p>
              <button disabled className="min-h-12 cursor-not-allowed bg-gray-300 px-5 py-3 font-bold text-gray-500" type="button">
                Pendaftaran Belum Dibuka
              </button>
            </article>
          </div>
        </div>
      </section>

      {/* --- FITUR UNGGULAN --- */}
      <section id="fitur" className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Kenapa Memilih Bimbel Cerna?</h2>
            <p className="text-gray-500 mt-2">Kombinasi pengajaran berkualitas dan teknologi.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Fitur 1 */}
            <div className="p-8 bg-blue-50 rounded-2xl border border-blue-100 hover:shadow-lg transition">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-3xl mb-6">
                📺
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Rekaman Ulang</h3>
              <p className="text-gray-600">
                Lupa materi tadi siang? Tonton ulang rekaman sesi belajar kapan saja lewat dashboard siswa.
              </p>
            </div>

            {/* Fitur 2 */}
            <div className="p-8 bg-orange-50 rounded-2xl border border-orange-100 hover:shadow-lg transition">
              <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center text-3xl mb-6">
                📝
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Laporan Harian</h3>
              <p className="text-gray-600">
                Orang tua mendapat laporan perkembangan dan catatan khusus dari pengajar setiap kali pertemuan selesai.
              </p>
            </div>

            {/* Fitur 3 */}
            <div className="p-8 bg-green-50 rounded-2xl border border-green-100 hover:shadow-lg transition">
              <div className="w-14 h-14 bg-green-100 text-green-600 rounded-xl flex items-center justify-center text-3xl mb-6">
                🎓
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Sertifikat Kelulusan</h3>
              <p className="text-gray-600">
                Dapatkan sertifikat resmi sebagai bukti penuntasan materi dan kesiapan naik ke jenjang berikutnya.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-10 bg-gray-900 text-white text-center border-t border-gray-800">
        <p className="font-semibold text-lg mb-2">Bimbel Cerna</p>
        <p className="text-gray-400 text-sm">
          Gang Maeng, Talangputri, Plaju, Palembang.<br/>
          &copy; {new Date().getFullYear()} Cerdas & Bernalar. All rights reserved.
        </p>
      </footer>
    </div>
  );
}