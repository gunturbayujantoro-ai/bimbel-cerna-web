'use server'

import { createClient } from '@/utils/supabase/server'

type RegistrationActionState = {
  error?: string
  whatsappUrl?: string
}

export async function submitRegistration(_previousState: RegistrationActionState, formData: FormData): Promise<RegistrationActionState> {
  const token = String(formData.get('token') ?? '')
  const studentName = String(formData.get('studentName') ?? '').trim()
  const gender = String(formData.get('gender') ?? '')
  const birthDate = String(formData.get('birthDate') ?? '')
  const school = String(formData.get('school') ?? '').trim()
  const grade = String(formData.get('grade') ?? '').trim()
  const address = String(formData.get('address') ?? '').trim()
  const guardianName = String(formData.get('guardianName') ?? '').trim()
  const guardianRelation = String(formData.get('guardianRelation') ?? '').trim()
  const guardianPhone = String(formData.get('guardianPhone') ?? '').trim()
  const guardianEmail = String(formData.get('guardianEmail') ?? '').trim()
  const preferredSchedule = String(formData.get('preferredSchedule') ?? '').trim()
  const notes = String(formData.get('notes') ?? '').trim()
  const scheduleDates = formData.getAll('scheduleDate').map(String)
  const scheduleStarts = formData.getAll('scheduleStart').map(String)
  const scheduleEnds = formData.getAll('scheduleEnd').map(String)

  if (!/^[0-9a-f-]{36}$/i.test(token) || !studentName || !['Laki-laki', 'Perempuan'].includes(gender) || !birthDate || !school || !grade || !address || !guardianName || !guardianRelation || !guardianPhone || scheduleDates.length === 0 || scheduleDates.length !== scheduleStarts.length || scheduleDates.length !== scheduleEnds.length) {
    return { error: 'Lengkapi identitas dan jadwal setiap pertemuan dengan benar.' }
  }

  const schedules = scheduleDates.map((date, index) => ({
    date,
    start: scheduleStarts[index],
    end: scheduleEnds[index],
  }))
  const durationIsOneHour = schedules.every(({ start, end }) => {
    const startMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(start)
    const endMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(end)
    if (!startMatch || !endMatch) return false

    const startMinutes = Number(startMatch[1]) * 60 + Number(startMatch[2])
    const endMinutes = Number(endMatch[1]) * 60 + Number(endMatch[2])
    return startMinutes < 23 * 60 && endMinutes === startMinutes + 60
  })

  if (schedules.some(({ date }) => !date) || !durationIsOneHour) {
    return { error: 'Setiap jadwal harus memiliki waktu mulai dan durasi tepat 60 menit.' }
  }

  const supabase = await createClient()
  const { data: packageData, error: packageError } = await supabase.rpc('get_public_registration_package', { p_token: token })
  const packageInfo = Array.isArray(packageData) ? packageData[0] : null

  if (packageError || !packageInfo) {
    return { error: 'Tautan pendaftaran tidak aktif atau tidak ditemukan.' }
  }

  const { error } = await supabase.rpc('submit_public_registration', {
    p_token: token,
    p_student_name: studentName,
    p_gender: gender,
    p_birth_date: birthDate,
    p_school: school,
    p_grade: grade,
    p_address: address,
    p_guardian_name: guardianName,
    p_guardian_relation: guardianRelation,
    p_guardian_phone: guardianPhone,
    p_schedules: schedules,
    p_guardian_email: guardianEmail || null,
    p_preferred_schedule: preferredSchedule || null,
    p_notes: notes || null,
  })

  if (error) {
    const message = error.message.includes('bertabrakan')
      ? error.message
      : 'Pendaftaran gagal. Periksa kembali jadwal dan data, lalu coba lagi.'
    return { error: message }
  }

  const scheduleSummary = schedules
    .map(({ date, start, end }, index) => `Pertemuan ${index + 1}: ${date}, ${start}–${end}`)
    .join('\n')
  const message = [
    'Pendaftaran privat baru diterima.',
    `Paket: ${packageInfo.name}`,
    `Nama siswa: ${studentName}`,
    `Sekolah/kelas: ${school} / ${grade}`,
    `Nama wali: ${guardianName} (${guardianRelation})`,
    `WhatsApp wali: ${guardianPhone}`,
    `Alamat: ${address}`,
    'Jadwal:',
    scheduleSummary,
  ].join('\n')

  return { whatsappUrl: `https://wa.me/628117873878?text=${encodeURIComponent(message)}` }
}
