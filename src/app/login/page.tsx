'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('admin@unesa.ac.id')
  const [password, setPassword] = useState('admin123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await login(email, password)
      router.replace('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-900 flex items-center justify-center px-4">
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(212,175,55,0.18),_transparent_28%)]"></div>
      <div className="relative w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 shadow-2xl backdrop-blur-xl grid lg:grid-cols-[1.1fr_0.9fr]">
        <div className="p-10 lg:p-14 text-white">
          <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/70">
            Smart Energy SaaS
          </div>
          <h1 className="mt-8 max-w-xl text-4xl font-bold leading-tight lg:text-6xl">
            Login untuk mengelola pengguna, kelas, dan pemantauan energi.
          </h1>
          <p className="mt-6 max-w-lg text-sm leading-7 text-white/70 lg:text-base">
            Dashboard ini sudah siap untuk mode SaaS dengan autentikasi, role admin, dan manajemen user.
          </p>
          <div className="mt-10 grid gap-4 text-sm text-white/80 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-white">Admin Default</p>
              <p className="mt-1 text-white/70">admin@unesa.ac.id</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-white">Password</p>
              <p className="mt-1 text-white/70">admin123</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-950/70 p-8 lg:p-10">
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/90 p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white">Masuk</h2>
            <p className="mt-2 text-sm text-white/60">Gunakan akun admin atau user yang sudah dibuat.</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none ring-0 placeholder:text-white/30 focus:border-cyan-400"
                  placeholder="admin@unesa.ac.id"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none ring-0 placeholder:text-white/30 focus:border-cyan-400"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-amber-400 px-4 py-3 font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Memproses...' : 'Masuk ke Dashboard'}
              </button>
            </form>

            <p className="mt-6 text-xs text-white/40">
              Login memakai JWT cookie dan akan melindungi halaman aplikasi.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}