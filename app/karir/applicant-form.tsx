import { submitJobApplication } from './actions'

const inputClass = 'mt-1 w-full border border-gray-300 bg-white px-3 py-2.5 font-normal text-black outline-none focus:border-orange-500'

export function ApplicantForm({ token }: { token: string }) {
  return (
    <form action={submitJobApplication} className="space-y-7">
      <input type="hidden" name="token" value={token} />
      <fieldset className="grid gap-5 border border-gray-200 bg-white p-5 sm:grid-cols-2 sm:p-7">
        <legend className="px-2 text-lg font-bold text-gray-900">Data diri dan kontak</legend>
        <label className="text-sm font-semibold text-gray-800 sm:col-span-2">Nama lengkap *
          <input name="fullName" required maxLength={150} autoComplete="name" className={inputClass} />
        </label>
        <label className="text-sm font-semibold text-gray-800">Email aktif *
          <input name="email" type="email" required maxLength={254} autoComplete="email" className={inputClass} />
        </label>
        <label className="text-sm font-semibold text-gray-800">Nomor WhatsApp *
          <input name="phone" type="tel" required maxLength={30} autoComplete="tel" className={inputClass} />
        </label>
        <label className="text-sm font-semibold text-gray-800">Tanggal lahir *
          <input name="birthDate" type="date" required max={new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })} className={inputClass} />
        </label>
        <label className="text-sm font-semibold text-gray-800">Jenis kelamin *
          <select name="gender" required defaultValue="" className={inputClass}>
            <option value="" disabled>Pilih jenis kelamin</option>
            <option>Laki-laki</option>
            <option>Perempuan</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-gray-800 sm:col-span-2">Alamat domisili lengkap *
          <textarea name="address" required maxLength={1000} rows={3} autoComplete="street-address" className={inputClass} />
        </label>
      </fieldset>

      <fieldset className="grid gap-5 border border-gray-200 bg-white p-5 sm:grid-cols-2 sm:p-7">
        <legend className="px-2 text-lg font-bold text-gray-900">Pendidikan dan pengalaman</legend>
        <label className="text-sm font-semibold text-gray-800">Pendidikan terakhir *
          <select name="educationLevel" required defaultValue="" className={inputClass}>
            <option value="" disabled>Pilih pendidikan</option>
            {['SMA/SMK', 'D1', 'D2', 'D3', 'D4', 'S1', 'S2', 'S3', 'Lainnya'].map((level) => <option key={level}>{level}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-gray-800">Tahun lulus *
          <input name="graduationYear" type="number" min="1950" max="2100" required className={inputClass} />
        </label>
        <label className="text-sm font-semibold text-gray-800">Nama sekolah / perguruan tinggi *
          <input name="educationInstitution" required maxLength={180} className={inputClass} />
        </label>
        <label className="text-sm font-semibold text-gray-800">Jurusan *
          <input name="educationMajor" required maxLength={150} className={inputClass} />
        </label>
        <label className="text-sm font-semibold text-gray-800">Pengalaman kerja (tahun) *
          <input name="experienceYears" type="number" min="0" max="80" step="0.5" required defaultValue="0" className={inputClass} />
        </label>
        <label className="text-sm font-semibold text-gray-800 sm:col-span-2">Ringkasan pengalaman kerja, organisasi, atau kegiatan relevan *
          <textarea name="experienceSummary" required maxLength={5000} rows={4} className={inputClass} placeholder="Tuliskan nama tempat kerja/organisasi, posisi, periode, dan tanggung jawab. Jika belum berpengalaman, tulis belum berpengalaman." />
        </label>
        <label className="text-sm font-semibold text-gray-800 sm:col-span-2">Keahlian *
          <textarea name="skills" required maxLength={2000} rows={2} className={inputClass} placeholder="Pisahkan dengan koma, contoh: Mengajar Matematika, Komunikasi, Microsoft Office" />
        </label>
        <label className="text-sm font-semibold text-gray-800 sm:col-span-2">Link portofolio / karya (opsional)
          <input name="portfolioUrl" type="url" maxLength={500} placeholder="https://" className={inputClass} />
        </label>
      </fieldset>

      <fieldset className="grid gap-5 border border-gray-200 bg-white p-5 sm:grid-cols-2 sm:p-7">
        <legend className="px-2 text-lg font-bold text-gray-900">Media sosial dan motivasi</legend>
        <label className="text-sm font-semibold text-gray-800">Platform media sosial *
          <select name="socialPlatform" required defaultValue="" className={inputClass}>
            <option value="" disabled>Pilih platform</option>
            <option>Instagram</option>
            <option>LinkedIn</option>
            <option>Facebook</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-gray-800">Link profil media sosial *
          <input name="socialUrl" type="url" required maxLength={500} placeholder="https://" className={inputClass} />
        </label>
        <label className="text-sm font-semibold text-gray-800 sm:col-span-2">Surat lamaran / motivasi *
          <textarea name="coverLetter" required maxLength={5000} rows={5} className={inputClass} placeholder="Perkenalkan diri dan jelaskan alasan Anda melamar." />
        </label>
      </fieldset>

      <button className="bg-orange-500 px-6 py-3.5 font-bold text-white hover:bg-orange-600">Kirim lamaran</button>
    </form>
  )
}
