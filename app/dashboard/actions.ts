'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'

function redirectAdminView(view: 'students' | 'packages' | 'links', message: string): never {
  redirect(`/dashboard?view=${view}&adminMessage=${encodeURIComponent(message)}`)
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')
  return { supabase, user }
}

async function requireActiveStudent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'student') redirect('/dashboard')

  const { data: canAccess, error } = await supabase.rpc('refresh_student_access')
  if (error || !canAccess) {
    await supabase.auth.signOut()
    redirect('/login?message=Masa%20belajar%20sudah%20berakhir.%20Hubungi%20admin.')
  }

  return { supabase, user }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return redirect('/login')
}

export async function createPrivatePackage(formData: FormData) {
  const { supabase } = await requireAdmin()
  const name = String(formData.get('name') ?? '').trim()
  const subject = String(formData.get('subject') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const rawPrice = String(formData.get('price') ?? '').trim()
  const rawSessions = String(formData.get('sessions') ?? '').trim()
  const price = Number(rawPrice)
  const sessions = Number(rawSessions)

  if (!name || !subject || !rawPrice || !rawSessions || !Number.isFinite(price) || price < 0 || !Number.isInteger(sessions) || sessions < 1) {
    redirectAdminView('packages', 'Data paket belum valid')
  }

  const { error } = await supabase.from('private_packages').insert({
    name,
    subject,
    description: description || null,
    price,
    sessions,
  })

  if (error) redirectAdminView('packages', error.message)
  redirectAdminView('packages', 'Paket berhasil ditambahkan')
}

export async function createRegistrationLink(formData: FormData) {
  const { supabase, user } = await requireAdmin()
  const packageId = String(formData.get('packageId') ?? '')
  const token = crypto.randomUUID()

  const { error } = await supabase.from('registration_links').insert({
    package_id: packageId,
    token,
    created_by: user.id,
  })

  if (error) redirectAdminView('links', error.message)
  redirectAdminView('links', 'Tautan pendaftaran berhasil dibuat')
}

export async function createStudentAccount(formData: FormData) {
  await requireAdmin()
  const fullName = String(formData.get('fullName') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  const school = String(formData.get('school') ?? '').trim()
  const registrationId = String(formData.get('registrationId') ?? '').trim()

  if (!fullName || fullName.length > 150 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 254 || password.length < 8 || !school || school.length > 180) {
    redirectAdminView('students', 'Data akun tidak valid. Password minimal 8 karakter.')
  }

  let adminClient
  try {
    adminClient = createAdminClient()
  } catch {
    redirectAdminView('students', 'SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi')
  }

  if (registrationId) {
    const { data: registration, error: registrationError } = await adminClient
      .from('public_registrations')
      .select('id, student_profile_id')
      .eq('id', registrationId)
      .single()

    if (registrationError || !registration || registration.student_profile_id) {
      redirectAdminView('students', 'Pendaftaran sudah terhubung atau tidak ditemukan')
    }
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, school },
  })

  if (error || !data.user) {
    redirectAdminView('students', error?.message ?? 'Akun siswa gagal dibuat')
  }

  const { error: profileError } = await adminClient.from('profiles').upsert({
    id: data.user.id,
    full_name: fullName,
    email,
    school,
    role: 'student',
    is_active: false,
    active_from: null,
    active_until: null,
  }, { onConflict: 'id' })

  const { data: profile, error: lookupError } = await adminClient
    .from('profiles')
    .select('student_id')
    .eq('id', data.user.id)
    .single()

  if (profileError || lookupError || !profile?.student_id) {
    await adminClient.auth.admin.deleteUser(data.user.id)
    redirectAdminView('students', 'Profil gagal dibuat. Pastikan SQL ID siswa sudah dijalankan.')
  }

  if (registrationId) {
    const { data: linkedRegistration, error: linkError } = await adminClient
      .from('public_registrations')
      .update({ student_profile_id: data.user.id })
      .eq('id', registrationId)
      .is('student_profile_id', null)
      .select('id')
      .single()

    if (linkError || !linkedRegistration) {
      await adminClient.auth.admin.deleteUser(data.user.id)
      redirectAdminView('students', 'Pendaftaran gagal dihubungkan ke akun siswa')
    }

    const { error: scheduleError } = await adminClient
      .from('student_schedules')
      .update({ student_profile_id: data.user.id })
      .eq('registration_id', registrationId)

    if (scheduleError) {
      await adminClient.from('public_registrations').update({ student_profile_id: null }).eq('id', registrationId)
      await adminClient.auth.admin.deleteUser(data.user.id)
      redirectAdminView('students', 'Jadwal gagal dihubungkan ke akun siswa')
    }
  }

  redirect(`/dashboard?view=students&adminMessage=${encodeURIComponent('Akun siswa berhasil dibuat')}&newStudentId=${encodeURIComponent(profile.student_id)}${registrationId ? '&scheduleLinked=1' : ''}`)
}

