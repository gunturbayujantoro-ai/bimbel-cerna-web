'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  // PERUBAHAN: Tambahkan 'await' di sini
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return redirect('/login?message=Gagal login, cek email/password')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      await supabase.auth.signOut()
      redirect('/login?message=Akun%20belum%20memiliki%20profil%20yang%20valid')
    }

    if (profile.role === 'student') {
      const { data: canAccess, error: accessError } = await supabase.rpc('refresh_student_access')
      if (accessError || !canAccess) {
        await supabase.auth.signOut()
        redirect('/login?message=Masa%20belajar%20belum%20aktif%20atau%20sudah%20berakhir.%20Hubungi%20admin.')
      }
    }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
