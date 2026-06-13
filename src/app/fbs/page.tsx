'use client'

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts'
import {
  Zap, Settings, Menu, Gauge, Activity, LogOut, Clock, Building2, Power
} from 'lucide-react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/components/AuthProvider'

// ─── Dummy Data ───────────────────────────────────────────────────────────────

interface DummyDevice {
  id: number
  location: string
  device_name: string
  device_type: 'AC' | 'LAMP' | 'SENSOR'
  device_eui: string
  current_power: number
  current_temperature: number
  status: 'online' | 'offline'
}

const INITIAL_DEVICES: DummyDevice[] = [
  // BS-101
  { id: 1, location: 'BS-101', device_name: 'AC BS-101 Unit 1', device_type: 'AC', device_eui: 'FBS-AC-101A', current_power: 2.4, current_temperature: 24, status: 'online' },
  { id: 2, location: 'BS-101', device_name: 'Lampu BS-101', device_type: 'LAMP', device_eui: 'FBS-LM-101A', current_power: 0.8, current_temperature: 0, status: 'online' },
  // BS-102
  { id: 3, location: 'BS-102', device_name: 'AC BS-102 Unit 1', device_type: 'AC', device_eui: 'FBS-AC-102A', current_power: 2.1, current_temperature: 25, status: 'online' },
  { id: 4, location: 'BS-102', device_name: 'Lampu BS-102', device_type: 'LAMP', device_eui: 'FBS-LM-102A', current_power: 0.6, current_temperature: 0, status: 'offline' },
  // BS-103
  { id: 5, location: 'BS-103', device_name: 'AC BS-103 Unit 1', device_type: 'AC', device_eui: 'FBS-AC-103A', current_power: 1.8, current_temperature: 26, status: 'online' },
  { id: 6, location: 'BS-103', device_name: 'Lampu BS-103', device_type: 'LAMP', device_eui: 'FBS-LM-103A', current_power: 0.7, current_temperature: 0, status: 'online' },
  // Lab Bahasa
  { id: 7, location: 'Lab Bahasa', device_name: 'AC Lab Bahasa', device_type: 'AC', device_eui: 'FBS-AC-LBA', current_power: 3.2, current_temperature: 23, status: 'online' },
  { id: 8, location: 'Lab Bahasa', device_name: 'Lampu Lab Bahasa', device_type: 'LAMP', device_eui: 'FBS-LM-LBA', current_power: 1.2, current_temperature: 0, status: 'online' },
  { id: 9, location: 'Lab Bahasa', device_name: 'Sensor Suhu Lab', device_type: 'SENSOR', device_eui: 'FBS-SN-LBA', current_power: 0.1, current_temperature: 28.5, status: 'online' },
  // Ruang Seni
  { id: 10, location: 'Ruang Seni', device_name: 'AC Ruang Seni', device_type: 'AC', device_eui: 'FBS-AC-RSN', current_power: 2.8, current_temperature: 24, status: 'online' },
  { id: 11, location: 'Ruang Seni', device_name: 'Lampu Ruang Seni', device_type: 'LAMP', device_eui: 'FBS-LM-RSN', current_power: 2.1, current_temperature: 0, status: 'online' },
  { id: 12, location: 'Ruang Seni', device_name: 'Sensor Ruang Seni', device_type: 'SENSOR', device_eui: 'FBS-SN-RSN', current_power: 0.1, current_temperature: 30.2, status: 'online' },
]

function generateHourlyData() {
  const hours = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00']
  return hours.map((time, i) => {
    const factor = Math.sin((i - 1) * Math.PI / 10) * 0.4 + 0.8
    return {
      time,
      ac: Math.round((10 + factor * 12 + Math.random() * 3) * 10) / 10,
      lamp: Math.round((3 + factor * 4 + Math.random() * 1.5) * 10) / 10,
    }
  })
}

