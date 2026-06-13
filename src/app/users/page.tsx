'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Menu, Settings, LogOut, Shield, Trash2, Plus, Building2, Activity, Clock } from 'lucide-react'
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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [now, setNow] = useState(new Date())

  const canManage = user?.role === 'admin'

  // Clock effect
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

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
    <div className="flex h-screen bg-gray-50" style={{
      backgroundImage: 'url(/assets/bg_image.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}>
      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-white/40 pointer-events-none"></div>
      
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-[#0f2d59] text-white transition-all duration-300 flex flex-col shadow-xl relative z-20 border-r-4 border-r-[#d8ae47]`}
      >
        <div className="p-4 flex items-center justify-between border-b border-white/10">
          {sidebarOpen && (
            <div className="flex-1 w-full h-auto">
              <Image 
                src="/logo_unesa.png" 
                alt="UNESA Logo" 
                width={240} 
                height={80}
                priority
                className="w-full h-auto object-contain brightness-110"
              />
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-white/10 rounded transition-all ml-auto"
          >
            <Menu size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {/* Main University Links */}
          <Link href="/" className="flex items-center space-x-3 px-4 py-2.5 rounded text-white/70 hover:bg-white/5 hover:text-white transition-all">
            <Building2 size={18} />
            {sidebarOpen && <span className="text-sm">Dasbor Rektorat</span>}
          </Link>
          
          <div className="space-y-1">
            <Link href="/psikologi" className="flex items-center space-x-3 px-4 py-2.5 rounded text-white bg-white/10 font-bold transition-all">
              <Activity size={18} className="text-[#f1c40f]" />
              {sidebarOpen && <span className="text-sm">Fakultas Psikologi</span>}
            </Link>
            
            {/* Sub-menu for Psikologi */}
            {sidebarOpen && (
              <div className="pl-8 space-y-1 border-l border-white/10 ml-6">
                <Link href="/psikologi" className="block py-1.5 px-3 text-xs text-white/60 hover:text-white rounded hover:bg-white/5">
                  Dasbor
                </Link>
                <Link href="/devices" className="block py-1.5 px-3 text-xs text-white/60 hover:text-white rounded hover:bg-white/5">
                  Perangkat
                </Link>
                <Link href="/analytics" className="block py-1.5 px-3 text-xs text-white/60 hover:text-white rounded hover:bg-white/5">
                  Analitik
                </Link>
                <Link href="/alerts" className="block py-1.5 px-3 text-xs text-white/60 hover:text-white rounded hover:bg-white/5">
                  Pemberitahuan
                </Link>
                <Link href="/users" className="block py-1.5 px-3 text-xs font-semibold text-white rounded bg-white/10">
                  Pengguna
                </Link>
              </div>
            )}
          </div>
          
          <Link href="/fbs" className="flex items-center space-x-3 px-4 py-2.5 rounded text-white/70 hover:bg-white/5 hover:text-white transition-all">
            <Activity size={18} />
            {sidebarOpen && <span className="text-sm">Fakultas Bahasa & Seni</span>}
          </Link>
        </nav>

        <div className="px-3 pb-6 space-y-2 border-t border-white/10 pt-4">
          <Link href="/settings" className="flex items-center space-x-3 px-4 py-3 rounded text-white/70 hover:bg-white/5 hover:text-white transition-all">
            <Settings size={20} />
            {sidebarOpen && <span className="text-sm">Pengaturan</span>}
          </Link>
          <button onClick={logout} className="w-full flex items-center space-x-3 px-4 py-3 rounded text-white/70 hover:bg-white/5 hover:text-white transition-all text-left">
            <LogOut size={20} />
            {sidebarOpen && <span className="text-sm">Keluar</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="bg-[#0f2d59] text-white shadow-md border-b-4 border-[#d8ae47] z-10 shrink-0">
          <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-1.5 hover:bg-white/10 rounded transition-all mr-2 lg:hidden"
                >
                  <Menu size={20} />
                </button>
              )}
              <div>
                <h1 className="text-white font-extrabold text-base tracking-tight leading-tight uppercase">Dashboard Pengguna Fakultas Psikologi</h1>
                <p className="text-[#f1c40f] font-bold text-xs tracking-wider uppercase">Universitas Negeri Surabaya</p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              {/* Clock and Calendar */}
              <div className="text-right border-r border-white/20 pr-6 hidden md:block">
                <div className="flex items-center justify-end space-x-1.5 text-white">
                  <Clock size={13} className="text-[#f1c40f]" />
                  <span className="font-bold text-sm tracking-wide">{now.toLocaleTimeString('id-ID')}</span>
                </div>
                <p className="text-slate-300 text-xs mt-0.5">{now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>

              {/* User Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center space-x-2.5 hover:bg-white/10 p-1.5 rounded-lg transition-all focus:outline-none"
                >
                  <div className="w-9 h-9 rounded-full bg-[#d8ae47] text-[#0f2d59] font-black text-sm flex items-center justify-center border-2 border-white shadow-md">
                    {user?.full_name ? user.full_name[0].toUpperCase() : 'A'}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-bold text-white leading-none">{user?.full_name || 'Administrator'}</p>
                    <p className="text-[10px] text-[#f1c40f] font-bold leading-none mt-1 uppercase">Psikologi</p>
                  </div>
                </button>

                {/* Dropdown Menu */}
                {profileMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setProfileMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-1 z-40 border border-slate-200 divide-y divide-slate-100 text-slate-800">
                      <div className="px-4 py-2">
                        <p className="text-xs font-semibold text-slate-400">Masuk sebagai</p>
                        <p className="text-xs font-bold text-slate-800 truncate mt-0.5">{user?.email}</p>
                      </div>
                      <div className="py-1">
                        <Link
                          href="/settings"
                          className="flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 font-medium transition-all"
                          onClick={() => setProfileMenuOpen(false)}
                        >
                          <Settings size={16} className="text-slate-500" />
                          <span>Pengaturan</span>
                        </Link>
                      </div>
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setProfileMenuOpen(false)
                            logout()
                          }}
                          className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-semibold transition-all text-left"
                        >
                          <LogOut size={16} className="text-red-500" />
                          <span>Keluar</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto relative z-10 p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            
            {/* Summary KPI Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">User Management</p>
                <h2 className="text-xl font-bold text-gray-900 mt-1">Kelola Pengguna Dashboard</h2>
                <p className="text-sm text-slate-500 mt-0.5">Admin dapat menambah, mengubah, dan menonaktifkan pengguna dashboard.</p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <Stat label="Total" value={summary.total} />
                <Stat label="Admin" value={summary.admins} />
                <Stat label="Aktif" value={summary.active} />
              </div>
            </div>

            <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              {/* Form Create */}
              <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
                <h2 className="text-base font-bold text-gray-900 mb-4 border-b pb-2">Tambah Pengguna</h2>
                <form onSubmit={handleCreate} className="space-y-4">
                  <Input label="Nama Lengkap" value={form.full_name} onChange={(value) => setForm({ ...form, full_name: value })} />
                  <Input label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
                  <Input label="Password" type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} />
                  <div>
                    <label className="mb-2 block text-xs font-bold text-slate-500 uppercase">Role</label>
                    <select 
                      value={form.role} 
                      onChange={(e) => setForm({ ...form, role: e.target.value as any })} 
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none text-sm focus:border-[#0f2d59] font-bold text-slate-700"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700 font-bold">{error}</div>}
                  <button 
                    disabled={saving} 
                    className="inline-flex items-center gap-2 rounded-lg bg-[#0f2d59] hover:bg-teal-800 transition-all px-4 py-2.5 font-bold text-xs uppercase tracking-wider text-white disabled:opacity-70"
                  >
                    <Plus size={16} />
                    {saving ? 'Menyimpan...' : 'Tambah User'}
                  </button>
                </form>
              </div>

              {/* Users List */}
              <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200 flex flex-col h-[500px]">
                <h2 className="text-base font-bold text-gray-900 mb-4 border-b pb-2">Daftar Pengguna</h2>
                {loading ? (
                  <p className="text-xs text-gray-500 font-bold">Memuat user...</p>
                ) : (
                  <div className="space-y-3 overflow-y-auto flex-1 pr-2">
                    {users.map((item) => (
                      <div key={item.id} className="rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-all bg-slate-50 flex items-start justify-between gap-4">
                        <div>
                          <p className="font-bold text-sm text-gray-900 leading-tight">{item.full_name}</p>
                          <p className="text-xs text-gray-500 mt-1">{item.email}</p>
                          <span className="inline-block mt-2 text-[10px] uppercase font-extrabold tracking-wider bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                            {item.role}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                            {item.is_active ? 'aktif' : 'nonaktif'}
                          </span>
                          <button onClick={() => handleDelete(item.id)} className="rounded-lg p-2 text-red-600 hover:bg-red-100 transition-all">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 min-w-[80px]">
      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold leading-none">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-800 leading-none">{value}</p>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold text-slate-500 uppercase">{label}</label>
      <input 
        type={type} 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-[#0f2d59]" 
      />
    </div>
  )
}