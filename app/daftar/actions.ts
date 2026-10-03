'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function submitRegistration(formData: FormData) {
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

  if (!/^[0-9a-f-]{36}$/i.test(token) || !studentName || !['Laki-laki', 'Perempuan'].includes(gender) || !birthDate || !school || !grade || !address || !guardianName || !guardianRelation || !guardianPhone || scheduleDates.length === 0 || scheduleDates.length !== scheduleStarts.length || scheduleDates.length !== scheduleEnds.length || scheduleDates.some((date, index) => !date || !scheduleStarts[index] || !scheduleEnds[index])) {
    redirect(`/daftar/${encodeURIComponent(token)}?error=${encodeURIComponent('Lengkapi identitas dan jadwal setiap pertemuan dengan benar.')}`)
  }

  const schedules = scheduleDates.map((date, index) => ({
    date,
    start: scheduleStarts[index],
    end: scheduleEnds[index],
  }))

  const supabase = await createClient()
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
    redirect(`/daftar/${encodeURIComponent(token)}?error=${encodeURIComponent(message)}`)
  }

  redirect(`/daftar/${encodeURIComponent(token)}?success=1`)
}
