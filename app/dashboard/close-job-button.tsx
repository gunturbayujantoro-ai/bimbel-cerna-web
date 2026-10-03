'use client'

import { closeJobOpening } from './job-actions'

export function CloseJobButton({ jobId }: { jobId: string }) {
  function confirmClose(event: React.FormEvent<HTMLFormElement>) {
    if (!window.confirm('Tutup lowongan ini? Pelamar tidak lagi dapat membuka atau mengirim lamaran.')) {
      event.preventDefault()
    }
  }

  return (
    <form action={closeJobOpening} onSubmit={confirmClose}>
      <input type="hidden" name="jobId" value={jobId} />
      <button className="text-sm font-semibold text-red-700 underline hover:text-red-900">Tutup lowongan</button>
    </form>
  )
}
