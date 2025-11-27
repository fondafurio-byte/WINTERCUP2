import React, { useState, useEffect } from 'react'
import { X, Download, Smartphone } from 'lucide-react'

type DeviceType = 'ios' | 'android' | 'desktop' | 'unknown'

export default function InstallPWABanner() {
  const [showBanner, setShowBanner] = useState(false)
  const [deviceType, setDeviceType] = useState<DeviceType>('unknown')
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone || 
                         document.referrer.includes('android-app://')
    
    if (isStandalone) {
      return // Already installed, don't show banner
    }

    // Check if user has dismissed the banner before
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      const dismissedDate = new Date(dismissed)
      const now = new Date()
      const daysSinceDismissed = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
      
      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        return
      }
    }

    // Detect device type
    const userAgent = navigator.userAgent.toLowerCase()
    let detected: DeviceType = 'unknown'

    if (/iphone|ipad|ipod/.test(userAgent)) {
      detected = 'ios'
    } else if (/android/.test(userAgent)) {
      detected = 'android'
    } else if (/windows|mac|linux/.test(userAgent)) {
      detected = 'desktop'
    }

    setDeviceType(detected)
    
    // Only show banner if we detected a known device type
    if (detected !== 'unknown') {
      setShowBanner(true)
    }

    // Listen for beforeinstallprompt event (Android/Desktop Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString())
    setShowBanner(false)
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // For Android/Desktop Chrome
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        setShowBanner(false)
      }
      
      setDeferredPrompt(null)
    }
  }

  const getInstructions = () => {
    switch (deviceType) {
      case 'ios':
        return (
          <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.6 }}>
            <p style={{ marginBottom: 12, fontWeight: 600, color: '#1e293b' }}>
              📱 Installa l'app sul tuo iPhone/iPad:
            </p>
            <ol style={{ paddingLeft: 20, margin: 0 }}>
              <li style={{ marginBottom: 8 }}>
                Tocca il pulsante <strong>"Condividi"</strong> <span style={{ fontSize: '1.2rem' }}>⎋</span> in basso (Safari)
              </li>
              <li style={{ marginBottom: 8 }}>
                Scorri verso il basso e tocca <strong>"Aggiungi a Home"</strong> <span style={{ fontSize: '1.2rem' }}>➕</span>
              </li>
              <li style={{ marginBottom: 8 }}>
                Tocca <strong>"Aggiungi"</strong> in alto a destra
              </li>
              <li>
                L'app apparirà nella tua schermata Home come un'app nativa!
              </li>
            </ol>
          </div>
        )
      
      case 'android':
        return (
          <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.6 }}>
            <p style={{ marginBottom: 12, fontWeight: 600, color: '#1e293b' }}>
              📱 Installa l'app sul tuo Android:
            </p>
            {deferredPrompt ? (
              <div>
                <p style={{ marginBottom: 12 }}>
                  Puoi installare questa app direttamente sul tuo dispositivo per un accesso più rapido e un'esperienza ottimale.
                </p>
                <button
                  onClick={handleInstallClick}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none',
                    borderRadius: 8,
                    padding: 14,
                    color: 'white',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    marginTop: 12
                  }}
                >
                  <Download size={18} />
                  Installa Ora
                </button>
              </div>
            ) : (
              <ol style={{ paddingLeft: 20, margin: 0 }}>
                <li style={{ marginBottom: 8 }}>
                  Tocca il menu <strong>⋮</strong> (tre puntini) in alto a destra
                </li>
                <li style={{ marginBottom: 8 }}>
                  Seleziona <strong>"Installa app"</strong> o <strong>"Aggiungi a Home"</strong>
                </li>
                <li style={{ marginBottom: 8 }}>
                  Conferma toccando <strong>"Installa"</strong>
                </li>
                <li>
                  L'app apparirà nel drawer delle app come un'app nativa!
                </li>
              </ol>
            )}
          </div>
        )
      
      case 'desktop':
        return (
          <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.6 }}>
            <p style={{ marginBottom: 12, fontWeight: 600, color: '#1e293b' }}>
              💻 Installa l'app sul tuo computer:
            </p>
            {deferredPrompt ? (
              <div>
                <p style={{ marginBottom: 12 }}>
                  Installa questa app per accedervi rapidamente dalla barra delle applicazioni e ottenere un'esperienza ottimale.
                </p>
                <button
                  onClick={handleInstallClick}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none',
                    borderRadius: 8,
                    padding: 14,
                    color: 'white',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    marginTop: 12
                  }}
                >
                  <Download size={18} />
                  Installa Ora
                </button>
              </div>
            ) : (
              <ol style={{ paddingLeft: 20, margin: 0 }}>
                <li style={{ marginBottom: 8 }}>
                  Cerca l'icona <strong>"Installa"</strong> <span style={{ fontSize: '1rem' }}>⊕</span> nella barra degli indirizzi (Chrome/Edge)
                </li>
                <li style={{ marginBottom: 8 }}>
                  Oppure apri il menu <strong>⋮</strong> e seleziona <strong>"Installa Winter Cup 2"</strong>
                </li>
                <li style={{ marginBottom: 8 }}>
                  Conferma l'installazione
                </li>
                <li>
                  L'app apparirà come un'applicazione desktop indipendente!
                </li>
              </ol>
            )}
          </div>
        )
      
      default:
        return null
    }
  }

  if (!showBanner) {
    return null
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'linear-gradient(135deg, #17b3ff 0%, #0891d1 100%)',
      color: 'white',
      padding: '16px 20px',
      boxShadow: '0 -4px 12px rgba(0,0,0,0.15)',
      zIndex: 1000,
      animation: 'slideUp 0.3s ease-out'
    }}>
      <div style={{ maxWidth: 600, margin: '0 auto', position: 'relative' }}>
        <button
          onClick={handleDismiss}
          style={{
            position: 'absolute',
            top: -8,
            right: -8,
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '50%',
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'white'
          }}
          aria-label="Chiudi"
        >
          <X size={16} />
        </button>

        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 12, 
          marginBottom: 12,
          paddingRight: 24
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 12,
            padding: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Smartphone size={28} />
          </div>
          <div>
            <h3 style={{ 
              margin: 0, 
              fontSize: '1.1rem', 
              fontWeight: 700,
              marginBottom: 4
            }}>
              Installa Winter Cup 2
            </h3>
            <p style={{ 
              margin: 0, 
              fontSize: '0.85rem', 
              opacity: 0.9 
            }}>
              Accesso rapido e esperienza ottimale
            </p>
          </div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.95)',
          borderRadius: 12,
          padding: 16
        }}>
          {getInstructions()}
        </div>
      </div>

      <style>
        {`
          @keyframes slideUp {
            from {
              transform: translateY(100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  )
}
