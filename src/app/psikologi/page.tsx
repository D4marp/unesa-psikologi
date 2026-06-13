'use client'

import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer
} from 'recharts'
import { 
  Zap, Settings, LogOut, Menu, 
  Gauge, Activity, Clock, Building2
} from 'lucide-react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { devicesAPI, consumptionAPI } from '@/lib/apiClient'
import { useAuth } from '@/components/AuthProvider'

interface Device {
  id: number
  class_id: number
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

interface ChartDataPoint {
  time?: string
  month?: string
  ac: number
  lamp: number
  sensorTemp?: number
  sensorHumidity?: number
}

function isDeviceOnline(device: Device): boolean {
  const iot = String(device.iot_status || '').toLowerCase()
  const status = String(device.status || '').toLowerCase()
  return iot === 'online' || iot === 'active' || status === 'active' || status === 'idle'
}

export default function Dashboard() {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [timeRange, setTimeRange] = useState('24h')
  const [selectedClass, setSelectedClass] = useState('All')
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [energyData, setEnergyData] = useState<ChartDataPoint[]>([])
  const [monthlyData, setMonthlyData] = useState<ChartDataPoint[]>([])
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [now, setNow] = useState(new Date())

  // Clock effect
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Extract unique classes from devices
  const [classes, setClasses] = useState(['All'])

  // Load devices and consumption data from backend
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)
        
        // Fetch all devices from backend
        const devicesData = await devicesAPI.getAll()
        setDevices(devicesData || [])
        
        // Extract unique locations (classes)
        if (devicesData && devicesData.length > 0) {
          const uniqueClasses = ['All', ...new Set(devicesData.map((d: Device) => d.location))]
          setClasses(uniqueClasses)
        }
        
        setMonthlyData(buildMonthlyTypeSeries([], 6))
        
