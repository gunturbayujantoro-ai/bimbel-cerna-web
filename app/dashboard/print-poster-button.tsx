'use client'

export function PrintPosterButton() {
  return <button onClick={() => window.print()} className="bg-gray-900 px-4 py-2 font-semibold text-white">Cetak poster</button>
}
