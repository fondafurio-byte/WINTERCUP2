import React, { useState, useEffect } from 'react'
import { Users, Plus, Edit2, Trash2, X } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { supabase } from '../lib/supabase'

type Team = { id: string; name: string; girone: string; logo_url?: string | null; team_photo_url?: string | null }
type StaffMember = { id: string; squadra_id: string; ruolo: string; nome: string; cognome: string }
type Athlete = { id: string; squadra_id: string; numero_maglia: string; nome: string; cognome: string }

export default function Partecipanti() {
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [isTeamUser, setIsTeamUser] = useState(false)
  const [loggedInTeamId, setLoggedInTeamId] = useState<string | null>(null)
  
  // Modals state
  const [addStaffOpen, setAddStaffOpen] = useState(false)
  const [addAthleteOpen, setAddAthleteOpen] = useState(false)
  const [editStaffOpen, setEditStaffOpen] = useState(false)
  const [editAthleteOpen, setEditAthleteOpen] = useState(false)
  const [editTeamOpen, setEditTeamOpen] = useState(false)
  const [addTeamOpen, setAddTeamOpen] = useState(false)
  
  // Form state
  const [staffRuolo, setStaffRuolo] = useState('Head Coach')
  const [staffNome, setStaffNome] = useState('')
  const [staffCognome, setStaffCognome] = useState('')
  const [athleteMaglia, setAthleteMaglia] = useState('')
  const [athleteNome, setAthleteNome] = useState('')
  const [athleteCognome, setAthleteCognome] = useState('')
  const [editingItem, setEditingItem] = useState<any>(null)
  const [status, setStatus] = useState<string | null>(null)
  
  // Team edit state
  const [teamName, setTeamName] = useState('')
  const [teamGirone, setTeamGirone] = useState<string>('')
  const [teamLogoUrl, setTeamLogoUrl] = useState('')
  const [teamPhotoUrl, setTeamPhotoUrl] = useState('')

  // Check admin and team user status
  useEffect(() => {
    let mounted = true
    async function checkUserRole() {
      try {
        let user: any = null
        try {
          const userRes: any = await (supabase.auth as any).getUser()
          user = userRes?.data?.user
        } catch (e) {
          try { user = (supabase.auth as any).user?.() ?? null } catch (_) { user = null }
        }
        if (!user) { 
          if (mounted) {
            setIsAdmin(false)
            setIsTeamUser(false)
            setLoggedInTeamId(null)
          }
          return 
        }
        
        // Check if admin
        const { data: adminData, error: adminError } = await supabase.from('admins').select('*').or(`user_id.eq.${user.id},id.eq.${user.id}`).limit(1)
        if (adminError) { console.debug('admin check error', adminError.message) }
        const admin = Boolean(adminData && (adminData as any).length > 0)
        
        // Check if team user
        const { data: teamUserData } = await supabase.from('users').select('squadra_id').eq('user_id', user.id).limit(1)
        const teamUser = Boolean(teamUserData && teamUserData.length > 0)
        const teamId = teamUser && teamUserData && teamUserData.length > 0 ? teamUserData[0].squadra_id : null
        
        if (mounted) {
          setIsAdmin(admin)
          setIsTeamUser(teamUser)
          setLoggedInTeamId(teamId)
        }
      } catch (err) { 
        console.debug(err)
        if (mounted) {
          setIsAdmin(false)
          setIsTeamUser(false)
          setLoggedInTeamId(null)
        }
      }
    }
    checkUserRole()
    
    const handleAdminLogin = () => { checkUserRole() }
    const handleTeamLogin = () => { checkUserRole() }
    window.addEventListener('admin-login-success', handleAdminLogin)
    window.addEventListener('team-login-success', handleTeamLogin)
    
    return () => {
      mounted = false
      window.removeEventListener('admin-login-success', handleAdminLogin)
      window.removeEventListener('team-login-success', handleTeamLogin)
    }
  }, [])

  // Load teams
  useEffect(() => {
    async function loadTeams() {
      try {
        const { data, error } = await supabase.from('squadre').select('id,name,girone,logo_url,team_photo_url').order('name')
        if (error) { console.debug('loadTeams error', error.message); return }
        setTeams((data as any) ?? [])
      } catch (err) { console.debug(err) }
    }
    loadTeams()
  }, [])

  // Helper function to sort staff
  const sortStaff = (staffArray: any[]) => {
    const staffOrder = { 'Head Coach': 1, 'Assistente': 2, 'Accompagnatore': 3, 'Istruttore 1': 1, 'Istruttore 2': 2 }
    return [...staffArray].sort((a: any, b: any) => {
      return (staffOrder[a.ruolo as keyof typeof staffOrder] || 999) - (staffOrder[b.ruolo as keyof typeof staffOrder] || 999)
    })
  }

  // Helper function to sort athletes by jersey number
  const sortAthletes = (athletesArray: any[]) => {
    return [...athletesArray].sort((a: any, b: any) => {
      const numA = parseInt(a.numero_maglia, 10)
      const numB = parseInt(b.numero_maglia, 10)
      if (isNaN(numA) && isNaN(numB)) return a.numero_maglia.localeCompare(b.numero_maglia)
      if (isNaN(numA)) return 1
      if (isNaN(numB)) return -1
      return numA - numB
    })
  }

  // Load staff and athletes when team is selected
  useEffect(() => {
    if (!selectedTeam) return
    async function loadTeamData() {
      try {
        const [staffRes, athletesRes] = await Promise.all([
          supabase.from('staff').select('*').eq('squadra_id', selectedTeam!.id),
          supabase.from('atleti').select('*').eq('squadra_id', selectedTeam!.id).order('numero_maglia')
        ])
        if (staffRes.error) console.debug('staff error', staffRes.error.message)
        if (athletesRes.error) console.debug('athletes error', athletesRes.error.message)
        
        setStaff(sortStaff((staffRes.data as any) ?? []))
        setAthletes(sortAthletes((athletesRes.data as any) ?? []))
      } catch (err) { console.debug(err) }
    }
    loadTeamData()
  }, [selectedTeam])

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTeam || !staffNome || !staffCognome) return
    setStatus(null)
    try {
      const { data, error } = await supabase.from('staff').insert([{
        squadra_id: selectedTeam.id,
        ruolo: staffRuolo,
        nome: staffNome,
        cognome: staffCognome
      }]).select()
      if (error) { setStatus('Errore: ' + error.message); return }
      if (data && data.length) setStaff(prev => sortStaff([...prev, ...(data as any)]))
      setAddStaffOpen(false)
      setStaffNome('')
      setStaffCognome('')
    } catch (err) { setStatus('Errore') }
  }

  async function handleAddAthlete(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTeam || !athleteMaglia || !athleteNome || !athleteCognome) return
    setStatus(null)
    try {
      const { data, error } = await supabase.from('atleti').insert([{
        squadra_id: selectedTeam.id,
        numero_maglia: athleteMaglia,
        nome: athleteNome,
        cognome: athleteCognome
      }]).select()
      if (error) { setStatus('Errore: ' + error.message); return }
      if (data && data.length) setAthletes(prev => sortAthletes([...prev, ...(data as any)]))
      setAddAthleteOpen(false)
      setAthleteMaglia('')
      setAthleteNome('')
      setAthleteCognome('')
    } catch (err) { setStatus('Errore') }
  }

  async function handleUpdateStaff(e: React.FormEvent) {
    e.preventDefault()
    if (!editingItem) return
    setStatus(null)
    try {
      const { data, error } = await supabase.from('staff').update({
        ruolo: staffRuolo,
        nome: staffNome,
        cognome: staffCognome
      }).eq('id', editingItem.id).select()
      if (error) { setStatus('Errore: ' + error.message); return }
      if (data && data.length) {
        setStaff(prev => sortStaff(prev.map(s => s.id === editingItem.id ? (data as any)[0] : s)))
      }
      setEditStaffOpen(false)
      setEditingItem(null)
    } catch (err) { setStatus('Errore') }
  }

  async function handleUpdateAthlete(e: React.FormEvent) {
    e.preventDefault()
    if (!editingItem) return
    setStatus(null)
    try {
      const { data, error } = await supabase.from('atleti').update({
        numero_maglia: athleteMaglia,
        nome: athleteNome,
        cognome: athleteCognome
      }).eq('id', editingItem.id).select()
      if (error) { setStatus('Errore: ' + error.message); return }
      if (data && data.length) {
        setAthletes(prev => sortAthletes(prev.map(a => a.id === editingItem.id ? (data as any)[0] : a)))
      }
      setEditAthleteOpen(false)
      setEditingItem(null)
    } catch (err) { setStatus('Errore') }
  }

  async function handleDeleteStaff(id: string) {
    if (!confirm('Confermi eliminazione?')) return
    try {
      const { error } = await supabase.from('staff').delete().eq('id', id)
      if (error) { alert('Errore: ' + error.message); return }
      setStaff(prev => prev.filter(s => s.id !== id))
    } catch (err) { alert('Errore eliminazione') }
  }

  async function handleDeleteAthlete(id: string) {
    if (!confirm('Confermi eliminazione?')) return
    try {
      const { error } = await supabase.from('atleti').delete().eq('id', id)
      if (error) { alert('Errore: ' + error.message); return }
      setAthletes(prev => prev.filter(a => a.id !== id))
    } catch (err) { alert('Errore eliminazione') }
  }

  async function handleUpdateTeam(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTeam || !teamName) return
    setStatus(null)
    try {
      const { data, error } = await supabase.from('squadre').update({
        name: teamName,
        girone: teamGirone || null,
        logo_url: teamLogoUrl || null,
        team_photo_url: teamPhotoUrl || null
      }).eq('id', selectedTeam.id).select()
      if (error) { setStatus('Errore: ' + error.message); return }
      if (data && data.length) {
        const updatedTeam = (data as any)[0]
        setSelectedTeam(updatedTeam)
        setTeams(prev => prev.map(t => t.id === selectedTeam.id ? updatedTeam : t))
      }
      setEditTeamOpen(false)
      setStatus('Squadra aggiornata!')
      setTimeout(() => setStatus(null), 2000)
    } catch (err) { setStatus('Errore aggiornamento squadra') }
  }

  async function handleAddTeam(e: React.FormEvent) {
    e.preventDefault()
    if (!teamName) return
    setStatus(null)
    try {
      const { data, error } = await supabase.from('squadre').insert([{
        name: teamName,
        girone: teamGirone || null,
        logo_url: teamLogoUrl || null,
        team_photo_url: teamPhotoUrl || null
      }]).select()
      if (error) { setStatus('Errore: ' + error.message); return }
      if (data && data.length) {
        setTeams(prev => [...prev, ...(data as any)])
      }
      setAddTeamOpen(false)
      setTeamName('')
      setTeamGirone('')
      setTeamLogoUrl('')
      setTeamPhotoUrl('')
      setStatus('Squadra creata!')
      setTimeout(() => setStatus(null), 2000)
    } catch (err) { setStatus('Errore creazione squadra') }
  }

  async function handleDeleteTeam() {
    if (!selectedTeam) return
    if (!confirm(`Confermi l'eliminazione della squadra "${selectedTeam.name}"? Verranno eliminati anche tutti gli atleti e lo staff associati.`)) return
    try {
      // Delete staff and athletes first (if foreign keys don't cascade)
      await Promise.all([
        supabase.from('staff').delete().eq('squadra_id', selectedTeam.id),
        supabase.from('atleti').delete().eq('squadra_id', selectedTeam.id)
      ])
      
      const { error } = await supabase.from('squadre').delete().eq('id', selectedTeam.id)
      if (error) { alert('Errore: ' + error.message); return }
      
      setTeams(prev => prev.filter(t => t.id !== selectedTeam.id))
      setSelectedTeam(null)
      setStatus('Squadra eliminata')
      setTimeout(() => setStatus(null), 2000)
    } catch (err) { alert('Errore eliminazione squadra') }
  }

  // Check if user can edit (admin or own team)
  const canEdit = isAdmin || (isTeamUser && selectedTeam?.id === loggedInTeamId)

  return (
    <main style={{ width: '100%', maxWidth: 1100, margin: '24px auto', padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Partecipanti</h1>
        {isAdmin && !selectedTeam && (
          <button 
            className="btn" 
            onClick={() => {
              setTeamName('')
              setTeamGirone('')
              setTeamLogoUrl('')
              setStatus(null)
              setAddTeamOpen(true)
            }}
          >
            <Plus size={16} /> Aggiungi Squadra
          </button>
        )}
      </div>

      {/* Team cards grid */}
      {!selectedTeam && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {teams.map(team => (
            <div
              key={team.id}
              onClick={() => setSelectedTeam(team)}
              style={{
                padding: 20,
                borderRadius: 12,
                border: team.girone === 'A' ? '2px solid #17b3ff' : team.girone === 'B' ? '2px solid #b8160f' : '2px solid #e6edf3',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: team.girone === 'A' ? 'linear-gradient(135deg, #e0f4ff 0%, #b8e6ff 100%)' : team.girone === 'B' ? 'linear-gradient(135deg, #fde8e7 0%, #fbb8b4 100%)' : '#ffffff'
              }}
              onMouseEnter={(e) => { 
                e.currentTarget.style.borderColor = team.girone === 'A' ? '#17b3ff' : team.girone === 'B' ? '#b8160f' : '#0f172a'; 
                e.currentTarget.style.boxShadow = team.girone === 'A' ? '0 4px 12px rgba(23,179,255,0.3)' : team.girone === 'B' ? '0 4px 12px rgba(184,22,15,0.3)' : '0 4px 12px rgba(15,23,42,0.1)' 
              }}
              onMouseLeave={(e) => { 
                e.currentTarget.style.borderColor = team.girone === 'A' ? '#17b3ff' : team.girone === 'B' ? '#b8160f' : '#e6edf3'; 
                e.currentTarget.style.boxShadow = 'none' 
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {team.logo_url ? (
                  <img 
                    src={team.logo_url} 
                    alt={`${team.name} logo`} 
                    style={{ width: 48, height: 48, objectFit: 'contain' }}
                    onError={(e) => { 
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.nextElementSibling?.setAttribute('style', 'display: block')
                    }}
                  />
                ) : (
                  <Users size={24} color="#0f172a" />
                )}
                {!team.logo_url && <Users size={24} color="#0f172a" style={{ display: 'none' }} />}
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{team.name}</div>
                  <div style={{ fontSize: '0.9rem', color: '#64748b', marginTop: 4 }}>Girone {team.girone}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Team detail view */}
      {selectedTeam && (
        <div>
          {/* Team Header with Logo */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            gap: 16, 
            marginBottom: 24,
            padding: 20,
            background: selectedTeam.girone === 'A' ? 'linear-gradient(135deg, #e0f4ff 0%, #b8e6ff 100%)' : selectedTeam.girone === 'B' ? 'linear-gradient(135deg, #fde8e7 0%, #fbb8b4 100%)' : '#f8fafc',
            borderRadius: 12,
            border: selectedTeam.girone === 'A' ? '2px solid #17b3ff' : selectedTeam.girone === 'B' ? '2px solid #b8160f' : '2px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              {selectedTeam.logo_url ? (
                <img 
                  src={selectedTeam.logo_url} 
                  alt={`${selectedTeam.name} logo`}
                  style={{ 
                    width: 80, 
                    height: 80, 
                    objectFit: 'contain'
                  }}
                />
              ) : (
                <div style={{
                  width: 80,
                  height: 80,
                  background: 'white',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Users size={40} color="#64748b" />
                </div>
              )}
              {selectedTeam.team_photo_url && (
                <img 
                  src={selectedTeam.team_photo_url} 
                  alt={`${selectedTeam.name} team photo`}
                  style={{ 
                    width: 200,
                    maxHeight: 150,
                    objectFit: 'cover',
                    borderRadius: 8,
                    border: '2px solid white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, marginBottom: 8, fontSize: '1.75rem' }}>{selectedTeam.name}</h2>
              <span style={{ color: '#64748b', fontSize: '1rem', fontWeight: 600 }}>Girone {selectedTeam.girone || 'Non assegnato'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <button className="btn secondary" onClick={() => setSelectedTeam(null)}>
              <X size={16} /> Indietro
            </button>
            {isAdmin && (
              <>
                <button 
                  className="btn" 
                  style={{ marginLeft: 'auto' }}
                  onClick={() => {
                    setTeamName(selectedTeam.name)
                    setTeamGirone(selectedTeam.girone || '')
                    setTeamLogoUrl(selectedTeam.logo_url || '')
                    setTeamPhotoUrl(selectedTeam.team_photo_url || '')
                    setStatus(null)
                    setEditTeamOpen(true)
                  }}
                >
                  <Edit2 size={16} /> Modifica dati squadra
                </button>
                <button 
                  className="btn" 
                  style={{ background: '#dc2626', borderColor: '#dc2626' }}
                  onClick={handleDeleteTeam}
                >
                  <Trash2 size={16} /> Elimina squadra
                </button>
              </>
            )}
          </div>

          {/* Staff section */}
          <section style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3>Staff</h3>
              {canEdit && (
                <button className="btn" onClick={() => { setAddStaffOpen(true); setStaffRuolo('Head Coach'); setStaffNome(''); setStaffCognome(''); setStatus(null) }}>
                  <Plus size={16} /> Aggiungi
                </button>
              )}
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {staff.length === 0 && <div style={{ color: '#64748b' }}>Nessuno staff</div>}
              {staff.map(s => {
                // Map old roles to new roles for display
                const displayRole = s.ruolo === 'Istruttore 1' ? 'Head Coach' : s.ruolo === 'Istruttore 2' ? 'Assistente' : s.ruolo
                return (
                <div key={s.id} style={{ padding: 12, border: '1px solid #e6edf3', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{s.nome} {s.cognome}</div>
                    <div style={{ fontSize: '0.9rem', color: '#64748b' }}>{displayRole}</div>
                  </div>
                  {canEdit && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={{ background: 'transparent', border: 0, cursor: 'pointer' }} onClick={() => {
                        setEditingItem(s)
                        setStaffRuolo(s.ruolo)
                        setStaffNome(s.nome)
                        setStaffCognome(s.cognome)
                        setStatus(null)
                        setEditStaffOpen(true)
                      }}>
                        <Edit2 size={16} />
                      </button>
                      <button style={{ background: 'transparent', border: 0, cursor: 'pointer' }} onClick={() => handleDeleteStaff(s.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )})}
            </div>
          </section>

          {/* Athletes section */}
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3>Atleti</h3>
              {canEdit && (
                <button className="btn" onClick={() => { setAddAthleteOpen(true); setAthleteMaglia(''); setAthleteNome(''); setAthleteCognome(''); setStatus(null) }}>
                  <Plus size={16} /> Aggiungi
                </button>
              )}
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {athletes.length === 0 && <div style={{ color: '#64748b' }}>Nessun atleta</div>}
              {athletes.map(a => (
                <div key={a.id} style={{ padding: 12, border: '1px solid #e6edf3', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem' }}>
                      {a.numero_maglia}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{a.nome} {a.cognome}</div>
                    </div>
                  </div>
                  {canEdit && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={{ background: 'transparent', border: 0, cursor: 'pointer' }} onClick={() => {
                        setEditingItem(a)
                        setAthleteMaglia(a.numero_maglia)
                        setAthleteNome(a.nome)
                        setAthleteCognome(a.cognome)
                        setStatus(null)
                        setEditAthleteOpen(true)
                      }}>
                        <Edit2 size={16} />
                      </button>
                      <button style={{ background: 'transparent', border: 0, cursor: 'pointer' }} onClick={() => handleDeleteAthlete(a.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Add Staff Modal */}
      <Dialog.Root open={addStaffOpen} onOpenChange={setAddStaffOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="rw-overlay" />
          <Dialog.Content className="rw-dialog">
            <Dialog.Title style={{ fontSize: '1.05rem', fontWeight: 700 }}>Aggiungi Staff</Dialog.Title>
            <form onSubmit={handleAddStaff} style={{ marginTop: 12, display: 'grid', gap: 12 }}>
              <div>
                <div style={{ marginBottom: 6, fontWeight: 600 }}>Ruolo</div>
                <select className="rw-input" value={staffRuolo} onChange={e => setStaffRuolo(e.target.value)}>
                  <option value="Head Coach">Head Coach</option>
                  <option value="Assistente">Assistente</option>
                  <option value="Accompagnatore">Accompagnatore</option>
                </select>
              </div>
              <div>
                <div style={{ marginBottom: 6, fontWeight: 600 }}>Nome</div>
                <input className="rw-input" value={staffNome} onChange={e => setStaffNome(e.target.value)} placeholder="Nome" required />
              </div>
              <div>
                <div style={{ marginBottom: 6, fontWeight: 600 }}>Cognome</div>
                <input className="rw-input" value={staffCognome} onChange={e => setStaffCognome(e.target.value)} placeholder="Cognome" required />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                <Dialog.Close asChild>
                  <button type="button" className="btn secondary">Annulla</button>
                </Dialog.Close>
                <button className="btn" type="submit">Salva</button>
              </div>
              {status && <div className="status">{status}</div>}
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Edit Staff Modal */}
      <Dialog.Root open={editStaffOpen} onOpenChange={setEditStaffOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="rw-overlay" />
          <Dialog.Content className="rw-dialog">
            <Dialog.Title style={{ fontSize: '1.05rem', fontWeight: 700 }}>Modifica Staff</Dialog.Title>
            <form onSubmit={handleUpdateStaff} style={{ marginTop: 12, display: 'grid', gap: 12 }}>
              <div>
                <div style={{ marginBottom: 6, fontWeight: 600 }}>Ruolo</div>
                <select className="rw-input" value={staffRuolo} onChange={e => setStaffRuolo(e.target.value)}>
                  <option value="Head Coach">Head Coach</option>
                  <option value="Assistente">Assistente</option>
                  <option value="Accompagnatore">Accompagnatore</option>
                </select>
              </div>
              <div>
                <div style={{ marginBottom: 6, fontWeight: 600 }}>Nome</div>
                <input className="rw-input" value={staffNome} onChange={e => setStaffNome(e.target.value)} placeholder="Nome" required />
              </div>
              <div>
                <div style={{ marginBottom: 6, fontWeight: 600 }}>Cognome</div>
                <input className="rw-input" value={staffCognome} onChange={e => setStaffCognome(e.target.value)} placeholder="Cognome" required />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                <Dialog.Close asChild>
                  <button type="button" className="btn secondary">Annulla</button>
                </Dialog.Close>
                <button className="btn" type="submit">Salva</button>
              </div>
              {status && <div className="status">{status}</div>}
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Add Athlete Modal */}
      <Dialog.Root open={addAthleteOpen} onOpenChange={setAddAthleteOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="rw-overlay" />
          <Dialog.Content className="rw-dialog">
            <Dialog.Title style={{ fontSize: '1.05rem', fontWeight: 700 }}>Aggiungi Atleta</Dialog.Title>
            <form onSubmit={handleAddAthlete} style={{ marginTop: 12, display: 'grid', gap: 12 }}>
              <div>
                <div style={{ marginBottom: 6, fontWeight: 600 }}>Numero Maglia</div>
                <select className="rw-input" value={athleteMaglia} onChange={e => setAthleteMaglia(e.target.value)} required>
                  <option value="">-- seleziona --</option>
                  <option value="0">0</option>
                  <option value="00">00</option>
                  {Array.from({ length: 100 }, (_, i) => i + 1).map(n => (
                    <option key={n} value={String(n)}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ marginBottom: 6, fontWeight: 600 }}>Nome</div>
                <input className="rw-input" value={athleteNome} onChange={e => setAthleteNome(e.target.value)} placeholder="Nome" required />
              </div>
              <div>
                <div style={{ marginBottom: 6, fontWeight: 600 }}>Cognome</div>
                <input className="rw-input" value={athleteCognome} onChange={e => setAthleteCognome(e.target.value)} placeholder="Cognome" required />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                <Dialog.Close asChild>
                  <button type="button" className="btn secondary">Annulla</button>
                </Dialog.Close>
                <button className="btn" type="submit">Salva</button>
              </div>
              {status && <div className="status">{status}</div>}
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Edit Athlete Modal */}
      <Dialog.Root open={editAthleteOpen} onOpenChange={setEditAthleteOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="rw-overlay" />
          <Dialog.Content className="rw-dialog">
            <Dialog.Title style={{ fontSize: '1.05rem', fontWeight: 700 }}>Modifica Atleta</Dialog.Title>
            <form onSubmit={handleUpdateAthlete} style={{ marginTop: 12, display: 'grid', gap: 12 }}>
              <div>
                <div style={{ marginBottom: 6, fontWeight: 600 }}>Numero Maglia</div>
                <select className="rw-input" value={athleteMaglia} onChange={e => setAthleteMaglia(e.target.value)} required>
                  <option value="">-- seleziona --</option>
                  <option value="0">0</option>
                  <option value="00">00</option>
                  {Array.from({ length: 100 }, (_, i) => i + 1).map(n => (
                    <option key={n} value={String(n)}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ marginBottom: 6, fontWeight: 600 }}>Nome</div>
                <input className="rw-input" value={athleteNome} onChange={e => setAthleteNome(e.target.value)} placeholder="Nome" required />
              </div>
              <div>
                <div style={{ marginBottom: 6, fontWeight: 600 }}>Cognome</div>
                <input className="rw-input" value={athleteCognome} onChange={e => setAthleteCognome(e.target.value)} placeholder="Cognome" required />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                <Dialog.Close asChild>
                  <button type="button" className="btn secondary">Annulla</button>
                </Dialog.Close>
                <button className="btn" type="submit">Salva</button>
              </div>
              {status && <div className="status">{status}</div>}
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Edit Team Modal */}
      {isAdmin && (
      <Dialog.Root open={editTeamOpen} onOpenChange={setEditTeamOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="rw-overlay" />
          <Dialog.Content className="rw-dialog">
            <Dialog.Title style={{ fontSize: '1.05rem', fontWeight: 700 }}>Modifica Dati Squadra</Dialog.Title>
            <form onSubmit={handleUpdateTeam} style={{ marginTop: 12, display: 'grid', gap: 12 }}>
              <div>
                <div style={{ marginBottom: 6, fontWeight: 600 }}>Nome Squadra</div>
                <input 
                  className="rw-input" 
                  value={teamName} 
                  onChange={e => setTeamName(e.target.value)} 
                  placeholder="Nome squadra" 
                  required 
                />
              </div>
              <div>
                <div style={{ marginBottom: 6, fontWeight: 600 }}>Girone</div>
                <select className="rw-input" value={teamGirone} onChange={e => setTeamGirone(e.target.value)}>
                  <option value="">-- Non assegnato --</option>
                  <option value="A">Girone A</option>
                  <option value="B">Girone B</option>
                </select>
              </div>
              <div>
                <div style={{ marginBottom: 6, fontWeight: 600 }}>Logo URL</div>
                <input 
                  className="rw-input" 
                  value={teamLogoUrl} 
                  onChange={e => setTeamLogoUrl(e.target.value)} 
                  placeholder="https://esempio.com/logo.png" 
                  type="url"
                />
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
                  Inserisci l'URL pubblico del logo (es. da Imgur, Google Drive, ecc.)
                </div>
                {teamLogoUrl && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Anteprima:</div>
                    <img 
                      src={teamLogoUrl} 
                      alt="Logo anteprima" 
                      style={{ maxWidth: 80, maxHeight: 80, borderRadius: 8, border: '2px solid #e6edf3' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  </div>
                )}
              </div>
              <div>
                <div style={{ marginBottom: 6, fontWeight: 600 }}>Foto Squadra URL</div>
                <input 
                  className="rw-input" 
                  value={teamPhotoUrl} 
                  onChange={e => setTeamPhotoUrl(e.target.value)} 
                  placeholder="https://esempio.com/foto-squadra.jpg" 
                  type="url"
                />
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
                  Foto della squadra che apparirà sotto il logo (opzionale)
                </div>
                {teamPhotoUrl && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Anteprima:</div>
                    <img 
                      src={teamPhotoUrl} 
                      alt="Foto squadra anteprima" 
                      style={{ maxWidth: 200, maxHeight: 150, borderRadius: 8, border: '2px solid #e6edf3', objectFit: 'cover' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                <Dialog.Close asChild>
                  <button type="button" className="btn secondary">Annulla</button>
                </Dialog.Close>
                <button className="btn" type="submit">Salva</button>
              </div>
              {status && <div className="status">{status}</div>}
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      )}

      {/* Add Team Modal */}
      {isAdmin && (
      <Dialog.Root open={addTeamOpen} onOpenChange={setAddTeamOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="rw-overlay" />
          <Dialog.Content className="rw-dialog">
            <Dialog.Title style={{ fontSize: '1.05rem', fontWeight: 700 }}>Aggiungi Nuova Squadra</Dialog.Title>
            <form onSubmit={handleAddTeam} style={{ marginTop: 12, display: 'grid', gap: 12 }}>
              <div>
                <div style={{ marginBottom: 6, fontWeight: 600 }}>Nome Squadra</div>
                <input 
                  className="rw-input" 
                  value={teamName} 
                  onChange={e => setTeamName(e.target.value)} 
                  placeholder="Nome squadra" 
                  required 
                />
              </div>
              <div>
                <div style={{ marginBottom: 6, fontWeight: 600 }}>Girone</div>
                <select className="rw-input" value={teamGirone} onChange={e => setTeamGirone(e.target.value)}>
                  <option value="">-- Non assegnato --</option>
                  <option value="A">Girone A</option>
                  <option value="B">Girone B</option>
                </select>
              </div>
              <div>
                <div style={{ marginBottom: 6, fontWeight: 600 }}>Logo URL</div>
                <input 
                  className="rw-input" 
                  value={teamLogoUrl} 
                  onChange={e => setTeamLogoUrl(e.target.value)} 
                  placeholder="https://esempio.com/logo.png" 
                  type="url"
                />
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
                  Inserisci l'URL pubblico del logo (es. da Imgur, Google Drive, ecc.)
                </div>
                {teamLogoUrl && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Anteprima:</div>
                    <img 
                      src={teamLogoUrl} 
                      alt="Logo anteprima" 
                      style={{ maxWidth: 80, maxHeight: 80, borderRadius: 8, border: '2px solid #e6edf3' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  </div>
                )}
              </div>
              <div>
                <div style={{ marginBottom: 6, fontWeight: 600 }}>Foto Squadra URL</div>
                <input 
                  className="rw-input" 
                  value={teamPhotoUrl} 
                  onChange={e => setTeamPhotoUrl(e.target.value)} 
                  placeholder="https://esempio.com/foto-squadra.jpg" 
                  type="url"
                />
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
                  Foto della squadra che apparirà sotto il logo (opzionale)
                </div>
                {teamPhotoUrl && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Anteprima:</div>
                    <img 
                      src={teamPhotoUrl} 
                      alt="Foto squadra anteprima" 
                      style={{ maxWidth: 200, maxHeight: 150, borderRadius: 8, border: '2px solid #e6edf3', objectFit: 'cover' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                <Dialog.Close asChild>
                  <button type="button" className="btn secondary">Annulla</button>
                </Dialog.Close>
                <button className="btn" type="submit">Crea Squadra</button>
              </div>
              {status && <div className="status">{status}</div>}
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      )}
    </main>
  )
}
