'use client'

import { useState, useRef } from 'react'
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
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

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

  const s: Record<string, React.CSSProperties> = {
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
    preview: {
      width: '180px', height: '180px', borderRadius: '50%',
      border: `3px dashed #334155`,
      borderStyle: selfiePreview ? 'solid' : 'dashed',
      borderColor: selfiePreview ? '#22c55e' : '#334155',
      overflow: 'hidden', display: 'flex', alignItems: 'center',
      justifyContent: 'center', cursor: 'pointer', background: '#1a1a2e',
      margin: '0 auto 16px',
    },
    btn: {
      width: '100%', padding: '14px', border: 'none', borderRadius: '10px',
      fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
    },
    groupItem: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px', background: '#1a1a2e', borderRadius: '10px',
      cursor: 'pointer', marginBottom: '8px',
    },
  }

  if (step === 'selfie') {
    return (
      <div style={s.container}>
        <div style={s.header}>
          <button style={{ background: 'none', border: 'none', color: '#4f9cf7', fontSize: '0.95rem', cursor: 'pointer' }} onClick={() => router.push('/')}>
            ← Back
          </button>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Find Your Photo</h1>
        </div>
        <div style={s.card}>
          <div style={s.cardTitle}>Upload your selfie</div>
          <div style={s.preview} onClick={() => inputRef.current?.click()}>
            {selfiePreview ? (
              <img src={selfiePreview} alt="selfie" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ textAlign: 'center', color: '#8899aa', fontSize: '0.85rem' }}>
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '4px' }}>📷</span>
                Tap to take a selfie
              </div>
            )}
          </div>
          <input ref={inputRef} type="file" accept="image/*" capture="user" hidden onChange={handleFileSelect} />
          <button style={{ ...s.btn, background: 'transparent', color: '#4f9cf7', border: '1px solid #4f9cf7' }} onClick={() => inputRef.current?.click()}>
            📷 Choose Photo
          </button>
          {error && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '8px', textAlign: 'center' }}>{error}</div>}
        </div>
        <button style={{ ...s.btn, background: '#4f9cf7', color: '#fff', opacity: selfieFile ? 1 : 0.4 }} disabled={!selfieFile} onClick={startSearch}>
          Search
        </button>
      </div>
    )
  }

  if (step === 'searching') {
    return (
      <div style={s.container}>
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
      <div style={s.container}>
        <div style={s.header}><h1 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Results</h1></div>
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: '3rem', fontWeight: 800, color: '#22c55e' }}>{totalCount}</div>
          <div style={{ fontSize: '1rem', color: '#8899aa', marginTop: '4px' }}>{totalCount === 1 ? 'photo found' : 'photos found'}</div>
        </div>
        {groups.length > 0 && (
          <div style={s.card}>
            <div style={s.cardTitle}>Select by date</div>
            {groups.map((g) => (
              <div key={g.date} style={s.groupItem}
                onClick={() => { setStep('sending'); sendGroup(g.date) }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(79,156,247,0.15)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#1a1a2e')}
              >
                <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{g.date}</span>
                <span style={{ color: '#4f9cf7', fontWeight: 600, fontSize: '0.9rem' }}>{g.count} {g.count === 1 ? 'photo' : 'photos'}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto', paddingBottom: '20px' }}>
          <button style={{ ...s.btn, background: '#22c55e', color: '#fff' }} onClick={() => { setStep('sending'); sendGroup('') }}>
            📨 Send All to Telegram
          </button>
          <button style={{ ...s.btn, background: 'transparent', color: '#4f9cf7', border: '1px solid #4f9cf7' }} onClick={() => { setStep('selfie'); setSelfieFile(null); setSelfiePreview(null); setError(null) }}>
            🔄 Search Again
          </button>
        </div>
      </div>
    )
  }

  if (step === 'sending') {
    return (
      <div style={s.container}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 0' }}>
          <div style={{ width: '60px', height: '60px', border: '4px solid #334155', borderTopColor: '#4f9cf7', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '20px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '8px' }}>Sending photos...</div>
          <div style={{ color: '#8899aa', fontSize: '0.9rem' }}>Check Telegram in a moment</div>
        </div>
      </div>
    )
  }

  async function sendGroup(date: string) {
    if (!token) return
    try {
      const res = await fetch(`${API}/api/results/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, date }),
      })
      const data = await res.json()
      if (data.success) setStep('sent')
      else { setError(data.error || 'Failed to send'); setStep('results') }
    } catch { setError('Network error'); setStep('results') }
  }

  return (
    <div style={s.container}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>✅</div>
        <h2 style={{ marginBottom: '8px', color: '#22c55e' }}>Photos Sent!</h2>
        <p style={{ color: '#8899aa', marginBottom: '24px', fontSize: '0.95rem' }}>Your photos are being sent in Telegram.</p>
        <button style={{ background: 'transparent', color: '#4f9cf7', border: '1px solid #4f9cf7', width: '100%', padding: '14px', borderRadius: '10px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }} onClick={() => router.push('/')}>
          Back Home
        </button>
      </div>
    </div>
  )
}
