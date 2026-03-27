'use client'

import { useState } from 'react'
import { Menu, Settings, Bell, AlertCircle, Trash2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

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
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  
  // Static dummy alerts data
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: 1,
      title: 'AC Temperature High',
      message: 'AC Kelas A temperature exceeded 25°C',
      severity: 'high',
      status: 'unread',
      device_id: 1,
      created_at: '2026-03-26T10:30:00',
    },
    {
      id: 2,
      title: 'Power Consumption Peak',
      message: 'AC Kelas B consuming 3.5 kW (above threshold)',
      severity: 'medium',
      status: 'unread',
      device_id: 2,
      created_at: '2026-03-26T09:15:00',
    },
    {
      id: 3,
      title: 'Normal Operation',
      message: 'All devices operating normally',
      severity: 'low',
      status: 'read',
      device_id: 3,
      created_at: '2026-03-26T08:00:00',
    },
    {
      id: 4,
      title: 'Maintenance Required',
      message: 'Lamp Kelas D requires maintenance check',
      severity: 'medium',
      status: 'unread',
      device_id: 4,
      created_at: '2026-03-25T14:20:00',
    },
  ])

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

  const handleMarkAsRead = (id: number) => {
    setAlerts(alerts.map(a => 
      a.id === id ? { ...a, status: 'read' } : a
    ))
  }

  const handleDelete = (id: number) => {
    setAlerts(alerts.filter(a => a.id !== id))
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`${
        sidebarOpen ? 'w-64' : 'w-20'
      } gradient-primary text-white transition-all duration-300 flex flex-col shadow-xl`}>
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
          <NavLink href="/" icon={<Menu size={20} />} label="Dasbor" sidebarOpen={sidebarOpen} />
          <NavLink href="/devices" icon={<Menu size={20} />} label="Perangkat" sidebarOpen={sidebarOpen} />
          <NavLink href="/analytics" icon={<Menu size={20} />} label="Analitik" sidebarOpen={sidebarOpen} />
          <NavLink href="/alerts" icon={<Bell size={20} />} label="Pemberitahuan" active sidebarOpen={sidebarOpen} />
        </nav>

        <div className="px-3 pb-6 space-y-2 border-t border-white/20 pt-4">
          <NavLink href="/settings" icon={<Settings size={20} />} label="Pengaturan" sidebarOpen={sidebarOpen} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Pemberitahuan</h2>
              <p className="text-gray-500 mt-1">Kelola pemberitahuan sistem</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Belum Dibaca</p>
                <p className="text-2xl font-bold text-red-600">{unreadCount}</p>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center space-x-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
            >
              <option value="all">Semua Status</option>
              <option value="unread">Belum Dibaca</option>
              <option value="read">Sudah Dibaca</option>
            </select>
          </div>
        </header>

        {/* Alerts List */}
        <div className="p-6">
          <div className="space-y-4">
            {filteredAlerts.length > 0 ? (
              filteredAlerts.map((alert) => (
                <div key={alert.id} className={`p-4 rounded-lg ${getSeverityColor(alert.severity)} flex items-start justify-between`}>
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
                        className="px-3 py-1 bg-white/50 hover:bg-white rounded-lg text-sm font-medium text-gray-700"
                      >
                        Mark Read
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(alert.id)}
                      className="p-2 hover:bg-red-200 rounded-lg text-red-600"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-white rounded-lg">
                <Bell size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Tidak ada pemberitahuan</p>
              </div>
            )}
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
