import type { Metadata } from 'next'
import './globals.css'
import AppShell from '@/components/AppShell'

export const metadata: Metadata = {
  title: 'Smart Energy Dashboard',
  description: 'Professional Energy Consumption Monitoring Dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-gray-50 to-gray-100">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
