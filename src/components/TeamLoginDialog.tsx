import React, { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { supabase } from '../lib/supabase'
import { Lock, User, Key, UserPlus } from 'lucide-react'
import PublicUserRegistration from './PublicUserRegistration'

interface TeamLoginDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export default function TeamLoginDialog({ open: controlledOpen, onOpenChange }: TeamLoginDialogProps = {}) {
  const [internalOpen, setInternalOpen] = useState(true)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [pendingUserData, setPendingUserData] = useState<any>(null)
  const [showRegistration, setShowRegistration] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus(null)
    setLoading(true)

    try {
      console.log('🔍 Attempting login with input:', username)
      
      let userData: any = null
      let userError: any = null
      let isPublicUser = false
      let userEmail = ''

      // 1. Cerca nella tabella users (utenti squadra) per username
      const { data: teamUser, error: teamError } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .maybeSingle()

      if (teamUser) {
        userData = teamUser
        userEmail = teamUser.email
        console.log('👥 Team user found by username:', userData)
      }

      // 2. Se non trovato, cerca nella tabella public_users per username
      if (!userData && !teamError) {
        console.log('🔍 Not found in users, trying public_users by username...')
        const { data: publicUser, error: publicError } = await supabase
          .from('public_users')
          .select('*')
          .eq('username', username)
          .maybeSingle()
        
        if (publicUser) {
          userData = publicUser
          userEmail = publicUser.email
          isPublicUser = true
          console.log('🌍 Public user found by username:', userData)
        }
        userError = publicError
      }

      // 3. Se ancora non trovato, prova con email in public_users
      if (!userData && !userError) {
        console.log('🔍 Not found by username, trying public_users by email...')
        const { data: publicUserByEmail, error: emailError } = await supabase
          .from('public_users')
          .select('*')
          .eq('email', username)
          .maybeSingle()
        
        if (publicUserByEmail) {
          userData = publicUserByEmail
          userEmail = publicUserByEmail.email
          isPublicUser = true
          console.log('📧 Public user found by email:', userData)
        }
        userError = emailError
      }

      console.log('✅ Final lookup result:', { 
        found: !!userData,
        isPublicUser,
        has_user_id: !!userData?.user_id,
        username: userData?.username,
        email: userEmail
      })

      if (userError) {
        console.error('User error:', userError)
        setStatus('Errore nel database: ' + userError.message)
        setLoading(false)
        return
      }

      if (!userData) {
        setStatus('Username/Email non trovato. Verifica di aver scritto correttamente.')
        setLoading(false)
        return
      }

      // Controlla se l'utente ha già un account auth
      if (userData.user_id) {
        // Login normale con password (sia team che public users)
        console.log('User has account, attempting password login...')
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: password
        })

        if (authError) {
          console.error('Auth error:', authError)
          setStatus('Password errata.')
          setLoading(false)
          return
        }

        setStatus('✅ Accesso effettuato!')
        setTimeout(() => {
          setOpen(false)
          window.dispatchEvent(new CustomEvent('team-login-success'))
        }, 800)
      } else {
        // Primo accesso: verifica token - query separata per sicurezza
        const { data: tokenData, error: tokenError } = await supabase
          .from('team_tokens')
          .select('token')
          .eq('squadra_id', userData.squadra_id)
          .maybeSingle()

        console.log('Token lookup:', { tokenData, tokenError })

        if (tokenError || !tokenData) {
          setStatus('Errore: token non trovato per questa squadra')
          setLoading(false)
          return
        }

        if (tokenData.token !== password) {
          setStatus('Token non valido')
          setLoading(false)
          return
        }

        // Token valido, mostra form cambio password
        setPendingUserData(userData)
        setShowPasswordChange(true)
        setStatus('✅ Token valido! Imposta una nuova password.')
        setLoading(false)
      }
    } catch (err) {
      console.error('Error:', err)
      setStatus('Errore durante il login: ' + (err as Error).message)
      setLoading(false)
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setStatus(null)
    setLoading(true)

    if (!newPassword || newPassword.length < 6) {
      setStatus('La password deve essere di almeno 6 caratteri')
      setLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setStatus('Le password non corrispondono')
      setLoading(false)
      return
    }

    try {
      // Crea account Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: pendingUserData.email,
        password: newPassword,
        options: {
          emailRedirectTo: undefined,
          data: {
            username: pendingUserData.username,
            squadra_id: pendingUserData.squadra_id,
            is_team_user: true
          }
        }
      })
      
      console.log('SignUp response:', { signUpData, signUpError })

      if (signUpError) {
        setStatus('Errore nella creazione dell\'account: ' + signUpError.message)
        setLoading(false)
        return
      }

      console.log('SignUp success:', signUpData.user?.id)

      // Aggiorna la tabella users con il nuovo user_id e flag password cambiata
      const { data: updateData, error: updateError } = await supabase
        .from('users')
        .update({
          user_id: signUpData.user?.id,
          has_changed_password: true
        })
        .eq('id', pendingUserData.id)
        .select()

      console.log('Update result:', { updateData, updateError })

      if (updateError) {
        console.error('Error updating user:', updateError)
        setStatus('Errore nell\'aggiornamento: ' + updateError.message)
        setLoading(false)
        return
      }

      // Fai il login automatico
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: pendingUserData.email,
        password: newPassword
      })

      if (signInError) {
        setStatus('Account creato! Effettua il login con le nuove credenziali.')
        setTimeout(() => {
          setShowPasswordChange(false)
          setPendingUserData(null)
          setPassword('')
          setNewPassword('')
          setConfirmPassword('')
          setLoading(false)
        }, 2000)
        return
      }

      setStatus('✅ Account creato e login effettuato!')
      setTimeout(() => {
        setOpen(false)
        window.dispatchEvent(new CustomEvent('team-login-success'))
      }, 1000)
    } catch (err) {
      console.error('Error:', err)
      setStatus('Errore durante la creazione dell\'account')
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="rw-overlay" />
        <Dialog.Content className="rw-dialog" style={{ maxWidth: 400 }}>
          {!showPasswordChange ? (
            <>
              <Dialog.Title style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 16 }}>
                🏀 Login Squadra
              </Dialog.Title>
              <Dialog.Description style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: 16 }}>
                Accedi con le credenziali della tua squadra
              </Dialog.Description>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 6, color: '#475569' }}>
                    <User size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                    Username o Email
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="rw-input"
                    required
                    autoComplete="username"
                    placeholder="nome_squadra o email"
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 6, color: '#475569' }}>
                    <Lock size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                    Password / Token
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="rw-input"
                    required
                    autoComplete="current-password"
                    placeholder="Password o token al primo accesso"
                  />
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 6 }}>
                    Al primo accesso usa il token fornito
                  </p>
                </div>

                {status && (
                  <div className="status" style={{ marginBottom: 16, textAlign: 'center', fontSize: 14 }}>
                    {status}
                  </div>
                )}

                <button type="submit" className="btn" disabled={loading} style={{ width: '100%' }}>
                  {loading ? 'Accesso in corso...' : 'Accedi'}
                </button>

                <div style={{ marginTop: 16, textAlign: 'center', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                  <span style={{ fontSize: 13, color: '#64748b' }}>oppure</span>
                  <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                </div>

                <button 
                  type="button" 
                  className="btn secondary" 
                  onClick={() => setShowRegistration(true)}
                  style={{ width: '100%', marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <UserPlus size={18} />
                  Registrati come Utente
                </button>

                <div style={{
                  marginTop: 16,
                  padding: 12,
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: 6
                }}>
                  <div style={{ fontSize: '0.8rem', color: '#0c4a6e', lineHeight: 1.5 }}>
                    <strong>👤 Utente registrato:</strong> Vota gli MVP delle partite e visualizza statistiche complete.
                  </div>
                </div>
              </form>

              <PublicUserRegistration 
                open={showRegistration} 
                onOpenChange={setShowRegistration}
              />
            </>
          ) : (
            <>
              <Dialog.Title style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 16 }}>
                <Key size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                Imposta Password
              </Dialog.Title>
              <Dialog.Description style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: 20 }}>
                Benvenuto <strong>{pendingUserData?.username}</strong>! Imposta una password sicura per il tuo account.
              </Dialog.Description>
              <form onSubmit={handlePasswordChange}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 6, color: '#475569' }}>
                    Nuova Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="rw-input"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="Minimo 6 caratteri"
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 6, color: '#475569' }}>
                    Conferma Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="rw-input"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="Ripeti la password"
                  />
                </div>

                {status && (
                  <div className="status" style={{ marginBottom: 16, textAlign: 'center', fontSize: 14 }}>
                    {status}
                  </div>
                )}

                <button type="submit" className="btn" disabled={loading} style={{ width: '100%' }}>
                  {loading ? 'Creazione account...' : 'Conferma e Accedi'}
                </button>
              </form>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