        setError(null)
      } catch (err) {
        console.error('Error loading dashboard data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
        // Show mock data on error
        setDevices([])
        setClasses(['All'])
        setEnergyData(generateMockCharData())
        setMonthlyData(buildMonthlyTypeSeries([], 6))
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  useEffect(() => {
    const loadMonthlyTrend = async () => {
      try {
        if (!devices || devices.length === 0) {
          setMonthlyData(buildMonthlyTypeSeries([], 6))
          return
        }

        const classId = selectedClass === 'All'
          ? undefined
          : devices.find((d) => d.location === selectedClass)?.class_id

        const summary = await consumptionAPI.getMonthlyTrendSummary(6, classId)
        setMonthlyData(buildMonthlyTypeSeries(summary || [], 6))
      } catch (e) {
        console.warn('Could not load monthly trend summary:', e)
        setMonthlyData(buildMonthlyTypeSeries([], 6))
      }
    }

    loadMonthlyTrend()
  }, [devices, selectedClass])

  useEffect(() => {
    const loadHourlyTrend = async () => {
      try {
        if (!devices || devices.length === 0) {
          setEnergyData(generateMockCharData())
          return
        }

        const today = new Date().toISOString().split('T')[0]

        if (selectedClass === 'All') {
          const classIds = [...new Set(devices.map((item) => item.class_id))]
          const perClassHourly = await Promise.all(
            classIds.map((id) => consumptionAPI.getHourlyAggregatedByClass(id, today).catch(() => []))
          )
          setEnergyData(mergeHourlySeries(perClassHourly as any[][]))
          return
        }

        const classId = devices.find((item) => item.location === selectedClass)?.class_id
        if (!classId) {
          setEnergyData(generateMockCharData())
          return
        }

        const hourly = await consumptionAPI.getHourlyAggregatedByClass(classId, today)
        setEnergyData((hourly || []).map((item: any) => ({
          time: item.time || item.hour_start || '00:00',
          ac: Number(item.ac ?? item.ac_total ?? 0),
          lamp: Number(item.lamp ?? item.lamp_total ?? 0),
          sensorTemp: Number(item.sensorTemp ?? item.avg_temperature ?? 0),
          sensorHumidity: Number(item.sensorHumidity ?? item.avg_humidity ?? 0),
        })))
      } catch (e) {
        console.warn('Could not load hourly consumption summary:', e)
        setEnergyData(generateMockCharData())
      }
    }

    loadHourlyTrend()
  }, [devices, selectedClass])

  // Filter devices by selected class
  const filteredDevices = selectedClass === 'All' 
    ? devices 
    : devices.filter(d => d.location === selectedClass)

  // Calculate KPI values
  const deviceTotalPower = filteredDevices.reduce((sum, d) => sum + (parseFloat(String(d.current_power)) || 0), 0)
  const acDevices = filteredDevices.filter(d => d.device_type === 'AC')
  const lampDevices = filteredDevices.filter(d => d.device_type === 'LAMP')
  const sensorDevices = filteredDevices.filter(d => d.device_type === 'SENSOR')
  
  const deviceAcPower = acDevices.reduce((sum, d) => sum + (parseFloat(String(d.current_power)) || 0), 0)
  const deviceLampPower = lampDevices.reduce((sum, d) => sum + (parseFloat(String(d.current_power)) || 0), 0)

  // Use only valid AC temperature readings; fallback to default 24°C when real data is unavailable.
  const validAcTemps = acDevices
    .map((d) => parseFloat(String(d.current_temperature)))
    .filter((temp) => Number.isFinite(temp) && temp > 0)

  const avgAcTemp = validAcTemps.length > 0
    ? (validAcTemps.reduce((sum, temp) => sum + temp, 0) / validAcTemps.length).toFixed(1)
    : '24.0'

  const latestHourlyPoint = energyData.length > 0 ? energyData[energyData.length - 1] : null
  const latestMonthlyPoint = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1] : null
  const latestSensorPoint = latestHourlyPoint || latestMonthlyPoint

  const currentAcPower = latestHourlyPoint && latestHourlyPoint.ac > 0
    ? latestHourlyPoint.ac
    : deviceAcPower

  const currentLampPower = latestHourlyPoint && latestHourlyPoint.lamp > 0
    ? latestHourlyPoint.lamp
    : deviceLampPower

  const totalPower = (latestHourlyPoint && (latestHourlyPoint.ac > 0 || latestHourlyPoint.lamp > 0)
    ? currentAcPower + currentLampPower
    : deviceTotalPower).toFixed(2)

  const avgSensorTemp = latestSensorPoint?.sensorTemp && latestSensorPoint.sensorTemp > 0
    ? latestSensorPoint.sensorTemp.toFixed(1)
    : '0'

  const latestSensorHumidity = latestSensorPoint?.sensorHumidity && latestSensorPoint.sensorHumidity > 0
    ? latestSensorPoint.sensorHumidity
    : 0

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data...</p>
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
                <Link href="/psikologi" className="block py-1.5 px-3 text-xs font-semibold text-white rounded bg-white/10">
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
      <main className="flex-1 overflow-auto relative z-10">
        {error && (
          <div className="mx-8 mt-6 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-yellow-800 shadow-sm">
            Data API belum tersedia. Dashboard tetap dibuka dengan data kosong/mock sementara.
          </div>
        )}

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
                <h1 className="text-white font-extrabold text-base tracking-tight leading-tight uppercase">Dashboard Energi Fakultas Psikologi</h1>
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

        {/* Content */}
        <div className="p-8">
          
          {/* Filters & Dynamic Statistics Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-50 text-[#0f2d59] rounded-lg">
                <Zap size={24} />
              </div>
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Konsumsi Fakultas Psikologi</p>
                <h3 className="text-2xl font-extrabold text-[#0f2d59] mt-0.5">{totalPower} kW</h3>
                <p className="text-xs text-green-600 font-semibold mt-1">↓ 8% vs kemarin</p>
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
                          ? 'bg-[#0f2d59] text-white shadow-sm'
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
                        ? 'bg-[#0f2d59] text-white shadow-sm'
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <KPICard
              title="AC - Daya Saat Ini"
              value={`${currentAcPower.toFixed(2)} kW`}
              change="+5%"
              icon={<Zap className="text-orange-500" size={20} />}
              bgColor="bg-orange-50"
            />
            <KPICard
              title="Lampu - Daya Saat Ini"
              value={`${currentLampPower.toFixed(2)} kW`}
              change="+3%"
              icon={<Zap className="text-blue-500" size={20} />}
              bgColor="bg-blue-50"
            />
            <KPICard
              title="Suhu AC Rata-rata"
              value={`${avgAcTemp}°C`}
              change="+2%"
              icon={<Gauge className="text-green-500" size={20} />}
              bgColor="bg-green-50"
            />
            <KPICard
              title="VS321 - Suhu Rata-rata"
              value={`${avgSensorTemp}°C`}
              change={`${latestSensorHumidity.toFixed(1)}% RH`}
              icon={<Activity className="text-cyan-600" size={20} />}
              bgColor="bg-cyan-50"
            />
            <KPICard
              title="Total Perangkat Aktif"
              value={`${filteredDevices.filter((d) => isDeviceOnline(d)).length}`}
              change={`${sensorDevices.length} sensor`}
              icon={<Activity className="text-purple-500" size={20} />}
              bgColor="bg-purple-50"
            />
          </div>

          {/* Advanced Analytics Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* AC & Lamp Consumption */}
            <div className="bg-white rounded-xl card-shadow p-6 hover:shadow-xl smooth-transition">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Konsumsi Daya AC & Lampu</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={energyData.length > 0 ? energyData : generateMockCharData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="time" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="ac" fill="#d8ae47" radius={[4, 4, 0, 0]} name="Daya AC (kW)" />
                  <Bar dataKey="lamp" fill="#483688" radius={[4, 4, 0, 0]} name="Daya Lampu (kW)" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly Trend */}
            <div className="bg-white rounded-xl card-shadow p-6 hover:shadow-xl smooth-transition">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tren Bulanan</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={monthlyData.length > 0 ? monthlyData : generateMockMonthlyData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="ac" stroke="#d8ae47" strokeWidth={2} name="AC (kWh)" />
                  <Line type="monotone" dataKey="lamp" stroke="#483688" strokeWidth={2} name="Lampu (kWh)" />
                  <Line type="monotone" dataKey="sensorTemp" stroke="#0ea5e9" strokeWidth={2} strokeDasharray="5 3" name="VS321 Suhu (°C)" />
                  <Line type="monotone" dataKey="sensorHumidity" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" name="VS321 Humidity (%)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Device Management */}
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-6">
            {/* AC & Lamp Devices Table */}
            <div className="bg-white rounded-xl card-shadow p-6 hover:shadow-xl smooth-transition">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Perangkat AC, Lampu, dan VS321 Sensor</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Lokasi</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Perangkat</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Tipe</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Daya (kW)</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Suhu (°C)</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Device EUI</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDevices.map((device) => (
                      <tr key={device.id} className="border-b border-gray-100 hover:bg-gray-50 smooth-transition">
                        <td className="py-3 px-4 font-medium text-gray-900">{device.location}</td>
                        <td className="py-3 px-4 text-gray-600">{device.device_name}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            device.device_type === 'AC'
                              ? 'bg-orange-100 text-orange-700'
                              : device.device_type === 'LAMP'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-cyan-100 text-cyan-700'
                          }`}>
                            {device.device_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-900 font-semibold">{(parseFloat(String(device.current_power)) || 0).toFixed(2)} kW</td>
                        <td className="py-3 px-4 text-gray-600">{(parseFloat(String(device.current_temperature)) || 0).toFixed(1)}°C</td>
                        <td className="py-3 px-4 text-gray-600 text-xs font-mono">{device.device_eui}</td>
                        <td className="py-3 px-4">
                          {(() => {
                            const online = isDeviceOnline(device)
                            return (
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            online
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {online ? '● Online' : '○ Offline'}
                          </span>
                            )
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}



function KPICard({
  title,
  value,
  change,
  icon,
  bgColor,
}: {
  title: string
  value: string
  change: string
  icon: React.ReactNode
  bgColor: string
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

// Dynamic helper functions for real-time mock data based on current date
function generateMockCharData(): ChartDataPoint[] {
  const data: ChartDataPoint[] = []
  
  for (let hour = 0; hour < 24; hour += 4) {
    const time = String(hour).padStart(2, '0') + ':00'
    const acBase = 15 + Math.sin((hour - 6) * Math.PI / 12) * 15 + Math.random() * 5
    const lampBase = 8 + Math.cos((hour - 12) * Math.PI / 12) * 10 + Math.random() * 3
    
    data.push({
      time,
      ac: Math.max(5, Math.round(acBase * 100) / 100),
      lamp: Math.max(2, Math.round(lampBase * 100) / 100),
    })
  }
  
  return data
}

function generateMockMonthlyData(): ChartDataPoint[] {
  const now = new Date()
  const currentMonth = now.getMonth()
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const data: ChartDataPoint[] = []
  
  for (let i = 5; i >= 0; i--) {
    const monthIndex = (currentMonth - i + 12) % 12
    const monthName = monthNames[monthIndex]
    
    const seasonalFactor = 1 + Math.sin((monthIndex - 5) * Math.PI / 6) * 0.3
    const acBase = 450 * seasonalFactor + Math.random() * 100
    const lampBase = 240 * seasonalFactor + Math.random() * 50
    
    data.push({
      month: monthName,
      ac: Math.round(acBase * 100) / 100,
      lamp: Math.round(lampBase * 100) / 100,
    })
  }
  
  return data
}

function mergeHourlySeries(seriesList: any[][]): ChartDataPoint[] {
  const hourMap = new Map<string, {
    time: string
    ac: number
    lamp: number
    sensorTemps: number[]
    sensorHumiditys: number[]
  }>()

  ;(seriesList || []).forEach((series) => {
    (series || []).forEach((item: any) => {
      const time = item.time || item.hour_start || '00:00'
      const existing = hourMap.get(time) || {
        time,
        ac: 0,
        lamp: 0,
        sensorTemps: [] as number[],
        sensorHumiditys: [] as number[],
      }

      existing.ac += Number(item.ac ?? item.ac_total ?? item.total_consumption ?? 0) || 0
      existing.lamp += Number(item.lamp ?? item.lamp_total ?? 0) || 0

      const sensorTemp = Number(item.sensorTemp ?? item.avg_temperature)
      const sensorHumidity = Number(item.sensorHumidity ?? item.avg_humidity)

      if (Number.isFinite(sensorTemp) && sensorTemp > 0) {
        existing.sensorTemps.push(sensorTemp)
      }

      if (Number.isFinite(sensorHumidity) && sensorHumidity > 0) {
        existing.sensorHumiditys.push(sensorHumidity)
      }

      hourMap.set(time, existing)
    })
  })

  return [...hourMap.values()]
    .sort((left, right) => left.time.localeCompare(right.time))
    .map((entry) => ({
      time: entry.time,
      ac: Math.round(entry.ac * 100) / 100,
      lamp: Math.round(entry.lamp * 100) / 100,
      sensorTemp: entry.sensorTemps.length > 0
        ? entry.sensorTemps.reduce((sum, value) => sum + value, 0) / entry.sensorTemps.length
        : 0,
      sensorHumidity: entry.sensorHumiditys.length > 0
        ? entry.sensorHumiditys.reduce((sum, value) => sum + value, 0) / entry.sensorHumiditys.length
        : 0,
    }))
}

function buildMonthlyTypeSeries(apiRows: any[], months: number = 6): ChartDataPoint[] {
  const monthMap: Record<string, { ac: number; lamp: number; sensorTemp: number; sensorHumidity: number }> = {}

  ;(apiRows || []).forEach((row: any) => {
    if (!row?.month_key) {
      return
    }

    const [yearStr, monthStr] = String(row.month_key).split('-')
    const year = parseInt(yearStr, 10)
    const monthIndex = parseInt(monthStr, 10) - 1
    if (Number.isNaN(year) || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
      return
    }

    const monthLabel = new Date(year, monthIndex, 1).toLocaleString('en-US', { month: 'short' })
    monthMap[monthLabel] = {
      ac: parseFloat(row.ac_total) || 0,
      lamp: parseFloat(row.lamp_total) || 0,
      sensorTemp: parseFloat(row.avg_temperature) || 0,
      sensorHumidity: parseFloat(row.avg_humidity) || 0,
    }
  })

  const now = new Date()
  const result: ChartDataPoint[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleString('en-US', { month: 'short' })
    result.push({
      month: label,
      ac: monthMap[label]?.ac || 0,
      lamp: monthMap[label]?.lamp || 0,
      sensorTemp: monthMap[label]?.sensorTemp || 0,
      sensorHumidity: monthMap[label]?.sensorHumidity || 0,
    })
  }

  return result
}
