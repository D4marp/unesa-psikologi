'use client'

import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer
} from 'recharts'
import { 
  Zap, AlertCircle, Settings, LogOut, Menu, 
  Gauge, Activity
} from 'lucide-react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

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
}

interface ChartDataPoint {
  time?: string
  month?: string
  ac: number
  lamp: number
}

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [timeRange, setTimeRange] = useState('24h')
  const [selectedClass, setSelectedClass] = useState('All')
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [energyData, setEnergyData] = useState<ChartDataPoint[]>([])
  const [monthlyData, setMonthlyData] = useState<ChartDataPoint[]>([])

  // Extract unique classes from devices
  const [classes, setClasses] = useState(['All'])

  // Load devices and consumption data
  useEffect(() => {
    // Use static dummy data
    const staticDevices = [
      { id: 1, device_eui: 'AC-KELAS-A-001', device_name: 'AC Kelas A', device_type: 'AC', application_type: 'cooling', location: 'Ruang A1', current_power: 2.5, current_temperature: 22.5, iot_status: 'online' },
      { id: 2, device_eui: 'AC-KELAS-B-001', device_name: 'AC Kelas B', device_type: 'AC', application_type: 'cooling', location: 'Ruang B1', current_power: 3.2, current_temperature: 23.1, iot_status: 'online' },
      { id: 3, device_eui: 'AC-KELAS-C-001', device_name: 'AC Kelas C', device_type: 'AC', application_type: 'cooling', location: 'Ruang C1', current_power: 2.8, current_temperature: 22.8, iot_status: 'online' },
      { id: 4, device_eui: 'LAMP-KELAS-D-001', device_name: 'Lampu Kelas D', device_type: 'Lampung', application_type: 'lighting', location: 'Ruang D1', current_power: 1.2, current_temperature: 20.0, iot_status: 'online' },
      { id: 5, device_eui: 'LAMP-KELAS-E-001', device_name: 'Lampu Kelas E', device_type: 'Lampung', application_type: 'lighting', location: 'Ruang E1', current_power: 1.5, current_temperature: 20.5, iot_status: 'online' },
    ]
    
    const uniqueClasses = ['All', ...new Set(staticDevices.map((d: Device) => d.location))]
    setClasses(uniqueClasses)
    setDevices(staticDevices)
    
    // Use static energy data for today
    setEnergyData([
      { time: '00:00', ac: 15, lamp: 8 },
      { time: '04:00', ac: 12, lamp: 5 },
      { time: '08:00', ac: 22, lamp: 18 },
      { time: '12:00', ac: 28, lamp: 25 },
      { time: '16:00', ac: 26, lamp: 22 },
      { time: '20:00', ac: 32, lamp: 28 },
      { time: '24:00', ac: 24, lamp: 18 },
    ])
    
    // Use static monthly data - full 12 months starting from April (installation completed)
    // Data starts from April 2025 through March 2026
    setMonthlyData([
      { month: 'Apr', ac: 350, lamp: 180 },  // Initial ramp-up after installation
      { month: 'May', ac: 450, lamp: 240 },  // Usage increases
      { month: 'Jun', ac: 520, lamp: 280 },  // Higher usage
      { month: 'Jul', ac: 600, lamp: 320 },  // Peak (hot season)
      { month: 'Aug', ac: 580, lamp: 310 },  // Still high
      { month: 'Sep', ac: 500, lamp: 270 },  // Usage decreases
      { month: 'Oct', ac: 420, lamp: 230 },  // Temperature cooler
      { month: 'Nov', ac: 380, lamp: 210 },  // Moderate usage
      { month: 'Dec', ac: 360, lamp: 200 },  // Low season (cool weather)
      { month: 'Jan', ac: 370, lamp: 205 },  // Still moderate
      { month: 'Feb', ac: 390, lamp: 215 },  // Slight increase
      { month: 'Mar', ac: 410, lamp: 225 },  // Back to moderate
    ])
    
    setLoading(false)
    setError(null)
  }, [])

  // Filter devices by selected class
  const filteredDevices = selectedClass === 'All' 
    ? devices 
    : devices.filter(d => d.location === selectedClass)

  // Calculate KPI values
  const totalPower = filteredDevices.reduce((sum, d) => sum + (parseFloat(String(d.current_power)) || 0), 0).toFixed(2)
  const acDevices = filteredDevices.filter(d => d.device_type === 'AC')
  const lampDevices = filteredDevices.filter(d => d.device_type === 'Lampung')
  
  const acPower = acDevices.reduce((sum, d) => sum + (parseFloat(String(d.current_power)) || 0), 0).toFixed(2)
  const lampPower = lampDevices.reduce((sum, d) => sum + (parseFloat(String(d.current_power)) || 0), 0).toFixed(2)

  // Calculate average efficiency
  const avgAcTemp = acDevices.length > 0 
    ? (acDevices.reduce((sum, d) => sum + (parseFloat(String(d.current_temperature)) || 0), 0) / acDevices.length).toFixed(1)
    : '0'

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

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center bg-white p-6 rounded-lg shadow">
          <AlertCircle className="text-red-500 mx-auto mb-4" size={32} />
          <p className="text-red-600 font-semibold">Error: {error}</p>
          <p className="text-gray-600 mt-2 text-sm">Silakan coba muat ulang halaman</p>
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
              <Image 
                src="/logo_unesa.png" 
                alt="UNESA Logo" 
                width={240} 
                height={80}
                priority
                className="w-full h-auto object-contain"
              />
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-white/20 rounded-lg"
          >
            <Menu size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-2">
          <NavItem icon={<Activity size={20} />} label="Dasbor" active sidebarOpen={sidebarOpen} href="/" />
          <NavItem icon={<Zap size={20} />} label="Perangkat" sidebarOpen={sidebarOpen} href="/devices" />
          <NavItem icon={<Gauge size={20} />} label="Analitik" sidebarOpen={sidebarOpen} href="/analytics" />
          <NavItem icon={<AlertCircle size={20} />} label="Pemberitahuan" sidebarOpen={sidebarOpen} href="/alerts" />
        </nav>

        <div className="px-3 pb-6 space-y-2 border-t border-white/20 pt-4">
          <NavItem icon={<Settings size={20} />} label="Pengaturan" sidebarOpen={sidebarOpen} href="/settings" />
          <NavItem icon={<LogOut size={20} />} label="Keluar" sidebarOpen={sidebarOpen} href="/" />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative z-10">
        {/* Header dengan Filter */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-8 py-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">UNESA Fakultas Psikologi.</h2>
                <p className="text-gray-500 mt-1">Pemantauan Konsumsi Energi Real-time per Kelas</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Total Daya Saat Ini</p>
                  <p className="text-2xl font-bold text-primary">
                    {totalPower} kW
                  </p>
                  <p className="text-xs text-green-600">↓ 8% vs kemarin</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
                  U
                </div>
              </div>
            </div>

            {/* Class Filter & Time Range */}
            <div className="flex items-center space-x-6 pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-gray-700">Pilih Kelas:</span>
                <div className="flex space-x-2 flex-wrap">
                  {classes.map((cls) => (
                    <button
                      key={cls}
                      onClick={() => setSelectedClass(cls)}
                      className={`px-3 py-2 rounded-lg font-medium smooth-transition text-sm ${
                        selectedClass === cls
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex space-x-2 ml-auto">
                {['24h', '7d', '30d'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-4 py-2 rounded-lg font-medium smooth-transition text-sm ${
                      timeRange === range
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPICard
              title="AC - Daya Saat Ini"
              value={`${acPower} kW`}
              change="+5%"
              icon={<Zap className="text-orange-500" size={20} />}
              bgColor="bg-orange-50"
            />
            <KPICard
              title="Lampu - Daya Saat Ini"
              value={`${lampPower} kW`}
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
              title="Total Perangkat Aktif"
              value={`${filteredDevices.filter(d => d.iot_status === 'online').length}`}
              change={`+1%`}
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
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Device Management */}
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-6">
            {/* AC & Lamp Devices Table */}
            <div className="bg-white rounded-xl card-shadow p-6 hover:shadow-xl smooth-transition">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Perangkat AC & Lampu</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Lokasi</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Perangkat</th>
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
                        <td className="py-3 px-4 text-gray-900 font-semibold">{(parseFloat(String(device.current_power)) || 0).toFixed(2)} kW</td>
                        <td className="py-3 px-4 text-gray-600">{(parseFloat(String(device.current_temperature)) || 0).toFixed(1)}°C</td>
                        <td className="py-3 px-4 text-gray-600 text-xs font-mono">{device.device_eui}</td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            device.iot_status === 'online' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {device.iot_status === 'online' ? '● Online' : '○ Offline'}
                          </span>
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

function NavItem({
  icon,
  label,
  active = false,
  sidebarOpen,
  href = '#'
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
  sidebarOpen: boolean
  href?: string
}) {
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
  
  // Generate hourly data for today with realistic pattern
  for (let hour = 0; hour < 24; hour += 4) {
    const time = String(hour).padStart(2, '0') + ':00'
    // Power varies realistically: low at night, peak during day
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
  
  // Generate last 6 months including current month
  for (let i = 5; i >= 0; i--) {
    const monthIndex = (currentMonth - i + 12) % 12
    const monthName = monthNames[monthIndex]
    
    // Seasonal variation: higher in summer, lower in winter
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
