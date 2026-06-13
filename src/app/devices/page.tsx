'use client'

import { Settings, Menu, Building2, Activity, Clock, LogOut } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { devicesAPI } from '@/lib/apiClient'
import { useAuth } from '@/components/AuthProvider'

interface Device {
  id: number
  device_eui: string
  device_name: string
  device_type: string
  application_type: string
  location: string
  current_power: number
  current_temperature: number
  iot_status: string
  status?: string
}

function isDeviceOnline(device: Device): boolean {
  const iot = String(device.iot_status || '').toLowerCase()
  const status = String(device.status || '').toLowerCase()
  return iot === 'online' || iot === 'active' || status === 'active' || status === 'idle'
}

export default function DevicesPage() {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedClass, setSelectedClass] = useState('All')
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [classes, setClasses] = useState(['All'])
  const [classControlLoading, setClassControlLoading] = useState<Record<string, 'on' | 'off' | null>>({})
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [now, setNow] = useState(new Date())

  // Clock effect
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Load devices from backend API
  useEffect(() => {
    const loadDevices = async () => {
      try {
        setLoading(true)
        const devicesData = await devicesAPI.getAll()
        setDevices(devicesData || [])
        
        // Extract unique locations
        if (devicesData && devicesData.length > 0) {
          const uniqueClasses = ['All', ...new Set(devicesData.map((d: Device) => d.location))]
          setClasses(uniqueClasses)
        }
        
        setError(null)
      } catch (err) {
        console.error('Error loading devices:', err)
        setError(err instanceof Error ? err.message : 'Failed to load devices')
        setDevices([])
      } finally {
        setLoading(false)
      }
    }

    loadDevices()
  }, [])

  const filteredDevices = selectedClass === 'All' 
    ? devices 
    : devices.filter(d => d.location === selectedClass)

  const visibleClassCodes = Array.from(new Set(filteredDevices.map((d) => d.location).filter(Boolean)))

  const handleClassControl = async (classCode: string, action: 'on' | 'off') => {
    try {
      setClassControlLoading(prev => ({ ...prev, [classCode]: action }))
      await devicesAPI.controlByClass(classCode, action)

      setDevices(prev => prev.map(device => {
        if (device.location !== classCode) {
          return device
        }

        return {
          ...device,
          status: action === 'on' ? 'active' : 'idle',
          iot_status: action === 'on' ? 'active' : 'inactive',
        }
      }))

      setError(null)
    } catch (err) {
      console.error('Error controlling class devices:', err)
      setError(err instanceof Error ? err.message : 'Gagal mengirim perintah ON/OFF kelas ke Node-RED')
    } finally {
      setClassControlLoading(prev => ({ ...prev, [classCode]: null }))
    }
  }

  const handleDummyControl = (deviceId: number, action: 'on' | 'off') => {
    setDevices(prev => prev.map(device => {
      if (device.id !== deviceId) {
        return device
      }

      return {
        ...device,
        status: action === 'on' ? 'active' : 'offline',
        iot_status: action === 'on' ? 'active' : 'offline',
      }
    }))
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data perangkat...</p>
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
                <Link href="/devices" className="block py-1.5 px-3 text-xs font-semibold text-white rounded bg-white/10">
                  Perangkat
                </Link>
                <Link href="/analytics" className="block py-1.5 px-3 text-xs text-white/60 hover:text-white rounded hover:bg-white/5">
                  Analitik
                </Link>
                <Link href="/alerts" className="block py-1.5 px-3 text-xs text-white/60 hover:text-white rounded hover:bg-white/5">
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
                <h1 className="text-white font-extrabold text-base tracking-tight leading-tight uppercase">Dashboard Perangkat Fakultas Psikologi</h1>
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
              Terjadi kendala saat memuat atau mengontrol perangkat.
            </div>
          )}

          {/* Clean Modern Filter Card */}
          <div className="mx-8 mt-6 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-slate-900 font-bold text-sm">Filter Status Perangkat</h3>
              <p className="text-slate-500 text-xs mt-0.5">Saring tampilan perangkat berdasarkan lokasi ruangan</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lokasi:</span>
              <div className="flex flex-wrap gap-1.5">
                {classes.map((cls) => (
                  <button
                    key={cls}
                    onClick={() => setSelectedClass(cls)}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                      selectedClass === cls
                        ? 'bg-[#0f2d59] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-8">
          {visibleClassCodes.length > 0 && (
            <div className="mb-6 rounded-xl bg-white p-6 shadow-md">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Kontrol ON/OFF Per Kelas</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleClassCodes.map((classCode) => (
                  <div key={classCode} className="rounded-lg border border-gray-200 p-4">
                    <p className="text-sm font-semibold text-gray-900">{classCode}</p>
                    <p className="mt-1 text-xs text-gray-500">Perintah berlaku untuk semua perangkat di kelas ini.</p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleClassControl(classCode, 'on')}
                        disabled={Boolean(classControlLoading[classCode])}
                        className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {classControlLoading[classCode] === 'on' ? 'Mengirim...' : 'ON'}
                      </button>
                      <button
                        onClick={() => handleClassControl(classCode, 'off')}
                        disabled={Boolean(classControlLoading[classCode])}
                        className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {classControlLoading[classCode] === 'off' ? 'Mengirim...' : 'OFF'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6">
            {filteredDevices.length > 0 ? (
              filteredDevices.map((device) => (
                <div key={device.id} className="bg-white rounded-xl shadow-md p-6">
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-sm text-gray-500">{device.location}</p>
                          <h3 className="text-lg font-bold text-gray-900 mt-1">{device.device_name}</h3>
                          <p className="text-xs text-gray-400 font-mono mt-1">{device.device_eui}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isDeviceOnline(device) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {isDeviceOnline(device) ? '● Online' : '○ Offline'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Daya</span>
                          <span className="font-semibold">{(parseFloat(String(device.current_power)) || 0).toFixed(2)} kW</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Suhu</span>
                          <span className="font-semibold">{(parseFloat(String(device.current_temperature)) || 0).toFixed(1)}°C</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tipe</span>
                          <span className="font-semibold text-blue-600">{device.device_type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Aplikasi</span>
                          <span className="font-semibold text-green-600">{device.application_type}</span>
                        </div>
                      </div>

                      {['ac', 'projector'].includes(String(device.device_type).toLowerCase()) && (
                        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex items-center space-x-1">
                            <span className="text-xs font-extrabold text-[#0f2d59] uppercase tracking-wider">Kendali:</span>
                            <span className="text-[10px] text-slate-400 font-semibold font-mono">#{device.id}</span>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleDummyControl(device.id, 'on')}
                              disabled={isDeviceOnline(device)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 duration-200 ${
                                isDeviceOnline(device)
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md'
                              }`}
                            >
                              ON
                            </button>
                            <button
                              onClick={() => handleDummyControl(device.id, 'off')}
                              disabled={!isDeviceOnline(device)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 duration-200 ${
                                !isDeviceOnline(device)
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                  : 'bg-red-600 text-white hover:bg-red-700 hover:shadow-md'
                              }`}
                            >
                              OFF
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600">Tidak ada perangkat ditemukan</p>
              </div>
            )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}


