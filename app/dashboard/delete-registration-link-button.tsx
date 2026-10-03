'use client'

import { deleteRegistrationLink } from './actions'

export function DeleteRegistrationLinkButton({ linkId }: { linkId: string }) {
  function confirmDelete(event: React.FormEvent<HTMLFormElement>) {
    if (!window.confirm('Hapus tautan ini? Data pendaftaran yang sudah masuk tetap disimpan.')) {
      event.preventDefault()
    }
  }

  return (
    <form action={deleteRegistrationLink} onSubmit={confirmDelete}>
      <input type="hidden" name="linkId" value={linkId} />
      <button type="submit" className="mt-2 text-sm font-semibold text-red-700 underline hover:text-red-900">Hapus tautan</button>
    </form>
  )
}
