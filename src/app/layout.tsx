import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'HS Classification Assistant',
  description: 'Legally defensible HS Code classification through AI-driven guidance',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-legal-light">
          <header className="bg-legal-blue text-white p-4">
            <div className="container mx-auto flex justify-between items-center">
              <h1 className="text-2xl font-bold">HS Classification Assistant</h1>
              <nav className="space-x-4">
                <a href="/" className="hover:underline">Home</a>
                <a href="/classify" className="hover:underline">New Classification</a>
                <a href="/history" className="hover:underline">History</a>
              </nav>
            </div>
          </header>
          <main className="container mx-auto p-4">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}