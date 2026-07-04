import Link from 'next/link'

export default function HomePage() {
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
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '8px' }}>
          Yena Photo
        </h1>
        <p style={{ color: '#8899aa', fontSize: '0.95rem', marginBottom: '32px' }}>
          Find your photos using face recognition
        </p>
        <Link href="/find-photos" style={{
          display: 'block',
          width: '100%',
          padding: '16px',
          borderRadius: '12px',
          fontSize: '1.1rem',
          fontWeight: 600,
          textAlign: 'center',
          textDecoration: 'none',
          background: '#4f9cf7',
          color: '#fff',
        }}>
          Find Your Photo
        </Link>
      </div>
    </main>
  )
}
