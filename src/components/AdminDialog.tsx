import React, { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { supabase } from '../lib/supabase'
import { Mail, Lock, UserPlus } from 'lucide-react'
import clsx from 'clsx'

export default function AdminDialog(){
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  
  // Login state
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Registration state
  const [regEmail, setRegEmail] = useState('')
  const [regUsername, setRegUsername] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regStatus, setRegStatus] = useState<string | null>(null)
  const [regLoading, setRegLoading] = useState(false)

  // If the component is mounted, open the dialog by default so parent 'Apri Admin' shows it immediately
  useEffect(() => {
    setOpen(true)
  }, [])

  async function handleSubmit(e: React.FormEvent){
    e.preventDefault()
    setStatus(null)
    setLoading(true)
    try{
      // Support both email and username login. If input contains '@' treat as email,
      // otherwise try to resolve username -> email from `profiles` or `admins` tables.
      let identifier = username
      if (!identifier.includes('@')) {
        // try profiles table first
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', identifier)
          .maybeSingle()

        if (profileErr) {
          console.debug('profiles lookup error', profileErr.message)
        }

        if (profile && (profile as any).email) {
          identifier = (profile as any).email
        } else {
          // Try admins table
          const { data: adminRec } = await supabase
            .from('admins')
            .select('email')
            .eq('username', identifier)
            .maybeSingle()

          if (adminRec && (adminRec as any).email) {
            identifier = (adminRec as any).email
          } else {
            // Try rilevatori table
            const { data: rilevRec } = await supabase
              .from('rilevatori')
              .select('email')
              .eq('username', identifier)
              .maybeSingle()

            if (rilevRec && (rilevRec as any).email) {
              identifier = (rilevRec as any).email
            } else {
              setStatus('Username non trovato')
              setLoading(false)
              return
            }
          }
        }
      }

      const res = await supabase.auth.signInWithPassword({ email: identifier, password })
      if (res.error) {
        if (res.error.message.includes('fetch')) {
          setStatus('⚠️ Errore di connessione: il progetto Supabase potrebbe essere in pausa. Riattivalo dal dashboard.')
        } else {
          setStatus(res.error.message)
        }
        setLoading(false)
        return
      }
      const user = res.data.user
      if (!user) {
        setStatus('Nessun utente autenticato')
        setLoading(false)
        return
      }
      
      // Check if user is admin
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)

      if (adminError) {
        console.debug('admin check error', adminError.message)
      }

      if (adminData && adminData.length > 0) {
        setStatus('Accesso effettuato come admin')
        setTimeout(() => {
          setOpen(false)
          window.dispatchEvent(new CustomEvent('admin-login-success'))
        }, 800)
        return
      }

      // Check if user is rilevatore
      const { data: rilevData, error: rilevError } = await supabase
        .from('rilevatori')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)

      if (rilevError) {
        console.debug('rilevatore check error', rilevError.message)
      }

      if (rilevData && rilevData.length > 0) {
        setStatus('Accesso effettuato come rilevatore')
        setTimeout(() => {
          setOpen(false)
          window.dispatchEvent(new CustomEvent('admin-login-success'))
        }, 800)
        return
      }

      // User authenticated but not in admin or rilevatori tables
      setStatus('Accesso effettuato ma non hai permessi')
      setLoading(false)

    }catch(err:any){
      setStatus(String(err.message || err))
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent){
    e.preventDefault()
    setRegStatus(null)
    setRegLoading(true)

    try{
      // Validate input
      if (!regEmail || !regUsername || !regPassword) {
        setRegStatus('Tutti i campi sono obbligatori')
        setRegLoading(false)
        return
      }

      if (!regEmail.includes('@')) {
        setRegStatus('Email non valida')
        setRegLoading(false)
        return
      }

      // Check if username already exists in rilevatori
      const { data: existingRilev } = await supabase
        .from('rilevatori')
        .select('username')
        .eq('username', regUsername)
        .maybeSingle()

      if (existingRilev) {
        setRegStatus('Username già in uso')
        setRegLoading(false)
        return
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: regEmail,
        password: regPassword,
      })

      if (authError) {
        if (authError.message.includes('fetch')) {
          setRegStatus('⚠️ Errore di connessione: il progetto Supabase potrebbe essere in pausa.')
        } else {
          setRegStatus(authError.message)
        }
        setRegLoading(false)
        return
      }

      if (!authData.user) {
        setRegStatus('Errore durante la creazione dell\'utente')
        setRegLoading(false)
        return
      }

      // Insert into rilevatori table
      const { error: rilevError } = await supabase
        .from('rilevatori')
        .insert({
          user_id: authData.user.id,
          email: regEmail,
          username: regUsername
        })

      if (rilevError) {
        setRegStatus(`Errore: ${rilevError.message}`)
        setRegLoading(false)
        return
      }

      setRegStatus('✅ Rilevatore registrato con successo!')
      setTimeout(() => {
        setRegEmail('')
        setRegUsername('')
        setRegPassword('')
        setRegStatus(null)
        setMode('login')
      }, 1500)

    }catch(err:any){
      setRegStatus(String(err.message || err))
      setRegLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="btn" onClick={() => setOpen(true)}>Admin</button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="rw-overlay" />
        <Dialog.Content className="rw-dialog">
          <Dialog.Title style={{fontSize: '1.05rem', fontWeight:700}}>
            {mode === 'login' ? 'Accesso' : 'Registra Rilevatore'}
          </Dialog.Title>
          <Dialog.Description style={{marginTop:8, marginBottom:12, color:'#475569'}}>
            {mode === 'login' ? 'Effettua l\'accesso con il tuo account' : 'Crea un nuovo account per rilevatore'}
          </Dialog.Description>

          {/* Tab Switcher */}
          <div style={{display:'flex',gap:8,marginBottom:16,borderBottom:'1px solid #e2e8f0'}}>
            <button
              type="button"
              onClick={() => setMode('login')}
              style={{
                flex:1,
                padding:'8px 16px',
                background:'none',
                border:'none',
                borderBottom: mode === 'login' ? '2px solid #3b82f6' : '2px solid transparent',
                color: mode === 'login' ? '#3b82f6' : '#64748b',
                fontWeight: mode === 'login' ? 600 : 400,
                cursor:'pointer',
                transition:'all 0.2s'
              }}
            >
              Accesso
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              style={{
                flex:1,
                padding:'8px 16px',
                background:'none',
                border:'none',
                borderBottom: mode === 'register' ? '2px solid #3b82f6' : '2px solid transparent',
                color: mode === 'register' ? '#3b82f6' : '#64748b',
                fontWeight: mode === 'register' ? 600 : 400,
                cursor:'pointer',
                transition:'all 0.2s'
              }}
            >
              Registra Rilevatore
            </button>
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleSubmit}>
            <label style={{display:'block',marginBottom:8}}>
              <div style={{marginBottom:6,fontWeight:600,fontSize:14}}>Username o Email</div>
              <div className="rw-input">
                <Mail size={16} />
                <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Username or email" type="text" />
              </div>
            </label>

            <label style={{display:'block',marginTop:8}}>
              <div style={{marginBottom:6,fontWeight:600,fontSize:14}}>Password</div>
              <div className="rw-input">
                <Lock size={16} />
                <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" />
              </div>
            </label>

            <div className="rw-actions">
              <Dialog.Close asChild>
                <button type="button" className="btn secondary">Annulla</button>
              </Dialog.Close>
              <button className="btn" type="submit" disabled={loading}>{loading? 'Caricamento...' : 'Accedi'}</button>
            </div>

            {status && <div className="status">{status}</div>}
          </form>
          ) : (
            <form onSubmit={handleRegister}>
              <label style={{display:'block',marginBottom:8}}>
                <div style={{marginBottom:6,fontWeight:600,fontSize:14}}>Email</div>
                <div className="rw-input">
                  <Mail size={16} />
                  <input 
                    value={regEmail} 
                    onChange={e=>setRegEmail(e.target.value)} 
                    placeholder="email@example.com" 
                    type="email" 
                  />
                </div>
              </label>

              <label style={{display:'block',marginTop:8}}>
                <div style={{marginBottom:6,fontWeight:600,fontSize:14}}>Username</div>
                <div className="rw-input">
                  <UserPlus size={16} />
                  <input 
                    value={regUsername} 
                    onChange={e=>setRegUsername(e.target.value)} 
                    placeholder="username" 
                    type="text" 
                  />
                </div>
              </label>

              <label style={{display:'block',marginTop:8}}>
                <div style={{marginBottom:6,fontWeight:600,fontSize:14}}>Password</div>
                <div className="rw-input">
                  <Lock size={16} />
                  <input 
                    value={regPassword} 
                    onChange={e=>setRegPassword(e.target.value)} 
                    placeholder="Password" 
                    type="password" 
                  />
                </div>
              </label>

              <div className="rw-actions">
                <Dialog.Close asChild>
                  <button type="button" className="btn secondary">Annulla</button>
                </Dialog.Close>
                <button className="btn" type="submit" disabled={regLoading}>
                  {regLoading ? 'Registrazione...' : 'Registra'}
                </button>
              </div>

              {regStatus && <div className="status">{regStatus}</div>}
            </form>
          )}

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
