import React, { useState } from 'react'
import { Share2, ExternalLink } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'

export default function Condividi() {
  const siteUrl = 'https://wintercup-2.vercel.app'
  const [qrPreviewOpen, setQrPreviewOpen] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  const handleShare = async () => {
    if (navigator.share) {
      // Mobile Web Share API
      try {
        await navigator.share({
          title: 'Winter Cup 2° Edizione',
          text: 'Segui la Winter Cup 2° Edizione!',
          url: siteUrl,
        })
      } catch (err) {
        console.log('Share cancelled or error:', err)
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(siteUrl)
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
      } catch (err) {
        console.error('Failed to copy:', err)
      }
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: 600, margin: '0 auto' }}>
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: 16,
        padding: 32,
        color: 'white',
        marginBottom: 24,
        textAlign: 'center',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: 8 }}>
          Condividi Winter Cup 2
        </h1>
        <p style={{ fontSize: '0.95rem', opacity: 0.9 }}>
          Invita amici e tifosi a seguire la competizione
        </p>
      </div>

      {/* Link Section */}
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: 24,
        marginBottom: 20,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16, color: '#1e293b' }}>
          🔗 Link del sito
        </h2>
        
        <div style={{
          background: '#f1f5f9',
          border: '2px solid #e2e8f0',
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap'
        }}>
          <ExternalLink size={20} style={{ color: '#64748b', flexShrink: 0 }} />
          <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1,
              color: '#3b82f6',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.95rem',
              wordBreak: 'break-all'
            }}
          >
            {siteUrl}
          </a>
        </div>

        <button
          onClick={handleShare}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            border: 'none',
            borderRadius: 8,
            padding: 16,
            color: 'white',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'transform 0.2s'
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Share2 size={20} />
          {copySuccess ? 'Link copiato!' : 'Condividi'}
        </button>
      </div>

      {/* QR Code Section */}
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: 24,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16, color: '#1e293b' }}>
          📱 QR Code
        </h2>
        
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: 16
        }}>
          <img
            src="/qr-code.svg"
            alt="QR Code Winter Cup 2"
            style={{
              width: 200,
              height: 200,
              border: '3px solid #e2e8f0',
              borderRadius: 12,
              padding: 12,
              background: 'white',
              cursor: 'pointer'
            }}
            onClick={() => setQrPreviewOpen(true)}
          />
        </div>

        <button
          onClick={() => setQrPreviewOpen(true)}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: 8,
            padding: 14,
            color: 'white',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          Visualizza anteprima
        </button>
      </div>

      {/* QR Preview Dialog */}
      <Dialog.Root open={qrPreviewOpen} onOpenChange={setQrPreviewOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="rw-overlay" />
          <Dialog.Content
            className="rw-dialog"
            style={{
              maxWidth: 400,
              padding: 0,
              overflow: 'hidden'
            }}
          >
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: 20,
              color: 'white'
            }}>
              <Dialog.Title style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                QR Code Winter Cup 2
              </Dialog.Title>
            </div>
            
            <div style={{ padding: 24, textAlign: 'center' }}>
              <img
                src="/qr-code.svg"
                alt="QR Code Winter Cup 2"
                style={{
                  width: '100%',
                  maxWidth: 300,
                  height: 'auto',
                  border: '3px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 16,
                  background: 'white',
                  marginBottom: 16
                }}
              />
              
              <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: 20 }}>
                Scansiona questo QR code per accedere al sito
              </p>

              <button
                onClick={() => setQrPreviewOpen(false)}
                style={{
                  width: '100%',
                  background: '#64748b',
                  border: 'none',
                  borderRadius: 8,
                  padding: 12,
                  color: 'white',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Chiudi
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
