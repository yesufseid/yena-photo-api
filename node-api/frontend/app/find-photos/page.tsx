'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3001'

interface Group {
  date: string
  count: number
}

export default function FindPhotosPage() {
  const [step, setStep] = useState<'selfie' | 'searching' | 'results' | 'sending' | 'sent'>('selfie')
  const [selfieFile, setSelfieFile] = useState<File | null>(null)
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [groups, setGroups] = useState<Group[]>([])
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [telegramId, setTelegramId] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    try {
      const tg = window.Telegram?.WebApp
      if (tg?.initDataUnsafe?.user) {
        setTelegramId(tg.initDataUnsafe.user.id)
      }
    } catch {}
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelfieFile(file)
    setSelfiePreview(URL.createObjectURL(file))
    setError(null)
  }

  const startSearch = async () => {
    if (!selfieFile) return
    setStep('searching')
    setError(null)

    const formData = new FormData()
    formData.append('selfie', selfieFile)
    formData.append('telegram_id', String(telegramId || ''))

    try {
      const res = await fetch(`${API}/api/search`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (!data.success) {
        setError(data.error || 'Search failed')
        setStep('selfie')
        return
      }

      setTotalCount(data.count)
      setGroups(data.groups || [])
      setToken(data.token)
      setStep('results')
    } catch {
      setError('Network error. Try again.')
      setStep('selfie')
    }
  }

  const sendGroup = async (date: string) => {
    if (!token) return
    setStep('sending')

    try {
      const res = await fetch(`${API}/api/results/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, date }),
      })
      const data = await res.json()

      if (data.success) {
        setStep('sent')
      } else {
        setError(data.error || 'Failed to send')
        setStep('results')
      }
    } catch {
      setError('Network error')
      setStep('results')
    }
  }

  const closeApp = () => {
    try { window.Telegram?.WebApp.close() } catch {}
  }

  const styles: Record<string, React.CSSProperties> = {
    container: {
      minHeight: '100vh',
      background: '#0f0f1a',
      color: '#eee',
      fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
      padding: '20px',
      maxWidth: '480px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 0',
      marginBottom: '16px',
    },
    backBtn: {
      background: 'none',
      border: 'none',
      color: '#4f9cf7',
      fontSize: '0.95rem',
      cursor: 'pointer',
      padding: '4px 8px',
    },
    title: {
      fontSize: '1.3rem',
      fontWeight: 700,
      margin: 0,
    },
    card: {
      background: '#16213e',
      borderRadius: '14px',
      padding: '20px',
      marginBottom: '16px',
    },
    cardTitle: {
      fontSize: '1rem',
      fontWeight: 600,
      marginBottom: '12px',
      color: '#fff',
    },
    selfiePreview: {
      width: '180px',
      height: '180px',
      borderRadius: '50%',
      border: `3px dashed ${selfiePreview ? '#22c55e' : '#334155'}`,
      borderStyle: selfiePreview ? 'solid' : 'dashed',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      background: '#1a1a2e',
      margin: '0 auto 16px',
    },
    selfiePlaceholder: {
      textAlign: 'center',
      color: '#8899aa',
      fontSize: '0.85rem',
    },
    btn: {
      width: '100%',
      padding: '14px',
      border: 'none',
      borderRadius: '10px',
      fontSize: '1rem',
      fontWeight: 600,
      cursor: 'pointer',
      textAlign: 'center' as const,
      transition: 'all 0.2s',
    },
    btnPrimary: {
      background: '#4f9cf7',
      color: '#fff',
    },
    btnSuccess: {
      background: '#22c55e',
      color: '#fff',
    },
    btnOutline: {
      background: 'transparent',
      color: '#4f9cf7',
      border: '1px solid #4f9cf7',
    },
    groupItem: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px',
      background: '#1a1a2e',
      borderRadius: '10px',
      cursor: 'pointer',
      marginBottom: '8px',
      transition: 'background 0.2s',
    },
    errorText: {
      color: '#ef4444',
      fontSize: '0.85rem',
      marginTop: '8px',
      textAlign: 'center' as const,
    },
    resultCount: {
      textAlign: 'center' as const,
      padding: '24px 0',
    },
    resultNumber: {
      fontSize: '3rem',
      fontWeight: 800,
      color: '#22c55e',
    },
    resultLabel: {
      fontSize: '1rem',
      color: '#8899aa',
      marginTop: '4px',
    },
  }

  if (step === 'selfie') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => router.push('/')}>← Back</button>
          <h1 style={styles.title}>Find Your Photo</h1>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>Upload your selfie</div>
          <div
            style={styles.selfiePreview}
            onClick={() => inputRef.current?.click()}
          >
            {selfiePreview ? (
              <img src={selfiePreview} alt="selfie" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={styles.selfiePlaceholder}>
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '4px' }}>📷</span>
                Tap to take a selfie
              </div>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="user"
            hidden
            onChange={handleFileSelect}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={{ ...styles.btn, ...styles.btnOutline, flex: 1 }} onClick={() => inputRef.current?.click()}>
              📷 Choose Photo
            </button>
          </div>
          {error && <div style={styles.errorText}>{error}</div>}
        </div>

        <button
          style={{ ...styles.btn, ...styles.btnPrimary, opacity: selfieFile ? 1 : 0.4 }}
          disabled={!selfieFile}
          onClick={startSearch}
        >
          Search
        </button>
      </div>
    )
  }

  if (step === 'searching') {
    return (
      <div style={styles.container}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 0' }}>
          <div style={{ width: '60px', height: '60px', border: '4px solid #334155', borderTopColor: '#4f9cf7', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '20px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '8px' }}>Searching for your photos</div>
          <div style={{ color: '#8899aa', fontSize: '0.9rem' }}>Analyzing face...</div>
        </div>
      </div>
    )
  }

  if (step === 'results') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Results</h1>
        </div>

        <div style={styles.resultCount}>
          <div style={styles.resultNumber}>{totalCount}</div>
          <div style={styles.resultLabel}>{totalCount === 1 ? 'photo found' : 'photos found'}</div>
        </div>

        {groups.length > 0 && (
          <div style={styles.card}>
            <div style={styles.cardTitle}>Select by date</div>
            {groups.map((g) => (
              <div
                key={g.date}
                style={styles.groupItem}
                onClick={() => sendGroup(g.date)}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(79,156,247,0.15)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#1a1a2e')}
              >
                <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{g.date}</span>
                <span style={{ color: '#4f9cf7', fontWeight: 600, fontSize: '0.9rem' }}>
                  {g.count} {g.count === 1 ? 'photo' : 'photos'}
                </span>
              </div>
            ))}
          </div>
        )}

        {totalCount > 0 && (
          <button style={{ ...styles.btn, ...styles.btnSuccess, marginTop: 'auto' }} onClick={() => sendGroup('')}>
            📨 Send All to Telegram
          </button>
        )}

        <button
          style={{ ...styles.btn, ...styles.btnOutline, marginTop: '12px' }}
          onClick={() => { setStep('selfie'); setSelfieFile(null); setSelfiePreview(null); setError(null) }}
        >
          🔄 Search Again
        </button>

        {error && <div style={styles.errorText}>{error}</div>}
      </div>
    )
  }

  if (step === 'sending') {
    return (
      <div style={styles.container}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 0' }}>
          <div style={{ width: '60px', height: '60px', border: '4px solid #334155', borderTopColor: '#4f9cf7', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '20px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '8px' }}>Sending photos...</div>
          <div style={{ color: '#8899aa', fontSize: '0.9rem' }}>Check Telegram in a moment</div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>✅</div>
        <h2 style={{ marginBottom: '8px', color: '#22c55e' }}>Photos Sent!</h2>
        <p style={{ color: '#8899aa', marginBottom: '24px', fontSize: '0.95rem' }}>
          Your photos are being sent in Telegram.
        </p>
        <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={closeApp}>
          Close
        </button>
      </div>
    </div>
  )
}
