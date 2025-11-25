import React, { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { supabase } from '../lib/supabase'
import { Mail, Lock } from 'lucide-react'
import clsx from 'clsx'

export default function AdminDialog(){
  const [open, setOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="btn" onClick={() => setOpen(true)}>Admin</button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="rw-overlay" />
        <Dialog.Content className="rw-dialog">
          <Dialog.Title style={{fontSize: '1.05rem', fontWeight:700}}>Accesso</Dialog.Title>
          <Dialog.Description style={{marginTop:8, marginBottom:12, color:'#475569'}}>Effettua l'accesso con il tuo account</Dialog.Description>

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

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
