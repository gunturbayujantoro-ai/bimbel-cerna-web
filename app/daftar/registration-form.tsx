'use client'

import { useActionState, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'

type RegistrationActionState = {
  error?: string
  whatsappUrl?: string
}

type RegistrationFormProps = {
  action: (previousState: RegistrationActionState, formData: FormData) => Promise<RegistrationActionState>
  children: ReactNode
}

type Schedule = {
  start: string
  end: string
}

export function RegistrationForm({ action, children }: RegistrationFormProps) {
  const [state, formAction, isPending] = useActionState(action, {})
  const whatsappWindow = useRef<Window | null>(null)

  useEffect(() => {
    if (state.whatsappUrl) {
      if (whatsappWindow.current && !whatsappWindow.current.closed) {
        whatsappWindow.current.location.href = state.whatsappUrl
      }
      whatsappWindow.current = null
    } else if (state.error && whatsappWindow.current) {
      whatsappWindow.current.close()
      whatsappWindow.current = null
    }
  }, [state])

  function openWhatsAppWindow(event: FormEvent<HTMLFormElement>) {
    if (event.currentTarget.checkValidity()) {
      whatsappWindow.current = window.open('about:blank', '_blank')
    }
  }

  if (state.whatsappUrl) {
    return (
      <section className="border border-green-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-bold uppercase text-green-700">Pendaftaran tersimpan</p>
        <h2 className="mt-3 text-2xl font-bold text-gray-900">Terima kasih telah mendaftar</h2>
        <p className="mt-3 leading-relaxed text-gray-600">Data calon siswa sudah tersimpan. WhatsApp admin telah dibuka dengan pesan pendaftaran yang siap dikirim.</p>
        <a href={state.whatsappUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700">Buka WhatsApp admin</a>
        <p className="mt-3 text-sm text-gray-500">Tekan tombol Kirim di WhatsApp untuk mengirim notifikasi.</p>
      </section>
    )
  }

  return (
    <form action={formAction} onSubmit={openWhatsAppWindow} className="space-y-8">
      {state.error && <p role="alert" className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{state.error}</p>}
      {children}
      <button type="submit" disabled={isPending} className="w-full bg-orange-500 px-6 py-3.5 font-bold text-white transition hover:bg-orange-600 disabled:cursor-wait disabled:bg-orange-300 sm:w-auto">
        {isPending ? 'Menyimpan pendaftaran...' : 'Kirim pendaftaran'}
      </button>
    </form>
  )
}

export function ScheduleFields({ sessions, today }: { sessions: number; today: string }) {
  const [schedules, setSchedules] = useState<Schedule[]>(() =>
    Array.from({ length: sessions }, () => ({ start: '', end: '' }))
  )

  function updateStart(index: number, start: string) {
    const [hours, minutes] = start.split(':').map(Number)
    const endMinutes = hours * 60 + minutes + 60
    const end = start && endMinutes < 24 * 60
      ? `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`
      : ''

    setSchedules((current) => current.map((schedule, scheduleIndex) =>
      scheduleIndex === index ? { start, end } : schedule
    ))
  }

  return (
    <fieldset className="border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
      <legend className="px-2 text-lg font-bold text-gray-900">Pilih jadwal setiap pertemuan</legend>
      <p className="mb-5 text-sm text-gray-600">Pilih {sessions} jadwal pada bulan yang sama. Waktu yang sudah dipesan siswa lain akan ditolak.</p>
      <div className="space-y-4">
        {schedules.map((schedule, index) => (
          <div key={index} className="grid gap-4 border-t border-gray-100 pt-4 sm:grid-cols-[minmax(110px,0.6fr)_1fr_1fr_1fr] sm:items-end">
            <p className="font-semibold text-gray-800">Pertemuan {index + 1}</p>
            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-700">Tanggal *</span>
              <input name="scheduleDate" type="date" min={today} required className="w-full border border-gray-300 px-3 py-2.5 outline-none focus:border-orange-500" />
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-700">Mulai *</span>
              <input name="scheduleStart" type="time" max="22:59" required value={schedule.start} onChange={(event) => updateStart(index, event.target.value)} className="w-full border border-gray-300 px-3 py-2.5 outline-none focus:border-orange-500" />
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-700">Selesai (otomatis, 60 menit)</span>
              <input type="time" value={schedule.end} disabled className="w-full cursor-not-allowed border border-gray-300 bg-gray-100 px-3 py-2.5 text-gray-600" />
              <input type="hidden" name="scheduleEnd" value={schedule.end} />
            </label>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-gray-500">Lokasi belajar menggunakan alamat siswa yang Anda isi di bawah.</p>
    </fieldset>
  )
}
