import Link from 'next/link'

type TutorStudent = {
  id: string
  full_name: string | null
  student_id: string | null
  school: string | null
}

type TutorSchedule = {
  id: string
  student_profile_id: string | null
  starts_at: string
  ends_at: string
  location: string
}

export function TutorCalendar({
  month,
  students,
  schedules,
}: {
  month: string
  students: TutorStudent[]
  schedules: TutorSchedule[]
}) {
  const [year, monthNumber] = month.split('-').map(Number)
  const monthDate = new Date(Date.UTC(year, monthNumber - 1, 1))
  const title = monthDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  const firstDay = monthDate.getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  const days: Array<number | null> = Array.from({ length: firstDay }, () => null)
  days.push(...Array.from({ length: daysInMonth }, (_, index) => index + 1))
  while (days.length % 7 !== 0) days.push(null)

  const previousDate = new Date(Date.UTC(year, monthNumber - 2, 1))
  const nextDate = new Date(Date.UTC(year, monthNumber, 1))
  const previousMonth = previousDate.toISOString().slice(0, 7)
  const nextMonth = nextDate.toISOString().slice(0, 7)
  const studentsById = new Map(students.map((student) => [student.id, student]))
  const schedulesByDate = new Map<string, TutorSchedule[]>()

  for (const schedule of schedules) {
    const date = new Date(schedule.starts_at).toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })
    const dateSchedules = schedulesByDate.get(date) ?? []
    dateSchedules.push(schedule)
    schedulesByDate.set(date, dateSchedules)
  }

  return (
    <section className="border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 px-5 py-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Kalender siswa</h2>
          <p className="mt-1 text-sm text-gray-600">Jadwal siswa yang ditugaskan kepada Anda.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link aria-label="Bulan sebelumnya" href={`/dashboard?month=${previousMonth}`} className="grid size-9 place-items-center border border-gray-300 text-lg font-semibold text-gray-700 hover:bg-gray-50">‹</Link>
          <span className="min-w-32 text-center text-sm font-bold capitalize text-gray-900">{title}</span>
          <Link aria-label="Bulan berikutnya" href={`/dashboard?month=${nextMonth}`} className="grid size-9 place-items-center border border-gray-300 text-lg font-semibold text-gray-700 hover:bg-gray-50">›</Link>
        </div>
      </div>
      <div className="grid grid-cols-7">
        {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day) => (
          <div key={day} className="border-b border-r border-gray-200 bg-gray-50 py-2 text-center text-[10px] font-bold uppercase text-gray-500 sm:text-xs">{day}</div>
        ))}
        {days.map((day, index) => {
          const date = day ? `${month}-${String(day).padStart(2, '0')}` : ''
          const daySchedules = date ? schedulesByDate.get(date) ?? [] : []

          return (
            <div key={`${date || 'empty'}-${index}`} className={`min-h-20 border-b border-r border-gray-200 p-1 sm:min-h-32 sm:p-2 ${day ? 'bg-white' : 'bg-gray-50'}`}>
              {day && <>
                <p className="mb-1 text-[11px] font-bold text-gray-700 sm:mb-2 sm:text-sm">{day}</p>
                <div className="space-y-1">
                  {daySchedules.map((schedule) => {
                    const student = schedule.student_profile_id ? studentsById.get(schedule.student_profile_id) : null
                    const start = new Date(schedule.starts_at).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
                    const end = new Date(schedule.ends_at).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

                    return (
                      <article key={schedule.id} className="border-l-2 border-orange-500 bg-orange-50 p-1 text-[9px] leading-tight sm:p-2 sm:text-xs">
                        <p className="font-bold text-gray-900">{start}–{end}</p>
                        <p className="break-words font-semibold text-gray-800">{student?.full_name ?? 'Siswa'}</p>
                        <p className="hidden break-words text-gray-600 sm:block">{student?.school ?? ''}</p>
                        <p className="hidden break-words text-gray-600 sm:block">{schedule.location}</p>
                      </article>
                    )
                  })}
                </div>
              </>}
            </div>
          )
        })}
      </div>
      {!students.length && <p className="border-t border-gray-200 px-5 py-8 text-center text-sm text-gray-500">Belum ada siswa yang ditugaskan kepada Anda.</p>}
      {students.length > 0 && !schedules.length && <p className="border-t border-gray-200 px-5 py-8 text-center text-sm text-gray-500">Tidak ada jadwal siswa pada bulan ini.</p>}
    </section>
  )
}
