'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Menu, Users, Settings, LogOut, Shield, Trash2, Plus } from 'lucide-react'
import Image from 'next/image'
import { usersAPI } from '@/lib/apiClient'
import { useAuth } from '@/components/AuthProvider'

type UserRecord = {
  id: number
  full_name: string
  email: string
  role: 'admin' | 'manager' | 'viewer'
  is_active: boolean
  last_login?: string
}

export default function UsersPage() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'viewer' as 'admin' | 'manager' | 'viewer' })

  const canManage = user?.role === 'admin'

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await usersAPI.getAll()
      setUsers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat user')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canManage) {
      loadUsers()
    }
  }, [canManage])

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      setSaving(true)
      await usersAPI.create(form)
      setForm({ full_name: '', email: '', password: '', role: 'viewer' })
      await loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambah user')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus user ini?')) return
    await usersAPI.delete(id)
    await loadUsers()
  }

  const summary = useMemo(() => ({
    total: users.length,
    admins: users.filter((item) => item.role === 'admin').length,
    active: users.filter((item) => item.is_active).length,
  }), [users])

  if (!canManage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white px-4">
        <div className="max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <Shield className="mx-auto text-cyan-300" size={40} />
          <h1 className="mt-4 text-2xl font-bold">Akses ditolak</h1>
          <p className="mt-2 text-sm text-white/65">Halaman user management hanya untuk role admin.</p>
          <button onClick={() => router.push('/')} className="mt-6 rounded-2xl bg-cyan-400 px-4 py-2 font-semibold text-slate-950">
            Kembali
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50" style={{ backgroundImage: 'url(/assets/bg_image.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
      <div className="absolute inset-0 bg-white/40 pointer-events-none"></div>
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} gradient-primary text-white transition-all duration-300 flex flex-col shadow-xl relative z-20`}>
        <div className="p-4 flex items-center justify-between">
          {sidebarOpen && <Image src="/logo_unesa.png" alt="UNESA Logo" width={240} height={80} priority className="w-full h-auto object-contain" />}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-white/20 rounded-lg"><Menu size={20} /></button>
        </div>

        <nav className="flex-1 px-3 space-y-2">
          <NavItem href="/" icon={<Shield size={20} />} label="Dasbor" sidebarOpen={sidebarOpen} />
          <NavItem href="/users" icon={<Users size={20} />} label="Pengguna" active sidebarOpen={sidebarOpen} />
          <NavItem href="/settings" icon={<Settings size={20} />} label="Pengaturan" sidebarOpen={sidebarOpen} />
        </nav>

        <div className="px-3 pb-6 space-y-2 border-t border-white/20 pt-4">
          <button onClick={logout} className="w-full text-left flex items-center space-x-3 px-4 py-3 rounded-lg text-white/70 hover:bg-white/10">
            <LogOut size={20} />
            {sidebarOpen && <span className="text-sm font-medium">Keluar</span>}
          </button>
        </div>
      </aside>

      <main className="relative z-10 flex-1 overflow-auto p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="rounded-3xl bg-white/85 p-6 shadow-lg backdrop-blur">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-gray-500">SaaS User Management</p>
                <h1 className="mt-2 text-3xl font-bold text-gray-900">Kelola pengguna dashboard</h1>
                <p className="mt-1 text-gray-600">Admin dapat menambah, mengubah, dan menonaktifkan user.</p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <Stat label="Total" value={summary.total} />
                <Stat label="Admin" value={summary.admins} />
                <Stat label="Aktif" value={summary.active} />
              </div>
            </div>
          </header>

          <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-3xl bg-white/90 p-6 shadow-lg backdrop-blur">
              <h2 className="text-xl font-semibold text-gray-900">Tambah user</h2>
              <form onSubmit={handleCreate} className="mt-5 space-y-4">
                <Input label="Nama Lengkap" value={form.full_name} onChange={(value) => setForm({ ...form, full_name: value })} />
                <Input label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
                <Input label="Password" type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} />
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Role</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as any })} className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-cyan-400">
                    <option value="viewer">viewer</option>
                    <option value="manager">manager</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
                {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
                <button disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 font-semibold text-white disabled:opacity-70">
                  <Plus size={18} />
                  {saving ? 'Menyimpan...' : 'Tambah User'}
                </button>
              </form>
            </div>

            <div className="rounded-3xl bg-white/90 p-6 shadow-lg backdrop-blur">
              <h2 className="text-xl font-semibold text-gray-900">Daftar user</h2>
              {loading ? (
                <p className="mt-4 text-sm text-gray-500">Memuat user...</p>
              ) : (
                <div className="mt-5 space-y-3">
                  {users.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-gray-200 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-gray-900">{item.full_name}</p>
                          <p className="text-sm text-gray-500">{item.email}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-gray-500">{item.role}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {item.is_active ? 'aktif' : 'nonaktif'}
                          </span>
                          <button onClick={() => handleDelete(item.id)} className="rounded-full p-2 text-red-600 hover:bg-red-50">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

function NavItem({ href, icon, label, active = false, sidebarOpen }: { href: string; icon: React.ReactNode; label: string; active?: boolean; sidebarOpen: boolean }) {
  return (
    <Link href={href} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg ${active ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'}`}>
      {icon}
      {sidebarOpen && <span className="text-sm font-medium">{label}</span>}
    </Link>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-cyan-400" />
    </div>
  )
}