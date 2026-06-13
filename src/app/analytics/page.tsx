'use client'

import { useMemo, useEffect, useState } from 'react'
import { Menu, Settings, TrendingUp, Gauge, Zap, AlertCircle, Building2, Activity, Clock, LogOut } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import Link from 'next/link'
import Image from 'next/image'
import { devicesAPI, consumptionAPI } from '@/lib/apiClient'
import { useAuth } from '@/components/AuthProvider'

interface Device {
  id: number
  class_id: number
  location: string
  device_name: string
  device_type: string
  current_power: number
}

interface MonthlyPoint {
  month: string
  ac: number
  lamp: number
}

interface DailyPoint {
  day: string
  ac: number
  lamp: number
}

export default function AnalyticsPage() {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedClass, setSelectedClass] = useState('All')
  const [timeRange, setTimeRange] = useState('30d')
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState(['All'])
  const [monthlyData, setMonthlyData] = useState<MonthlyPoint[]>([])
  const [dailyTrends, setDailyTrends] = useState<DailyPoint[]>([])
  const [deviceComparison, setDeviceComparison] = useState<any[]>([])
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [now, setNow] = useState(new Date())

  // Clock effect
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const loadDevices = async () => {
      try {
        setLoading(true)
        const devicesData = await devicesAPI.getAll()
        const list = (devicesData || []) as Device[]
        setDevices(list)

        if (list.length > 0) {
          const uniqueClasses = ['All', ...new Set(list.map((item) => item.location))]
          setClasses(uniqueClasses)
        }
      } catch (error) {
        console.error('Error loading devices:', error)
        setDevices([])
      } finally {
        setLoading(false)
      }
    }

    loadDevices()
  }, [])

  useEffect(() => {
    const loadAnalytics = async () => {
      if (!devices.length) {
        setMonthlyData(buildMonthlySeries([], 6))
        setDailyTrends([])
        setDeviceComparison([])
        return
      }

      try {
        const classId = selectedClass === 'All'
          ? undefined
          : devices.find((item) => item.location === selectedClass)?.class_id

        const summary = await consumptionAPI.getMonthlyTrendSummary(6, classId)
        setMonthlyData(buildMonthlySeries(summary || [], 6))

        const today = new Date().toISOString().split('T')[0]
        if (classId) {
          const hourly = await consumptionAPI.getHourlyAggregatedByClass(classId, today)
          setDailyTrends(buildDailyFromHourly(hourly || []))

          const startDate = shiftDateByDays(today, timeRange === '7d' ? 6 : timeRange === '30d' ? 29 : 89)
          const totals = await consumptionAPI.getTotalByClass(classId, startDate, today)
          setDeviceComparison((totals || []).map((item: any) => ({
            device: item.device_name,
            efficiency: Math.round((90 - Math.min(40, Number(item.avg_consumption || 0) * 2)) * 10) / 10,
            consumption: Number(item.total_consumption || 0),
            cost: Number(item.total_consumption || 0) * 1.2,
          })))
        } else {
          const classIds = [...new Set(devices.map((item) => item.class_id))]
          const perClassHourly = await Promise.all(
            classIds.map((id) => consumptionAPI.getHourlyAggregatedByClass(id, today).catch(() => []))
          )
          const mergedHourly = mergeHourlySeries(perClassHourly as any[][])
          setDailyTrends(buildDailyFromHourly(mergedHourly))

          const locationTotals = new Map<string, number>()
          devices.forEach((item) => {
            locationTotals.set(item.location, (locationTotals.get(item.location) || 0) + Number(item.current_power || 0))
          })
          setDeviceComparison(
            [...locationTotals.entries()].map(([device, consumption]) => ({
              device,
              efficiency: Math.round((90 - Math.min(40, consumption * 2)) * 10) / 10,
              consumption,
              cost: consumption * 1.2,
            }))
          )
        }
      } catch (error) {
        console.error('Error loading analytics:', error)
        setMonthlyData(buildMonthlySeries([], 6))
        setDailyTrends([])
        setDeviceComparison([])
      }
    }

    loadAnalytics()
  }, [devices, selectedClass, timeRange])

  const latestMonth = useMemo(() => {
    return monthlyData.length ? monthlyData[monthlyData.length - 1] : { ac: 0, lamp: 0 }
  }, [monthlyData])

  const totalCost = useMemo(() => {
    const totalLoad = dailyTrends.reduce((sum, item) => sum + item.ac + item.lamp, 0)
    return totalLoad * 1.2
  }, [dailyTrends])

  const costBreakdown = useMemo(() => {
    return [
      { category: 'Peak Hours', cost: totalCost * 0.5, percentage: 50 },
      { category: 'Off-Peak', cost: totalCost * 0.33, percentage: 33 },
      { category: 'Renewable Offset', cost: totalCost * 0.17, percentage: 17 },
    ]
  }, [totalCost])

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data analitik...</p>
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
                <Link href="/analytics" className="block py-1.5 px-3 text-xs font-semibold text-white rounded bg-white/10">
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
                <h1 className="text-white font-extrabold text-base tracking-tight leading-tight uppercase">Dashboard Analitik Fakultas Psikologi</h1>
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
          {/* Clean Modern Filter Card */}
          <div className="mx-8 mt-6 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Kelas:</span>
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
            
            <div className="flex bg-slate-100 p-1 rounded border border-slate-200">
              {['7d', '30d', '90d'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    timeRange === range
                      ? 'bg-[#0f2d59] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <AnalyticsCard title="AC Konsumsi Bulan Ini" value={`${latestMonth.ac.toFixed(2)} kWh`} change="Dinamis" icon={<Zap className="text-orange-500" />} />
              <AnalyticsCard title="Lampu Konsumsi Bulan Ini" value={`${latestMonth.lamp.toFixed(2)} kWh`} change="Dinamis" icon={<Gauge className="text-blue-500" />} />
              <AnalyticsCard title="Total Biaya Estimasi" value={`Rp ${(totalCost * 1000).toLocaleString('id-ID')}`} change="Dinamis" icon={<TrendingUp className="text-green-500" />} />
              <AnalyticsCard title="Top Consumer" value={deviceComparison[0]?.device || '-'} change={`${(deviceComparison[0]?.consumption || 0).toFixed(2)} kWh`} icon={<AlertCircle className="text-teal-500" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Tren Konsumsi Bulanan</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                    <Legend />
                    <Line type="monotone" dataKey="ac" stroke="#d8ae47" strokeWidth={2} name="AC (kWh)" />
                    <Line type="monotone" dataKey="lamp" stroke="#483688" strokeWidth={2} name="Lampu (kWh)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Puncak Penggunaan Harian</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="day" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                    <Legend />
                    <Bar dataKey="ac" fill="#d8ae47" name="AC (kW)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="lamp" fill="#483688" name="Lamp (kW)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Konsumen Energi Teratas</h3>
                <div className="space-y-3">
                  {deviceComparison
                    .slice()
                    .sort((a, b) => b.consumption - a.consumption)
                    .map((device, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-slate-100">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{device.device}</p>
                          <p className="text-xs text-gray-500">{Number(device.consumption || 0).toFixed(2)} kWh</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">Rp {(Number(device.cost || 0) * 1000).toLocaleString('id-ID')}</p>
                          <p className="text-[10px] text-gray-500 font-bold">{Number(device.efficiency || 0).toFixed(1)}% efisien</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Analisis Rincian Biaya</h3>
                <div className="space-y-4">
                  {costBreakdown.map((item, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-xs font-bold text-gray-700">{item.category}</span>
                        <span className="text-xs font-bold text-gray-900">Rp {(item.cost * 1000).toLocaleString('id-ID')}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-yellow-500 to-[#0f2d59]" style={{ width: `${item.percentage}%` }} />
                      </div>
                      <p className="text-[10px] text-gray-500 font-bold mt-1">{item.percentage}% dari total</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function AnalyticsCard({ title, value, change, icon }: any) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{title}</p>
          <p className="text-xl font-black text-slate-800 mt-1">{value}</p>
          <p className="text-[10px] text-green-600 font-bold mt-1">{change}</p>
        </div>
        <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">{icon}</div>
      </div>
    </div>
  )
}

function shiftDateByDays(date: string, daysBack: number) {
  const d = new Date(date)
  d.setDate(d.getDate() - daysBack)
  return d.toISOString().split('T')[0]
}

function buildMonthlySeries(apiRows: any[], months: number): MonthlyPoint[] {
  const monthMap: Record<string, { ac: number; lamp: number }> = {}

  ;(apiRows || []).forEach((row) => {
    if (!row?.month_key) return
    const [yearStr, monthStr] = String(row.month_key).split('-')
    const year = parseInt(yearStr, 10)
    const monthIndex = parseInt(monthStr, 10) - 1
    if (Number.isNaN(year) || Number.isNaN(monthIndex)) return

    const monthLabel = new Date(year, monthIndex, 1).toLocaleString('en-US', { month: 'short' })
    monthMap[monthLabel] = {
      ac: Number(row.ac_total || 0),
      lamp: Number(row.lamp_total || 0),
    }
  })

  const now = new Date()
  const series: MonthlyPoint[] = []
  for (let i = months - 1; i >= 0; i--) {
    const current = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const month = current.toLocaleString('en-US', { month: 'short' })
    series.push({ month, ac: monthMap[month]?.ac || 0, lamp: monthMap[month]?.lamp || 0 })
  }

  return series
}

function buildDailyFromHourly(apiRows: any[]): DailyPoint[] {
  const rows = (apiRows || []).slice(0, 7)
  return rows.map((item, index) => ({
    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index],
    ac: Number(item.ac || 0),
    lamp: Number(item.lamp || 0),
  }))
}

function mergeHourlySeries(perClassRows: any[][]) {
  const map: Record<string, { time: string; ac: number; lamp: number }> = {}

  perClassRows.forEach((rows) => {
    ;(rows || []).forEach((row: any) => {
      const key = row.time
      if (!map[key]) {
        map[key] = { time: key, ac: 0, lamp: 0 }
      }
      map[key].ac += Number(row.ac || 0)
      map[key].lamp += Number(row.lamp || 0)
    })
  })

  return Object.values(map).sort((a, b) => a.time.localeCompare(b.time))
}
