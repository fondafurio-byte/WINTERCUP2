import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Copy, RefreshCw, Eye, EyeOff, Edit2, Check, X } from 'lucide-react'
import { getEventStats } from '../lib/analytics'

type TeamToken = {
  squadra_id: string
  squadra_nome: string
  girone: string
  token: string
  username: string
  email: string
  has_changed_password: boolean
  user_created_at: string
}

export default function TokenManager() {
  const [tokens, setTokens] = useState<TeamToken[]>([])
  const [loading, setLoading] = useState(true)
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({})
  const [isAdmin, setIsAdmin] = useState(false)
  const [editingField, setEditingField] = useState<{ squadraId: string; field: 'username' | 'email' } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [counts, setCounts] = useState<{
    senzaLogin?: string | number
    publicUsers: number
    teamUsers: number
    rilevatori: number
    admins: number
    totale: number
    appOpens?: number
    logins?: number
  }>({ senzaLogin: '-', publicUsers: 0, teamUsers: 0, rilevatori: 0, admins: 0, totale: 0, appOpens: 0, logins: 0 })
  const [showUsersModal, setShowUsersModal] = useState(false)
  const [usersList, setUsersList] = useState<Array<any>>([])

  useEffect(() => {
    checkAdmin()
  }, [])

  async function checkAdmin() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setIsAdmin(false)
        setLoading(false)
        return
      }

      const { data: adminData } = await supabase
        .from('admins')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)

      if (adminData && adminData.length > 0) {
        setIsAdmin(true)
        loadTokens()
        loadStats()
      } else {
        setIsAdmin(false)
        setLoading(false)
      }
    } catch (err) {
      console.error('Error checking admin:', err)
      setIsAdmin(false)
      setLoading(false)
    }
  }

  async function loadTokens() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('team_tokens_view')
        .select('*')
        .order('girone')
        .order('squadra_nome')

      if (error) {
        console.error('Error loading tokens:', error)
      } else {
        setTokens(data || [])
      }
    } catch (err) {
      console.error('Error:', err)
    }
    setLoading(false)
  }

  // Admin statistics
  async function loadStats() {
    setStatsLoading(true)
    try {
      // Fetch counts from main tables
      const { data: teamData } = await supabase.from('users').select('user_id')
      const { data: pubData } = await supabase.from('public_users').select('user_id')
      const { data: rilevatoriData } = await supabase.from('rilevatori').select('id')
      const { data: adminsList } = await supabase.from('admins').select('id')

      const teamCount = (teamData && teamData.length) || 0
      const pubCount = (pubData && pubData.length) || 0
      const rilevCount = (rilevatoriData && rilevatoriData.length) || 0
      const adminCount = (adminsList && adminsList.length) || 0

      const total = teamCount + pubCount + rilevCount + adminCount

      // Get event stats from analytics table
      const eventStats = await getEventStats()
      const appOpens = eventStats?.byType?.['app_open'] || 0
      const logins = eventStats?.byType?.['login'] || 0

      setCounts({
        senzaLogin: '-',
        publicUsers: pubCount,
        teamUsers: teamCount,
        rilevatori: rilevCount,
        admins: adminCount,
        totale: total,
        appOpens,
        logins
      })
    } catch (err) {
      console.error('Error loading stats:', err)
    }
    setStatsLoading(false)
  }

  async function loadUsersList() {
    try {
      const [ { data: teamData }, { data: pubData }, { data: rilevData }, { data: adminsData } ] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('public_users').select('*'),
        supabase.from('rilevatori').select('*'),
        supabase.from('admins').select('*')
      ])

      const unified: any[] = []
      ;(teamData || []).forEach((u: any) => unified.push({ type: 'squadra', data: u }))
      ;(pubData || []).forEach((u: any) => unified.push({ type: 'pubblico', data: u }))
      ;(rilevData || []).forEach((u: any) => unified.push({ type: 'rilevatore', data: u }))
      ;(adminsData || []).forEach((u: any) => unified.push({ type: 'admin', data: u }))

      setUsersList(unified)
      setShowUsersModal(true)
    } catch (err) {
      console.error('Error loading users list:', err)
      alert('Errore caricamento elenco utenti')
    }
  }

  async function regenerateToken(squadraId: string) {
    if (!confirm('Rigenerare il token? Questo invaliderà il token precedente.')) return

    try {
      const { error } = await supabase.rpc('generate_team_token')

      if (error) {
        alert('Errore nella rigenerazione del token: ' + error.message)
      } else {
        loadTokens()
        alert('Token rigenerato con successo!')
      }
    } catch (err) {
      console.error('Error:', err)
      alert('Errore nella rigenerazione del token')
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    alert('Copiato negli appunti!')
  }

  function toggleShowToken(squadraId: string) {
    setShowTokens(prev => ({
      ...prev,
      [squadraId]: !prev[squadraId]
    }))
  }

  function startEditing(squadraId: string, field: 'username' | 'email', currentValue: string) {
    setEditingField({ squadraId, field })
    setEditValue(currentValue)
  }

  function cancelEditing() {
    setEditingField(null)
    setEditValue('')
  }

  async function saveEdit() {
    if (!editingField) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({ [editingField.field]: editValue })
        .eq('squadra_id', editingField.squadraId)

      if (error) {
        alert('Errore nel salvataggio: ' + error.message)
      } else {
        loadTokens()
        setEditingField(null)
        setEditValue('')
      }
    } catch (err) {
      console.error('Error saving edit:', err)
      alert('Errore nel salvataggio')
    }
    setSaving(false)
  }

  function renderEditableField(squadraId: string, field: 'username' | 'email', value: string) {
    const isEditing = editingField?.squadraId === squadraId && editingField?.field === field

    if (isEditing) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type={field === 'email' ? 'email' : 'text'}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            disabled={saving}
            autoFocus
            style={{
              padding: '4px 8px',
              border: '2px solid #3b82f6',
              borderRadius: 4,
              fontSize: '0.875rem',
              fontFamily: field === 'username' ? 'monospace' : 'inherit',
              width: field === 'email' ? '200px' : '140px'
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit()
              if (e.key === 'Escape') cancelEditing()
            }}
          />
          <button
            onClick={saveEdit}
            disabled={saving || !editValue.trim()}
            style={{
              background: '#10b981',
              border: 'none',
              borderRadius: 4,
              padding: 4,
              cursor: saving ? 'wait' : 'pointer',
              color: 'white',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Salva"
          >
            <Check size={14} />
          </button>
          <button
            onClick={cancelEditing}
            disabled={saving}
            style={{
              background: '#ef4444',
              border: 'none',
              borderRadius: 4,
              padding: 4,
              cursor: 'pointer',
              color: 'white',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Annulla"
          >
            <X size={14} />
          </button>
        </div>
      )
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: field === 'username' ? 'monospace' : 'inherit' }}>
          {value}
        </span>
        <button
          onClick={() => startEditing(squadraId, field, value)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            color: '#64748b',
            display: 'flex',
            alignItems: 'center'
          }}
          title="Modifica"
        >
          <Edit2 size={14} />
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <main style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>
        Caricamento...
      </main>
    )
  }

  if (!isAdmin) {
    return (
      <main style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>
        Accesso negato. Solo gli amministratori possono visualizzare questa pagina.
      </main>
    )
  }

  const gironiA = tokens.filter(t => t.girone === 'A')
  const gironiB = tokens.filter(t => t.girone === 'B')

  return (
    <main style={{ padding: 20, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: 8, color: '#1e293b' }}>
          🔧 Gestione
        </h1>
        <p style={{ color: '#64748b' }}>
          Pannello amministrazione: gestione token e statistiche utenti.
        </p>
      </div>

      {/* Girone A */}
      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 16, color: '#17b3ff' }}>
          Girone A
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.875rem' }}>Squadra</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.875rem' }}>Username</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.875rem' }}>Email</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.875rem' }}>Token</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, fontSize: '0.875rem' }}>Password Cambiata</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, fontSize: '0.875rem' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {gironiA.map(team => (
                <tr key={team.squadra_id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{team.squadra_nome}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem' }}>
                    {renderEditableField(team.squadra_id, 'username', team.username)}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem' }}>
                    {renderEditableField(team.squadra_id, 'email', team.email)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <code style={{ 
                        background: '#f1f5f9', 
                        padding: '4px 8px', 
                        borderRadius: 4,
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        letterSpacing: '0.5px'
                      }}>
                        {showTokens[team.squadra_id] ? team.token : '••••••••••••'}
                      </code>
                      <button
                        onClick={() => toggleShowToken(team.squadra_id)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}
                        title={showTokens[team.squadra_id] ? 'Nascondi' : 'Mostra'}
                      >
                        {showTokens[team.squadra_id] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: 12,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: team.has_changed_password ? '#dcfce7' : '#fef3c7',
                      color: team.has_changed_password ? '#166534' : '#92400e'
                    }}>
                      {team.has_changed_password ? '✓ Sì' : '✗ No'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button
                      onClick={() => copyToClipboard(`Username: ${team.username}\nToken: ${team.token}`)}
                      style={{
                        background: 'transparent',
                        border: '1px solid #cbd5e1',
                        borderRadius: 4,
                        padding: '6px 12px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                      title="Copia credenziali"
                    >
                      <Copy size={14} />
                      Copia
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Girone B */}
      <div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 16, color: '#b8160f' }}>
          Girone B
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.875rem' }}>Squadra</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.875rem' }}>Username</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.875rem' }}>Email</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.875rem' }}>Token</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, fontSize: '0.875rem' }}>Password Cambiata</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, fontSize: '0.875rem' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {gironiB.map(team => (
                <tr key={team.squadra_id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{team.squadra_nome}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem' }}>
                    {renderEditableField(team.squadra_id, 'username', team.username)}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem' }}>
                    {renderEditableField(team.squadra_id, 'email', team.email)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <code style={{ 
                        background: '#f1f5f9', 
                        padding: '4px 8px', 
                        borderRadius: 4,
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        letterSpacing: '0.5px'
                      }}>
                        {showTokens[team.squadra_id] ? team.token : '••••••••••••'}
                      </code>
                      <button
                        onClick={() => toggleShowToken(team.squadra_id)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}
                        title={showTokens[team.squadra_id] ? 'Nascondi' : 'Mostra'}
                      >
                        {showTokens[team.squadra_id] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: 12,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: team.has_changed_password ? '#dcfce7' : '#fef3c7',
                      color: team.has_changed_password ? '#166534' : '#92400e'
                    }}>
                      {team.has_changed_password ? '✓ Sì' : '✗ No'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button
                      onClick={() => copyToClipboard(`Username: ${team.username}\nToken: ${team.token}`)}
                      style={{
                        background: 'transparent',
                        border: '1px solid #cbd5e1',
                        borderRadius: 4,
                        padding: '6px 12px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                      title="Copia credenziali"
                    >
                      <Copy size={14} />
                      Copia
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 32, padding: 16, background: '#fef3c7', borderRadius: 8, border: '1px solid #fde68a' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 8, color: '#92400e' }}>
          ℹ️ Istruzioni per le squadre
        </h3>
        <ul style={{ color: '#92400e', paddingLeft: 20, margin: 0 }}>
          <li>Al primo accesso, usare lo <strong>username</strong> e il <strong>token</strong> come password</li>
          <li>Dopo il primo login, verrà richiesto di impostare una nuova password</li>
          <li>Gli utenti squadra hanno accesso in <strong>sola lettura</strong> ai dati</li>
        </ul>
      </div>

      {/* Admin statistics */}
      <div style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12, color: '#0f172a' }}>Statistiche</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 12 }}>
          <div style={{ padding: 12, background: 'white', borderRadius: 8, border: '1px solid #e6e6e6' }}>
            <div style={{ fontSize: 12, color: '#64748b' }}>Senza login</div>
            <div style={{ fontWeight: 700, fontSize: 20 }}>{counts.senzaLogin}</div>
          </div>
          <div style={{ padding: 12, background: 'white', borderRadius: 8, border: '1px solid #e6e6e6' }}>
            <div style={{ fontSize: 12, color: '#64748b' }}>Utente pubblico</div>
            <div style={{ fontWeight: 700, fontSize: 20 }}>{statsLoading ? '...' : counts.publicUsers}</div>
          </div>
          <div style={{ padding: 12, background: 'white', borderRadius: 8, border: '1px solid #e6e6e6' }}>
            <div style={{ fontSize: 12, color: '#64748b' }}>Squadra</div>
            <div style={{ fontWeight: 700, fontSize: 20 }}>{statsLoading ? '...' : counts.teamUsers}</div>
          </div>
          <div style={{ padding: 12, background: 'white', borderRadius: 8, border: '1px solid #e6e6e6' }}>
            <div style={{ fontSize: 12, color: '#64748b' }}>Rilevatore</div>
            <div style={{ fontWeight: 700, fontSize: 20 }}>{statsLoading ? '...' : counts.rilevatori}</div>
          </div>
          <div style={{ padding: 12, background: 'white', borderRadius: 8, border: '1px solid #e6e6e6' }}>
            <div style={{ fontSize: 12, color: '#64748b' }}>Admin</div>
            <div style={{ fontWeight: 700, fontSize: 20 }}>{statsLoading ? '...' : counts.admins}</div>
          </div>
          <div style={{ padding: 12, background: 'white', borderRadius: 8, border: '1px solid #e6e6e6' }}>
            <div style={{ fontSize: 12, color: '#64748b' }}>Totale</div>
            <div style={{ fontWeight: 700, fontSize: 20 }}>{statsLoading ? '...' : counts.totale}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => loadStats()}
            style={{ background: '#3b82f6', color: 'white', border: 0, borderRadius: 6, padding: '8px 12px', cursor: 'pointer' }}
            title="Aggiorna statistiche"
          >
            <RefreshCw size={14} />&nbsp;Aggiorna
          </button>

          <button
            onClick={() => loadUsersList()}
            style={{ background: '#0f172a', color: 'white', border: 0, borderRadius: 6, padding: '8px 12px', cursor: 'pointer' }}
          >
            Elenco Utenti
          </button>

          <div style={{ marginLeft: 'auto', color: '#64748b', fontSize: 13 }}>
            <strong>Aperture app:</strong> {statsLoading ? '...' : counts.appOpens || 0} | <strong>Accessi:</strong> {statsLoading ? '...' : counts.logins || 0}
          </div>
        </div>
      </div>

      {/* Users modal */}
      {showUsersModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '90%', maxWidth: 900, maxHeight: '85vh', overflow: 'auto', background: 'white', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Elenco Utenti</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowUsersModal(false)} style={{ background: '#ef4444', color: 'white', border: 0, borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>
                  Chiudi
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ textAlign: 'left', padding: 8 }}>Tipo</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>ID</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Username / Email</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Dettagli</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e6e6e6' }}>
                      <td style={{ padding: 8, textTransform: 'capitalize' }}>{u.type}</td>
                      <td style={{ padding: 8 }}>{u.data?.user_id || u.data?.id || '—'}</td>
                      <td style={{ padding: 8 }}>{u.data?.username || u.data?.email || u.data?.nome || '—'}</td>
                      <td style={{ padding: 8 }}>
                        {Object.keys(u.data || {}).slice(0, 4).map(k => (
                          <div key={k}><strong>{k}:</strong> {String((u.data || {})[k])}</div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
