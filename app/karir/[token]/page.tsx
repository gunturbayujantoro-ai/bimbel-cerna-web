import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { ApplicantForm } from '../applicant-form'

type JobApplicationPageProps = {
  params: Promise<{ token: string }>
  searchParams: Promise<{ success?: string; error?: string }>
}

export default async function JobApplicationPage({ params, searchParams }: JobApplicationPageProps) {
  const { token } = await params
  const query = await searchParams
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_public_job_opening', { p_token: token })

  if (error) throw new Error(`Informasi lowongan gagal dimuat: ${error.message}`)
  const job = Array.isArray(data) ? data[0] : null

  if (!job) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
        <section className="w-full max-w-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-bold uppercase text-orange-600">Bimbel Cerna</p>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">Lowongan tidak tersedia</h1>
          <p className="mt-3 text-gray-600">Lowongan ini sudah ditutup atau batas waktu lamaran telah berakhir.</p>
          <Link href="/" className="mt-6 inline-flex bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600">Kembali ke halaman utama</Link>
        </section>
      </main>
    )
  }

  if (query.success === '1') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
        <section className="w-full max-w-lg border border-green-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-bold uppercase text-green-700">Lamaran terkirim</p>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">Terima kasih telah melamar</h1>
          <p className="mt-3 leading-relaxed text-gray-600">Lamaran Anda untuk posisi {job.title} sudah kami terima.</p>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-semibold text-orange-700 hover:text-orange-800">Bimbel Cerna</Link>
        <header className="mb-8 mt-6 border-b border-gray-200 pb-6">
          <p className="text-sm font-bold uppercase text-orange-600">Formulir pelamar kerja</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">{job.title}</h1>
          <p className="mt-2 text-gray-700">{job.department} · {job.employment_type} · {job.work_arrangement} · {job.location}</p>
          <p className="mt-1 text-sm text-gray-600">Batas lamaran: {new Date(`${job.application_deadline}T00:00:00.000Z`).toLocaleDateString('id-ID', { dateStyle: 'long', timeZone: 'UTC' })}</p>
          {(job.salary_min !== null || job.salary_max !== null) && <p className="mt-1 text-sm font-semibold text-gray-800">Kisaran gaji: Rp {job.salary_min === null ? '-' : Number(job.salary_min).toLocaleString('id-ID')} – {job.salary_max === null ? '-' : Number(job.salary_max).toLocaleString('id-ID')}</p>}
          <section className="mt-6 space-y-4 border border-gray-200 bg-white p-5">
            <div><h2 className="font-bold text-gray-900">Deskripsi pekerjaan</h2><p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{job.description}</p></div>
            <div><h2 className="font-bold text-gray-900">Tanggung jawab</h2><p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{job.responsibilities}</p></div>
            <div><h2 className="font-bold text-gray-900">Persyaratan / kualifikasi</h2><p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{job.requirements}</p></div>
            {job.benefits && <div><h2 className="font-bold text-gray-900">Benefit</h2><p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{job.benefits}</p></div>}
          </section>
          {query.error && <p role="alert" className="mt-5 border border-red-200 bg-red-50 p-4 text-sm text-red-700">{query.error}</p>}
        </header>
        <ApplicantForm token={token} />
      </div>
    </main>
  )
}
