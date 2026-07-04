'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void
        close: () => void
        initDataUnsafe: {
          user?: {
            id: number
            first_name: string
            last_name?: string
            username?: string
          }
        }
      }
    }
  }
}

export default function HomePage() {
  const [user, setUser] = useState<{ id: number; name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let tgUser: { id: number; first_name: string } | undefined
    try {
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.ready()
        tgUser = window.Telegram.WebApp.initDataUnsafe.user
      }
    } catch {}
    if (tgUser) {
      setUser({ id: tgUser.id, name: tgUser.first_name })
    }
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <main style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f0f1a',
        color: '#eee',
        fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📸</div>
          <p>Loading...</p>
        </div>
      </main>
    )
  }

  if (!user) {
    return (
      <main style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f0f1a',
        color: '#eee',
        fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
        padding: '20px',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📸</div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Yena Photo</h1>
          <p style={{ color: '#8899aa', fontSize: '0.9rem' }}>
            Open this page from the Telegram bot.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#0f0f1a',
      color: '#eee',
      fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <div style={{ fontSize: '4rem', marginBottom: '16px' }}>📸</div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '4px' }}>
          Hi, {user.name}
        </h1>
        <p style={{ color: '#8899aa', fontSize: '0.95rem', marginBottom: '32px' }}>
          Find your photos using face recognition
        </p>
        <button
          onClick={() => router.push('/find-photos')}
          style={{
            width: '100%',
            padding: '16px',
            border: 'none',
            borderRadius: '12px',
            fontSize: '1.1rem',
            fontWeight: 600,
            cursor: 'pointer',
            background: '#4f9cf7',
            color: '#fff',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#3b82f6')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#4f9cf7')}
        >
          Find Your Photo
        </button>
      </div>
    </main>
  )
}
