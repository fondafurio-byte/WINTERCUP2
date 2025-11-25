import React, { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { supabase } from '../lib/supabase'
import { User, Mail, Lock, X } from 'lucide-react'

interface PublicUserRegistrationProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function PublicUserRegistration({ open, onOpenChange }: PublicUserRegistrationProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus(null)
    setLoading(true)

    try {
      // Validazioni
      if (!email || !password || !username || !displayName) {
        setStatus('Tutti i campi sono obbligatori')
        setLoading(false)
        return
      }

      if (username.length < 3) {
        setStatus('Lo username deve essere di almeno 3 caratteri')
        setLoading(false)
        return
      }

      if (password.length < 6) {
        setStatus('La password deve essere di almeno 6 caratteri')
        setLoading(false)
        return
      }

      if (password !== confirmPassword) {
        setStatus('Le password non coincidono')
        setLoading(false)
        return
      }

      // Verifica che lo username non sia già in uso
      const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .maybeSingle()

      if (existingUser) {
        setStatus('Username già in uso, scegline un altro')
        setLoading(false)
        return
      }

      // Registrazione con Supabase Auth
      // Il trigger del database inserirà automaticamente l'utente nella tabella users
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            username: username,
            display_name: displayName,
            user_type: 'public' // Utente pubblico
          }
        }
      })

      if (authError) {
        console.error('Registration error:', authError)
        setStatus('Errore durante la registrazione: ' + authError.message)
        setLoading(false)
        return
      }

      if (!authData.user) {
        setStatus('Errore: account non creato')
        setLoading(false)
        return
      }

      console.log('✅ User successfully registered:', { username, email, user_id: authData.user.id })
      setStatus('✅ Registrazione completata! Puoi ora effettuare il login.')
      
      setTimeout(() => {
        onOpenChange(false)
        setEmail('')
        setPassword('')
        setConfirmPassword('')
        setUsername('')
        setDisplayName('')
        setStatus(null)
      }, 2000)

    } catch (err) {
      console.error('Error:', err)
      setStatus('Errore durante la registrazione: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="rw-overlay" />
        <Dialog.Content className="rw-dialog" style={{ maxWidth: 450 }}>
          <Dialog.Title style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 16 }}>
            Registrazione Utente
          </Dialog.Title>

          <Dialog.Close asChild>
            <button
              className="btn secondary"
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                width: 32,
                height: 32,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>
          </Dialog.Close>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontWeight: 600 }}>
                <User size={18} />
                Username
              </label>
              <input
                className="rw-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username per il login (min. 3 caratteri)"
                required
                minLength={3}
              />
              <small style={{ display: 'block', marginTop: 4, color: '#64748b', fontSize: 12 }}>
                Userai questo username per accedere
              </small>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontWeight: 600 }}>
                <User size={18} />
                Nome Visualizzato
              </label>
              <input
                className="rw-input"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Il tuo nome completo"
                required
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontWeight: 600 }}>
                <Mail size={18} />
                Email
              </label>
              <input
                className="rw-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tua.email@example.com"
                required
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontWeight: 600 }}>
                <Lock size={18} />
                Password
              </label>
              <input
                className="rw-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimo 6 caratteri"
                required
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontWeight: 600 }}>
                <Lock size={18} />
                Conferma Password
              </label>
              <input
                className="rw-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ripeti la password"
                required
              />
            </div>

            {status && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: status.startsWith('✅') ? '#d1fae5' : '#fee2e2',
                  color: status.startsWith('✅') ? '#065f46' : '#991b1b',
                  fontSize: 14
                }}
              >
                {status}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
              <Dialog.Close asChild>
                <button type="button" className="btn secondary" disabled={loading}>
                  Annulla
                </button>
              </Dialog.Close>
              <button type="submit" className="btn" disabled={loading}>
                {loading ? 'Registrazione...' : 'Registrati'}
              </button>
            </div>
          </form>

          <div style={{ marginTop: 16, padding: 12, background: '#f1f5f9', borderRadius: 8, fontSize: 13, color: '#475569' }}>
            <strong>ℹ️ Nota:</strong> I voti degli utenti registrati pubblicamente hanno un peso del 10% nella scelta del MVP, mentre i voti delle squadre hanno un peso del 90%.
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
