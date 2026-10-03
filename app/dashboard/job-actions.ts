'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || profile?.role !== 'admin') redirect('/dashboard')
  return { supabase, user }
}

function redirectJobs(message: string, jobId?: string): never {
  const query = new URLSearchParams({ view: 'lowongan', adminMessage: message })
  if (jobId) query.set('jobId', jobId)
  redirect(`/dashboard?${query.toString()}`)
}

export async function createJobOpening(formData: FormData) {
  const { supabase, user } = await requireAdmin()
  const title = String(formData.get('title') ?? '').trim()
  const department = String(formData.get('department') ?? '').trim()
  const employmentType = String(formData.get('employmentType') ?? '')
  const location = String(formData.get('location') ?? '').trim()
  const workArrangement = String(formData.get('workArrangement') ?? '')
  const rawSalaryMin = String(formData.get('salaryMin') ?? '').trim()
  const rawSalaryMax = String(formData.get('salaryMax') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const responsibilities = String(formData.get('responsibilities') ?? '').trim()
  const requirements = String(formData.get('requirements') ?? '').trim()
  const benefits = String(formData.get('benefits') ?? '').trim()
  const applicationDeadline = String(formData.get('applicationDeadline') ?? '')
  const contactEmail = String(formData.get('contactEmail') ?? '').trim().toLowerCase()
  const contactPhone = String(formData.get('contactPhone') ?? '').trim()
  const salaryMin = rawSalaryMin ? Number(rawSalaryMin) : null
  const salaryMax = rawSalaryMax ? Number(rawSalaryMax) : null
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(applicationDeadline)
    && !Number.isNaN(Date.parse(`${applicationDeadline}T00:00:00.000Z`))
    && new Date(`${applicationDeadline}T00:00:00.000Z`).toISOString().slice(0, 10) === applicationDeadline
    && applicationDeadline >= new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })

  if (
    !title || title.length > 150 || !department || department.length > 120
    || !['Full-time', 'Part-time', 'Kontrak', 'Freelance', 'Magang'].includes(employmentType)
    || !location || location.length > 180 || !['WFO', 'WFH', 'Hybrid'].includes(workArrangement)
    || (salaryMin !== null && (!Number.isFinite(salaryMin) || salaryMin < 0))
    || (salaryMax !== null && (!Number.isFinite(salaryMax) || salaryMax < 0))
    || (salaryMin !== null && salaryMax !== null && salaryMax < salaryMin)
    || !description || description.length > 10000
    || !responsibilities || responsibilities.length > 10000
    || !requirements || requirements.length > 10000
    || benefits.length > 10000 || !validDate
    || !/^\S+@\S+\.\S+$/.test(contactEmail) || contactEmail.length > 254
    || contactPhone.length < 6 || contactPhone.length > 30
  ) {
    redirectJobs('Data lowongan belum lengkap atau tidak valid')
  }

  const { error } = await supabase.from('job_openings').insert({
    title,
    department,
    employment_type: employmentType,
    location,
    work_arrangement: workArrangement,
    salary_min: salaryMin,
    salary_max: salaryMax,
    description,
    responsibilities,
    requirements,
    benefits: benefits || null,
    application_deadline: applicationDeadline,
    contact_email: contactEmail,
    contact_phone: contactPhone,
    created_by: user.id,
  })

  if (error) redirectJobs(`Lowongan gagal disimpan: ${error.message}`)
  redirectJobs('Lowongan kerja berhasil dibuat')
}

export async function closeJobOpening(formData: FormData) {
  const { supabase } = await requireAdmin()
  const jobId = String(formData.get('jobId') ?? '')
  if (!/^[0-9a-f-]{36}$/i.test(jobId)) redirectJobs('Data lowongan tidak valid')

  const { data, error } = await supabase
    .from('job_openings')
    .update({ status: 'closed', closed_at: new Date().toISOString() })
    .eq('id', jobId)
    .eq('status', 'open')
    .select('id')
    .single()

  if (error || !data) redirectJobs(error?.message ?? 'Lowongan sudah ditutup atau tidak ditemukan')
  redirectJobs('Lowongan berhasil ditutup')
}