export async function activateStudent(formData: FormData) {
  const { supabase } = await requireAdmin()
  const studentId = String(formData.get('studentId') ?? '').trim()
  const activeFrom = String(formData.get('activeFrom') ?? '')
  const months = Number(formData.get('months'))
  const paymentReceived = formData.get('paymentReceived') === 'on'
  const allowedDurations = [1, 2, 3, 6, 12]
  const startDate = new Date(`${activeFrom}T00:00:00.000Z`)

  if (!studentId || !paymentReceived || !/^\d{4}-\d{2}-\d{2}$/.test(activeFrom) || Number.isNaN(startDate.getTime()) || startDate.toISOString().slice(0, 10) !== activeFrom || !allowedDurations.includes(months)) {
    redirectAdminView('students', 'Data masa aktif tidak valid')
  }

  const targetMonth = startDate.getUTCMonth() + months
  const targetYear = startDate.getUTCFullYear() + Math.floor(targetMonth / 12)
  const normalizedMonth = targetMonth % 12
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate()
  const endDate = new Date(Date.UTC(targetYear, normalizedMonth, Math.min(startDate.getUTCDate(), lastDay)))
  endDate.setUTCDate(endDate.getUTCDate() - 1)
  const activeUntil = endDate.toISOString().slice(0, 10)

  const { data: student, error: studentError } = await supabase
    .from('profiles')
    .select('id, is_active, active_from, active_until')
    .eq('student_id', studentId)
    .eq('role', 'student')
    .single()

  if (studentError || !student) redirectAdminView('students', 'Siswa tidak ditemukan')

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })
  const keepsCurrentPeriod = student.is_active && student.active_from && student.active_until >= today && activeFrom > student.active_until

  const { error } = await supabase
    .from('profiles')
    .update({ is_active: true, active_from: keepsCurrentPeriod ? student.active_from : activeFrom, active_until: activeUntil })
    .eq('id', student.id)
    .eq('role', 'student')

  if (error) redirectAdminView('students', error.message)
  redirectAdminView('students', `Masa aktif diperbarui sampai ${activeUntil}`)
}

export async function rescheduleStudentSession(formData: FormData) {
  const { supabase, user } = await requireActiveStudent()
  const scheduleId = String(formData.get('scheduleId') ?? '')
  const startLocal = String(formData.get('startLocal') ?? '')
  const endLocal = String(formData.get('endLocal') ?? '')
  const startAt = new Date(`${startLocal}:00+07:00`)
  const endAt = new Date(`${endLocal}:00+07:00`)

  if (!scheduleId || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(startLocal) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(endLocal) || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || startAt <= new Date() || endAt <= startAt) {
    redirect('/dashboard?scheduleMessage=Masukkan%20tanggal%20dan%20jam%20baru%20yang%20valid')
  }

  const { data: schedule, error: scheduleError } = await supabase
    .from('student_schedules')
    .select('id, starts_at, status')
    .eq('id', scheduleId)
    .eq('student_profile_id', user.id)
    .single()

  if (scheduleError || !schedule || schedule.status !== 'scheduled') {
    redirect('/dashboard?scheduleMessage=Jadwal%20tidak%20ditemukan')
  }

  if (new Date(schedule.starts_at).getTime() - Date.now() < 24 * 60 * 60 * 1000) {
    redirect('/dashboard?scheduleMessage=Batas%20reschedule%20adalah%2024%20jam%20sebelum%20sesi')
  }

  const { error } = await supabase
    .from('student_schedules')
    .update({ starts_at: startAt.toISOString(), ends_at: endAt.toISOString() })
    .eq('id', scheduleId)
    .eq('student_profile_id', user.id)

  if (error) {
    const message = error.code === '23P01'
      ? 'Jadwal baru bertabrakan dengan jadwal siswa lain. Pilih waktu yang berbeda.'
      : 'Jadwal gagal diubah. Periksa kembali tanggal dan jam yang dipilih.'
    redirect(`/dashboard?scheduleMessage=${encodeURIComponent(message)}`)
  }

  redirect('/dashboard?scheduleMessage=Jadwal%20berhasil%20diubah')
}