function generateMonthlyData() {
  const now = new Date()
  const names = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des']
  return Array.from({ length: 6 }, (_, i) => {
    const mIdx = (now.getMonth() - 5 + i + 12) % 12
    const factor = 0.85 + Math.sin(i * 0.7) * 0.2
    
    // FBS starts in May (Mei) -> mIdx >= 4 (May is index 4)
    const active = mIdx >= 4
    return {
      month: names[mIdx],
      ac: active ? Math.round((340 * factor + Math.random() * 40) * 10) / 10 : 0,
      lamp: active ? Math.round((150 * factor + Math.random() * 25) * 10) / 10 : 0,
    }
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FBSDashboard() {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedClass, setSelectedClass] = useState('All')
  const [devices, setDevices] = useState<DummyDevice[]>(INITIAL_DEVICES)
  const [timeRange, setTimeRange] = useState('24h')
  const [hourlyData] = useState(generateHourlyData())
  const [monthlyData] = useState(generateMonthlyData())
  const [classControlLoading, setClassControlLoading] = useState<Record<string, boolean>>({})
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [now, setNow] = useState(new Date())

  // Clock effect
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const classes = ['All', ...Array.from(new Set(devices.map(d => d.location)))]
  const filtered = selectedClass === 'All' ? devices : devices.filter(d => d.location === selectedClass)

  const acDevices = filtered.filter(d => d.device_type === 'AC' && d.status === 'online')
  const lampDevices = filtered.filter(d => d.device_type === 'LAMP' && d.status === 'online')
  const sensorDevices = filtered.filter(d => d.device_type === 'SENSOR')
  const acPower = acDevices.reduce((s, d) => s + d.current_power, 0)
  const lampPower = lampDevices.reduce((s, d) => s + d.current_power, 0)
  const avgTemp = acDevices.length > 0
    ? (acDevices.reduce((s, d) => s + d.current_temperature, 0) / acDevices.length).toFixed(1)
    : '—'
  const activeCount = filtered.filter(d => d.status === 'online').length

  const classLocations = Array.from(new Set(filtered.map(d => d.location)))

  const handleClassControl = (location: string, action: 'on' | 'off') => {
    setClassControlLoading(prev => ({ ...prev, [location]: true }))
    setTimeout(() => {
      setDevices(prev => prev.map(d =>
        d.location === location ? { ...d, status: action === 'on' ? 'online' : 'offline' } : d
      ))
      setClassControlLoading(prev => ({ ...prev, [location]: false }))
    }, 600)
  }

  return (
    <div className="flex h-screen" style={{
      backgroundImage: 'url(/bg_unesa2.png)',
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed'
    }}>
      <div className="absolute inset-0 bg-white/40 pointer-events-none" />

      {/* Sidebar */}
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
          
          <Link href="/psikologi" className="flex items-center space-x-3 px-4 py-2.5 rounded text-white/70 hover:bg-white/5 hover:text-white transition-all">
            <Activity size={18} />
            {sidebarOpen && <span className="text-sm">Fakultas Psikologi</span>}
          </Link>

          <div className="space-y-1">
            <Link href="/fbs" className="flex items-center space-x-3 px-4 py-2.5 rounded text-white bg-white/10 font-bold transition-all">
              <Activity size={18} className="text-[#f1c40f]" />
              {sidebarOpen && <span className="text-sm">Fakultas Bahasa & Seni</span>}
            </Link>
            
            {/* Sub-menu for FBS */}
            {sidebarOpen && (
              <div className="pl-8 space-y-1 border-l border-white/10 ml-6">
                <Link href="/fbs" className="block py-1.5 px-3 text-xs font-semibold text-white rounded bg-white/10">
                  Dasbor
                </Link>
                <Link href="/fbs" className="block py-1.5 px-3 text-xs text-white/60 hover:text-white rounded hover:bg-white/5">
                  Perangkat
                </Link>
                <Link href="/fbs" className="block py-1.5 px-3 text-xs text-white/60 hover:text-white rounded hover:bg-white/5">
                  Analitik
                </Link>
                <Link href="/fbs" className="block py-1.5 px-3 text-xs text-white/60 hover:text-white rounded hover:bg-white/5">
                  Pemberitahuan
                </Link>
              </div>
            )}
          </div>
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
      <main className="flex-1 overflow-auto relative z-10">
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
                <h1 className="text-white font-extrabold text-base tracking-tight leading-tight uppercase">Dashboard Energi Fakultas Bahasa & Seni</h1>
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
                    <p className="text-[10px] text-[#f1c40f] font-bold leading-none mt-1 uppercase">FBS</p>
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

        {/* Content Area */}
        <div className="p-8">
          
          {/* Filters & Dynamic Statistics Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-teal-50 text-teal-700 rounded-lg">
                <Zap size={24} />
              </div>
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Konsumsi Fakultas Bahasa & Seni</p>
                <h3 className="text-2xl font-extrabold text-[#0D5C63] mt-0.5">{(acPower + lampPower).toFixed(2)} kW</h3>
                <p className="text-xs text-green-600 font-semibold mt-1">↓ 5% vs kemarin</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1 justify-end">
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Pilih Kelas:</span>
                <div className="flex flex-wrap gap-1.5">
                  {classes.map((cls) => (
                    <button
                      key={cls}
                      onClick={() => setSelectedClass(cls)}
                      className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                        selectedClass === cls
                          ? 'bg-[#0D5C63] text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex space-x-1 bg-slate-100 p-1 rounded border border-slate-200">
                {['24h', '7d', '30d'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                      timeRange === range
                        ? 'bg-[#0D5C63] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPICard title="AC — Daya Aktif" value={`${acPower.toFixed(2)} kW`} change="+3% vs kemarin" icon={<Zap className="text-orange-500" size={20} />} bgColor="bg-orange-50" />
            <KPICard title="Lampu — Daya Aktif" value={`${lampPower.toFixed(2)} kW`} change="+1% vs kemarin" icon={<Zap className="text-yellow-500" size={20} />} bgColor="bg-yellow-50" />
            <KPICard title="Suhu AC Rata-rata" value={avgTemp !== '—' ? `${avgTemp}°C` : '—'} change="Kondisi normal" icon={<Gauge className="text-teal-500" size={20} />} bgColor="bg-teal-50" />
            <KPICard title="Total Device Aktif" value={`${activeCount} / ${filtered.length}`} change={`${sensorDevices.length} sensor`} icon={<Activity className="text-purple-500" size={20} />} bgColor="bg-purple-50" />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl card-shadow p-6 hover:shadow-xl smooth-transition">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Konsumsi Daya per Jam (Hari Ini)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }} />
                  <Legend />
                  <Bar dataKey="ac" fill="#0D5C63" radius={[4,4,0,0]} name="Daya AC (kW)" />
                  <Bar dataKey="lamp" fill="#2DC653" radius={[4,4,0,0]} name="Daya Lampu (kW)" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl card-shadow p-6 hover:shadow-xl smooth-transition">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tren Bulanan (6 Bulan)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }} />
                  <Legend />
                  <Line type="monotone" dataKey="ac" stroke="#0D5C63" strokeWidth={2.5} name="AC (kWh)" dot={{ fill: '#0D5C63', r: 4 }} />
                  <Line type="monotone" dataKey="lamp" stroke="#2DC653" strokeWidth={2.5} name="Lampu (kWh)" dot={{ fill: '#2DC653', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Class Controls */}
          {classLocations.length > 0 && (
            <div className="bg-white rounded-xl card-shadow p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🕹️ Kontrol ON/OFF Per Ruangan</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {classLocations.map(loc => {
                  const locDevices = filtered.filter(d => d.location === loc)
                  const anyOn = locDevices.some(d => d.status === 'online')
                  return (
                    <div key={loc} className="rounded-xl border border-gray-200 p-4 hover:border-teal-300 smooth-transition">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-gray-900">{loc}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${anyOn ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {anyOn ? '● Aktif' : '○ Mati'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">{locDevices.length} perangkat di ruangan ini</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleClassControl(loc, 'on')}
                          disabled={classControlLoading[loc]}
                          className="rounded-lg bg-green-600 hover:bg-green-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-60 smooth-transition"
                        >
                          {classControlLoading[loc] ? 'Mengirim...' : '▶ ON'}
                        </button>
                        <button
                          onClick={() => handleClassControl(loc, 'off')}
                          disabled={classControlLoading[loc]}
                          className="rounded-lg bg-red-600 hover:bg-red-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-60 smooth-transition"
                        >
                          {classControlLoading[loc] ? 'Mengirim...' : '⏹ OFF'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Device Table */}
          <div className="bg-white rounded-xl card-shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Perangkat FBS</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    {['Ruangan', 'Perangkat', 'Tipe', 'Daya (kW)', 'Suhu (°C)', 'Device EUI', 'Status', 'Aksi'].map(h => (
                      <th key={h} className="text-left py-3 px-4 font-semibold text-gray-700">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(device => (
                    <tr key={device.id} className="border-b border-gray-100 hover:bg-gray-50 smooth-transition">
                      <td className="py-3 px-4 font-medium text-gray-900">{device.location}</td>
                      <td className="py-3 px-4 text-gray-600">{device.device_name}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          device.device_type === 'AC' ? 'bg-orange-100 text-orange-700' :
                          device.device_type === 'LAMP' ? 'bg-yellow-100 text-yellow-700' : 'bg-cyan-100 text-cyan-700'
                        }`}>{device.device_type}</span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-900">{device.current_power.toFixed(2)}</td>
                      <td className="py-3 px-4 text-gray-600">{device.current_temperature > 0 ? `${device.current_temperature}°C` : '—'}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs font-mono">{device.device_eui}</td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          device.status === 'online' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {device.status === 'online' ? '● Online' : '○ Offline'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setDevices(prev => prev.map(d =>
                            d.id === device.id ? { ...d, status: d.status === 'online' ? 'offline' : 'online' } : d
                          ))}
                          className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold smooth-transition ${
                            device.status === 'online'
                              ? 'bg-red-100 hover:bg-red-200 text-red-700'
                              : 'bg-green-100 hover:bg-green-200 text-green-700'
                          }`}
                        >
                          <Power size={12} />
                          <span>{device.status === 'online' ? 'Matikan' : 'Nyalakan'}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}



function KPICard({ title, value, change, icon, bgColor }: {
  title: string; value: string; change: string; icon: React.ReactNode; bgColor: string
}) {
  return (
    <div className="bg-white rounded-lg card-shadow p-4 hover:shadow-lg smooth-transition">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <p className="text-xs text-green-600 font-medium mt-2">{change}</p>
        </div>
        <div className={`${bgColor} p-3 rounded-lg`}>{icon}</div>
      </div>
    </div>
  )
}
