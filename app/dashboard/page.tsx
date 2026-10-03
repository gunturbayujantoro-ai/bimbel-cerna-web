import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { activateStudent, createPrivatePackage, createRegistrationLink, createStudentAccount, rescheduleStudentSession, signOut } from './actions'

type DashboardPageProps = {
  searchParams: Promise<{ adminMessage?: string; newStudentId?: string; scheduleLinked?: string; scheduleMessage?: string; month?: string; view?: string }>
}

function formatLearningDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function getDaysRemaining(endDate: string, today: string) {
  const endTimestamp = Date.parse(`${endDate}T00:00:00.000Z`)
  const todayTimestamp = Date.parse(`${today}T00:00:00.000Z`)
  return Math.round((endTimestamp - todayTimestamp) / 86400000)
}

function toJakartaInputValue(dateTime: string) {
  return new Date(new Date(dateTime).getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 16)
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createClient()

  // 1. Cek User Login
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return redirect('/login')
  }

  // 2. Ambil Data Profil Siswa
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'student') {
    const { data: canAccess, error: accessError } = await supabase.rpc('refresh_student_access')
    if (accessError || !canAccess) {
      await supabase.auth.signOut()
      redirect('/login?message=Masa%20belajar%20belum%20aktif%20atau%20sudah%20berakhir.%20Hubungi%20admin.')
    }
  }

  if (profile?.role === 'admin') {
    const query = await searchParams
    const dashboardView = ['overview', 'students', 'packages', 'links'].includes(query.view ?? '') ? query.view! : 'overview'
    const navigation = [
      { id: 'overview', label: 'Ringkasan', icon: '⌂' },
      { id: 'students', label: 'Registrasi siswa', icon: '♙' },
      { id: 'packages', label: 'Buat paket privat', icon: '▤' },
      { id: 'links', label: 'Tautan pendaftaran', icon: '↗' },
    ]
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })
    const requestedMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(query.month ?? '') ? query.month! : today.slice(0, 7)
    const [calendarYear, calendarMonth] = requestedMonth.split('-').map(Number)
    const monthStart = new Date(Date.UTC(calendarYear, calendarMonth - 1, 1) - 7 * 60 * 60 * 1000).toISOString()
    const monthEnd = new Date(Date.UTC(calendarYear, calendarMonth, 1) - 7 * 60 * 60 * 1000).toISOString()
    const nextMonthDate = new Date(Date.UTC(calendarYear, calendarMonth, 1))
    const previousMonthDate = new Date(Date.UTC(calendarYear, calendarMonth - 2, 1))
    const nextMonth = nextMonthDate.toISOString().slice(0, 7)
    const previousMonth = previousMonthDate.toISOString().slice(0, 7)
    const monthTitle = new Date(Date.UTC(calendarYear, calendarMonth - 1, 1)).toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    const firstDayOfWeek = new Date(Date.UTC(calendarYear, calendarMonth - 1, 1)).getUTCDay()
    const daysInMonth = new Date(Date.UTC(calendarYear, calendarMonth, 0)).getUTCDate()
    const calendarDays: Array<number | null> = Array.from({ length: firstDayOfWeek }, () => null)
    calendarDays.push(...Array.from({ length: daysInMonth }, (_, index) => index + 1))
    while (calendarDays.length % 7 !== 0) calendarDays.push(null)

    const [{ data: students }, { data: packages }, { data: links }, { data: registrations }, { data: schedules }, requestHeaders] = await Promise.all([
      supabase.from('profiles').select('id, student_id, full_name, email, school, is_active, active_from, active_until').eq('role', 'student').order('full_name'),
      supabase.from('private_packages').select('*').order('created_at', { ascending: false }),
      supabase.from('registration_links').select('*').order('created_at', { ascending: false }),
      supabase.from('public_registrations').select('*').order('created_at', { ascending: false }),
      supabase.from('student_schedules').select('*').eq('status', 'scheduled').gte('starts_at', monthStart).lt('starts_at', monthEnd).order('starts_at'),
      headers(),
    ])
    const registrationsById = new Map((registrations ?? []).map((registration) => [registration.id, registration]))
    const schedulesByDate = new Map<string, typeof schedules>()
    for (const schedule of schedules ?? []) {
      const day = new Date(schedule.starts_at).toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })
      const daySchedules = schedulesByDate.get(day) ?? []
      daySchedules.push(schedule)
      schedulesByDate.set(day, daySchedules)
    }
    const renewalReminders = (students ?? [])
      .filter((student) => student.active_from && student.active_until && student.active_from <= today && (student.is_active || student.active_until < today) && getDaysRemaining(student.active_until, today) <= 10)
      .map((student) => ({ ...student, daysRemaining: getDaysRemaining(student.active_until, today) }))
    const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host')
    const protocol = requestHeaders.get('x-forwarded-proto') ?? 'https'
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? (host ? `${protocol}://${host}` : '')).replace(/\/$/, '')
    const packageById = new Map((packages ?? []).map((item) => [item.id, item]))

    return (
      <div className="min-h-screen bg-slate-50">
        <nav className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
            <div>
              <p className="text-sm font-bold text-orange-600">Bimbel Cerna</p>
              <p className="text-base font-bold text-gray-900 sm:text-lg">Panel Admin</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="hidden items-center gap-1 md:flex">
                {navigation.map((item) => <Link key={item.id} href={`/dashboard?view=${item.id}`} className={`px-3 py-2 text-sm font-semibold ${dashboardView === item.id ? 'text-orange-700' : 'text-gray-600 hover:text-gray-900'}`}>{item.label}</Link>)}
              </div>
              <form action={signOut}>
                <button className="text-sm font-semibold text-gray-600 hover:text-red-600">Keluar</button>
              </form>
            </div>
          </div>
        </nav>

        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 pb-24 sm:space-y-8 sm:px-6 sm:py-8 md:pb-8">
          <header className="border-b border-gray-200 pb-4 sm:border-0 sm:pb-0">
            <p className="text-sm font-semibold text-gray-500">Halo, {profile.full_name || user.email}</p>
            <h1 className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">{{ overview: 'Ringkasan dashboard', students: 'Registrasi siswa', packages: 'Buat paket privat', links: 'Tautan pendaftaran' }[dashboardView]}</h1>
          </header>

          {query.adminMessage && <p role="status" className="border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">{query.adminMessage}</p>}
          {query.newStudentId && <p role="status" className="border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">ID siswa baru: <strong>{query.newStudentId}</strong></p>}
          {query.scheduleLinked && <p role="status" className="border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">Jadwal dari pendaftaran publik sudah terhubung ke akun siswa.</p>}

          {dashboardView === 'overview' && <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4" aria-label="Ringkasan">
            {[
              { label: 'Akun siswa', value: students?.length ?? 0 },
              { label: 'Pendaftar masuk', value: registrations?.length ?? 0 },
              { label: 'Paket privat', value: packages?.length ?? 0 },
              { label: 'Tautan aktif', value: links?.filter((link) => link.is_active).length ?? 0 },
            ].map((item) => <article key={item.label} className="border border-gray-200 bg-white p-4 sm:p-5"><p className="text-xs font-semibold text-gray-500 sm:text-sm">{item.label}</p><p className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">{item.value}</p></article>)}
          </section>

          <section aria-labelledby="renewal-reminders" className="border border-orange-200 bg-orange-50 px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="renewal-reminders" className="font-bold text-gray-900">Pengingat perpanjangan</h2>
              <span className="text-sm font-semibold text-orange-800">{renewalReminders.length} siswa perlu ditindaklanjuti</span>
            </div>
            {renewalReminders.length ? (
              <ul className="mt-3 divide-y divide-orange-200">
                {renewalReminders.map((student) => (
                  <li key={student.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-semibold text-gray-900">{student.full_name} <span className="font-mono text-sm text-gray-500">· {student.student_id}</span></p>
                      <p className="mt-1 text-sm text-gray-600">Masa aktif berakhir {formatLearningDate(student.active_until)}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-sm font-bold ${student.daysRemaining <= 3 ? 'text-red-700' : 'text-orange-800'}`}>
                        {student.daysRemaining < 0 ? `Lewat ${Math.abs(student.daysRemaining)} hari` : student.daysRemaining === 0 ? 'Habis hari ini' : `Sisa ${student.daysRemaining} hari`}
                      </span>
                      <a href="#student-management" className="text-sm font-semibold text-blue-700 underline">Proses perpanjangan</a>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-2 text-sm text-gray-600">Belum ada siswa yang masa belajarnya berakhir dalam 10 hari.</p>}
          </section>

          <section className="border border-gray-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Kalender belajar</h2>
                <p className="mt-1 text-sm text-gray-600">Jadwal privat seluruh siswa, waktu Palembang.</p>
              </div>
              <div className="flex items-center gap-2">
                <Link aria-label="Bulan sebelumnya" href={`/dashboard?view=overview&month=${previousMonth}`} className="grid size-9 place-items-center border border-gray-300 text-lg font-semibold text-gray-700 hover:bg-gray-50">‹</Link>
                <span className="min-w-28 text-center text-sm font-bold capitalize text-gray-900 sm:min-w-32 sm:text-base">{monthTitle}</span>
                <Link aria-label="Bulan berikutnya" href={`/dashboard?view=overview&month=${nextMonth}`} className="grid size-9 place-items-center border border-gray-300 text-lg font-semibold text-gray-700 hover:bg-gray-50">›</Link>
              </div>
            </div>
            <div className="grid grid-cols-7">
                {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day) => <div key={day} className="border-b border-r border-gray-200 bg-gray-50 py-2 text-center text-[10px] font-bold uppercase text-gray-500 sm:px-3 sm:text-xs">{day}</div>)}
                {calendarDays.map((day, index) => {
                  const dateKey = day ? `${requestedMonth}-${String(day).padStart(2, '0')}` : ''
                  const daySchedules = dateKey ? schedulesByDate.get(dateKey) ?? [] : []
                  return (
                    <div key={`${dateKey || 'empty'}-${index}`} className={`min-h-12 border-b border-r border-gray-200 p-1 sm:min-h-28 sm:p-2 ${day ? 'bg-white' : 'bg-gray-50'}`}>
                      {day && <>
                        <p className="mb-1 text-[11px] font-bold text-gray-700 sm:mb-2 sm:text-sm">{day}</p>
                        <div className="space-y-1 sm:space-y-2">
                          {daySchedules.slice(0, 1).map((schedule) => {
                            const registration = registrationsById.get(schedule.registration_id)
                            const startTime = new Date(schedule.starts_at).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
                            return (
                              <article key={schedule.id} className="border-l-2 border-orange-500 bg-orange-50 px-1 py-0.5 text-[9px] leading-tight sm:p-2 sm:text-xs">
                                <p className="font-bold text-gray-900">{startTime}</p>
                                <p className="hidden truncate font-semibold text-gray-800 sm:block">{registration?.student_name ?? 'Siswa'}</p>
                                <p className="hidden break-words text-gray-600 sm:block">{schedule.location}</p>
                              </article>
                            )
                          })}
                          {daySchedules.length > 1 && <p className="text-[9px] font-semibold text-orange-800 sm:hidden">+{daySchedules.length - 1}</p>}
                          {daySchedules.slice(1).map((schedule) => {
                            const registration = registrationsById.get(schedule.registration_id)
                            const startTime = new Date(schedule.starts_at).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
                            const endTime = new Date(schedule.ends_at).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
                            return <article key={schedule.id} className="hidden border-l-2 border-orange-500 bg-orange-50 p-2 text-xs sm:block"><p className="font-bold text-gray-900">{startTime}–{endTime}</p><p className="mt-0.5 font-semibold text-gray-800">{registration?.student_name ?? 'Siswa'}</p><p className="mt-0.5 break-words text-gray-600">{schedule.location}</p></article>
                          })}
                        </div>
                      </>}
                    </div>
                  )
                })}
            </div>
          </section>
          </>}

          {dashboardView === 'students' && <>
          <section className="border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-bold text-gray-900">Registrasi akun siswa</h2>
            <p className="mt-1 text-sm text-gray-600">Buat akun login untuk siswa. Sistem membuat ID siswa unik secara otomatis.</p>
            <form action={createStudentAccount} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <label className="text-sm font-semibold text-gray-700">Nama lengkap
                <input name="fullName" required maxLength={150} autoComplete="name" className="mt-1 w-full border border-gray-300 px-3 py-2.5 font-normal outline-none focus:border-orange-500" />
              </label>
              <label className="text-sm font-semibold text-gray-700">Email login
                <input name="email" type="email" required maxLength={254} autoComplete="email" className="mt-1 w-full border border-gray-300 px-3 py-2.5 font-normal outline-none focus:border-orange-500" />
              </label>
              <label className="text-sm font-semibold text-gray-700">Password awal
                <input name="password" type="password" required minLength={8} autoComplete="new-password" className="mt-1 w-full border border-gray-300 px-3 py-2.5 font-normal outline-none focus:border-orange-500" />
              </label>
              <label className="text-sm font-semibold text-gray-700">Sekolah
                <input name="school" required maxLength={180} className="mt-1 w-full border border-gray-300 px-3 py-2.5 font-normal outline-none focus:border-orange-500" />
              </label>
              <label className="text-sm font-semibold text-gray-700">Pendaftaran publik
                <select name="registrationId" defaultValue="" className="mt-1 w-full border border-gray-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-orange-500">
                  <option value="">Tidak ada pendaftaran</option>
                  {(registrations ?? []).filter((registration) => !registration.student_profile_id).map((registration) => <option key={registration.id} value={registration.id}>{registration.student_name} · {registration.guardian_name}</option>)}
                </select>
              </label>
              <button className="bg-gray-900 px-5 py-3 font-semibold text-white hover:bg-gray-700 sm:col-span-2 lg:col-span-5">Buat akun siswa</button>
            </form>
          </section>

          <section id="student-management" className="border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-6 py-5">
              <h2 className="text-lg font-bold text-gray-900">Siswa dan masa aktif belajar</h2>
              <p className="mt-1 text-sm text-gray-600">Tentukan tanggal mulai dan durasi pembayaran untuk mengaktifkan akses belajar.</p>
            </div>
            {students?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr><th className="px-6 py-3">Siswa</th><th className="px-6 py-3">ID siswa</th><th className="px-6 py-3">Status / periode</th><th className="px-6 py-3">Aktifkan / perpanjang</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {students.map((student) => {
                      const active = student.is_active && student.active_from && student.active_until && today >= student.active_from && today <= student.active_until
                      const expired = student.active_until && student.active_until < today
                      const status = expired
                        ? 'Nonaktif'
                        : !student.is_active || !student.active_from || !student.active_until
                        ? 'Belum aktif'
                        : today < student.active_from ? 'Akan aktif' : today > student.active_until ? 'Berakhir' : 'Aktif'
                      const nextStart = student.active_until && student.active_until >= today
                        ? new Date(new Date(`${student.active_until}T00:00:00.000Z`).getTime() + 86400000).toISOString().slice(0, 10)
                        : today

                      return (
                        <tr key={student.id} className="align-top">
                          <td className="px-6 py-4"><p className="font-semibold text-gray-900">{student.full_name}</p><p className="mt-1 text-gray-500">{student.email}</p><p className="mt-1 text-gray-500">{student.school}</p></td>
                          <td className="px-6 py-4 font-mono font-semibold text-gray-800">{student.student_id ?? 'ID belum tersedia'}</td>
                          <td className="px-6 py-4"><span className={`font-semibold ${active ? 'text-green-700' : status === 'Nonaktif' || status === 'Berakhir' ? 'text-red-700' : 'text-gray-500'}`}>{status}</span>{student.active_from && student.active_until && <p className="mt-1 whitespace-nowrap text-gray-600">{formatLearningDate(student.active_from)} – {formatLearningDate(student.active_until)}</p>}</td>
                          <td className="px-6 py-4">
                            <form action={activateStudent} className="flex items-end gap-2">
                              <input type="hidden" name="studentId" value={student.student_id ?? ''} />
                              <label className="text-xs font-semibold text-gray-600">Mulai
                                <input name="activeFrom" type="date" required defaultValue={nextStart} className="mt-1 block border border-gray-300 px-2 py-2 text-sm font-normal" />
                              </label>
                              <label className="text-xs font-semibold text-gray-600">Durasi
                                <select name="months" defaultValue="1" className="mt-1 block border border-gray-300 bg-white px-2 py-2 text-sm font-normal">
                                  <option value="1">1 bulan</option><option value="2">2 bulan</option><option value="3">3 bulan</option><option value="6">6 bulan</option><option value="12">12 bulan</option>
                                </select>
                              </label>
                              <label className="flex items-center gap-1.5 pb-2 text-xs font-semibold text-gray-600"><input name="paymentReceived" type="checkbox" required className="accent-orange-600" />Pembayaran diterima</label>
                              <button disabled={!student.student_id} className="bg-orange-500 px-3 py-2 font-semibold text-white hover:bg-orange-600 disabled:bg-gray-300">Konfirmasi</button>
                            </form>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : <p className="px-6 py-10 text-center text-sm text-gray-500">Belum ada akun siswa.</p>}
          </section>
          </>}

          {dashboardView === 'packages' && <section className="max-w-2xl border border-gray-200 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-bold text-gray-900">Buat paket privat</h2>
              <p className="mt-1 text-sm text-gray-600">Paket akan tersedia untuk dipilih saat membuat tautan pendaftaran.</p>
              <form action={createPrivatePackage} className="mt-5 space-y-4">
                <label className="block text-sm font-semibold text-gray-700">Nama paket
                  <input name="name" required maxLength={120} className="mt-1 w-full border border-gray-300 px-3 py-2.5 font-normal outline-none focus:border-orange-500" placeholder="Privat Matematika SD" />
                </label>
                <label className="block text-sm font-semibold text-gray-700">Mata pelajaran
                  <input name="subject" required maxLength={100} className="mt-1 w-full border border-gray-300 px-3 py-2.5 font-normal outline-none focus:border-orange-500" placeholder="Matematika" />
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="block text-sm font-semibold text-gray-700">Harga (Rp)
                    <input name="price" type="number" min="0" step="1000" required className="mt-1 w-full border border-gray-300 px-3 py-2.5 font-normal outline-none focus:border-orange-500" placeholder="500000" />
                  </label>
                  <label className="block text-sm font-semibold text-gray-700">Pertemuan per bulan
                    <input name="sessions" type="number" min="1" step="1" required className="mt-1 w-full border border-gray-300 px-3 py-2.5 font-normal outline-none focus:border-orange-500" placeholder="8" />
                  </label>
                </div>
                <label className="block text-sm font-semibold text-gray-700">Deskripsi
                  <textarea name="description" maxLength={500} rows={3} className="mt-1 w-full border border-gray-300 px-3 py-2.5 font-normal outline-none focus:border-orange-500" placeholder="Durasi dan cakupan belajar" />
                </label>
                <button className="w-full bg-gray-900 px-4 py-3 font-semibold text-white hover:bg-gray-700">Simpan paket</button>
              </form>
          </section>}

          {dashboardView === 'links' && <section className="border border-gray-200 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-bold text-gray-900">Buat tautan pendaftaran</h2>
              <p className="mt-1 text-sm text-gray-600">Setiap tautan terhubung ke satu paket dan bisa dibagikan ke calon siswa.</p>
              <form action={createRegistrationLink} className="mt-5 flex flex-col gap-3 sm:flex-row">
                <label className="flex-1 text-sm font-semibold text-gray-700">Pilih paket
                  <select name="packageId" required defaultValue="" className="mt-1 w-full border border-gray-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-orange-500">
                    <option value="" disabled>Pilih paket privat</option>
                    {(packages ?? []).filter((item) => item.is_active).map((item) => <option key={item.id} value={item.id}>{item.name} · Rp {Number(item.price).toLocaleString('id-ID')}</option>)}
                  </select>
                </label>
                <button disabled={!packages?.some((item) => item.is_active)} className="self-end bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300">Buat tautan</button>
              </form>

              <div className="mt-8 border-t border-gray-200 pt-5">
                <h3 className="font-bold text-gray-900">Tautan pendaftaran</h3>
                {links?.length ? (
                  <ul className="mt-3 divide-y divide-gray-100">
                    {links.map((link) => {
                      const linkedPackage = packageById.get(link.package_id)
                      const url = `${siteUrl}/daftar/${link.token}`
                      return (
                        <li key={link.id} className="py-3">
                          <p className="text-sm font-semibold text-gray-800">{linkedPackage?.name ?? 'Paket tidak ditemukan'} <span className={link.is_active ? 'text-green-700' : 'text-gray-500'}>· {link.is_active ? 'Aktif' : 'Nonaktif'}</span></p>
                          <a href={url} className="mt-1 block break-all text-sm text-blue-700 underline" target="_blank" rel="noreferrer">{url}</a>
                        </li>
                      )
                    })}
                  </ul>
                ) : <p className="mt-3 text-sm text-gray-500">Belum ada tautan. Buat tautan setelah menambahkan paket.</p>}
              </div>
          </section>
          }

          {dashboardView === 'students' &&
          <section className="border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-6 py-5">
              <h2 className="text-lg font-bold text-gray-900">Pendaftar masuk</h2>
              <p className="mt-1 text-sm text-gray-600">Data identitas yang dikirim melalui tautan publik.</p>
            </div>
            {registrations?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr><th className="px-6 py-3">Calon siswa</th><th className="px-6 py-3">Paket</th><th className="px-6 py-3">Wali</th><th className="px-6 py-3">Sekolah / kelas</th><th className="px-6 py-3">Diterima</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {registrations.map((registration) => (
                      <tr key={registration.id} className="align-top">
                        <td className="px-6 py-4"><p className="font-semibold text-gray-900">{registration.student_name}</p><p className="mt-1 text-gray-500">{registration.gender} · {registration.birth_date}</p><p className="mt-1 max-w-xs text-gray-500">{registration.address}</p></td>
                        <td className="px-6 py-4">{packageById.get(registration.package_id)?.name ?? 'Paket dihapus'}</td>
                        <td className="px-6 py-4"><p className="font-medium text-gray-800">{registration.guardian_name} ({registration.guardian_relation})</p><a className="mt-1 block text-blue-700" href={`https://wa.me/${String(registration.guardian_phone).replace(/\D/g, '')}`} target="_blank" rel="noreferrer">{registration.guardian_phone}</a>{registration.guardian_email && <p className="mt-1 text-gray-500">{registration.guardian_email}</p>}</td>
                        <td className="px-6 py-4">{registration.school}<p className="mt-1 text-gray-500">{registration.grade}</p>{registration.preferred_schedule && <p className="mt-1 text-gray-500">Jadwal: {registration.preferred_schedule}</p>}{registration.notes && <p className="mt-1 max-w-xs whitespace-pre-wrap text-gray-500">Catatan: {registration.notes}</p>}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{new Date(registration.created_at).toLocaleDateString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="px-6 py-10 text-center text-sm text-gray-500">Belum ada pendaftaran yang masuk.</p>}
          </section>
          }
        </main>
        <nav aria-label="Menu admin" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(15,23,42,0.08)] md:hidden">
          {navigation.map((item) => <Link key={item.id} href={`/dashboard?view=${item.id}`} aria-current={dashboardView === item.id ? 'page' : undefined} className={`flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-center ${dashboardView === item.id ? 'text-orange-700' : 'text-gray-500'}`}><span aria-hidden="true" className="text-lg leading-none">{item.icon}</span><span className="text-[10px] font-semibold leading-tight">{item.label}</span></Link>)}
        </nav>
      </div>
    )
  }

  // 3. Ambil Data Jurnal (Sesi Belajar)
  // Mengambil data dari tabel 'learning_sessions', diurutkan dari yang terbaru
  const { data: sessions } = await supabase
    .from('learning_sessions')
    .select('*')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })
  const { data: schedules } = await supabase
    .from('student_schedules')
    .select('*')
    .eq('student_profile_id', user.id)
    .eq('status', 'scheduled')
    .order('starts_at')
  const query = await searchParams

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })
  const hasLearningPeriod = Boolean(profile?.is_active && profile.active_from && profile.active_until)
  const isCurrentlyActive = Boolean(hasLearningPeriod && today >= profile.active_from && today <= profile.active_until)
  const learningStatus = !hasLearningPeriod
    ? 'Belum aktif'
    : today < profile.active_from
      ? 'Akan aktif'
      : today > profile.active_until
        ? 'Masa aktif berakhir'
        : 'Aktif'
    const daysRemaining = hasLearningPeriod ? getDaysRemaining(profile.active_until, today) : null
    const showRenewalReminder = Boolean(hasLearningPeriod && profile.active_from <= today && daysRemaining !== null && daysRemaining <= 10)
    const renewalText = daysRemaining !== null && daysRemaining < 0
      ? `Masa belajar Anda berakhir ${Math.abs(daysRemaining)} hari lalu.`
      : daysRemaining === 0
        ? 'Masa belajar Anda berakhir hari ini.'
        : `Masa belajar Anda akan berakhir dalam ${daysRemaining} hari.`
    const renewalMessage = encodeURIComponent(`Halo Bimbel Cerna, saya ${profile?.full_name || 'siswa'} (ID ${profile?.student_id || '-'}) ingin menanyakan perpanjangan masa belajar.`)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* --- NAVBAR SEDERHANA --- */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="font-bold text-xl text-indigo-600">Bimbel Cerna</div>
          <form action={signOut}>
            <button className="text-sm text-gray-500 hover:text-red-600 font-medium">
              Keluar (Logout)
            </button>
          </form>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {query.scheduleMessage && <p role="status" className="mb-6 border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">{query.scheduleMessage}</p>}

        {showRenewalReminder && (
          <section role="status" className="mb-6 border border-orange-200 bg-orange-50 p-5">
            <p className="text-sm font-bold uppercase text-orange-800">Pengingat perpanjangan</p>
            <h2 className="mt-1 text-lg font-bold text-gray-900">{renewalText}</h2>
            <p className="mt-2 text-sm text-gray-700">Hubungi admin untuk pembayaran dan perpanjangan masa belajar.</p>
            <a href={`https://wa.me/628117873878?text=${renewalMessage}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex bg-orange-500 px-4 py-2.5 font-semibold text-white hover:bg-orange-600">Hubungi admin via WhatsApp</a>
          </section>
        )}
        
        {/* --- KARTU IDENTITAS --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 flex flex-col md:flex-row items-center gap-6">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-2xl">
            🎓
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl font-bold text-gray-900">
              Halo, {profile?.full_name || 'Siswa'}!
            </h1>
            <p className="text-gray-500">
              {profile?.school || 'Belum ada data sekolah'} • {profile?.role === 'student' ? 'Siswa' : 'Tamu'}
            </p>
            {profile?.student_id && <p className="mt-1 text-sm font-semibold text-gray-700">ID siswa: {profile.student_id}</p>}
            <div className="mt-3 border-t border-gray-100 pt-3">
              <p className="text-xs font-semibold uppercase text-gray-500">Masa aktif belajar</p>
              {profile?.active_from && profile?.active_until ? (
                <p className="mt-1 font-semibold text-gray-900">{formatLearningDate(profile.active_from)} s.d. {formatLearningDate(profile.active_until)}</p>
              ) : <p className="mt-1 text-sm text-gray-500">Belum ada periode belajar yang ditetapkan.</p>}
            </div>
          </div>
          <div className={`px-4 py-2 text-sm font-semibold ${isCurrentlyActive ? 'border border-green-100 bg-green-50 text-green-700' : 'border border-gray-200 bg-gray-100 text-gray-600'}`}>
            Status: {learningStatus}
          </div>
        </div>

        <section className="mb-10 border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-6 py-5">
            <h2 className="text-lg font-bold text-gray-900">Jadwal belajar</h2>
            <p className="mt-1 text-sm text-gray-600">Jadwal privat dan alamat belajar Anda.</p>
          </div>
          {schedules?.length ? (
            <ul className="divide-y divide-gray-100">
              {schedules.map((schedule) => {
                const canReschedule = new Date(schedule.starts_at).getTime() - Date.now() >= 24 * 60 * 60 * 1000
                return (
                  <li key={schedule.id} className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-gray-900">{new Date(schedule.starts_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        <p className="mt-1 text-sm font-semibold text-orange-700">{new Date(schedule.starts_at).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}–{new Date(schedule.ends_at).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}</p>
                        <p className="mt-1 text-sm text-gray-600">{schedule.location}</p>
                      </div>
                      <span className={`text-xs font-bold ${canReschedule ? 'text-green-700' : 'text-gray-500'}`}>{canReschedule ? 'Reschedule tersedia' : 'Reschedule ditutup (< 24 jam)'}</span>
                    </div>
                    <form action={rescheduleStudentSession} className="mt-4 flex flex-wrap items-end gap-3 border-t border-gray-100 pt-4">
                      <input type="hidden" name="scheduleId" value={schedule.id} />
                      <label className="text-xs font-semibold text-gray-600">Tanggal dan jam baru
                        <input name="startLocal" type="datetime-local" required disabled={!canReschedule} defaultValue={toJakartaInputValue(schedule.starts_at)} className="mt-1 block border border-gray-300 px-2 py-2 text-sm font-normal disabled:bg-gray-100" />
                      </label>
                      <label className="text-xs font-semibold text-gray-600">Selesai
                        <input name="endLocal" type="datetime-local" required disabled={!canReschedule} defaultValue={toJakartaInputValue(schedule.ends_at)} className="mt-1 block border border-gray-300 px-2 py-2 text-sm font-normal disabled:bg-gray-100" />
                      </label>
                      <button type="submit" disabled={!canReschedule} className="bg-orange-500 px-4 py-2.5 font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300">Ubah jadwal</button>
                    </form>
                  </li>
                )
              })}
            </ul>
          ) : <p className="px-6 py-10 text-center text-sm text-gray-500">Belum ada jadwal terhubung ke akun ini.</p>}
        </section>

        {/* --- SECTION JURNAL BELAJAR --- */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            📚 Jurnal Belajarku
          </h2>

          {/* Logika: Jika belum ada sesi, tampilkan pesan kosong */}
          {sessions && sessions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500">Belum ada catatan pertemuan.</p>
              <p className="text-sm text-gray-400 mt-1">Sesi belajar kamu akan muncul di sini setelah dimulai.</p>
            </div>
          ) : (
            // Jika ada sesi, tampilkan list kartu (Timeline)
            <div className="space-y-6">
              {sessions?.map((session) => (
                <div key={session.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{session.title}</h3>
                        <p className="text-sm text-gray-500">
                          {new Date(session.created_at).toLocaleDateString('id-ID', {
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                          })}
                        </p>
                      </div>
                      {session.is_completed && (
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                          Selesai
                        </span>
                      )}
                    </div>
                    
                    {/* Feedback Guru */}
                    <div className="bg-yellow-50 p-4 rounded-lg mb-4 border border-yellow-100">
                      <p className="text-sm text-yellow-800 font-medium mb-1">📝 Catatan Pengajar:</p>
                      <p className="text-gray-700 text-sm italic">"{session.feedback}"</p>
                    </div>

                    {/* Tombol Tonton Video (Jika ada link) */}
                    {session.video_url && (
                       <a 
                         href={session.video_url} 
                         target="_blank" 
                         rel="noreferrer"
                         className="inline-flex items-center justify-center w-full px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
                       >
                         📺 Tonton Rekaman Belajar
                       </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}