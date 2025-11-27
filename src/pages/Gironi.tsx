import React, { useState, useEffect, useMemo } from 'react'
import { MapPin, Calendar, Clock, Edit2, Trash2, Zap, Plus, Trophy, BarChart3, UserPlus } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { supabase } from '../lib/supabase'
import VoteDialog from '../components/VoteDialog'

type Team = { id: string; name: string; girone?: string; logo_url?: string | null }
type MatchRow = { id?: string; home_team_id: string; away_team_id: string; campo?: string; orario?: string; girone: string; home_score?: number | null; away_score?: number | null }

export default function Gironi(){
  const [girone, setGirone] = useState<'A'|'B'>('A')
  const [view, setView] = useState<'squadre'|'partite'>('squadre')

  const [isAdmin, setIsAdmin] = useState(false)
  const [isRilevatore, setIsRilevatore] = useState(false)
  const [isTeamUser, setIsTeamUser] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [matches, setMatches] = useState<MatchRow[]>([])

  // Add team modal state
  const [addTeamModalOpen, setAddTeamModalOpen] = useState(false)
  const [availableTeams, setAvailableTeams] = useState<Team[]>([])
  const [selectedTeamToAdd, setSelectedTeamToAdd] = useState<string>('')
  const [addTeamStatus, setAddTeamStatus] = useState<string | null>(null)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [homeTeam, setHomeTeam] = useState<string>('')
  const [awayTeam, setAwayTeam] = useState<string>('')
  const [campo, setCampo] = useState('')
  const [orario, setOrario] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  // edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editHomeTeam, setEditHomeTeam] = useState<string>('')
  const [editAwayTeam, setEditAwayTeam] = useState<string>('')
  const [editCampo, setEditCampo] = useState<string>('')
  const [editOrario, setEditOrario] = useState<string>('')
  const [editRilevatore, setEditRilevatore] = useState<string>('')
  const [editStatus, setEditStatus] = useState<string | null>(null)
  const [editHomeScore, setEditHomeScore] = useState<string>('')
  const [editAwayScore, setEditAwayScore] = useState<string>('')
  const [rilevatori, setRilevatori] = useState<Array<{id:string; nome:string; cognome:string; username:string}>>([])

  // Punti atleti modal state
  const [puntiModalOpen, setPuntiModalOpen] = useState(false)
  const [puntiMatchId, setPuntiMatchId] = useState<string | null>(null)
  const [atleti, setAtleti] = useState<Array<{id:string; nome:string; cognome:string; numero_maglia:string; squadra_nome:string}>>([])
  const [selectedAtleta, setSelectedAtleta] = useState<string>('')
  const [puntiValue, setPuntiValue] = useState<string>('')
  const [puntiStatus, setPuntiStatus] = useState<string | null>(null)
  const [loadingAtleti, setLoadingAtleti] = useState(false)

  // Live scoring modal state
  const [liveModalOpen, setLiveModalOpen] = useState(false)
  const [liveMatchId, setLiveMatchId] = useState<string | null>(null)
  const [homeAtleti, setHomeAtleti] = useState<Array<{id:string; nome:string; cognome:string; numero_maglia:string}>>([])
  const [awayAtleti, setAwayAtleti] = useState<Array<{id:string; nome:string; cognome:string; numero_maglia:string}>>([])
  const [liveStatus, setLiveStatus] = useState<string | null>(null)
  const [loadingLive, setLoadingLive] = useState(false)
  const [atletiPunti, setAtletiPunti] = useState<Record<string, number>>({}) // atletaId -> total punti

  // Vote dialog state
  const [voteModalOpen, setVoteModalOpen] = useState(false)
  const [voteMatchId, setVoteMatchId] = useState<string | null>(null)
  const [voteSquadraCasa, setVoteSquadraCasa] = useState<Team | null>(null)
  const [voteSquadraOspite, setVoteSquadraOspite] = useState<Team | null>(null)

  // View stats modal state (for regular users)
  const [viewStatsModalOpen, setViewStatsModalOpen] = useState(false)
  const [viewStatsMatchId, setViewStatsMatchId] = useState<string | null>(null)
  const [viewStatsHomeAtleti, setViewStatsHomeAtleti] = useState<Array<{id:string; nome:string; cognome:string; numero_maglia:string; punti:number}>>([])
  const [viewStatsAwayAtleti, setViewStatsAwayAtleti] = useState<Array<{id:string; nome:string; cognome:string; numero_maglia:string; punti:number}>>([])
  const [viewStatsHomeTeam, setViewStatsHomeTeam] = useState<Team | null>(null)
  const [viewStatsAwayTeam, setViewStatsAwayTeam] = useState<Team | null>(null)
  const [loadingViewStats, setLoadingViewStats] = useState(false)

  // Calculate team totals
  const homeTeamScore = useMemo(() => {
    return homeAtleti.reduce((sum, atleta) => sum + (atletiPunti[atleta.id] || 0), 0)
  }, [homeAtleti, atletiPunti])

  const awayTeamScore = useMemo(() => {
    return awayAtleti.reduce((sum, atleta) => sum + (atletiPunti[atleta.id] || 0), 0)
  }, [awayAtleti, atletiPunti])

  // load teams for the selected girone
  useEffect(() => {
    async function loadTeams(){
      try{
        const { data, error } = await supabase.from('squadre').select('id,name,girone,logo_url').eq('girone', girone)
        if (error) {
          console.debug('loadTeams error', error.message)
          setTeams([])
          return
        }
        setTeams((data as any) ?? [])
        // set default selects if empty
        if ((data as any)?.length) {
          setHomeTeam((data as any)[0].id)
          setAwayTeam((data as any).length > 1 ? (data as any)[1].id : (data as any)[0].id)
        } else {
          setHomeTeam('')
          setAwayTeam('')
        }
      }catch(err){
        console.debug(err)
      }
    }
    loadTeams()
  }, [girone])

  // load matches for selected girone
  useEffect(() => {
    async function loadMatches(){
      try{
        const { data, error } = await supabase.from('partite').select('*').eq('girone', girone).order('orario', { ascending: true })
        if (error) { console.debug('loadMatches error', error.message); setMatches([]); return }
        setMatches((data as any) ?? [])
      }catch(err){ console.debug(err) }
    }
    loadMatches()
  }, [girone, modalOpen]) // reload after modal closes

  // Real-time polling for live score updates (every 3 seconds)
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try{
        const { data, error } = await supabase.from('partite').select('*').eq('girone', girone).order('orario', { ascending: true })
        if (error) { 
          console.debug('poll matches error', error.message)
          return 
        }
        // Update matches state with fresh data
        setMatches((data as any) ?? [])
      }catch(err){ 
        console.debug('poll error', err) 
      }
    }, 3000) // Poll every 3 seconds

    return () => clearInterval(pollInterval)
  }, [girone])



  // helpers to handle datetime-local vs stored ISO timezone issues
  function parseLocalDateTime(value?: string | null) {
    if (!value) return null
    // If string looks like YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:SS(.sss)(no Z),
    // create a Date by treating components as local time (so displayed hour matches input)
    const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
    if (m) {
      const [_, Y, M, D, hh, mm] = m
      return new Date(Number(Y), Number(M) - 1, Number(D), Number(hh), Number(mm))
    }
    // otherwise fallback to regular Date parsing
    return new Date(value)
  }

  function toDatetimeLocalInput(value?: string | null) {
    if (!value) return ''
    // If already in YYYY-MM-DDTHH:MM form, return trimmed
    const m = String(value).match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/)
    if (m) return m[1]
    // try parse as Date then format as local datetime-local string
    const d = new Date(value)
    if (isNaN(d.getTime())) return ''
    const y = d.getFullYear()
    const mo = String(d.getMonth() + 1).padStart(2, '0')
    const da = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${y}-${mo}-${da}T${hh}:${mi}`
  }

  // check admin and rilevatore status from authenticated user
  useEffect(() => {
    let mounted = true
    async function checkRoles(){
      try{
        // supabase-js has different helpers depending on version; try getUser(), fall back to .user()
        let user: any = null
        try {
          const userRes: any = await (supabase.auth as any).getUser()
          user = userRes?.data?.user
        } catch (e) {
          // fallback
          try { user = (supabase.auth as any).user?.() ?? null } catch (_) { user = null }
        }
        if (!user) { 
          if (mounted) {
            setIsAdmin(false)
            setIsRilevatore(false)
            setIsTeamUser(false)
          }
          return 
        }
        
        // Check admin
        const { data: adminData, error: adminError } = await supabase.from('admins').select('*').or(`user_id.eq.${user.id},id.eq.${user.id}`).limit(1)
        if (adminError) { console.debug('admin check error', adminError.message) }
        if (mounted) setIsAdmin(Boolean(adminData && (adminData as any).length > 0))
        
        // Load rilevatori list if admin
        if (adminData && (adminData as any).length > 0) {
          loadRilevatori()
        }
        
        // Check rilevatore
        const { data: rilevData, error: rilevError} = await supabase.from('rilevatori').select('*').or(`user_id.eq.${user.id},id.eq.${user.id}`).limit(1)
        if (rilevError) { console.debug('rilevatore check error', rilevError.message) }
        if (mounted) setIsRilevatore(Boolean(rilevData && (rilevData as any).length > 0))
        
        // Check team user OR public user (anyone who can vote)
        const { data: teamUserData } = await supabase.from('users').select('*').eq('user_id', user.id).limit(1)
        const { data: publicUserData } = await supabase.from('public_users').select('*').eq('user_id', user.id).limit(1)
        
        const isVoter = Boolean(
          (teamUserData && (teamUserData as any).length > 0) || 
          (publicUserData && (publicUserData as any).length > 0)
        )
        
        console.log('User voting rights check:', { 
          user_id: user.id, 
          isTeamUser: !!(teamUserData && (teamUserData as any).length > 0),
          isPublicUser: !!(publicUserData && (publicUserData as any).length > 0),
          canVote: isVoter
        })
        
        if (mounted) setIsTeamUser(isVoter)
      }catch(err){ 
        console.debug(err)
        if (mounted) {
          setIsAdmin(false)
          setIsRilevatore(false)
          setIsTeamUser(false)
        }
      }
    }
    checkRoles()
    
    // Listen for login success events
    const handleAdminLogin = () => {
      checkRoles()
    }
    const handleTeamLogin = () => {
      checkRoles()
    }
    window.addEventListener('admin-login-success', handleAdminLogin)
    window.addEventListener('team-login-success', handleTeamLogin)
    
    return () => { 
      mounted = false
      window.removeEventListener('admin-login-success', handleAdminLogin)
      window.removeEventListener('team-login-success', handleTeamLogin)
    }
  }, [])

  async function handleSignOut(){
    try{
      await supabase.auth.signOut()
    }catch(err){ console.debug('signout err', err) }
    setIsAdmin(false)
    setIsRilevatore(false)
    setIsTeamUser(false)
  }

  async function loadAtletiForMatch(matchId: string){
    setLoadingAtleti(true)
    setPuntiStatus(null)
    try{
      // Find the match to get home and away team IDs
      const match = matches.find(m => (m as any).id === matchId)
      if (!match) { 
        setPuntiStatus('Partita non trovata'); 
        setLoadingAtleti(false)
        return 
      }
      // Load atleti from both teams with join to squadre for team name
      const { data, error } = await supabase
        .from('atleti')
        .select('id, nome, cognome, numero_maglia, squadre!inner(name)')
        .in('squadra_id', [match.home_team_id, match.away_team_id])
        .order('squadra_id')
        .order('numero_maglia')
      
      if (error) { 
        console.debug('load atleti error', error)
        setPuntiStatus('Errore caricamento atleti: ' + error.message)
        setLoadingAtleti(false)
        return 
      }
      
      // Map data to expected shape
      const mapped = (data || []).map((a: any) => ({
        id: a.id,
        nome: a.nome,
        cognome: a.cognome,
        numero_maglia: a.numero_maglia,
        squadra_nome: a.squadre?.name || '—'
      }))
      setAtleti(mapped)
    }catch(err){
      console.debug('load atleti error', err)
      setPuntiStatus('Errore caricamento atleti')
    }finally{
      setLoadingAtleti(false)
    }
  }

  async function handleAddPuntiAtleta(e: React.FormEvent){
    e.preventDefault()
    setPuntiStatus(null)
    if (!puntiMatchId) { setPuntiStatus('ID partita mancante'); return }
    if (!selectedAtleta) { setPuntiStatus('Seleziona un atleta'); return }
    if (puntiValue === '' || isNaN(parseInt(puntiValue, 10))) { setPuntiStatus('Inserisci un valore numerico per i punti'); return }
    
    try{
      const payload = {
        partita_id: puntiMatchId,
        atleta_id: selectedAtleta,
        punti: parseInt(puntiValue, 10)
      }
      const { error } = await supabase.from('punti_atleti').insert([payload])
      if (error) { 
        setPuntiStatus('Errore inserimento: ' + error.message)
        return 
      }
      // Reset form
      setSelectedAtleta('')
      setPuntiValue('')
      setPuntiStatus('Punti inseriti con successo!')
      setTimeout(() => setPuntiStatus(null), 2000)
    }catch(err){
      console.debug('insert punti error', err)
      setPuntiStatus('Errore inserimento punti')
    }
  }

  async function loadAtletiForLiveScoring(matchId: string){
    setLoadingLive(true)
    setLiveStatus(null)
    try{
      const match = matches.find(m => (m as any).id === matchId)
      if (!match) { 
        setLiveStatus('Partita non trovata')
        setLoadingLive(false)
        return 
      }
      
      // Load home team athletes
      const { data: homeData, error: homeError } = await supabase
        .from('atleti')
        .select('id, nome, cognome, numero_maglia')
        .eq('squadra_id', match.home_team_id)
        .order('numero_maglia')
      
      if (homeError) {
        console.debug('load home atleti error', homeError)
        setLiveStatus('Errore caricamento atleti casa')
        setLoadingLive(false)
        return
      }
      
      // Load away team athletes
      const { data: awayData, error: awayError } = await supabase
        .from('atleti')
        .select('id, nome, cognome, numero_maglia')
        .eq('squadra_id', match.away_team_id)
        .order('numero_maglia')
      
      if (awayError) {
        console.debug('load away atleti error', awayError)
        setLiveStatus('Errore caricamento atleti ospiti')
        setLoadingLive(false)
        return
      }
      
      // Sort athletes by jersey number (numeric sort)
      const sortByJerseyNumber = (a: any, b: any) => {
        const numA = parseInt(a.numero_maglia, 10)
        const numB = parseInt(b.numero_maglia, 10)
        if (isNaN(numA) && isNaN(numB)) return a.numero_maglia.localeCompare(b.numero_maglia)
        if (isNaN(numA)) return 1
        if (isNaN(numB)) return -1
        return numA - numB
      }
      
      setHomeAtleti([...(homeData || [])].sort(sortByJerseyNumber))
      setAwayAtleti([...(awayData || [])].sort(sortByJerseyNumber))
      
      // Load existing punti for this match
      const { data: puntiData, error: puntiError } = await supabase
        .from('punti_atleti')
        .select('atleta_id, punti')
        .eq('partita_id', matchId)
      
      if (puntiError) {
        console.debug('load punti error', puntiError)
      } else if (puntiData) {
        // Aggregate punti by atleta_id
        const puntiMap: Record<string, number> = {}
        puntiData.forEach((p: any) => {
          if (!puntiMap[p.atleta_id]) puntiMap[p.atleta_id] = 0
          puntiMap[p.atleta_id] += p.punti
        })
        setAtletiPunti(puntiMap)
      }
    }catch(err){
      console.debug('load atleti live error', err)
      setLiveStatus('Errore caricamento atleti')
    }finally{
      setLoadingLive(false)
    }
  }

  async function loadStatsForViewing(matchId: string) {
    setLoadingViewStats(true)
    try {
      const match = matches.find(m => (m as any).id === matchId)
      if (!match) { 
        setLoadingViewStats(false)
        return 
      }

      const homeTeam = teams.find(t => t.id === match.home_team_id)
      const awayTeam = teams.find(t => t.id === match.away_team_id)
      
      setViewStatsHomeTeam(homeTeam || null)
      setViewStatsAwayTeam(awayTeam || null)

      // Load punti for this match with athlete details
      const { data: puntiData, error: puntiError } = await supabase
        .from('punti_atleti')
        .select('atleta_id, punti, atleti!inner(id, nome, cognome, numero_maglia, squadra_id)')
        .eq('partita_id', matchId)

      if (puntiError) {
        console.debug('load punti error', puntiError)
        setLoadingViewStats(false)
        return
      }

      // Aggregate punti by atleta
      const atletiMap: Record<string, { id: string; nome: string; cognome: string; numero_maglia: string; punti: number; squadra_id: string }> = {}
      
      for (const p of (puntiData || [])) {
        const atleta = (p as any).atleti
        if (!atletiMap[atleta.id]) {
          atletiMap[atleta.id] = {
            id: atleta.id,
            nome: atleta.nome,
            cognome: atleta.cognome,
            numero_maglia: atleta.numero_maglia,
            punti: 0,
            squadra_id: atleta.squadra_id
          }
        }
        atletiMap[atleta.id].punti += (p as any).punti
      }

      // Split by team and sort
      const sortByJerseyNumber = (a: any, b: any) => {
        const numA = parseInt(a.numero_maglia, 10)
        const numB = parseInt(b.numero_maglia, 10)
        if (isNaN(numA) && isNaN(numB)) return a.numero_maglia.localeCompare(b.numero_maglia)
        if (isNaN(numA)) return 1
        if (isNaN(numB)) return -1
        return numA - numB
      }

      const homeAtleti = Object.values(atletiMap)
        .filter(a => a.squadra_id === match.home_team_id)
        .sort(sortByJerseyNumber)

      const awayAtleti = Object.values(atletiMap)
        .filter(a => a.squadra_id === match.away_team_id)
        .sort(sortByJerseyNumber)

      setViewStatsHomeAtleti(homeAtleti)
      setViewStatsAwayAtleti(awayAtleti)
    } catch (err) {
      console.debug(err)
    }
    setLoadingViewStats(false)
  }

  async function handleQuickAddPunti(atletaId: string, punti: number){
    if (!liveMatchId) return
    try{
      const payload = {
        partita_id: liveMatchId,
        atleta_id: atletaId,
        punti
      }
      const { error } = await supabase.from('punti_atleti').insert([payload])
      if (error) {
        console.debug('quick add punti error', error)
        setLiveStatus('Errore: ' + error.message)
        setTimeout(() => setLiveStatus(null), 2000)
        return
      }
      // Update local counter
      setAtletiPunti(prev => ({
        ...prev,
        [atletaId]: (prev[atletaId] || 0) + punti
      }))
      // Success feedback
      setLiveStatus(`+${punti} inserito!`)
      setTimeout(() => setLiveStatus(null), 1000)
    }catch(err){
      console.debug('quick add error', err)
      setLiveStatus('Errore inserimento')
      setTimeout(() => setLiveStatus(null), 2000)
    }
  }

  async function handleSetAtletaPunti(atletaId: string, newTotal: number){
    if (!liveMatchId) return
    if (newTotal < 0) return
    
    try{
      // Get current total from state
      const currentTotal = atletiPunti[atletaId] || 0
      if (currentTotal === newTotal) return // No change
      
      // Delete all existing entries for this atleta in this match
      const { error: deleteError } = await supabase
        .from('punti_atleti')
        .delete()
        .eq('partita_id', liveMatchId)
        .eq('atleta_id', atletaId)
      
      if (deleteError) {
        console.debug('delete punti error', deleteError)
        setLiveStatus('Errore cancellazione: ' + deleteError.message)
        setTimeout(() => setLiveStatus(null), 2000)
        return
      }
      
      // Insert new total if > 0
      if (newTotal > 0) {
        const { error: insertError } = await supabase
          .from('punti_atleti')
          .insert([{
            partita_id: liveMatchId,
            atleta_id: atletaId,
            punti: newTotal
          }])
        
        if (insertError) {
          console.debug('insert punti error', insertError)
          setLiveStatus('Errore aggiornamento: ' + insertError.message)
          setTimeout(() => setLiveStatus(null), 2000)
          return
        }
      }
      
      // Update local state
      setAtletiPunti(prev => ({
        ...prev,
        [atletaId]: newTotal
      }))
      
      setLiveStatus('Punti aggiornati!')
      setTimeout(() => setLiveStatus(null), 1500)
    }catch(err){
      console.debug('set atleta punti error', err)
      setLiveStatus('Errore aggiornamento')
      setTimeout(() => setLiveStatus(null), 2000)
    }
  }

  async function handleAddTeamToGirone(e: React.FormEvent){
    e.preventDefault()
    setAddTeamStatus(null)
    if (!selectedTeamToAdd) { setAddTeamStatus('Seleziona una squadra'); return }

    try{
      const { data, error } = await supabase
        .from('squadre')
        .update({ girone })
        .eq('id', selectedTeamToAdd)
        .select()
      
      if (error) { setAddTeamStatus('Errore: ' + error.message); return }
      
      // Refresh teams
      const { data: refreshedTeams, error: refreshError } = await supabase
        .from('squadre')
        .select('id,name,girone')
        .eq('girone', girone)
      
      if (refreshError) {
        console.debug('refresh teams error', refreshError)
      } else {
        setTeams((refreshedTeams as any) ?? [])
      }
      
      setAddTeamModalOpen(false)
      setSelectedTeamToAdd('')
      setAddTeamStatus('Squadra aggiunta!')
      setTimeout(() => setAddTeamStatus(null), 2000)
    }catch(err){
      console.debug('add team error', err)
      setAddTeamStatus('Errore aggiunta squadra')
    }
  }

  async function loadRilevatori() {
    try {
      const { data, error } = await supabase
        .from('rilevatori')
        .select('id, nome, cognome, username')
        .order('cognome')
      
      if (error) {
        console.debug('load rilevatori error', error.message)
        return
      }
      
      setRilevatori((data as any) ?? [])
    } catch (err) {
      console.debug('load rilevatori error', err)
    }
  }

  async function handleCreateMatch(e: React.FormEvent){
    e.preventDefault()
    setStatus(null)
    if (!homeTeam || !awayTeam) { setStatus('Seleziona entrambe le squadre'); return }
    if (homeTeam === awayTeam) { setStatus('Le squadre non possono essere uguali'); return }
    try{
      const payload = {
        home_team_id: homeTeam,
        away_team_id: awayTeam,
        campo: campo || null,
        orario: orario || null,
        girone
      }
      const { data, error } = await supabase.from('partite').insert([payload]).select()
      if (error) { setStatus('Errore creazione: ' + error.message); return }
      // append inserted rows to local state
      if (data && (data as any).length) setMatches(prev => [...prev, ...(data as any)])
      setModalOpen(false)
    }catch(err){ console.debug(err); setStatus('Errore creazione') }
  }

  async function handleUpdateMatch(e: React.FormEvent){
    e.preventDefault()
    if (!editId) { setEditStatus('ID mancante'); return }
    setEditStatus(null)
    if (editHomeTeam === editAwayTeam) { setEditStatus('Le squadre non possono essere uguali'); return }
    try{
      const payload: any = {
        home_team_id: editHomeTeam,
        away_team_id: editAwayTeam,
        campo: editCampo || null,
        orario: editOrario || null,
        rilevatore_id: editRilevatore || null,
        home_score: editHomeScore !== '' ? parseInt(editHomeScore, 10) : null,
        away_score: editAwayScore !== '' ? parseInt(editAwayScore, 10) : null
      }
      const { data, error } = await supabase.from('partite').update(payload).eq('id', editId).select()
      if (error) {
        // If DB schema doesn't have score columns, retry without them as a fallback
        const msg = String(error.message || '')
        if (/away_score|home_score|Could not find/i.test(msg)) {
          const fallback = { home_team_id: editHomeTeam, away_team_id: editAwayTeam, campo: editCampo || null, orario: editOrario || null }
          try{
            const { data: data2, error: error2 } = await supabase.from('partite').update(fallback).eq('id', editId).select()
            if (error2) { setEditStatus('Errore aggiornamento (senza score): ' + error2.message); return }
            const updated2 = (data2 as any)?.[0] ?? { id: editId, ...fallback, girone }
            setMatches(prev => prev.map(m => ((m as any).id === editId ? updated2 : m)))
            setEditModalOpen(false)
            setEditStatus('Aggiornato senza campi risultato (colonne mancanti nel DB)')
            return
          }catch(e2){ console.debug('fallback update error', e2); setEditStatus('Errore aggiornamento (fallback)'); return }
        }
        setEditStatus('Errore aggiornamento: ' + error.message)
        return
      }
      const updated = (data as any)?.[0] ?? { id: editId, ...payload, girone }
      setMatches(prev => prev.map(m => ((m as any).id === editId ? updated : m)))
      setEditModalOpen(false)
    }catch(err){ console.debug(err); setEditStatus('Errore aggiornamento') }
  }



  return (
    <main style={{width:'100%',maxWidth:900,margin:'24px auto',padding:12}}>
      <h1>Gironi</h1>

      <div className="gironi-grid" style={{marginTop:16,display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',gap:8}}>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <select aria-label="Seleziona girone" className="rw-input" value={girone} onChange={(e) => setGirone(e.target.value as 'A'|'B')}>
            <option value="A">Girone A</option>
            <option value="B">Girone B</option>
          </select>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <select aria-label="Seleziona visualizzazione" className="rw-input" value={view} onChange={(e) => setView(e.target.value as 'squadre'|'partite')}>
            <option value="squadre">Squadre</option>
            <option value="partite">Partite</option>
          </select>
        </div>
      </div>

      <section style={{marginTop:24}}>
        {/* Squadre del girone */}
        {view === 'squadre' && (
        <div style={{marginTop:24}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <h3 style={{fontSize:16,fontWeight:600,margin:0}}>Squadre</h3>
            {isAdmin && (
              <button 
                className="btn" 
                onClick={async () => {
                  setAddTeamStatus(null)
                  setSelectedTeamToAdd('')
                  // Load only teams without girone
                  try{
                    const { data, error } = await supabase
                      .from('squadre')
                      .select('id,name,girone')
                      .is('girone', null)
                      .order('name')
                    if (error) {
                      console.debug('load available teams error', error)
                      setAvailableTeams([])
                    } else {
                      setAvailableTeams((data as any) ?? [])
                    }
                  }catch(err){
                    console.debug('load teams error', err)
                    setAvailableTeams([])
                  }
                  setAddTeamModalOpen(true)
                }}
              >
                <Plus size={16} /> Aggiungi
              </button>
            )}
          </div>
          {teams.length === 0 ? (
            <div style={{color:'#64748b',marginTop:8}}>Nessuna squadra in questo girone per questa fase.</div>
          ) : (
            <div style={{display:'grid',gap:8}}>
              {teams.map((team, idx) => (
                <div 
                  key={team.id} 
                  style={{
                    display:'flex',
                    alignItems:'center',
                    gap:12,
                    padding:12,
                    border:'1px solid #e2e8f0',
                    borderRadius:8,
                    background:'#fff'
                  }}
                >
                  <div style={{
                    width:40,
                    height:40,
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'center'
                  }}>
                    {team.logo_url ? (
                      <img src={team.logo_url} alt={team.name} style={{width:40,height:40,objectFit:'contain'}} />
                    ) : (
                      <div style={{
                        width:40,
                        height:40,
                        borderRadius:'50%',
                        background:'#eef2ff',
                        display:'flex',
                        alignItems:'center',
                        justifyContent:'center',
                        fontWeight:700,
                        color:'#0f172a'
                      }}>
                        {idx + 1}
                      </div>
                    )}
                  </div>
                  <div style={{flex:1,fontWeight:600,fontSize:15}}>
                    {team.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* Partite */}
        {view === 'partite' && (
        <div style={{marginTop:24}}>
          <h3 style={{fontSize:16,fontWeight:600,marginBottom:12}}>Partite</h3>
          <div>
            {/* Add match button visible only to admins */}
            {(isAdmin || isRilevatore) && (<>
              {isAdmin && (
                <div style={{marginTop:12}}>
                  <Dialog.Root open={modalOpen} onOpenChange={setModalOpen}>
                    <Dialog.Trigger asChild>
                      <button className="btn">Aggiungi partita</button>
                    </Dialog.Trigger>

                  <Dialog.Portal>
                    <Dialog.Overlay className="rw-overlay" />
                    <Dialog.Content className="rw-dialog">
                      <Dialog.Title style={{fontSize: '1.05rem', fontWeight:700}}>Nuova partita — Girone {girone}</Dialog.Title>
                      <form onSubmit={handleCreateMatch} style={{marginTop:12,display:'grid',gap:8}}>
                        <div>
                          <div style={{marginBottom:6,fontWeight:600}}>Squadra di casa</div>
                          <select className="rw-input" value={homeTeam} onChange={e=>setHomeTeam(e.target.value)}>
                            <option value="">-- seleziona --</option>
                            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </div>

                        <div>
                          <div style={{marginBottom:6,fontWeight:600}}>Squadra ospite</div>
                          <select className="rw-input" value={awayTeam} onChange={e=>setAwayTeam(e.target.value)}>
                            <option value="">-- seleziona --</option>
                            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </div>

                        <div>
                          <div style={{marginBottom:6,fontWeight:600}}>Campo</div>
                          <input className="rw-input" value={campo} onChange={e=>setCampo(e.target.value)} placeholder="Nome campo" />
                        </div>

                        <div>
                          <div style={{marginBottom:6,fontWeight:600}}>Orario</div>
                          <input className="rw-input" type="datetime-local" value={orario} onChange={e=>setOrario(e.target.value)} />
                        </div>

                        <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:6}}>
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
                </div>
              )}

              {/* Add Team modal (admin only) */}
              {isAdmin && (
                <Dialog.Root open={addTeamModalOpen} onOpenChange={setAddTeamModalOpen}>
                  <Dialog.Portal>
                    <Dialog.Overlay className="rw-overlay" />
                    <Dialog.Content className="rw-dialog">
                      <Dialog.Title style={{fontSize: '1.05rem', fontWeight:700}}>Aggiungi squadra al Girone {girone}</Dialog.Title>
                      <form onSubmit={handleAddTeamToGirone} style={{marginTop:12,display:'grid',gap:8}}>
                        <div>
                          <div style={{marginBottom:6,fontWeight:600}}>Seleziona squadra</div>
                          <select 
                            className="rw-input" 
                            value={selectedTeamToAdd} 
                            onChange={e=>setSelectedTeamToAdd(e.target.value)}
                            required
                          >
                            <option value="">-- seleziona squadra --</option>
                            {availableTeams.length === 0 ? (
                              <option disabled>Nessuna squadra disponibile</option>
                            ) : (
                              availableTeams.map(t => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))
                            )}
                          </select>
                          {availableTeams.length === 0 && (
                            <div style={{marginTop:8,color:'#64748b',fontSize:'0.9rem'}}>
                              Tutte le squadre sono già assegnate a un girone.
                            </div>
                          )}
                        </div>

                        <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:6}}>
                          <Dialog.Close asChild>
                            <button type="button" className="btn secondary">Annulla</button>
                          </Dialog.Close>
                          <button className="btn" type="submit">Aggiungi</button>
                        </div>

                        {addTeamStatus && <div className="status">{addTeamStatus}</div>}
                      </form>
                    </Dialog.Content>
                  </Dialog.Portal>
                </Dialog.Root>
              )}
              
              {/* Edit match modal (admin only) */}
              {isAdmin && (
                <Dialog.Root open={editModalOpen} onOpenChange={setEditModalOpen}>
                <Dialog.Portal>
                  <Dialog.Overlay className="rw-overlay" />
                  <Dialog.Content className="rw-dialog">
                    <Dialog.Title style={{fontSize: '1.05rem', fontWeight:700}}>Modifica partita — Girone {girone}</Dialog.Title>
                    <form onSubmit={handleUpdateMatch} style={{marginTop:12,display:'grid',gap:8}}>
                      <div>
                        <div style={{marginBottom:6,fontWeight:600}}>Squadra di casa</div>
                        <select className="rw-input" value={editHomeTeam} onChange={e=>setEditHomeTeam(e.target.value)}>
                          <option value="">-- seleziona --</option>
                          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>

                      <div>
                        <div style={{marginBottom:6,fontWeight:600}}>Squadra ospite</div>
                                  <select className="rw-input" value={editAwayTeam} onChange={e=>setEditAwayTeam(e.target.value)}>
                          <option value="">-- seleziona --</option>
                          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>

                      <div style={{display:'flex',gap:8}}>
                        <div style={{flex:1}}>
                          <div style={{marginBottom:6,fontWeight:600}}>Risultato casa</div>
                          <input className="rw-input" type="number" min={0} value={editHomeScore} onChange={e=>setEditHomeScore(e.target.value)} placeholder="--" />
                        </div>

                        <div style={{flex:1}}>
                          <div style={{marginBottom:6,fontWeight:600}}>Risultato ospite</div>
                          <input className="rw-input" type="number" min={0} value={editAwayScore} onChange={e=>setEditAwayScore(e.target.value)} placeholder="--" />
                        </div>
                      </div>

                      <div>
                        <div style={{marginBottom:6,fontWeight:600}}>Campo</div>
                        <input className="rw-input" value={editCampo} onChange={e=>setEditCampo(e.target.value)} placeholder="Nome campo" />
                      </div>

                      <div>
                        <div style={{marginBottom:6,fontWeight:600}}>Orario</div>
                        <input className="rw-input" type="datetime-local" value={editOrario} onChange={e=>setEditOrario(e.target.value)} />
                      </div>

                      {isAdmin && (
                        <div>
                          <div style={{marginBottom:6,fontWeight:600}}>Rilevatore</div>
                          <select className="rw-input" value={editRilevatore} onChange={e=>setEditRilevatore(e.target.value)}>
                            <option value="">-- Nessun rilevatore --</option>
                            {rilevatori.map(r => (
                              <option key={r.id} value={r.id}>
                                {r.nome} {r.cognome} (@{r.username})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div style={{display:'flex',justifyContent:'space-between',gap:8,marginTop:6}}>
                        <div style={{display:'flex',gap:8}}>
                          <Dialog.Close asChild>
                            <button type="button" className="btn secondary">Annulla</button>
                          </Dialog.Close>
                          <button className="btn" type="button" onClick={async () => {
                            if (!editId) return
                            if (!confirm('Confermi eliminazione della partita?')) return
                            try{
                              const { error } = await supabase.from('partite').delete().eq('id', editId)
                              if (error) { setEditStatus('Errore eliminazione: ' + error.message); return }
                              setMatches(prev => prev.filter(x => (x as any).id !== editId))
                              setEditModalOpen(false)
                            }catch(err){ setEditStatus('Errore eliminazione') }
                          }}>Elimina</button>
                        </div>

                        <div style={{display:'flex',gap:8}}>
                          {(isAdmin || isRilevatore) && (
                            <button className="btn secondary" type="button" onClick={() => {
                              if (!editId) return
                              setPuntiMatchId(editId)
                              loadAtletiForMatch(editId)
                              setPuntiModalOpen(true)
                            }}>Punti atleti</button>
                          )}
                          <button className="btn" type="submit">Salva</button>
                        </div>
                      </div>

                      {editStatus && <div className="status">{editStatus}</div>}
                    </form>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
              )}

              {/* Punti atleti modal (admin or rilevatore only) */}
              <Dialog.Root open={puntiModalOpen} onOpenChange={setPuntiModalOpen}>
                <Dialog.Portal>
                  <Dialog.Overlay className="rw-overlay" />
                  <Dialog.Content className="rw-dialog">
                    <Dialog.Title style={{fontSize: '1.05rem', fontWeight:700}}>Inserisci punti atleta — Girone {girone}</Dialog.Title>
                    
                    {loadingAtleti ? (
                      <div style={{padding:20,textAlign:'center',color:'#64748b'}}>Caricamento atleti...</div>
                    ) : atleti.length === 0 ? (
                      <div style={{padding:20,textAlign:'center',color:'#64748b'}}>Nessun atleta trovato per questa partita. Assicurati di aver aggiunto gli atleti alle squadre nella pagina Partecipanti.</div>
                    ) : (
                      <form onSubmit={handleAddPuntiAtleta} style={{marginTop:12,display:'grid',gap:12}}>
                        <div>
                          <div style={{marginBottom:6,fontWeight:600}}>Seleziona atleta</div>
                          <select className="rw-input" value={selectedAtleta} onChange={e=>setSelectedAtleta(e.target.value)} required>
                            <option value="">-- seleziona atleta --</option>
                            {atleti.map(a => (
                              <option key={a.id} value={a.id}>
                                #{a.numero_maglia} {a.nome} {a.cognome} ({a.squadra_nome})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <div style={{marginBottom:6,fontWeight:600}}>Punti</div>
                          <input 
                            className="rw-input" 
                            type="number" 
                            min={0} 
                            value={puntiValue} 
                            onChange={e=>setPuntiValue(e.target.value)} 
                            placeholder="Es: 10" 
                            required 
                          />
                        </div>

                        <div style={{display:'flex',justifyContent:'space-between',gap:8,marginTop:6}}>
                          <Dialog.Close asChild>
                            <button type="button" className="btn secondary">Chiudi</button>
                          </Dialog.Close>
                          <button className="btn" type="submit">Salva punti</button>
                        </div>

                        {puntiStatus && <div className="status" style={{marginTop:8}}>{puntiStatus}</div>}
                      </form>
                    )}
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>

              {/* Live scoring modal - accessible to both admin and rilevatori */}
              <Dialog.Root open={liveModalOpen} onOpenChange={setLiveModalOpen}>
                <Dialog.Portal>
                  <Dialog.Overlay className="rw-overlay" />
                  <Dialog.Content className="rw-dialog live-scoring-modal" style={{maxWidth:'95vw',width:800,maxHeight:'90vh',overflow:'auto'}}>
                    <Dialog.Title style={{fontSize: '1.05rem', fontWeight:700,marginBottom:16}}>
                      🎯 Rilevazione live punti — Girone {girone}
                    </Dialog.Title>
                    
                    {loadingLive ? (
                      <div style={{padding:20,textAlign:'center',color:'#64748b'}}>Caricamento atleti...</div>
                    ) : (
                      <>
                        {(homeAtleti.length === 0 && awayAtleti.length === 0) ? (
                          <div style={{padding:20,textAlign:'center',color:'#64748b'}}>
                            Nessun atleta trovato per questa partita.
                          </div>
                        ) : (
                          <>
                            {/* Score display */}
                            <div style={{
                              display:'flex',
                              justifyContent:'center',
                              alignItems:'center',
                              gap:12,
                              padding:'10px 20px',
                              background:'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              borderRadius:8,
                              marginBottom:16
                            }}>
                              <div style={{textAlign:'center',flex:1}}>
                                <div style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.85)',marginBottom:2,textTransform:'uppercase',letterSpacing:'0.5px'}}>
                                  {(() => {
                                    const match = matches.find(mm => (mm as any).id === liveMatchId)
                                    if (!match) return 'Casa'
                                    const teamsMap = (teams || []).reduce<Record<string,string>>((acc,t) => { acc[t.id] = t.name; return acc }, {})
                                    return teamsMap[match.home_team_id] ?? 'Casa'
                                  })()}
                                </div>
                                <div style={{fontSize:28,fontWeight:900,color:'white',lineHeight:1}}>
                                  {homeTeamScore}
                                </div>
                              </div>
                              
                              <div style={{fontSize:20,fontWeight:700,color:'rgba(255,255,255,0.6)'}}>—</div>
                              
                              <div style={{textAlign:'center',flex:1}}>
                                <div style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.85)',marginBottom:2,textTransform:'uppercase',letterSpacing:'0.5px'}}>
                                  {(() => {
                                    const match = matches.find(mm => (mm as any).id === liveMatchId)
                                    if (!match) return 'Ospite'
                                    const teamsMap = (teams || []).reduce<Record<string,string>>((acc,t) => { acc[t.id] = t.name; return acc }, {})
                                    return teamsMap[match.away_team_id] ?? 'Ospite'
                                  })()}
                                </div>
                                <div style={{fontSize:28,fontWeight:900,color:'white',lineHeight:1}}>
                                  {awayTeamScore}
                                </div>
                              </div>
                            </div>

                            <div className="live-scoring-grid">
                            {/* Home team column */}
                            <div className="team-column">
                              <h3 style={{fontSize:14,fontWeight:700,marginBottom:12,color:'#1e293b',textTransform:'uppercase'}}>
                                {(() => {
                                  const match = matches.find(mm => (mm as any).id === liveMatchId)
                                  if (!match) return 'Squadra Casa'
                                  const teamsMap = (teams || []).reduce<Record<string,string>>((acc,t) => { acc[t.id] = t.name; return acc }, {})
                                  return teamsMap[match.home_team_id] ?? 'Squadra Casa'
                                })()}
                              </h3>
                              <div className="athletes-list">
                                {homeAtleti.map(atleta => (
                                  <div key={atleta.id} style={{
                                    display:'flex',
                                    alignItems:'center',
                                    justifyContent:'space-between',
                                    padding:'8px 12px',
                                    background:'#f8fafc',
                                    borderRadius:8,
                                    border:'1px solid #e2e8f0'
                                  }}>
                                    <div style={{display:'flex',alignItems:'center',gap:8,flex:1}}>
                                      <span style={{
                                        fontWeight:700,
                                        fontSize:13,
                                        color:'#64748b',
                                        minWidth:32,
                                        textAlign:'center',
                                        background:'white',
                                        padding:'2px 8px',
                                        borderRadius:4
                                      }}>#{atleta.numero_maglia}</span>
                                      <span style={{fontSize:14,fontWeight:600}}>
                                        {atleta.nome} {atleta.cognome}
                                      </span>
                                      {(atletiPunti[atleta.id] || 0) > 0 && (
                                        <span style={{
                                          background:'#10b981',
                                          color:'white',
                                          padding:'2px 8px',
                                          borderRadius:4,
                                          fontSize:12,
                                          fontWeight:700
                                        }}>
                                          {atletiPunti[atleta.id]} pt
                                        </span>
                                      )}
                                    </div>
                                    <div style={{display:'flex',gap:4,alignItems:'center'}}>
                                      <input 
                                        type="number" 
                                        min="0"
                                        value={atletiPunti[atleta.id] || 0}
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value, 10)
                                          if (!isNaN(val) && val >= 0) {
                                            handleSetAtletaPunti(atleta.id, val)
                                          }
                                        }}
                                        style={{
                                          width:50,
                                          padding:'4px 8px',
                                          fontSize:13,
                                          fontWeight:600,
                                          textAlign:'center',
                                          border:'1px solid #cbd5e1',
                                          borderRadius:4,
                                          background:'white'
                                        }}
                                      />
                                      <button 
                                        onClick={() => handleQuickAddPunti(atleta.id, 1)}
                                        style={{
                                          padding:'4px 12px',
                                          fontSize:12,
                                          fontWeight:700,
                                          border:'1px solid #cbd5e1',
                                          borderRadius:4,
                                          background:'white',
                                          cursor:'pointer',
                                          transition:'all 0.15s'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = '#f1f5f9'
                                          e.currentTarget.style.borderColor = '#94a3b8'
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = 'white'
                                          e.currentTarget.style.borderColor = '#cbd5e1'
                                        }}
                                      >+1</button>
                                      <button 
                                        onClick={() => handleQuickAddPunti(atleta.id, 2)}
                                        style={{
                                          padding:'4px 12px',
                                          fontSize:12,
                                          fontWeight:700,
                                          border:'1px solid #cbd5e1',
                                          borderRadius:4,
                                          background:'white',
                                          cursor:'pointer',
                                          transition:'all 0.15s'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = '#f1f5f9'
                                          e.currentTarget.style.borderColor = '#94a3b8'
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = 'white'
                                          e.currentTarget.style.borderColor = '#cbd5e1'
                                        }}
                                      >+2</button>
                                      <button 
                                        onClick={() => handleQuickAddPunti(atleta.id, 3)}
                                        style={{
                                          padding:'4px 12px',
                                          fontSize:12,
                                          fontWeight:700,
                                          border:'1px solid #cbd5e1',
                                          borderRadius:4,
                                          background:'white',
                                          cursor:'pointer',
                                          transition:'all 0.15s'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = '#f1f5f9'
                                          e.currentTarget.style.borderColor = '#94a3b8'
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = 'white'
                                          e.currentTarget.style.borderColor = '#cbd5e1'
                                        }}
                                      >+3</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Away team column */}
                            <div className="team-column">
                              <h3 style={{fontSize:14,fontWeight:700,marginBottom:12,color:'#1e293b',textTransform:'uppercase'}}>
                                {(() => {
                                  const match = matches.find(mm => (mm as any).id === liveMatchId)
                                  if (!match) return 'Squadra Ospite'
                                  const teamsMap = (teams || []).reduce<Record<string,string>>((acc,t) => { acc[t.id] = t.name; return acc }, {})
                                  return teamsMap[match.away_team_id] ?? 'Squadra Ospite'
                                })()}
                              </h3>
                              <div className="athletes-list">
                                {awayAtleti.map(atleta => (
                                  <div key={atleta.id} style={{
                                    display:'flex',
                                    alignItems:'center',
                                    justifyContent:'space-between',
                                    padding:'8px 12px',
                                    background:'#f8fafc',
                                    borderRadius:8,
                                    border:'1px solid #e2e8f0'
                                  }}>
                                    <div style={{display:'flex',alignItems:'center',gap:8,flex:1}}>
                                      <span style={{
                                        fontWeight:700,
                                        fontSize:13,
                                        color:'#64748b',
                                        minWidth:32,
                                        textAlign:'center',
                                        background:'white',
                                        padding:'2px 8px',
                                        borderRadius:4
                                      }}>#{atleta.numero_maglia}</span>
                                      <span style={{fontSize:14,fontWeight:600}}>
                                        {atleta.nome} {atleta.cognome}
                                      </span>
                                      {(atletiPunti[atleta.id] || 0) > 0 && (
                                        <span style={{
                                          background:'#10b981',
                                          color:'white',
                                          padding:'2px 8px',
                                          borderRadius:4,
                                          fontSize:12,
                                          fontWeight:700
                                        }}>
                                          {atletiPunti[atleta.id]} pt
                                        </span>
                                      )}
                                    </div>
                                    <div style={{display:'flex',gap:4,alignItems:'center'}}>
                                      <input 
                                        type="number" 
                                        min="0"
                                        value={atletiPunti[atleta.id] || 0}
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value, 10)
                                          if (!isNaN(val) && val >= 0) {
                                            handleSetAtletaPunti(atleta.id, val)
                                          }
                                        }}
                                        style={{
                                          width:50,
                                          padding:'4px 8px',
                                          fontSize:13,
                                          fontWeight:600,
                                          textAlign:'center',
                                          border:'1px solid #cbd5e1',
                                          borderRadius:4,
                                          background:'white'
                                        }}
                                      />
                                      <button 
                                        onClick={() => handleQuickAddPunti(atleta.id, 1)}
                                        style={{
                                          padding:'4px 12px',
                                          fontSize:12,
                                          fontWeight:700,
                                          border:'1px solid #cbd5e1',
                                          borderRadius:4,
                                          background:'white',
                                          cursor:'pointer',
                                          transition:'all 0.15s'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = '#f1f5f9'
                                          e.currentTarget.style.borderColor = '#94a3b8'
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = 'white'
                                          e.currentTarget.style.borderColor = '#cbd5e1'
                                        }}
                                      >+1</button>
                                      <button 
                                        onClick={() => handleQuickAddPunti(atleta.id, 2)}
                                        style={{
                                          padding:'4px 12px',
                                          fontSize:12,
                                          fontWeight:700,
                                          border:'1px solid #cbd5e1',
                                          borderRadius:4,
                                          background:'white',
                                          cursor:'pointer',
                                          transition:'all 0.15s'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = '#f1f5f9'
                                          e.currentTarget.style.borderColor = '#94a3b8'
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = 'white'
                                          e.currentTarget.style.borderColor = '#cbd5e1'
                                        }}
                                      >+2</button>
                                      <button 
                                        onClick={() => handleQuickAddPunti(atleta.id, 3)}
                                        style={{
                                          padding:'4px 12px',
                                          fontSize:12,
                                          fontWeight:700,
                                          border:'1px solid #cbd5e1',
                                          borderRadius:4,
                                          background:'white',
                                          cursor:'pointer',
                                          transition:'all 0.15s'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = '#f1f5f9'
                                          e.currentTarget.style.borderColor = '#94a3b8'
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = 'white'
                                          e.currentTarget.style.borderColor = '#cbd5e1'
                                        }}
                                      >+3</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          </>
                        )}
                        
                        {liveStatus && (
                          <div className="status" style={{marginTop:16,textAlign:'center',fontSize:14}}>
                            {liveStatus}
                          </div>
                        )}
                        
                        <div style={{marginTop:20,display:'flex',justifyContent:'center',gap:12}}>
                          <Dialog.Close asChild>
                            <button type="button" className="btn secondary">Chiudi senza salvare</button>
                          </Dialog.Close>
                          <button 
                            type="button" 
                            className="btn"
                            onClick={async () => {
                              if (!liveMatchId) return
                              // Update match scores
                              try {
                                const { error } = await supabase
                                  .from('partite')
                                  .update({
                                    home_score: homeTeamScore,
                                    away_score: awayTeamScore
                                  })
                                  .eq('id', liveMatchId)
                                
                                if (error) {
                                  setLiveStatus('Errore salvataggio risultato: ' + error.message)
                                  setTimeout(() => setLiveStatus(null), 3000)
                                  return
                                }
                                
                                // Update local matches state
                                setMatches(prev => prev.map(m => 
                                  (m as any).id === liveMatchId 
                                    ? { ...m, home_score: homeTeamScore, away_score: awayTeamScore }
                                    : m
                                ))
                                
                                setLiveStatus('✅ Risultato salvato!')
                                setTimeout(() => {
                                  setLiveModalOpen(false)
                                  setLiveStatus(null)
                                }, 1500)
                              } catch(err) {
                                console.debug('save match result error', err)
                                setLiveStatus('Errore salvataggio')
                                setTimeout(() => setLiveStatus(null), 3000)
                              }
                            }}
                          >
                            Fine rilevazione e salva risultato
                          </button>
                        </div>
                      </>
                    )}
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
            </>)}

            <div style={{marginTop:12}}>
              {matches.length === 0 ? (
                <div style={{color:'#64748b'}}>Nessuna partita nel girone {girone} — ancora vuoto.</div>
              ) : (
                <ul style={{listStyle:'none',padding:0,margin:0}}>
                  {matches.map(m => {
                    // resolve team data from teams list
                    const homeTeam = teams.find(t => t.id === m.home_team_id)
                    const awayTeam = teams.find(t => t.id === m.away_team_id)
                    const homeName = homeTeam?.name ?? m.home_team_id
                    const awayName = awayTeam?.name ?? m.away_team_id
                    
                    // resolve rilevatore data
                    const rilevatore = rilevatori.find(r => r.id === (m as any).rilevatore_id)

                    // format date/time
                    let dateStr = ''
                    let timeStr = ''
                    if (m.orario) {
                      try{
                        const d = parseLocalDateTime(m.orario)!
                        const dd = String(d.getDate()).padStart(2,'0')
                        const mm = String(d.getMonth()+1).padStart(2,'0')
                        const yyyy = d.getFullYear()
                        const hh = String(d.getHours()).padStart(2,'0')
                        const mins = String(d.getMinutes()).padStart(2,'0')
                        dateStr = `${dd}/${mm}/${yyyy}`
                        timeStr = `${hh}:${mins}`
                      }catch(e){ /* ignore */ }
                    }

                    const showVoteButton = isTeamUser && (m as any).home_score != null && (m as any).away_score != null
                    if ((m as any).id && showVoteButton) {
                      console.log('Vote button conditions:', { 
                        matchId: (m as any).id,
                        isTeamUser, 
                        home_score: (m as any).home_score, 
                        away_score: (m as any).away_score,
                        showVoteButton
                      })
                    }
                    
                    return (
                      <li key={(m as any).id} className="match-row" style={{padding:12,borderBottom:'1px solid #eef2f7'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                          <div className="match-teams" style={{display:'flex',alignItems:'center',gap:8,flex:'1 1 auto',minWidth:0}}>
                            {(() => {
                              const hs = (m as any).home_score
                              const ascore = (m as any).away_score
                              const hasScore = hs != null || ascore != null
                              const highlightHome = hs != null && ascore != null && hs > ascore
                              const highlightAway = hs != null && ascore != null && ascore > hs
                              return (
                                <>
                                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                                    {homeTeam?.logo_url && (
                                      <img src={homeTeam.logo_url} alt={homeName} style={{width:40,height:40,objectFit:'contain',filter:highlightHome?'drop-shadow(0 0 4px rgba(34,197,94,0.6))':'none'}} />
                                    )}
                                  </div>
                                  <span className="match-score" style={{margin:'0 16px',fontWeight:700,fontSize:18}}>{hasScore ? `${hs != null ? hs : '-'} — ${ascore != null ? ascore : '-'}` : '—'}</span>
                                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                                    {awayTeam?.logo_url && (
                                      <img src={awayTeam.logo_url} alt={awayName} style={{width:40,height:40,objectFit:'contain',filter:highlightAway?'drop-shadow(0 0 4px rgba(34,197,94,0.6))':'none'}} />
                                    )}
                                  </div>
                                </>
                              )
                            })()}
                          </div>
                          <div style={{display:'flex',gap:8,alignItems:'center',flexShrink:0}}>
                            <div style={{color:'#64748b',fontSize:13}}>{m.girone}</div>
                            {isTeamUser && (m as any).home_score != null && (m as any).away_score != null && (
                              <>
                                <button 
                                  title="Visualizza Tabellino" 
                                  onClick={() => {
                                    setViewStatsMatchId((m as any).id)
                                    loadStatsForViewing((m as any).id)
                                    setViewStatsModalOpen(true)
                                  }} 
                                  style={{
                                    background:'#3b82f6',
                                    border:0,
                                    borderRadius:4,
                                    cursor:'pointer',
                                    color:'white',
                                    padding:'6px 12px',
                                    fontSize:13,
                                    fontWeight:600,
                                    display:'flex',
                                    alignItems:'center',
                                    gap:4
                                  }}>
                                  <BarChart3 size={14} />
                                  Tabellino
                                </button>
                                <button 
                                  title="Vota MVP" 
                                  onClick={() => {
                                    const homeTeam = teams.find(t => t.id === m.home_team_id)
                                    const awayTeam = teams.find(t => t.id === m.away_team_id)
                                    if (homeTeam && awayTeam) {
                                      setVoteMatchId((m as any).id)
                                      setVoteSquadraCasa(homeTeam)
                                      setVoteSquadraOspite(awayTeam)
                                      setVoteModalOpen(true)
                                    }
                                  }} 
                                  style={{
                                    background:'#f59e0b',
                                    border:0,
                                    borderRadius:4,
                                    cursor:'pointer',
                                    color:'white',
                                    padding:'6px 12px',
                                    fontSize:13,
                                    fontWeight:600,
                                    display:'flex',
                                    alignItems:'center',
                                    gap:4
                                  }}>
                                  <Trophy size={14} />
                                  Vota
                                </button>
                              </>
                            )}
                            {isRilevatore && !rilevatore && (
                              <button 
                                title="Registrati a questa partita" 
                                onClick={async () => {
                                  try {
                                    const { data: { user } } = await supabase.auth.getUser()
                                    if (!user) return
                                    
                                    const { data: rilevData } = await supabase
                                      .from('rilevatori')
                                      .select('id')
                                      .eq('user_id', user.id)
                                      .single()
                                    
                                    if (!rilevData) return
                                    
                                    const { error } = await supabase
                                      .from('partite')
                                      .update({ rilevatore_id: rilevData.id })
                                      .eq('id', (m as any).id)
                                    
                                    if (error) {
                                      alert('Errore: ' + error.message)
                                      return
                                    }
                                    
                                    // Reload matches
                                    const { data: matches } = await supabase
                                      .from('partite')
                                      .select('*')
                                      .eq('girone', girone)
                                      .order('orario', { ascending: true })
                                    
                                    if (matches) setMatches(matches as any)
                                    loadRilevatori()
                                  } catch (err) {
                                    console.debug(err)
                                  }
                                }}
                                style={{
                                  background:'#6366f1',
                                  border:0,
                                  borderRadius:4,
                                  cursor:'pointer',
                                  color:'white',
                                  padding:'6px 12px',
                                  fontSize:13,
                                  fontWeight:600,
                                  display:'flex',
                                  alignItems:'center',
                                  gap:4
                                }}
                              >
                                <UserPlus size={14} />
                                Registrati
                              </button>
                            )}
                            {(isAdmin || isRilevatore) && (
                              <button title="Rilevazione live punti" onClick={() => {
                                setLiveMatchId((m as any).id)
                                loadAtletiForLiveScoring((m as any).id)
                                setLiveModalOpen(true)
                              }} style={{background:'transparent',border:0,cursor:'pointer',color:'#10b981',padding:4}}>
                                <Zap size={18} fill="#10b981" />
                              </button>
                            )}
                            {isAdmin && (
                              <>
                                <button title="Modifica partita" onClick={() => {
                                  // open edit modal and populate fields
                                  setEditId((m as any).id)
                                  setEditHomeTeam(m.home_team_id)
                                  setEditAwayTeam(m.away_team_id)
                                  setEditCampo(m.campo ?? '')
                                  setEditOrario(toDatetimeLocalInput(m.orario ?? ''))
                                  setEditRilevatore((m as any).rilevatore_id ?? '')
                                  setEditHomeScore((m as any).home_score != null ? String((m as any).home_score) : '')
                                  setEditAwayScore((m as any).away_score != null ? String((m as any).away_score) : '')
                                  setEditStatus(null)
                                  setEditModalOpen(true)
                                }} style={{background:'transparent',border:0,cursor:'pointer',padding:4}}>
                                  <Edit2 size={16} />
                                </button>

                                <button title="Elimina partita" onClick={async () => {
                                  if (!confirm('Confermi l\'eliminazione di questa partita?')) return
                                  try{
                                    const { error } = await supabase.from('partite').delete().eq('id', (m as any).id)
                                    if (error) { alert('Errore eliminazione: ' + error.message); return }
                                    // remove from local state
                                    setMatches(prev => prev.filter(x => (x as any).id !== (m as any).id))
                                  }catch(err){ console.debug(err); alert('Errore eliminazione') }
                                }} style={{background:'transparent',border:0,cursor:'pointer',padding:4}}>
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        <div style={{display:'flex',gap:12,alignItems:'center',marginTop:8,color:'#475569',fontSize:12,flexWrap:'wrap'}}>
                          <div style={{display:'flex',alignItems:'center',gap:4}}>
                            <MapPin size={14} />
                            <span style={{textTransform:'uppercase',fontWeight:600}}>{m.campo ?? '—'}</span>
                          </div>

                          <div style={{display:'flex',alignItems:'center',gap:4}}>
                            <Calendar size={14} />
                            <span>{dateStr || '—'}</span>
                          </div>

                          <div style={{display:'flex',alignItems:'center',gap:4}}>
                            <Clock size={14} />
                            <span>{timeStr || '—'}</span>
                          </div>

                          {isAdmin && rilevatore && (
                            <div style={{display:'flex',alignItems:'center',gap:4,paddingLeft:8,borderLeft:'1px solid #cbd5e1'}}>
                              <UserPlus size={14} />
                              <span style={{fontWeight:600}}>
                                {rilevatore.nome} {rilevatore.cognome}
                              </span>
                            </div>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
        )}

      </section>

      {/* Vote Dialog */}
      {voteModalOpen && voteMatchId && voteSquadraCasa && voteSquadraOspite && (
        <VoteDialog
          open={voteModalOpen}
          onOpenChange={setVoteModalOpen}
          partitaId={voteMatchId}
          squadraCasa={voteSquadraCasa}
          squadraOspite={voteSquadraOspite}
        />
      )}

      {/* View Stats Modal */}
      <Dialog.Root open={viewStatsModalOpen} onOpenChange={setViewStatsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="rw-overlay" />
          <Dialog.Content className="rw-dialog" style={{ maxWidth: 700, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <Dialog.Title style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 16, flexShrink: 0 }}>
              📊 Tabellino Partita
            </Dialog.Title>

            {loadingViewStats ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Caricamento...</div>
            ) : (
              <div style={{ overflowY: 'auto', paddingRight: 8 }}>
                {/* Home Team */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                    {viewStatsHomeTeam?.logo_url && (
                      <img src={viewStatsHomeTeam.logo_url} alt={viewStatsHomeTeam.name} style={{ width: 32, height: 32, objectFit: 'contain' }} />
                    )}
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                      {viewStatsHomeTeam?.name || 'Squadra Casa'}
                    </h3>
                    <div style={{ marginLeft: 'auto', fontSize: '1.5rem', fontWeight: 800, color: '#3b82f6' }}>
                      {viewStatsHomeAtleti.reduce((sum, a) => sum + a.punti, 0)}
                    </div>
                  </div>
                  
                  {viewStatsHomeAtleti.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: 14 }}>
                      Nessun punto registrato
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>#</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Giocatore</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Punti</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewStatsHomeAtleti.map(atleta => (
                          <tr key={atleta.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 700, color: '#64748b', fontSize: '0.875rem' }}>
                              {atleta.numero_maglia}
                            </td>
                            <td style={{ padding: '8px 12px', fontSize: '0.875rem', color: '#1e293b' }}>
                              {atleta.nome} {atleta.cognome}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, fontSize: '1rem', color: '#3b82f6' }}>
                              {atleta.punti}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Away Team */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                    {viewStatsAwayTeam?.logo_url && (
                      <img src={viewStatsAwayTeam.logo_url} alt={viewStatsAwayTeam.name} style={{ width: 32, height: 32, objectFit: 'contain' }} />
                    )}
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                      {viewStatsAwayTeam?.name || 'Squadra Ospite'}
                    </h3>
                    <div style={{ marginLeft: 'auto', fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>
                      {viewStatsAwayAtleti.reduce((sum, a) => sum + a.punti, 0)}
                    </div>
                  </div>
                  
                  {viewStatsAwayAtleti.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: 14 }}>
                      Nessun punto registrato
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>#</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Giocatore</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Punti</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewStatsAwayAtleti.map(atleta => (
                          <tr key={atleta.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 700, color: '#64748b', fontSize: '0.875rem' }}>
                              {atleta.numero_maglia}
                            </td>
                            <td style={{ padding: '8px 12px', fontSize: '0.875rem', color: '#1e293b' }}>
                              {atleta.nome} {atleta.cognome}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, fontSize: '1rem', color: '#f59e0b' }}>
                              {atleta.punti}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            <Dialog.Close asChild>
              <button className="btn" style={{ width: '100%', marginTop: 20, flexShrink: 0 }}>
                Chiudi
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  )
}
