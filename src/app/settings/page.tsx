'use client'

import { useState, useEffect } from 'react'
import { Menu, Settings, Save, ChevronRight, Bell, Lock, Eye, Mail, Smartphone, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { settingsAPI } from '@/lib/apiClient'

interface Setting {
  key: string
  value: string
  description?: string
}

export default function SettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState('general')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState({
    // General
    timezone: 'Asia/Jakarta',
    language: 'Indonesia',
    theme: 'light',
    
    // Notifications
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    alertSeverity: 'high',
    
    // Thresholds
    consumptionThreshold: 15,
    temperatureThreshold: 70,
    costThreshold: 50000,
    
    // Security
    twoFactor: false,
    sessionTimeout: 30,
    autoLogout: true,
  })

  // Load settings from API
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true)
        const apiSettings = await settingsAPI.getAll()
        
        // Merge API settings with defaults
        const mergedSettings = { ...settings }
        apiSettings.forEach((setting: Setting) => {
          const key = setting.key.replace(/\./g, '_')
          if (key in mergedSettings) {
            const value = setting.value
            const parsedValue = value === 'true' ? true : value === 'false' ? false : isNaN(Number(value)) ? value : Number(value)
            ;(mergedSettings as any)[key] = parsedValue
          }
        })
        
        setSettings(mergedSettings)
        setError(null)
      } catch (err) {
        console.error('Error loading settings:', err)
        setError(err instanceof Error ? err.message : 'Failed to load settings')
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [])

  const handleToggle = (key: keyof typeof settings) => {
    setSettings({ ...settings, [key]: !settings[key] })
  }

  const handleChange = (key: string, value: any) => {
    setSettings({ ...settings, [key]: value })
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      
      // Save each setting
      for (const [key, value] of Object.entries(settings)) {
        await settingsAPI.update(
          key.replace(/_/g, '.'),
          String(value)
        )
      }
      
      setError(null)
      alert('Pengaturan berhasil disimpan!')
    } catch (err) {
      console.error('Error saving settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat pengaturan...</p>
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
          <NavLink href="/" icon={<Settings size={20} />} label="Dasbor" sidebarOpen={sidebarOpen} />
          <NavLink href="/devices" icon={<Menu size={20} />} label="Perangkat" sidebarOpen={sidebarOpen} />
          <NavLink href="/analytics" icon={<AlertCircle size={20} />} label="Analitik" sidebarOpen={sidebarOpen} />
          <NavLink href="/alerts" icon={<Bell size={20} />} label="Pemberitahuan" sidebarOpen={sidebarOpen} />
        </nav>

        <div className="px-3 pb-6 space-y-2 border-t border-white/20 pt-4">
          <NavLink href="/settings" icon={<Settings size={20} />} label="Pengaturan" active sidebarOpen={sidebarOpen} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative z-10">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Pengaturan</h2>
              <p className="text-gray-500 mt-1">Konfigurasi sistem Smart Energy Anda</p>
            </div>
            <button 
              onClick={handleSave}
              disabled={isSaving || loading}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 smooth-transition"
            >
              <Save size={20} />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </div>
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 p-4 text-red-700">
              <p>Error: {error}</p>
            </div>
          )}
        </header>

        {/* Content */}
        <div className="flex h-[calc(100vh-120px)]">
          {/* Tab Menu */}
          <div className="w-64 bg-white border-r border-gray-200 p-6">
            <div className="space-y-2">
              {[
                { id: 'general', label: 'Pengaturan Umum', icon: <Settings size={18} /> },
                { id: 'notifications', label: 'Pemberitahuan', icon: <Bell size={18} /> },
                { id: 'thresholds', label: 'Ambang Pemberitahuan', icon: <AlertCircle size={18} /> },
                { id: 'security', label: 'Keamanan', icon: <Lock size={18} /> },
                { id: 'account', label: 'Akun', icon: <Menu size={18} /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg smooth-transition ${
                    activeTab === tab.id
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {tab.icon}
                    <span className="font-medium">{tab.label}</span>
                  </div>
                  <ChevronRight size={18} />
                </button>
              ))}
            </div>
          </div>

          {/* Settings Content */}
          <div className="flex-1 p-8 overflow-auto">
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="max-w-2xl">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Pengaturan Umum</h3>
                
                <div className="space-y-6">
                  <SettingItem
                    label="Zona Waktu"
                    description="Atur zona waktu lokal Anda"
                  >
                    <select
                      value={settings.timezone}
                      onChange={(e) => handleChange('timezone', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                    >
                      <option>Asia/Jakarta</option>
                      <option>Asia/Bangkok</option>
                      <option>Asia/Manila</option>
                    </select>
                  </SettingItem>

                  <SettingItem
                    label="Bahasa"
                    description="Pilih bahasa pilihan Anda"
                  >
                    <select
                      value={settings.language}
                      onChange={(e) => handleChange('language', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                    >
                      <option>Indonesia</option>
                      <option>English</option>
                      <option>Thai</option>
                    </select>
                  </SettingItem>

                  <SettingItem
                    label="Tema"
                    description="Pilih antara tema terang dan gelap"
                  >
                    <select
                      value={settings.theme}
                      onChange={(e) => handleChange('theme', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                    >
                      <option>Terang</option>
                      <option>Gelap</option>
                      <option>Otomatis</option>
                    </select>
                  </SettingItem>
                </div>
              </div>
            )}

            {/* Notifications */}
            {activeTab === 'notifications' && (
              <div className="max-w-2xl">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Preferensi Pemberitahuan</h3>
                
                <div className="space-y-4">
                  <ToggleItem
                    label="Pemberitahuan Email"
                    description="Terima pemberitahuan melalui email"
                    checked={settings.emailNotifications}
                    icon={<Mail size={20} />}
                    onChange={() => handleToggle('emailNotifications')}
                  />

                  <ToggleItem
                    label="Pemberitahuan SMS"
                    description="Terima pemberitahuan penting melalui SMS"
                    checked={settings.smsNotifications}
                    icon={<Smartphone size={20} />}
                    onChange={() => handleToggle('smsNotifications')}
                  />

                  <ToggleItem
                    label="Pemberitahuan Push"
                    description="Terima notifikasi push di perangkat Anda"
                    checked={settings.pushNotifications}
                    icon={<Bell size={20} />}
                    onChange={() => handleToggle('pushNotifications')}
                  />

                  <div className="bg-white rounded-xl card-shadow p-6 mt-6">
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Alert Severity Level</label>
                    <select
                      value={settings.alertSeverity}
                      onChange={(e) => handleChange('alertSeverity', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                    >
                      <option value="all">All Alerts</option>
                      <option value="high">High and Critical Only</option>
                      <option value="critical">Critical Only</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Thresholds */}
            {activeTab === 'thresholds' && (
              <div className="max-w-2xl">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Alert Thresholds</h3>
                
                <div className="space-y-6">
                  <SettingItem
                    label="Consumption Threshold"
                    description="Alert when consumption exceeds (kWh)"
                  >
                    <input
                      type="number"
                      value={settings.consumptionThreshold}
                      onChange={(e) => handleChange('consumptionThreshold', parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                    />
                  </SettingItem>

                  <SettingItem
                    label="Temperature Threshold"
                    description="Alert when temperature exceeds (°C)"
                  >
                    <input
                      type="number"
                      value={settings.temperatureThreshold}
                      onChange={(e) => handleChange('temperatureThreshold', parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                    />
                  </SettingItem>

                  <SettingItem
                    label="Cost Threshold"
                    description="Alert when daily cost exceeds (Rp)"
                  >
                    <input
                      type="number"
                      value={settings.costThreshold}
                      onChange={(e) => handleChange('costThreshold', parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                    />
                  </SettingItem>
                </div>
              </div>
            )}

            {/* Security */}
            {activeTab === 'security' && (
              <div className="max-w-2xl">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Security Settings</h3>
                
                <div className="space-y-4">
                  <ToggleItem
                    label="Two-Factor Authentication"
                    description="Add extra security to your account"
                    checked={settings.twoFactor}
                    icon={<Lock size={20} />}
                    onChange={() => handleToggle('twoFactor')}
                  />

                  <ToggleItem
                    label="Auto Logout"
                    description="Automatically logout when inactive"
                    checked={settings.autoLogout}
                    icon={<Eye size={20} />}
                    onChange={() => handleToggle('autoLogout')}
                  />

                  <div className="bg-white rounded-xl card-shadow p-6 mt-6">
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Session Timeout (minutes)</label>
                    <input
                      type="number"
                      value={settings.sessionTimeout}
                      onChange={(e) => handleChange('sessionTimeout', parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Account */}
            {activeTab === 'account' && (
              <div className="max-w-2xl">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Account Settings</h3>
                
                <div className="bg-white rounded-xl card-shadow p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Account Email</label>
                    <input
                      type="email"
                      defaultValue="user@example.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Full Name</label>
                    <input
                      type="text"
                      defaultValue="John Doe"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      defaultValue="+62 821 1234 5678"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>

                  <hr className="my-4" />

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Danger Zone</h4>
                    <button className="px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 smooth-transition font-medium">
                      Delete Account
                    </button>
                  </div>
                </div>
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

function SettingItem({ label, description, children }: any) {
  return (
    <div className="bg-white rounded-xl card-shadow p-6">
      <label className="block text-sm font-semibold text-gray-900 mb-2">{label}</label>
      <p className="text-xs text-gray-500 mb-4">{description}</p>
      {children}
    </div>
  )
}

function ToggleItem({ label, description, checked, icon, onChange }: any) {
  return (
    <div className="bg-white rounded-xl card-shadow p-6 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <div className="p-3 bg-gray-100 rounded-lg text-gray-600">{icon}</div>
        <div>
          <p className="font-semibold text-gray-900">{label}</p>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      <button
        onClick={onChange}
        className={`relative inline-flex h-8 w-14 items-center rounded-full smooth-transition ${
          checked ? 'bg-primary' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-6 w-6 transform rounded-full bg-white smooth-transition ${
            checked ? 'translate-x-7' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}
