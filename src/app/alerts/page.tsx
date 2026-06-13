'use client'

import { useState, useEffect } from 'react'
import { Menu, Settings, Bell, AlertCircle, Trash2, Building2, Activity, Clock, LogOut } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { alertsAPI } from '@/lib/apiClient'
import { useAuth } from '@/components/AuthProvider'

interface Alert {
  id: number
  title: string
  message: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  status: 'unread' | 'read'
  device_id: number
  created_at: string
}

export default function AlertsPage() {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [now, setNow] = useState(new Date())

  // Clock effect
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Load alerts from backend API
  useEffect(() => {
    const loadAlerts = async () => {
      try {
        setLoading(true)
        const alertsData = await alertsAPI.getAll()
        setAlerts(alertsData || [])
        setError(null)
      } catch (err) {
        console.error('Error loading alerts:', err)
        setError(err instanceof Error ? err.message : 'Failed to load alerts')
        setAlerts([])
      } finally {
        setLoading(false)
      }
    }

    loadAlerts()
  }, [])

  const filteredAlerts = filterStatus === 'all' 
    ? alerts 
    : alerts.filter(a => a.status === filterStatus)

  const unreadCount = alerts.filter(a => a.status === 'unread').length

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 border-l-4 border-red-500'
      case 'high':
        return 'bg-orange-100 border-l-4 border-orange-500'
      case 'medium':
        return 'bg-yellow-100 border-l-4 border-yellow-500'
      case 'low':
        return 'bg-blue-100 border-l-4 border-blue-500'
      default:
        return 'bg-gray-100 border-l-4 border-gray-500'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertCircle className="text-red-600" size={20} />
      case 'medium':
        return <AlertCircle className="text-yellow-600" size={20} />
      default:
        return <AlertCircle className="text-blue-600" size={20} />
    }
  }

  const handleMarkAsRead = async (id: number) => {
    try {
      await alertsAPI.markAsRead(id)
      setAlerts(alerts.map(a => 
        a.id === id ? { ...a, status: 'read' } : a
      ))
    } catch (err) {
      console.error('Error marking alert as read:', err)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await alertsAPI.delete(id)
      setAlerts(alerts.filter(a => a.id !== id))
    } catch (err) {
      console.error('Error deleting alert:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat pemberitahuan...</p>
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
                <Link href="/alerts" className="block py-1.5 px-3 text-xs font-semibold text-white rounded bg-white/10">
                  Pemberitahuan
                </Link>
                {user?.role === 'admin' && (
                  <Link href="/users" className="block py-1.5 px-3 text-xs text-white/60 hover:text-white rounded hover:bg-white/5">
                    Pengguna
                  </Link>
                )}
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
                <h1 className="text-white font-extrabold text-base tracking-tight leading-tight uppercase">Dashboard Alerts Fakultas Psikologi</h1>
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
        <div className="flex-1 overflow-y-auto relative z-10">
          {error && (
            <div className="mx-8 mt-6 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-yellow-800 shadow-sm">
              Gagal mengambil data pemberitahuan. Halaman tetap tersedia dengan daftar kosong.
            </div>
          )}

          {/* Clean Modern Filter & Summary Card */}
          <div className="mx-8 mt-6 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-slate-900 font-bold text-sm">Filter Pemberitahuan</h2>
              <p className="text-slate-500 text-xs mt-0.5">Kelola dan saring pemberitahuan sistem smart energy</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right pr-4 border-r border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Belum Dibaca</span>
                <p className="text-xl font-black text-red-600 leading-none mt-1">{unreadCount}</p>
              </div>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-bold text-slate-700 bg-slate-50 focus:outline-none focus:border-[#0f2d59]"
              >
                <option value="all">Semua Status</option>
                <option value="unread">Belum Dibaca</option>
                <option value="read">Sudah Dibaca</option>
              </select>
            </div>
          </div>

          {/* Alerts List */}
          <div className="p-8">
            <div className="space-y-4">
              {filteredAlerts.length > 0 ? (
                filteredAlerts.map((alert) => (
                  <div key={alert.id} className={`p-4 rounded-lg bg-white border border-slate-200 shadow-sm ${getSeverityColor(alert.severity)} flex items-start justify-between`}>
                    <div className="flex items-start space-x-4 flex-1">
                      {getSeverityIcon(alert.severity)}
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{alert.title}</h3>
                        <p className="text-gray-700 text-sm mt-1">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          Device #{alert.device_id} • {new Date(alert.created_at).toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {alert.status === 'unread' && (
                        <button
                          onClick={() => handleMarkAsRead(alert.id)}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-all"
                        >
                          Tandai Dibaca
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(alert.id)}
                        className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-all"
                        title="Hapus"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-white rounded-lg border border-slate-200 shadow-sm">
                  <Bell size={48} className="text-gray-300 mx-auto mb-4 animate-bounce" />
                  <p className="text-gray-500 font-semibold text-sm">Tidak ada pemberitahuan</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
