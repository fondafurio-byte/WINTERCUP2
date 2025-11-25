import React, { Suspense, useState, useEffect, useRef } from 'react'
import ErrorBoundary from './ErrorBoundary'
import Topbar from './components/Topbar'
import SideMenu from './components/SideMenu'
import Home from './pages/Home'
import Gironi from './pages/Gironi'
import Statistiche from './pages/Statistiche'
import Finali from './pages/Finali'
import Partecipanti from './pages/Partecipanti'
import TokenManager from './pages/TokenManager'
import { supabase } from './lib/supabase'

const LazyAdminDialog = React.lazy(() => import('./components/AdminDialog'))

export default function App(){
  const [showAdmin, setShowAdmin] = useState(false)
  const [revealed, setRevealed] = useState(false) // whether the hidden trigger was activated
  const [menuOpen, setMenuOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState<string>('home')
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Check authentication status
  useEffect(() => {
    async function checkAuth() {
      try {
        const userRes: any = await (supabase.auth as any).getUser()
        const user = userRes?.data?.user
        setIsAuthenticated(!!user)
      } catch (e) {
        setIsAuthenticated(false)
      }
    }
    checkAuth()

    // Listen for login success
    const handleLogin = () => {
      setIsAuthenticated(true)
      setShowAdmin(false)
    }
    const handleTeamLogin = () => {
      setIsAuthenticated(true)
    }
    window.addEventListener('admin-login-success', handleLogin)
    window.addEventListener('team-login-success', handleTeamLogin)
    
    return () => {
      window.removeEventListener('admin-login-success', handleLogin)
      window.removeEventListener('team-login-success', handleTeamLogin)
    }
  }, [])

  // keyboard shortcut: Ctrl+Shift+A to reveal/open admin
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault()
        setRevealed(true)
        setShowAdmin(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // gestures on logo: triple-click OR long-press
  // Use refs via closure to persist timers across renders
  const clickState = useRef<{ count: number; timer: any; longPress: any }>({ count: 0, timer: null, longPress: null })

  function onLogoMouseDown() {
    // start long-press
    clickState.current.longPress = setTimeout(() => {
      setRevealed(true)
      setShowAdmin(true)
    }, 700)
  }

  function onLogoMouseUp() {
    if (clickState.current.longPress) {
      clearTimeout(clickState.current.longPress)
      clickState.current.longPress = null
    }
    clickState.current.count += 1
    if (clickState.current.timer) clearTimeout(clickState.current.timer)
    clickState.current.timer = setTimeout(() => { clickState.current.count = 0 }, 800)
    if (clickState.current.count >= 3) {
      setRevealed(true)
      setShowAdmin(true)
      clickState.current.count = 0
      if (clickState.current.timer) { clearTimeout(clickState.current.timer); clickState.current.timer = null }
    }
  }

  // Touch swipe to open menu: detect right swipe from left edge
  const touchStartX = useRef<number | null>(null)
  function onTouchStart(e: React.TouchEvent){
    touchStartX.current = e.touches?.[0]?.clientX ?? null
  }
  function onTouchEnd(e: React.TouchEvent){
    const endX = e.changedTouches?.[0]?.clientX ?? null
    if (touchStartX.current !== null && endX !== null){
      const dx = endX - touchStartX.current
      // start near edge and swipe right sufficiently
      if (touchStartX.current < 40 && dx > 60) setMenuOpen(true)
    }
    touchStartX.current = null
  }

  // Get page title based on currentPage
  const getPageTitle = () => {
    switch (currentPage) {
      case 'gironi': return 'Gironi'
      case 'statistiche': return 'Classifiche'
      case 'finali': return 'Finali'
      case 'partecipanti': return 'Partecipanti'
      case 'tokens': return 'Token Squadre'
      default: return 'Home'
    }
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen" style={{ paddingTop: 'env(safe-area-inset-top, 1rem)', background:'#ffffff' }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} items={[
            { key: 'home', label: 'Home', onClick: () => { setCurrentPage('home'); setMenuOpen(false) } },
            { key: 'gironi', label: 'Gironi', onClick: () => { setCurrentPage('gironi'); setMenuOpen(false) } },
            { key: 'statistiche', label: 'Classifiche', onClick: () => { setCurrentPage('statistiche'); setMenuOpen(false) } },
            { key: 'finali', label: 'Finali', onClick: () => { setCurrentPage('finali'); setMenuOpen(false) } },
            { key: 'partecipanti', label: 'Partecipanti', onClick: () => { setCurrentPage('partecipanti'); setMenuOpen(false) } },
            ...(isAuthenticated ? [{ key: 'tokens', label: 'Token Squadre', onClick: () => { setCurrentPage('tokens'); setMenuOpen(false) } }] : []),
          ]} />
        
        <div className="app-container">
          <Topbar title={getPageTitle()} onHamburger={() => setMenuOpen(true)} />

          <div className="mx-auto" style={{display:'flex',alignItems:'center',flexDirection:'column',gap:16,paddingTop:12}}>
            <img
              src="/icons/icon.svg"
              alt="Winter Cup 2 Logo"
              className="app-logo"
              onMouseDown={onLogoMouseDown}
              onMouseUp={onLogoMouseUp}
              onTouchStart={onLogoMouseDown}
              onTouchEnd={onLogoMouseUp}
            />

            <div>
              {/* Show logout button if authenticated */}
              {isAuthenticated ? (
                <button className="btn" onClick={async () => {
                  await supabase.auth.signOut()
                  setIsAuthenticated(false)
                  setRevealed(false)
                  window.location.reload()
                }}>Logout</button>
              ) : (
                <>
                  {/* The admin UI is hidden by default. It appears only when 'revealed' or via shortcut. */}
                  {revealed && !showAdmin && (
                    <button className="btn" onClick={() => setShowAdmin(true)}>Apri Admin</button>
                  )}

                  {showAdmin && (
                    <Suspense fallback={<div>Caricamento…</div>}>
                      <LazyAdminDialog />
                    </Suspense>
                  )}
                </>
              )}
            </div>

            {/* diagnostica rapida rimossa */}
          </div>
          
          {/* Page router (simple) */}
          <div>
            {currentPage === 'home' && (
              <Home />
            )}
            {currentPage === 'gironi' && (
              <Gironi />
            )}
            {currentPage === 'statistiche' && (
              <Statistiche />
            )}
            {currentPage === 'finali' && (
              <Finali />
            )}
            {currentPage === 'partecipanti' && (
              <Partecipanti />
            )}
            {currentPage === 'tokens' && (
              <TokenManager />
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}
