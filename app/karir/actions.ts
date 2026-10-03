'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function submitJobApplication(formData: FormData) {
  const token = String(formData.get('token') ?? '')
  const fullName = String(formData.get('fullName') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const phone = String(formData.get('phone') ?? '').trim()
  const birthDate = String(formData.get('birthDate') ?? '')
  const gender = String(formData.get('gender') ?? '')
  const address = String(formData.get('address') ?? '').trim()
  const educationLevel = String(formData.get('educationLevel') ?? '')
  const educationInstitution = String(formData.get('educationInstitution') ?? '').trim()
  const educationMajor = String(formData.get('educationMajor') ?? '').trim()
  const graduationYear = Number(formData.get('graduationYear'))
  const experienceYears = Number(formData.get('experienceYears'))
  const experienceSummary = String(formData.get('experienceSummary') ?? '').trim()
  const skills = String(formData.get('skills') ?? '').split(',').map((skill) => skill.trim()).filter(Boolean)
  const portfolioUrl = String(formData.get('portfolioUrl') ?? '').trim()
  const socialPlatform = String(formData.get('socialPlatform') ?? '')
  const socialUrl = String(formData.get('socialUrl') ?? '').trim()
  const coverLetter = String(formData.get('coverLetter') ?? '').trim()

  if (!/^[0-9a-f-]{36}$/i.test(token)) redirect('/karir')

  const supabase = await createClient()
  const { data: applicationId, error } = await supabase.rpc('submit_job_application', {
    p_token: token,
    p_full_name: fullName,
    p_email: email,
    p_phone: phone,
    p_birth_date: birthDate,
    p_gender: gender,
    p_address: address,
    p_education_level: educationLevel,
    p_education_institution: educationInstitution,
    p_education_major: educationMajor,
    p_graduation_year: graduationYear,
    p_experience_years: experienceYears,
    p_experience_summary: experienceSummary,
    p_skills: skills,
    p_portfolio_url: portfolioUrl || null,
    p_social_platform: socialPlatform,
    p_social_url: socialUrl,
    p_cover_letter: coverLetter,
  })

  if (error || !applicationId) {
    redirect(`/karir/${encodeURIComponent(token)}?error=${encodeURIComponent(error?.message ?? 'Lamaran gagal dikirim. Periksa kembali data Anda.')}`)
  }

  redirect(`/karir/${encodeURIComponent(token)}?success=1`)
}
