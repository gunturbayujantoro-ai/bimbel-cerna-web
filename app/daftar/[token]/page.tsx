import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { submitRegistration } from '../actions'

type RegistrationPageProps = {
  params: Promise<{ token: string }>
  searchParams: Promise<{ success?: string; error?: string }>
}

export default async function RegistrationPage({ params, searchParams }: RegistrationPageProps) {
  const { token } = await params
  const query = await searchParams
  const supabase = await createClient()
  const { data } = await supabase.rpc('get_public_registration_package', { p_token: token })
  const packageInfo = Array.isArray(data) ? data[0] : null
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })

  if (!packageInfo) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
        <section className="w-full max-w-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-bold uppercase text-orange-600">Bimbel Cerna</p>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">Tautan pendaftaran tidak tersedia</h1>
          <p className="mt-3 text-gray-600">Tautan ini mungkin sudah dinonaktifkan. Silakan hubungi admin untuk mendapatkan tautan baru.</p>
          <Link href="/" className="mt-6 inline-flex bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600">Kembali ke halaman utama</Link>
        </section>
      </main>
    )
  }

  if (query.success === '1') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
        <section className="w-full max-w-lg border border-green-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-bold uppercase text-green-700">Pendaftaran terkirim</p>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">Terima kasih telah mendaftar</h1>
          <p className="mt-3 leading-relaxed text-gray-600">Data calon siswa untuk paket {packageInfo.name} sudah kami terima. Admin Bimbel Cerna akan menghubungi wali siswa.</p>
          <Link href="/" className="mt-6 inline-flex bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600">Kembali ke halaman utama</Link>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-semibold text-orange-700 hover:text-orange-800">Bimbel Cerna</Link>
        <header className="mb-8 mt-6 border-b border-gray-200 pb-6">
          <p className="text-sm font-bold uppercase text-orange-600">Formulir pendaftaran privat</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">Data calon siswa</h1>
          <p className="mt-2 text-gray-600">Lengkapi informasi siswa dan wali. Admin akan menghubungi nomor wali yang dicantumkan.</p>
        </header>

        <section className="mb-8 border-l-4 border-orange-500 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-500">Paket yang dipilih</p>
          <h2 className="mt-1 text-xl font-bold text-gray-900">{packageInfo.name}</h2>
          <p className="mt-1 text-gray-600">{packageInfo.subject} · {packageInfo.sessions} pertemuan per bulan</p>
          {packageInfo.description && <p className="mt-2 text-sm text-gray-600">{packageInfo.description}</p>}
          <p className="mt-3 font-bold text-gray-900">Rp {Number(packageInfo.price).toLocaleString('id-ID')}</p>
        </section>

        {query.error && <p role="alert" className="mb-6 border border-red-200 bg-red-50 p-4 text-sm text-red-700">{query.error}</p>}

        <form action={submitRegistration} className="space-y-8">
          <input type="hidden" name="token" value={token} />
          <fieldset className="border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <legend className="px-2 text-lg font-bold text-gray-900">Pilih jadwal setiap pertemuan</legend>
            <p className="mb-5 text-sm text-gray-600">Pilih {packageInfo.sessions} jadwal pada bulan yang sama. Waktu yang sudah dipesan siswa lain akan ditolak.</p>
            <div className="space-y-4">
              {Array.from({ length: Number(packageInfo.sessions) }, (_, index) => (
                <div key={index} className="grid gap-4 border-t border-gray-100 pt-4 sm:grid-cols-[minmax(110px,0.6fr)_1fr_1fr_1fr] sm:items-end">
                  <p className="font-semibold text-gray-800">Pertemuan {index + 1}</p>
                  <label>
                    <span className="mb-1 block text-sm font-semibold text-gray-700">Tanggal *</span>
                    <input name="scheduleDate" type="date" min={today} required className="w-full border border-gray-300 px-3 py-2.5 outline-none focus:border-orange-500" />
                  </label>
                  <label>
                    <span className="mb-1 block text-sm font-semibold text-gray-700">Mulai *</span>
                    <input name="scheduleStart" type="time" required className="w-full border border-gray-300 px-3 py-2.5 outline-none focus:border-orange-500" />
                  </label>
                  <label>
                    <span className="mb-1 block text-sm font-semibold text-gray-700">Selesai *</span>
                    <input name="scheduleEnd" type="time" required className="w-full border border-gray-300 px-3 py-2.5 outline-none focus:border-orange-500" />
                  </label>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-gray-500">Lokasi belajar menggunakan alamat siswa yang Anda isi di bawah.</p>
          </fieldset>

          <fieldset className="border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <legend className="px-2 text-lg font-bold text-gray-900">Identitas calon siswa</legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-1 block text-sm font-semibold text-gray-700">Nama lengkap siswa *</span>
                <input name="studentName" required maxLength={150} autoComplete="name" className="w-full border border-gray-300 px-3 py-2.5 outline-none focus:border-orange-500" />
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-gray-700">Jenis kelamin *</span>
                <select name="gender" required defaultValue="" className="w-full border border-gray-300 bg-white px-3 py-2.5 outline-none focus:border-orange-500">
                  <option value="" disabled>Pilih jenis kelamin</option>
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-gray-700">Tanggal lahir *</span>
                <input name="birthDate" type="date" required className="w-full border border-gray-300 px-3 py-2.5 outline-none focus:border-orange-500" />
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-gray-700">Sekolah *</span>
                <input name="school" required maxLength={180} autoComplete="organization" className="w-full border border-gray-300 px-3 py-2.5 outline-none focus:border-orange-500" />
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-gray-700">Kelas / jenjang *</span>
                <input name="grade" required maxLength={80} placeholder="Contoh: Kelas 5 SD" className="w-full border border-gray-300 px-3 py-2.5 outline-none focus:border-orange-500" />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1 block text-sm font-semibold text-gray-700">Alamat lengkap siswa *</span>
                <textarea name="address" required maxLength={500} rows={3} autoComplete="street-address" className="w-full border border-gray-300 px-3 py-2.5 outline-none focus:border-orange-500" />
              </label>
            </div>
          </fieldset>

          <fieldset className="border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <legend className="px-2 text-lg font-bold text-gray-900">Identitas wali siswa</legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-sm font-semibold text-gray-700">Nama lengkap wali *</span>
                <input name="guardianName" required maxLength={150} autoComplete="name" className="w-full border border-gray-300 px-3 py-2.5 outline-none focus:border-orange-500" />
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-gray-700">Hubungan dengan siswa *</span>
                <input name="guardianRelation" required maxLength={60} placeholder="Orang tua, wali, dan lainnya" className="w-full border border-gray-300 px-3 py-2.5 outline-none focus:border-orange-500" />
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-gray-700">Nomor WhatsApp wali *</span>
                <input name="guardianPhone" type="tel" required maxLength={30} autoComplete="tel" className="w-full border border-gray-300 px-3 py-2.5 outline-none focus:border-orange-500" />
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-gray-700">Email wali</span>
                <input name="guardianEmail" type="email" maxLength={254} autoComplete="email" className="w-full border border-gray-300 px-3 py-2.5 outline-none focus:border-orange-500" />
              </label>
            </div>
          </fieldset>

          <fieldset className="border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <legend className="px-2 text-lg font-bold text-gray-900">Kebutuhan belajar</legend>
            <div className="space-y-5">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-gray-700">Waktu belajar yang diharapkan</span>
                <input name="preferredSchedule" maxLength={180} placeholder="Contoh: Senin-Jumat setelah pukul 16.00" className="w-full border border-gray-300 px-3 py-2.5 outline-none focus:border-orange-500" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-gray-700">Catatan tambahan</span>
                <textarea name="notes" maxLength={1000} rows={3} className="w-full border border-gray-300 px-3 py-2.5 outline-none focus:border-orange-500" />
              </label>
            </div>
          </fieldset>

          <button type="submit" className="w-full bg-orange-500 px-6 py-3.5 font-bold text-white transition hover:bg-orange-600 sm:w-auto">Kirim pendaftaran</button>
        </form>
      </div>
    </main>
  )
}
