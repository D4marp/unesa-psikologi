'use client'

import { useState, useEffect } from 'react'
import { Menu, Settings, TrendingUp, Gauge, Zap, AlertCircle } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import Link from 'next/link'
import Image from 'next/image'
import { devicesAPI, consumptionAPI } from '@/lib/apiClient'

interface Device {
  id: number
  location: string
  device_name: string
  current_power: number
  current_temperature: number
}

export default function AnalyticsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedClass, setSelectedClass] = useState('All')
  const [timeRange, setTimeRange] = useState('30d')
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState(['All'])
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [dailyTrends, setDailyTrends] = useState<any[]>([])

  // Load devices and consumption data from backend
  useEffect(() => {
    const loadAnalyticsData = async () => {
      try {
        setLoading(true)
        
        // Fetch devices from backend
        const devicesData = await devicesAPI.getAll()
        setDevices(devicesData || [])
        
        // Extract unique classes/locations
        if (devicesData && devicesData.length > 0) {
          const uniqueClasses = ['All', ...new Set(devicesData.map((d: Device) => d.location))]
          setClasses(uniqueClasses)
          
          // Load monthly consumption data (last 2 months)
          try {
            const currentDate = new Date()
            const currentMonth = currentDate.toISOString().substring(0, 7)
            
            const monthlyApi = await consumptionAPI.getMonthly(devicesData[0].id, currentMonth)
            if (monthlyApi && monthlyApi.length > 0) {
              const chartData = monthlyApi.map((item: any) => ({
                month: item.consumption_date?.substring(5, 7) || 'Apr',
                ac: parseFloat(item.consumption) || 0,
                lamp: 0,
                acEff: 82 + Math.random() * 10,
                lampEff: 85 + Math.random() * 10,
              }))
              setMonthlyData(chartData)
            }
          } catch (e) {
            console.warn('Could not load monthly data:', e)
            setMonthlyData(generateMockMonthlyData())
          }
          
          // Load daily trends (simulate from consumption API)
          try {
            const today = new Date().toISOString().split('T')[0]
            const dailyApi = await consumptionAPI.getHourly(devicesData[0].id, today)
            if (dailyApi && dailyApi.length > 0) {
              const chartData = dailyApi.map((item: any, idx: number) => ({
                day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][idx % 7],
                ac: parseFloat(item.consumption) || 0,
                lamp: Math.random() * 15,
              }))
              setDailyTrends(chartData)
            }
          } catch (e) {
            console.warn('Could not load daily trends:', e)
            setDailyTrends(generateMockDailyTrends())
          }
        }
      } catch (err) {
        console.error('Error loading analytics data:', err)
        setDevices([])
        setMonthlyData(generateMockMonthlyData())
        setDailyTrends(generateMockDailyTrends())
      } finally {
        setLoading(false)
      }
    }

    loadAnalyticsData()
  }, [])

  // Class Comparison (computed from devices)
  const deviceComparison = devices.length > 0 
    ? devices.map(d => ({
        device: d.location || 'Unknown',
        efficiency: Math.random() * 10 + 85,
        consumption: d.current_power || 0,
        cost: (d.current_power || 0) * 1.2
      }))
    : generateMockDeviceComparison()

  // Hourly pattern (dynamic based on current hour)
  const hourlyPattern = Array.from({ length: 6 }, (_, i) => {
    const h = (i * 4) % 24
    const hour = String(h).padStart(2, '0')
    // Realistic peak power during day (8-18), renewable peaks during day
    const loadBase = 30 + Math.sin((h - 6) * Math.PI / 12) * 40
    const renewableBase = Math.max(0, 40 + Math.sin((h - 10) * Math.PI / 8) * 35)
    return {
      hour,
      load: Math.round(Math.max(20, loadBase + Math.random() * 10) * 100) / 100,
      renewable: Math.round(Math.max(0, renewableBase + Math.random() * 8) * 100) / 100,
    }
  })

  // Cost breakdown (dynamic calculation)
  const totalCost = hourlyPattern.reduce((sum, item) => sum + item.load * 1.2, 0)
  const peakCost = totalCost * 0.5  // Peak hours = 50% of total
  const offPeakCost = totalCost * 0.33  // Off-peak = 33%
  const renewableCost = totalCost * 0.17  // Renewable = 17%
  
  const costBreakdown = [
    { category: 'Peak Hours', cost: Math.round(peakCost * 100) / 100, percentage: 50 },
    { category: 'Off-Peak', cost: Math.round(offPeakCost * 100) / 100, percentage: 33 },
    { category: 'Renewable', cost: Math.round(renewableCost * 100) / 100, percentage: 17 },
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
      backgroundImage: 'url(/Bg_image.png)',
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
        } gradient-primary text-white transition-all duration-300 flex flex-col shadow-xl relative z-20`}
      >
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

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative z-10">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-8 py-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Analitik AC & Lampu</h2>
                <p className="text-gray-500 mt-1">Analisis Konsumsi Energi Terperinci per Kelas</p>
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
          {/* KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <AnalyticsCard
              title="AC Konsumsi"
              value="450 kWh"
              change="+8.5%"
              icon={<Zap className="text-orange-500" />}
            />
            <AnalyticsCard
              title="Lampu Konsumsi"
              value="240 kWh"
              change="+5.2%"
              icon={<Gauge className="text-blue-500" />}
            />
            <AnalyticsCard
              title="AC Efisiensi"
              value="91%"
              change="+2%"
              icon={<TrendingUp className="text-green-500" />}
            />
            <AnalyticsCard
              title="Lampu Efisiensi"
              value="93%"
              change="+1%"
              icon={<TrendingUp className="text-teal-500" />}
            />
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Monthly Trend */}
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

            {/* Daily Patterns */}
            <div className="bg-white rounded-xl card-shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Puncak Penggunaan Harian</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                  <Legend />
                  <Bar dataKey="ac" fill="#d8ae47" name="AC Peak (kW)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="lamp" fill="#483688" name="Lamp Peak (kW)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Device Efficiency */}
            <div className="bg-white rounded-xl card-shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Analisis Efisiensi Perangkat</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={deviceComparison} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" stroke="#6b7280" />
                  <YAxis dataKey="device" type="category" stroke="#6b7280" width={80} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                  <Legend />
                  <Bar dataKey="efficiency" fill="#10B981" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Hourly Pattern */}
            <div className="bg-white rounded-xl card-shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Beban Per Jam vs Terbarukan</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={hourlyPattern}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="hour" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" yAxisId="left" />
                  <YAxis stroke="#6b7280" yAxisId="right" orientation="right" />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="load" stroke="#0F766E" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="renewable" stroke="#10B981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Summary Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Consumers */}
            <div className="bg-white rounded-xl card-shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Konsumen Energi Teratas</h3>
              <div className="space-y-3">
                {deviceComparison
                  .sort((a, b) => b.consumption - a.consumption)
                  .map((device, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{device.device}</p>
                        <p className="text-sm text-gray-500">{device.consumption} kWh hari ini</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">Rp {(device.cost * 1000).toLocaleString('id-ID')}</p>
                        <p className="text-sm text-gray-500">{device.efficiency}% efisien</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Cost Breakdown */}
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

// Dynamic helper function for mock device comparison based on current state
function generateMockDeviceComparison() {
  const classes = ['Kelas A', 'Kelas B', 'Kelas C', 'Kelas D', 'Kelas E']
  
  return classes.map(cls => {
    const baseConsumption = 3 + Math.random() * 2  // 3-5 kW
    const efficiency = 85 + Math.random() * 10     // 85-95%
    
    return {
      device: cls,
      efficiency: Math.round(efficiency * 10) / 10,
      consumption: Math.round(baseConsumption * 100) / 100,
      cost: Math.round(baseConsumption * 1.2 * 100) / 100,
    }
  })
}

function generateMockMonthlyData() {
  return [
    { month: 'Mar', ac: 0, lamp: 0, acEff: 0, lampEff: 0 },
    { month: 'Apr', ac: 350, lamp: 180, acEff: 82, lampEff: 85 },
  ]
}

function generateMockDailyTrends() {
  return [
    { day: 'Mon', ac: 25, lamp: 12 },
    { day: 'Tue', ac: 28, lamp: 14 },
    { day: 'Wed', ac: 22, lamp: 11 },
    { day: 'Thu', ac: 30, lamp: 15 },
    { day: 'Fri', ac: 32, lamp: 16 },
    { day: 'Sat', ac: 18, lamp: 9 },
    { day: 'Sun', ac: 15, lamp: 8 },
  ]
}
