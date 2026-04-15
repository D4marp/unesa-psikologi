'use client'

import { useMemo, useEffect, useState } from 'react'
import { Menu, Settings, TrendingUp, Gauge, Zap, AlertCircle } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import Link from 'next/link'
import Image from 'next/image'
import { devicesAPI, consumptionAPI } from '@/lib/apiClient'

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
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedClass, setSelectedClass] = useState('All')
  const [timeRange, setTimeRange] = useState('30d')
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState(['All'])
  const [monthlyData, setMonthlyData] = useState<MonthlyPoint[]>([])
  const [dailyTrends, setDailyTrends] = useState<DailyPoint[]>([])
  const [deviceComparison, setDeviceComparison] = useState<any[]>([])

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

  const latestMonth = monthlyData.length ? monthlyData[monthlyData.length - 1] : { ac: 0, lamp: 0 }
  const totalCost = useMemo(() => {
    const totalLoad = dailyTrends.reduce((sum, item) => sum + item.ac + item.lamp, 0)
    return totalLoad * 1.2
  }, [dailyTrends])

  const costBreakdown = [
    { category: 'Peak Hours', cost: totalCost * 0.5, percentage: 50 },
    { category: 'Off-Peak', cost: totalCost * 0.33, percentage: 33 },
    { category: 'Renewable Offset', cost: totalCost * 0.17, percentage: 17 },
  ]

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

      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} gradient-primary text-white transition-all duration-300 flex flex-col shadow-xl relative z-20`}>
        <div className="p-4 flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex-1 w-full h-auto">
              <Image src="/logo_unesa.png" alt="UNESA Logo" width={240} height={80} priority className="w-full h-auto object-contain" />
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-white/20 rounded-lg">
            <Menu size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-2">
          <NavLink href="/" icon={<Zap size={20} />} label="Dasbor" sidebarOpen={sidebarOpen} />
          <NavLink href="/devices" icon={<Gauge size={20} />} label="Perangkat" sidebarOpen={sidebarOpen} />
          <NavLink href="/analytics" icon={<TrendingUp size={20} />} label="Analitik" active sidebarOpen={sidebarOpen} />
          <NavLink href="/alerts" icon={<AlertCircle size={20} />} label="Pemberitahuan" sidebarOpen={sidebarOpen} />
        </nav>

        <div className="px-3 pb-6 space-y-2 border-t border-white/20 pt-4">
          <NavLink href="/settings" icon={<Settings size={20} />} label="Pengaturan" sidebarOpen={sidebarOpen} />
        </div>
      </aside>

      <main className="flex-1 overflow-auto relative z-10">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-8 py-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Analitik AC & Lampu</h2>
                <p className="text-gray-500 mt-1">Analisis konsumsi energi terhubung API</p>
              </div>
            </div>

            <div className="flex items-center space-x-6 pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-gray-700">Kelas:</span>
                <div className="flex space-x-2">
                  {classes.map((cls) => (
                    <button key={cls} onClick={() => setSelectedClass(cls)} className={`px-3 py-2 rounded-lg font-medium smooth-transition text-sm ${selectedClass === cls ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      {cls}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex space-x-2 ml-auto">
                {['7d', '30d', '90d'].map((range) => (
                  <button key={range} onClick={() => setTimeRange(range)} className={`px-4 py-2 rounded-lg font-medium smooth-transition text-sm ${timeRange === range ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    {range}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <AnalyticsCard title="AC Konsumsi Bulan Ini" value={`${latestMonth.ac.toFixed(2)} kWh`} change="API" icon={<Zap className="text-orange-500" />} />
            <AnalyticsCard title="Lampu Konsumsi Bulan Ini" value={`${latestMonth.lamp.toFixed(2)} kWh`} change="API" icon={<Gauge className="text-blue-500" />} />
            <AnalyticsCard title="Total Biaya Estimasi" value={`Rp ${(totalCost * 1000).toLocaleString('id-ID')}`} change="API" icon={<TrendingUp className="text-green-500" />} />
            <AnalyticsCard title="Top Consumer" value={deviceComparison[0]?.device || '-'} change={`${(deviceComparison[0]?.consumption || 0).toFixed(2)} kWh`} icon={<AlertCircle className="text-teal-500" />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl card-shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tren Konsumsi Bulanan</h3>
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

            <div className="bg-white rounded-xl card-shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Puncak Penggunaan Harian</h3>
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
            <div className="bg-white rounded-xl card-shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Konsumen Energi Teratas</h3>
              <div className="space-y-3">
                {deviceComparison
                  .slice()
                  .sort((a, b) => b.consumption - a.consumption)
                  .map((device, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{device.device}</p>
                        <p className="text-sm text-gray-500">{Number(device.consumption || 0).toFixed(2)} kWh</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">Rp {(Number(device.cost || 0) * 1000).toLocaleString('id-ID')}</p>
                        <p className="text-sm text-gray-500">{Number(device.efficiency || 0).toFixed(1)}% efisien</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-white rounded-xl card-shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Analisis Rincian Biaya</h3>
              <div className="space-y-4">
                {costBreakdown.map((item, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between mb-2">
                      <span className="font-medium text-gray-900">{item.category}</span>
                      <span className="text-sm font-semibold text-gray-700">Rp {(item.cost * 1000).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-teal-500 to-blue-500" style={{ width: `${item.percentage}%` }} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{item.percentage}% dari total</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function NavLink({ href, icon, label, active = false, sidebarOpen }: any) {
  return (
    <Link
      href={href}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg smooth-transition ${
        active ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'
      }`}
    >
      {icon}
      {sidebarOpen && <span className="text-sm font-medium">{label}</span>}
    </Link>
  )
}

function AnalyticsCard({ title, value, change, icon }: any) {
  return (
    <div className="bg-white rounded-lg card-shadow p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <p className="text-xs text-green-600 font-medium mt-2">{change}</p>
        </div>
        <div className="p-3 bg-gray-100 rounded-lg">{icon}</div>
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
