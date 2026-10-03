import Link from 'next/link'
import Image from 'next/image'
import QRCode from 'qrcode'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { PrintPosterButton } from '../../../print-poster-button'

export default async function JobPosterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profileError || profile?.role !== 'admin') redirect('/dashboard')

  const { data: job, error } = await supabase.from('job_openings').select('*').eq('id', id).single()
  if (error || !job) notFound()

  const requestHeaders = await headers()
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host')
  const protocol = requestHeaders.get('x-forwarded-proto') ?? 'https'
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? (host ? `${protocol}://${host}` : '')).replace(/\/$/, '')
  if (!siteUrl) throw new Error('URL situs tidak tersedia untuk membuat QR lowongan')

  const applicationUrl = `${siteUrl}/karir/${job.token}`
  const qrDataUrl = await QRCode.toDataURL(applicationUrl, { errorCorrectionLevel: 'H', margin: 2, width: 320 })
  const salary = job.salary_min !== null || job.salary_max !== null
    ? `Rp ${job.salary_min === null ? '-' : Number(job.salary_min).toLocaleString('id-ID')} – ${job.salary_max === null ? '-' : Number(job.salary_max).toLocaleString('id-ID')}`
    : 'Gaji dibicarakan saat wawancara'

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-3xl justify-between print:hidden">
        <Link href="/dashboard?view=lowongan" className="font-semibold text-blue-700 underline">Kembali ke lowongan</Link>
        <PrintPosterButton />
      </div>
      <article className="mx-auto max-w-3xl border-4 border-orange-500 bg-white p-7 shadow-xl sm:p-12 print:border-4 print:shadow-none">
        <p className="text-center text-sm font-extrabold uppercase tracking-[0.25em] text-orange-600">Bimbel Cerna · Bergabung Bersama Kami</p>
        <h1 className="mt-5 text-center text-4xl font-black leading-tight text-gray-950 sm:text-5xl">{job.title}</h1>
        <p className="mt-3 text-center text-xl font-bold text-gray-800">{job.department}</p>
        <div className="mt-6 grid grid-cols-2 gap-3 text-center text-sm font-semibold text-gray-800 sm:grid-cols-4">
          {[job.employment_type, job.work_arrangement, job.location, salary].map((detail) => <p key={detail} className="border border-gray-200 bg-slate-50 p-3">{detail}</p>)}
        </div>
        <section className="mt-8">
          <h2 className="text-lg font-bold text-gray-900">Tentang posisi ini</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{job.description}</p>
        </section>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <section>
            <h2 className="font-bold text-gray-900">Tanggung jawab</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{job.responsibilities}</p>
          </section>
          <section>
            <h2 className="font-bold text-gray-900">Kualifikasi</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{job.requirements}</p>
          </section>
        </div>
        {job.benefits && <section className="mt-6"><h2 className="font-bold text-gray-900">Benefit</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{job.benefits}</p></section>}
        <div className="mt-9 flex flex-col items-center gap-4 border-t-2 border-dashed border-orange-300 pt-7 sm:flex-row sm:justify-between">
          <div className="text-center sm:text-left">
            <p className="text-2xl font-black text-orange-600">Kami tunggu lamaranmu!</p>
            <p className="mt-2 font-semibold text-gray-900">Pindai QR untuk melamar</p>
            <p className="mt-2 text-sm text-gray-700">Batas lamaran: {new Date(`${job.application_deadline}T00:00:00.000Z`).toLocaleDateString('id-ID', { dateStyle: 'long', timeZone: 'UTC' })}</p>
            <p className="mt-1 break-all text-xs text-blue-700">{applicationUrl}</p>
          </div>
          <Image src={qrDataUrl} alt={`QR formulir lamaran ${job.title}`} width={192} height={192} unoptimized className="size-48" />
        </div>
        <p className="mt-6 text-center text-xs text-gray-500">Pertanyaan: {job.contact_email} · {job.contact_phone}</p>
      </article>
    </main>
  )
}
