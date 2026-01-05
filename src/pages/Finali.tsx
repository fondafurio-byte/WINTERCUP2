import React, { useState, useEffect, Suspense, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { Trophy, Zap, Edit2, Trash2, MapPin, Calendar, Clock, Radio, Eye, FileText } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'

const LazyFinalVoteDialog = React.lazy(() => import('../components/FinalVoteDialog'))

type Team = {
  id: string
  name: string
  girone: string
  logo_url?: string | null
}

type Standing = {
  id: string
  name: string
  girone: string
  logo_url?: string | null
  wins: number
  pts_for: number
  pts_against: number
  points: number
  position: number
}

type FinalMatch = {
  id: string
  home_team_id: string
  away_team_id: string
  home_score: number | null
  away_score: number | null
  finalType: '1-2' | '3-4' | '5-6' | '7-8'
  campo?: string | null
  orario?: string | null
  is_live?: boolean
  rilevatore_id?: string | null
}

export default function Finali(){
  const [view, setView] = useState<'incroci'|'classifica'>('incroci')
  const [standingsA, setStandingsA] = useState<Standing[]>([])
  const [standingsB, setStandingsB] = useState<Standing[]>([])
  const [loading, setLoading] = useState(false)
  const [allPhasesCompleted, setAllPhasesCompleted] = useState(false)
  const [finalRankings, setFinalRankings] = useState<Standing[]>([])
  const [finalMatches, setFinalMatches] = useState<FinalMatch[]>([])
  const [voteModalOpen, setVoteModalOpen] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<{ partitaId: string; squadraCasa: Team; squadraOspite: Team; finalType: '1-2' | '3-4' | '5-6' | '7-8' } | null>(null)
  const [isTeamUser, setIsTeamUser] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isRilevatore, setIsRilevatore] = useState(false)
  const [currentRilevatoreId, setCurrentRilevatoreId] = useState<string | null>(null)
  const [teamsMap, setTeamsMap] = useState<Record<string, Team>>({})

  // Live scoring modal state
  const [liveModalOpen, setLiveModalOpen] = useState(false)
  const [liveMatchId, setLiveMatchId] = useState<string | null>(null)
  const [homeAtleti, setHomeAtleti] = useState<Array<{id:string; nome:string; cognome:string; numero_maglia:string}>>([])
  const [awayAtleti, setAwayAtleti] = useState<Array<{id:string; nome:string; cognome:string; numero_maglia:string}>>([])
  const [liveStatus, setLiveStatus] = useState<string | null>(null)
  const [loadingLive, setLoadingLive] = useState(false)
  const [atletiPunti, setAtletiPunti] = useState<Record<string, number>>({})

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editMatchId, setEditMatchId] = useState<string | null>(null)
  const [editHomeScore, setEditHomeScore] = useState<string>('')
  const [editAwayScore, setEditAwayScore] = useState<string>('')
  const [editCampo, setEditCampo] = useState<string>('')
  const [editOrario, setEditOrario] = useState<string>('')
  const [editStatus, setEditStatus] = useState<string | null>(null)

  // Tabellino modal state (read-only)
  const [tabellinoModalOpen, setTabellinoModalOpen] = useState(false)
  const [tabellinoMatchId, setTabellinoMatchId] = useState<string | null>(null)
  const [tabellinoHomeTeam, setTabellinoHomeTeam] = useState<Team | null>(null)
  const [tabellinoAwayTeam, setTabellinoAwayTeam] = useState<Team | null>(null)
  const [tabellinoSelectedTeam, setTabellinoSelectedTeam] = useState<'home' | 'away' | ''>('')
  const [tabellinoAtletiList, setTabellinoAtletiList] = useState<Array<{id:string; nome:string; cognome:string; numero_maglia:string; punti:number}>>([])
  const [loadingTabellino, setLoadingTabellino] = useState(false)

  // Calculate team totals
  const homeTeamScore = useMemo(() => {
    return homeAtleti.reduce((sum, atleta) => sum + (atletiPunti[atleta.id] || 0), 0)
  }, [homeAtleti, atletiPunti])

  const awayTeamScore = useMemo(() => {
    return awayAtleti.reduce((sum, atleta) => sum + (atletiPunti[atleta.id] || 0), 0)
  }, [awayAtleti, atletiPunti])

  useEffect(() => {
    checkAuth()
    loadStandings()
  }, [])

  // Real-time polling for live score updates - only when live modal is open
  useEffect(() => {
    if (!liveModalOpen) return
    
    const pollInterval = setInterval(() => {
      loadStandings()
    }, 3000)
    return () => clearInterval(pollInterval)
  }, [liveModalOpen])

  async function checkAuth() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setIsTeamUser(false)
        setIsAdmin(false)
        setIsRilevatore(false)
        setCurrentRilevatoreId(null)
        return
      }

      // Check admin
      const { data: adminData } = await supabase
        .from('admins')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
      const isAdminUser = Boolean(adminData && adminData.length > 0)
      setIsAdmin(isAdminUser)
      console.log('Finali - isAdmin:', isAdminUser, 'user_id:', user.id)

      // Check rilevatore
      const { data: rilevData } = await supabase
        .from('rilevatori')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
      const isRilevUser = Boolean(rilevData && rilevData.length > 0)
      setIsRilevatore(isRilevUser)
      if (isRilevUser && rilevData && rilevData.length > 0) {
        setCurrentRilevatoreId(rilevData[0].id)
      } else {
        setCurrentRilevatoreId(null)
      }
      console.log('Finali - isRilevatore:', isRilevUser, 'rilevatoreId:', rilevData && rilevData.length > 0 ? rilevData[0].id : null)

      // Controlla se l'utente è un utente di squadra o pubblico
      const { data: teamUserData } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
      
      const { data: publicUserData } = await supabase
        .from('public_users')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)

      const isVoter = Boolean(
        (teamUserData && teamUserData.length > 0) || 
        (publicUserData && publicUserData.length > 0)
      )
      setIsTeamUser(isVoter)
    } catch (err) {
      console.error('Error checking auth:', err)
      setIsTeamUser(false)
      setIsAdmin(false)
      setIsRilevatore(false)
      setCurrentRilevatoreId(null)
    }
  }

  async function loadStandings() {
    setLoading(true)
    try {
      // Load teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('squadre')
        .select('id, name, girone, logo_url')
        .order('name')
      
      if (teamsError || !teamsData) {
        console.error('Error loading teams:', teamsError)
        setLoading(false)
        return
      }

      // Crea mappa dei team per accesso rapido
      const teamMap: Record<string, Team> = {}
      teamsData.forEach(t => {
        teamMap[t.id] = t
      })
      setTeamsMap(teamMap)

      // Load all matches to calculate final standings
      const { data: matchesData, error: matchesError } = await supabase
        .from('partite')
        .select('id, home_team_id, away_team_id, home_score, away_score, girone')
      
      if (matchesError || !matchesData) {
        console.error('Error loading matches:', matchesError)
        setLoading(false)
        return
      }

      // Calculate standings for each girone
      const calculateStandings = (gironeTeams: Team[], matches: any[]) => {
        const map: Record<string, Standing> = {}
        
        gironeTeams.forEach(t => {
          map[t.id] = {
            id: t.id,
            name: t.name,
            girone: t.girone,
            wins: 0,
            pts_for: 0,
            pts_against: 0,
            points: 0,
            position: 0
          }
        })

        matches.forEach(m => {
          if (m.home_score == null || m.away_score == null) return
          if (!map[m.home_team_id] || !map[m.away_team_id]) return

          map[m.home_team_id].pts_for += m.home_score
          map[m.home_team_id].pts_against += m.away_score
          map[m.away_team_id].pts_for += m.away_score
          map[m.away_team_id].pts_against += m.home_score

          if (m.home_score > m.away_score) {
            map[m.home_team_id].wins += 1
          } else if (m.away_score > m.home_score) {
            map[m.away_team_id].wins += 1
          }
        })

        const arr = Object.values(map).map(x => ({ ...x, points: x.wins * 2 }))
        arr.sort((a, b) => {
          // 1. Punti totali
          if (b.points !== a.points) return b.points - a.points
          
          // 2. Scontro diretto (se pari punti)
          const directMatches = matches.filter(m => 
            (m.home_team_id === a.id && m.away_team_id === b.id) ||
            (m.home_team_id === b.id && m.away_team_id === a.id)
          )
          if (directMatches.length > 0) {
            let aDirectPoints = 0
            let bDirectPoints = 0
            directMatches.forEach(m => {
              if (m.home_score != null && m.away_score != null) {
                if (m.home_team_id === a.id) {
                  if (m.home_score > m.away_score) aDirectPoints += 2
                  if (m.home_score < m.away_score) bDirectPoints += 2
                } else {
                  if (m.away_score > m.home_score) aDirectPoints += 2
                  if (m.away_score < m.home_score) bDirectPoints += 2
                }
              }
            })
            if (aDirectPoints !== bDirectPoints) return bDirectPoints - aDirectPoints
          }
          
          // 3. Differenza punti
          const diffA = a.pts_for - a.pts_against
          const diffB = b.pts_for - b.pts_against
          if (diffB !== diffA) return diffB - diffA
          
          // 4. Punti fatti
          if (b.pts_for !== a.pts_for) return b.pts_for - a.pts_for
          
          // 5. Nome alfabetico
          return a.name.localeCompare(b.name)
        })

        arr.forEach((team, idx) => {
          team.position = idx + 1
        })

        return arr
      }

      const teamsA = teamsData.filter(t => t.girone === 'A')
      const teamsB = teamsData.filter(t => t.girone === 'B')
      const matchesA = matchesData.filter(m => m.girone === 'A')
      const matchesB = matchesData.filter(m => m.girone === 'B')

      const stA = calculateStandings(teamsA, matchesA)
      const stB = calculateStandings(teamsB, matchesB)

      setStandingsA(stA)
      setStandingsB(stB)

      // Check if all phases are completed (all teams have played all matches)
      // Formula corretta per girone all'italiana solo andata: n * (n - 1) / 2
      const teamsACount = teamsA.length
      const teamsBCount = teamsB.length
      const totalMatchesExpectedA = (teamsACount * (teamsACount - 1)) / 2
      const totalMatchesExpectedB = (teamsBCount * (teamsBCount - 1)) / 2
      const totalMatchesExpected = totalMatchesExpectedA + totalMatchesExpectedB
      
      // Conta solo le partite dei gironi (non le finali)
      const completedGironeMatches = matchesData.filter(m => 
        m.girone !== null && m.home_score != null && m.away_score != null
      ).length
      
      const phasesCompleted = completedGironeMatches >= totalMatchesExpected
      setAllPhasesCompleted(phasesCompleted)
      
      console.log('Finali - Partite completate:', completedGironeMatches, '/', totalMatchesExpected, '(A:', totalMatchesExpectedA, 'B:', totalMatchesExpectedB, ') -> Gironi completati:', phasesCompleted)

      // Calculate final rankings based on finals matches
      // Finals matches are between same positions from different gironi
      // 1°/2° place final: stA[0] vs stB[0]
      // 3°/4° place final: stA[1] vs stB[1]
      // 5°/6° place final: stA[2] vs stB[2]
      // 7°/8° place final: stA[3] vs stB[3]
      
      // Trova tutte le partite finali (fase='finali' oppure tra gironi diversi)
      const finalsMatches = matchesData.filter(m => {
        const homeTeam = teamMap[m.home_team_id]
        const awayTeam = teamMap[m.away_team_id]
        return homeTeam && awayTeam && homeTeam.girone !== awayTeam.girone
      })
      
      // Carica le partite finali per la votazione/rilevazione
      // Trova le partite tra squadre di gironi diversi nella stessa posizione
      const finals: FinalMatch[] = []
      
      // Se i gironi sono completati e abbiamo almeno 4 squadre per girone
      if (stA.length >= 4 && stB.length >= 4 && phasesCompleted) {
        for (let pos = 1; pos <= 4; pos++) {
          const teamA = stA[pos - 1]
          const teamB = stB[pos - 1]
          
          if (teamA && teamB) {
            // Cerca una partita finale esistente
            let finalMatch = finalsMatches.find(m => 
              (m.home_team_id === teamA.id && m.away_team_id === teamB.id) ||
              (m.home_team_id === teamB.id && m.away_team_id === teamA.id)
            )
            
            // Se non esiste, creala automaticamente
            if (!finalMatch) {
              console.log(`Creazione automatica finale ${pos} tra ${teamA.name} e ${teamB.name}`)
              
              // Prepara il payload - alcuni campi potrebbero non essere nullable
              const insertPayload: any = {
                home_team_id: teamA.id,
                away_team_id: teamB.id,
                fase: 'finali'
              }
              
              // Solo se il database permette girone NULL per le finali
              // Altrimenti usa un valore speciale come 'FINALI'
              try {
                // Prova prima con girone NULL
                const { data: newMatch, error: createError } = await supabase
                  .from('partite')
                  .insert({
                    ...insertPayload,
                    girone: null,
                    home_score: null,
                    away_score: null
                  })
                  .select()
                  .single()
                
                if (!createError && newMatch) {
                  finalMatch = newMatch
                  console.log(`Finale ${pos} creata con successo:`, newMatch.id)
                } else if (createError) {
                  // Se fallisce con NULL, prova senza specificare girone o con valore speciale
                  console.warn(`Tentativo con girone=NULL fallito:`, createError.message)
                  
                  const { data: newMatch2, error: createError2 } = await supabase
                    .from('partite')
                    .insert({
                      ...insertPayload,
                      girone: 'FINALI', // Valore speciale invece di NULL
                      home_score: null,
                      away_score: null
                    })
                    .select()
                    .single()
                  
                  if (!createError2 && newMatch2) {
                    finalMatch = newMatch2
                    console.log(`Finale ${pos} creata con girone='FINALI':`, newMatch2.id)
                  } else {
                    console.error(`Errore creazione finale ${pos}:`, createError2)
                    console.error(`Dettagli errore:`, JSON.stringify(createError2, null, 2))
                  }
                }
              } catch (err) {
                console.error(`Eccezione durante creazione finale ${pos}:`, err)
              }
            }
            
            if (finalMatch) {
              const finalType = pos === 1 ? '1-2' : pos === 2 ? '3-4' : pos === 3 ? '5-6' : '7-8'
              finals.push({
                id: finalMatch.id,
                home_team_id: finalMatch.home_team_id,
                away_team_id: finalMatch.away_team_id,
                home_score: finalMatch.home_score,
                away_score: finalMatch.away_score,
                finalType: finalType as '1-2' | '3-4' | '5-6' | '7-8'
              })
            }
          }
        }
      }
      
      setFinalMatches(finals)
      console.log('Finali - finalMatches caricati:', finals.length, finals)
      console.log('Finali - Dettaglio finalMatches per tipo:')
      console.log('  1-2:', finals.find(m => m.finalType === '1-2'))
      console.log('  3-4:', finals.find(m => m.finalType === '3-4'))
      console.log('  5-6:', finals.find(m => m.finalType === '5-6'))
      console.log('  7-8:', finals.find(m => m.finalType === '7-8'))
      
      // Calculate final rankings based on finals matches results
      if (stA.length >= 4 && stB.length >= 4) {
        const finalTeamsMap: Record<string, { team: Standing; finalResult: 'win' | 'loss' | 'pending'; position: number }> = {}
        
        // Initialize all 8 teams (top 4 from each girone)
        for (let i = 0; i < 4; i++) {
          if (stA[i]) {
            finalTeamsMap[stA[i].id] = { team: stA[i], finalResult: 'pending', position: i + 1 }
          }
          if (stB[i]) {
            finalTeamsMap[stB[i].id] = { team: stB[i], finalResult: 'pending', position: i + 1 }
          }
        }

        // Find finals matches with results (matches between teams from different gironi in same positions)
        const finalsMatchesWithResults = finalsMatches.filter(m => {
          const homeTeam = finalTeamsMap[m.home_team_id]
          const awayTeam = finalTeamsMap[m.away_team_id]
          
          // Check if both teams are in finals and from different gironi and same position
          return homeTeam && awayTeam && 
                 homeTeam.team.girone !== awayTeam.team.girone &&
                 homeTeam.position === awayTeam.position &&
                 m.home_score != null && m.away_score != null
        })

        // Update results based on finals matches
        finalsMatchesWithResults.forEach(m => {
          if (m.home_score! > m.away_score!) {
            finalTeamsMap[m.home_team_id].finalResult = 'win'
            finalTeamsMap[m.away_team_id].finalResult = 'loss'
          } else if (m.away_score! > m.home_score!) {
            finalTeamsMap[m.away_team_id].finalResult = 'win'
            finalTeamsMap[m.home_team_id].finalResult = 'loss'
          }
        })

        // Create final rankings based on finals results
        // Finale 1°/2° Posto: vincente 1° posto, perdente 2° posto
        // Finale 3°/4° Posto: vincente 3° posto, perdente 4° posto
        // Finale 5°/6° Posto: vincente 5° posto, perdente 6° posto
        // Finale 7°/8° Posto: vincente 7° posto, perdente 8° posto
        const rankings: Standing[] = []
        
        // Per ogni posizione dei gironi (1-4), assegna le posizioni finali in base al risultato
        for (let pos = 1; pos <= 4; pos++) {
          // Trova vincente e perdente per questa posizione
          const teamsInThisPosition = Object.values(finalTeamsMap).filter(t => t.position === pos)
          const winner = teamsInThisPosition.find(t => t.finalResult === 'win')
          const loser = teamsInThisPosition.find(t => t.finalResult === 'loss')
          
          if (winner) {
            // Vincente prende la posizione dispari (1°, 3°, 5°, 7°)
            const finalPosition = (pos - 1) * 2 + 1
            rankings[finalPosition - 1] = winner.team
          }
          
          if (loser) {
            // Perdente prende la posizione pari (2°, 4°, 6°, 8°)
            const finalPosition = (pos - 1) * 2 + 2
            rankings[finalPosition - 1] = loser.team
          }
          
          // Se una finale non è stata giocata, mantieni l'ordine originale
          if (!winner && !loser) {
            // Se nessuna delle due squadre ha giocato, usa l'ordine di girone
            teamsInThisPosition.forEach((t, idx) => {
              const finalPosition = (pos - 1) * 2 + 1 + idx
              if (!rankings[finalPosition - 1]) {
                rankings[finalPosition - 1] = t.team
              }
            })
          } else if (!winner || !loser) {
            // Se solo una ha giocato, metti le squadre pending dopo
            teamsInThisPosition.filter(t => t.finalResult === 'pending').forEach(t => {
              const finalPosition = (pos - 1) * 2 + 2
              if (!rankings[finalPosition - 1]) {
                rankings[finalPosition - 1] = t.team
              }
            })
          }
        }

        // Rimuovi eventuali undefined e compatta l'array
        // Mostra la classifica solo se i gironi sono completati
        setFinalRankings(allPhasesCompleted ? rankings.filter(Boolean) : [])
      } else {
        setFinalRankings([])
      }

    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadTabellinoForMatch(matchId: string) {
    setLoadingTabellino(true)
    setTabellinoSelectedTeam('')
    setTabellinoAtletiList([])
    try {
      const match = finalMatches.find(m => m.id === matchId)
      if (!match) {
        setLoadingTabellino(false)
        return
      }
      
      const homeTeam = teamsMap[match.home_team_id]
      const awayTeam = teamsMap[match.away_team_id]
      setTabellinoHomeTeam(homeTeam || null)
      setTabellinoAwayTeam(awayTeam || null)
    } catch (err) {
      console.error('Error loading tabellino:', err)
    } finally {
      setLoadingTabellino(false)
    }
  }

  async function loadTabellinoForTeam(teamId: string) {
    if (!tabellinoMatchId) return
    setLoadingTabellino(true)
    try {
      // Get athletes for this team
      const { data: atletiData, error: atletiError } = await supabase
        .from('atleti')
        .select('id, nome, cognome, numero_maglia')
        .eq('squadra_id', teamId)
        .order('numero_maglia')
      
      if (atletiError) {
        console.error('Error loading athletes:', atletiError)
        setLoadingTabellino(false)
        return
      }
      
      // Load points for these athletes
      const atletiIds = (atletiData || []).map(a => a.id)
      const { data: puntiData } = await supabase
        .from('punti_atleti')
        .select('atleta_id, punti')
        .eq('partita_id', tabellinoMatchId)
        .in('atleta_id', atletiIds)
      
      const puntiMap = (puntiData || []).reduce((acc: any, p: any) => {
        acc[p.atleta_id] = (acc[p.atleta_id] || 0) + p.punti
        return acc
      }, {})
      
      // Combine athletes with their points
      const atletiWithPunti = (atletiData || []).map(a => ({
        ...a,
        punti: puntiMap[a.id] || 0
      }))
      
      setTabellinoAtletiList(atletiWithPunti)
    } catch (err) {
      console.error('Error loading tabellino:', err)
    } finally {
      setLoadingTabellino(false)
    }
  }

  function openVoteDialog(match: FinalMatch) {
    const squadraCasa = teamsMap[match.home_team_id]
    const squadraOspite = teamsMap[match.away_team_id]
    
    if (!squadraCasa || !squadraOspite) return

    setSelectedMatch({
      partitaId: match.id,
      squadraCasa,
      squadraOspite,
      finalType: match.finalType
    })
    setVoteModalOpen(true)
  }

  async function loadAtletiForLiveScoring(matchId: string) {
    setLoadingLive(true)
    setLiveStatus(null)
    try {
      const match = finalMatches.find(m => m.id === matchId)
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
        console.error('load home atleti error', homeError)
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
        console.error('load away atleti error', awayError)
        setLiveStatus('Errore caricamento atleti ospiti')
        setLoadingLive(false)
        return
      }

      // Sort by jersey number
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
        console.error('load punti error', puntiError)
      } else if (puntiData) {
        const puntiMap: Record<string, number> = {}
        puntiData.forEach((p: any) => {
          if (!puntiMap[p.atleta_id]) puntiMap[p.atleta_id] = 0
          puntiMap[p.atleta_id] += p.punti
        })
        setAtletiPunti(puntiMap)
      }
    } catch (err) {
      console.error('load atleti error', err)
      setLiveStatus('Errore caricamento atleti')
    } finally {
      setLoadingLive(false)
    }
  }

  async function handleAddPoint(atletaId: string, points: number) {
    try {
      if (!liveMatchId) return

      const { error } = await supabase.from('punti_atleti').insert([{
        partita_id: liveMatchId,
        atleta_id: atletaId,
        punti: points
      }])

      if (error) {
        console.error('insert punti error', error)
        setLiveStatus('Errore: ' + error.message)
        return
      }

      // Update local state
      setAtletiPunti(prev => ({
        ...prev,
        [atletaId]: (prev[atletaId] || 0) + points
      }))
    } catch (err) {
      console.error('add point error', err)
      setLiveStatus('Errore aggiunta punti')
    }
  }

  async function handleFinishLiveScoring() {
    if (!liveMatchId) return
    
    try {
      // Update match scores
      const { error } = await supabase
        .from('partite')
        .update({
          home_score: homeTeamScore,
          away_score: awayTeamScore
        })
        .eq('id', liveMatchId)

      if (error) {
        setLiveStatus('Errore aggiornamento punteggio: ' + error.message)
        return
      }

      setLiveStatus('Punteggio salvato!')
      setTimeout(() => {
        setLiveModalOpen(false)
        setLiveStatus(null)
        loadStandings() // Reload to update finals
      }, 1000)
    } catch (err) {
      console.error('finish scoring error', err)
      setLiveStatus('Errore salvataggio')
    }
  }

  async function handleEditMatch(e: React.FormEvent) {
    e.preventDefault()
    if (!editMatchId) return

    try {
      const homeScore = editHomeScore === '' ? null : parseInt(editHomeScore, 10)
      const awayScore = editAwayScore === '' ? null : parseInt(editAwayScore, 10)

      const { error } = await supabase
        .from('partite')
        .update({
          home_score: homeScore,
          away_score: awayScore,
          campo: editCampo || null,
          orario: editOrario || null
        })
        .eq('id', editMatchId)

      if (error) {
        setEditStatus('Errore: ' + error.message)
        return
      }

      setEditStatus('Partita aggiornata!')
      setTimeout(() => {
        setEditModalOpen(false)
        setEditStatus(null)
        loadStandings()
      }, 1000)
    } catch (err) {
      console.error('edit match error', err)
      setEditStatus('Errore aggiornamento')
    }
  }

  async function handleDeleteMatch(matchId: string) {
    if (!confirm('Confermi l\'eliminazione di questa partita finale?')) return

    try {
      const { error } = await supabase.from('partite').delete().eq('id', matchId)
      if (error) {
        alert('Errore eliminazione: ' + error.message)
        return
      }
      loadStandings()
    } catch (err) {
      console.error('delete match error', err)
      alert('Errore eliminazione')
    }
  }

  // Debug log
  console.log('Finali render - isAdmin:', isAdmin, 'isRilevatore:', isRilevatore, 'isTeamUser:', isTeamUser, 'finalMatches:', finalMatches.length)

  return (
    <main style={{width:'100%',maxWidth:900,margin:'24px auto',padding:12}}>
      <h1>Finali</h1>

      <div style={{marginTop:16,marginBottom:16}}>
        <select 
          aria-label="Seleziona visualizzazione" 
          className="rw-input" 
          value={view} 
          onChange={(e) => setView(e.target.value as 'incroci'|'classifica')}
          style={{maxWidth:300}}
        >
          <option value="incroci">Incroci Finali</option>
          <option value="classifica">Classifica Finale</option>
        </select>
      </div>

      {loading ? (
        <div style={{textAlign:'center',padding:20,color:'#64748b'}}>Caricamento...</div>
      ) : (
        <>
        {view === 'incroci' && (
        <section style={{marginTop:24}}>
          <h2 style={{fontSize:18,margin:0,marginBottom:16}}>Incroci Finali</h2>
          
          <div style={{display:'grid',gap:16}}>
            {/* Finale 1°/2° Posto */}
            <div style={{border:'2px solid #e2e8f0',borderRadius:8,padding:16,background:'#fff'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <h3 style={{margin:0,fontSize:16,fontWeight:700}}>Finale 1°/2° Posto</h3>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <span style={{background:'#fbbf24',color:'#78350f',padding:'4px 12px',borderRadius:6,fontSize:13,fontWeight:700}}>1° vs 1°</span>
                  {finalMatches.find(m => m.finalType === '1-2') && (
                    <>
                      {isTeamUser && (
                        <button
                          title="Vota MVP"
                          onClick={() => {
                            const match = finalMatches.find(m => m.finalType === '1-2')
                            if (match) openVoteDialog(match)
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
                          }}
                        >
                          <Trophy size={14} />
                          Vota MVP
                        </button>
                      )}
                      {(() => {
                        const match = finalMatches.find(m => m.finalType === '1-2')
                        const canEditMatch = isAdmin || (isRilevatore && currentRilevatoreId && match?.rilevatore_id === currentRilevatoreId)
                        return canEditMatch && (
                        <>
                          <button
                            title="Rilevazione live"
                            onClick={async () => {
                              if (match) {
                                setLiveMatchId(match.id)
                                loadAtletiForLiveScoring(match.id)
                                setLiveModalOpen(true)
                                // Imposta partita come live
                                await supabase.from('partite').update({ is_live: true }).eq('id', match.id)
                              }
                            }}
                            style={{
                              background:'#10b981',
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
                            <Zap size={14} />
                            Live
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                title="Modifica risultato"
                                onClick={() => {
                                  const match = finalMatches.find(m => m.finalType === '1-2')
                                  if (match) {
                                    setEditMatchId(match.id)
                                    setEditHomeScore(match.home_score?.toString() || '')
                                    setEditAwayScore(match.away_score?.toString() || '')
                                    setEditCampo(match.campo || '')
                                    setEditOrario(match.orario || '')
                                    setEditModalOpen(true)
                                  }
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
                                }}
                              >
                                <Edit2 size={14} />
                                Modifica
                              </button>
                            </>
                          )}
                        </>
                        )
                      })()}
                      {/* Pulsante Visualizza Tabellino - sempre visibile se la partita ha dei punteggi */}
                      {(() => {
                        const match = finalMatches.find(m => m.finalType === '1-2')
                        return (match && (match.home_score != null || match.away_score != null)) && (
                          <button
                            title="Visualizza Tabellino"
                            onClick={() => {
                              if (match) {
                                setTabellinoMatchId(match.id)
                                loadTabellinoForMatch(match.id)
                                setTabellinoModalOpen(true)
                              }
                            }}
                            style={{
                              background:'#10b981',
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
                            <FileText size={14} />
                            Tabellino
                          </button>
                        )
                      })()}
                    </>
                  )}
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                <div style={{flex:1,padding:12,background:'#f8fafc',borderRadius:6,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:80}}>
                  {allPhasesCompleted && standingsA[0] ? (
                    standingsA[0].logo_url ? (
                      <img src={standingsA[0].logo_url} alt={standingsA[0].name} style={{width:50,height:50,objectFit:'contain'}} />
                    ) : (
                      <div style={{fontWeight:700,fontSize:15}}>{standingsA[0].name}</div>
                    )
                  ) : (
                    <div style={{fontWeight:700,fontSize:15,color:'#64748b'}}>1° Girone A</div>
                  )}
                  <div style={{fontSize:12,color:'#64748b',marginTop:4}}>Girone A</div>
                </div>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                  {(() => {
                    const match = finalMatches.find(m => m.finalType === '1-2')
                    if (match && match.home_score != null && match.away_score != null) {
                      return (
                        <div style={{fontWeight:700,fontSize:24,color:'#0f172a'}}>
                          {match.home_score} — {match.away_score}
                        </div>
                      )
                    }
                    return <div style={{fontWeight:700,fontSize:20,color:'#64748b'}}>VS</div>
                  })()}
                </div>
                <div style={{flex:1,padding:12,background:'#fef2f2',borderRadius:6,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:80}}>
                  {allPhasesCompleted && standingsB[0] ? (
                    standingsB[0].logo_url ? (
                      <img src={standingsB[0].logo_url} alt={standingsB[0].name} style={{width:50,height:50,objectFit:'contain'}} />
                    ) : (
                      <div style={{fontWeight:700,fontSize:15}}>{standingsB[0].name}</div>
                    )
                  ) : (
                    <div style={{fontWeight:700,fontSize:15,color:'#64748b'}}>1° Girone B</div>
                  )}
                  <div style={{fontSize:12,color:'#64748b',marginTop:4}}>Girone B</div>
                </div>
              </div>
              {(() => {
                const match = finalMatches.find(m => m.finalType === '1-2')
                const campo = match?.campo || 'MORIGIA'
                const orarioDate = match?.orario ? new Date(match.orario) : new Date('2026-01-05T11:30:00')
                const dateStr = orarioDate.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
                const timeStr = orarioDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
                if (campo || dateStr || timeStr) {
                  return (
                    <div style={{display:'flex',gap:12,alignItems:'center',marginTop:12,color:'#475569',fontSize:13,flexWrap:'wrap',paddingTop:8,borderTop:'1px solid #e2e8f0'}}>
                      {campo && (
                        <div style={{display:'flex',alignItems:'center',gap:4}}>
                          <MapPin size={14} />
                          <span style={{textTransform:'uppercase',fontWeight:600}}>{campo}</span>
                        </div>
                      )}
                      {dateStr && (
                        <div style={{display:'flex',alignItems:'center',gap:4}}>
                          <Calendar size={14} />
                          <span>{dateStr}</span>
                        </div>
                      )}
                      {timeStr && (
                        <div style={{display:'flex',alignItems:'center',gap:4}}>
                          <Clock size={14} />
                          <span>{timeStr}</span>
                        </div>
                      )}
                    </div>
                  )
                }
                return null
              })()}
            </div>

            {/* Finale 3°/4° Posto */}
            <div style={{border:'2px solid #e2e8f0',borderRadius:8,padding:16,background:'#fff'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <h3 style={{margin:0,fontSize:16,fontWeight:700}}>Finale 3°/4° Posto</h3>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <span style={{background:'#e2e8f0',color:'#475569',padding:'4px 12px',borderRadius:6,fontSize:13,fontWeight:700}}>2° vs 2°</span>
                  {finalMatches.find(m => m.finalType === '3-4') && (
                    <>
                      {isTeamUser && (
                        <button
                          title="Vota MVP"
                          onClick={() => {
                            const match = finalMatches.find(m => m.finalType === '3-4')
                            if (match) openVoteDialog(match)
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
                          }}
                        >
                          <Trophy size={14} />
                          Vota MVP
                        </button>
                      )}
                      {(() => {
                        const match = finalMatches.find(m => m.finalType === '3-4')
                        const canEditMatch = isAdmin || (isRilevatore && currentRilevatoreId && match?.rilevatore_id === currentRilevatoreId)
                        return canEditMatch && (
                        <>
                          <button
                            title="Rilevazione live"
                            onClick={async () => {
                              if (match) {
                                setLiveMatchId(match.id)
                                loadAtletiForLiveScoring(match.id)
                                setLiveModalOpen(true)
                                // Imposta partita come live
                                await supabase.from('partite').update({ is_live: true }).eq('id', match.id)
                              }
                            }}
                            style={{
                              background:'#10b981',
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
                            <Zap size={14} />
                            Live
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                title="Modifica risultato"
                                onClick={() => {
                                  const match = finalMatches.find(m => m.finalType === '3-4')
                                  if (match) {
                                    setEditMatchId(match.id)
                                    setEditHomeScore(match.home_score?.toString() || '')
                                    setEditAwayScore(match.away_score?.toString() || '')
                                    setEditCampo(match.campo || '')
                                    setEditOrario(match.orario || '')
                                    setEditModalOpen(true)
                                  }
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
                                }}
                              >
                                <Edit2 size={14} />
                                Modifica
                              </button>
                            </>
                          )}
                        </>
                        )
                      })()}
                      {/* Pulsante Visualizza Tabellino */}
                      {(() => {
                        const match = finalMatches.find(m => m.finalType === '3-4')
                        return (match && (match.home_score != null || match.away_score != null)) && (
                          <button
                            title="Visualizza Tabellino"
                            onClick={() => {
                              if (match) {
                                setTabellinoMatchId(match.id)
                                loadTabellinoForMatch(match.id)
                                setTabellinoModalOpen(true)
                              }
                            }}
                            style={{
                              background:'#10b981',
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
                            <FileText size={14} />
                            Tabellino
                          </button>
                        )
                      })()}
                    </>
                  )}
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                <div style={{flex:1,padding:12,background:'#f8fafc',borderRadius:6,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:80}}>
                  {allPhasesCompleted && standingsA[1] ? (
                    standingsA[1].logo_url ? (
                      <img src={standingsA[1].logo_url} alt={standingsA[1].name} style={{width:50,height:50,objectFit:'contain'}} />
                    ) : (
                      <div style={{fontWeight:700,fontSize:15}}>{standingsA[1].name}</div>
                    )
                  ) : (
                    <div style={{fontWeight:700,fontSize:15,color:'#64748b'}}>2° Girone A</div>
                  )}
                  <div style={{fontSize:12,color:'#64748b',marginTop:4}}>Girone A</div>
                </div>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                  {(() => {
                    const match = finalMatches.find(m => m.finalType === '3-4')
                    if (match && match.home_score != null && match.away_score != null) {
                      return (
                        <div style={{fontWeight:700,fontSize:24,color:'#0f172a'}}>
                          {match.home_score} — {match.away_score}
                        </div>
                      )
                    }
                    return <div style={{fontWeight:700,fontSize:20,color:'#64748b'}}>VS</div>
                  })()}
                </div>
                <div style={{flex:1,padding:12,background:'#fef2f2',borderRadius:6,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:80}}>
                  {allPhasesCompleted && standingsB[1] ? (
                    standingsB[1].logo_url ? (
                      <img src={standingsB[1].logo_url} alt={standingsB[1].name} style={{width:50,height:50,objectFit:'contain'}} />
                    ) : (
                      <div style={{fontWeight:700,fontSize:15}}>{standingsB[1].name}</div>
                    )
                  ) : (
                    <div style={{fontWeight:700,fontSize:15,color:'#64748b'}}>2° Girone B</div>
                  )}
                  <div style={{fontSize:12,color:'#64748b',marginTop:4}}>Girone B</div>
                </div>
              </div>
              {(() => {
                const match = finalMatches.find(m => m.finalType === '3-4')
                const campo = match?.campo || 'MORIGIA'
                const orarioDate = match?.orario ? new Date(match.orario) : new Date('2026-01-05T09:30:00')
                const dateStr = orarioDate.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
                const timeStr = orarioDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
                if (campo || dateStr || timeStr) {
                  return (
                    <div style={{display:'flex',gap:12,alignItems:'center',marginTop:12,color:'#475569',fontSize:13,flexWrap:'wrap',paddingTop:8,borderTop:'1px solid #e2e8f0'}}>
                      {campo && (
                        <div style={{display:'flex',alignItems:'center',gap:4}}>
                          <MapPin size={14} />
                          <span style={{textTransform:'uppercase',fontWeight:600}}>{campo}</span>
                        </div>
                      )}
                      {dateStr && (
                        <div style={{display:'flex',alignItems:'center',gap:4}}>
                          <Calendar size={14} />
                          <span>{dateStr}</span>
                        </div>
                      )}
                      {timeStr && (
                        <div style={{display:'flex',alignItems:'center',gap:4}}>
                          <Clock size={14} />
                          <span>{timeStr}</span>
                        </div>
                      )}
                    </div>
                  )
                }
                return null
              })()}
            </div>

            {/* Finale 5°/6° Posto */}
            <div style={{border:'2px solid #e2e8f0',borderRadius:8,padding:16,background:'#fff'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <h3 style={{margin:0,fontSize:16,fontWeight:700}}>Finale 5°/6° Posto</h3>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <span style={{background:'#f59e0b',color:'#78350f',padding:'4px 12px',borderRadius:6,fontSize:13,fontWeight:700}}>3° vs 3°</span>
                  {finalMatches.find(m => m.finalType === '5-6') && (
                    <>
                      {isTeamUser && (
                        <button
                          title="Vota MVP"
                          onClick={() => {
                            const match = finalMatches.find(m => m.finalType === '5-6')
                            if (match) openVoteDialog(match)
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
                          }}
                        >
                          <Trophy size={14} />
                          Vota MVP
                        </button>
                      )}
                      {(() => {
                        const match = finalMatches.find(m => m.finalType === '5-6')
                        const canEditMatch = isAdmin || (isRilevatore && currentRilevatoreId && match?.rilevatore_id === currentRilevatoreId)
                        return canEditMatch && (
                        <>
                          <button
                            title="Rilevazione live"
                            onClick={async () => {
                              if (match) {
                                setLiveMatchId(match.id)
                                loadAtletiForLiveScoring(match.id)
                                setLiveModalOpen(true)
                                // Imposta partita come live
                                await supabase.from('partite').update({ is_live: true }).eq('id', match.id)
                              }
                            }}
                            style={{
                              background:'#10b981',
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
                            <Zap size={14} />
                            Live
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                title="Modifica risultato"
                                onClick={() => {
                                  const match = finalMatches.find(m => m.finalType === '5-6')
                                  if (match) {
                                    setEditMatchId(match.id)
                                    setEditHomeScore(match.home_score?.toString() || '')
                                    setEditAwayScore(match.away_score?.toString() || '')
                                    setEditCampo(match.campo || '')
                                    setEditOrario(match.orario || '')
                                    setEditModalOpen(true)
                                  }
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
                                }}
                              >
                                <Edit2 size={14} />
                                Modifica
                              </button>
                            </>
                          )}
                        </>
                        )
                      })()}
                      {/* Pulsante Visualizza Tabellino */}
                      {(() => {
                        const match = finalMatches.find(m => m.finalType === '5-6')
                        return (match && (match.home_score != null || match.away_score != null)) && (
                          <button
                            title="Visualizza Tabellino"
                            onClick={() => {
                              if (match) {
                                setTabellinoMatchId(match.id)
                                loadTabellinoForMatch(match.id)
                                setTabellinoModalOpen(true)
                              }
                            }}
                            style={{
                              background:'#10b981',
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
                            <FileText size={14} />
                            Tabellino
                          </button>
                        )
                      })()}
                    </>
                  )}
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                <div style={{flex:1,padding:12,background:'#f8fafc',borderRadius:6,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:80}}>
                  {allPhasesCompleted && standingsA[2] ? (
                    standingsA[2].logo_url ? (
                      <img src={standingsA[2].logo_url} alt={standingsA[2].name} style={{width:50,height:50,objectFit:'contain'}} />
                    ) : (
                      <div style={{fontWeight:700,fontSize:15}}>{standingsA[2].name}</div>
                    )
                  ) : (
                    <div style={{fontWeight:700,fontSize:15,color:'#64748b'}}>3° Girone A</div>
                  )}
                  <div style={{fontSize:12,color:'#64748b',marginTop:4}}>Girone A</div>
                </div>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                  {(() => {
                    const match = finalMatches.find(m => m.finalType === '5-6')
                    if (match && match.home_score != null && match.away_score != null) {
                      return (
                        <div style={{fontWeight:700,fontSize:24,color:'#0f172a'}}>
                          {match.home_score} — {match.away_score}
                        </div>
                      )
                    }
                    return <div style={{fontWeight:700,fontSize:20,color:'#64748b'}}>VS</div>
                  })()}
                </div>
                <div style={{flex:1,padding:12,background:'#fef2f2',borderRadius:6,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:80}}>
                  {allPhasesCompleted && standingsB[2] ? (
                    standingsB[2].logo_url ? (
                      <img src={standingsB[2].logo_url} alt={standingsB[2].name} style={{width:50,height:50,objectFit:'contain'}} />
                    ) : (
                      <div style={{fontWeight:700,fontSize:15}}>{standingsB[2].name}</div>
                    )
                  ) : (
                    <div style={{fontWeight:700,fontSize:15,color:'#64748b'}}>3° Girone B</div>
                  )}
                  <div style={{fontSize:12,color:'#64748b',marginTop:4}}>Girone B</div>
                </div>
              </div>
              {(() => {
                const match = finalMatches.find(m => m.finalType === '5-6')
                const campo = match?.campo || 'MATTIOLI'
                const orarioDate = match?.orario ? new Date(match.orario) : new Date('2026-01-05T11:00:00')
                const dateStr = orarioDate.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
                const timeStr = orarioDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
                if (campo || dateStr || timeStr) {
                  return (
                    <div style={{display:'flex',gap:12,alignItems:'center',marginTop:12,color:'#475569',fontSize:13,flexWrap:'wrap',paddingTop:8,borderTop:'1px solid #e2e8f0'}}>
                      {campo && (
                        <div style={{display:'flex',alignItems:'center',gap:4}}>
                          <MapPin size={14} />
                          <span style={{textTransform:'uppercase',fontWeight:600}}>{campo}</span>
                        </div>
                      )}
                      {dateStr && (
                        <div style={{display:'flex',alignItems:'center',gap:4}}>
                          <Calendar size={14} />
                          <span>{dateStr}</span>
                        </div>
                      )}
                      {timeStr && (
                        <div style={{display:'flex',alignItems:'center',gap:4}}>
                          <Clock size={14} />
                          <span>{timeStr}</span>
                        </div>
                      )}
                    </div>
                  )
                }
                return null
              })()}
            </div>

            {/* Finale 7°/8° Posto */}
            <div style={{border:'2px solid #e2e8f0',borderRadius:8,padding:16,background:'#fff'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <h3 style={{margin:0,fontSize:16,fontWeight:700}}>Finale 7°/8° Posto</h3>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <span style={{background:'#cbd5e1',color:'#475569',padding:'4px 12px',borderRadius:6,fontSize:13,fontWeight:700}}>4° vs 4°</span>
                  {finalMatches.find(m => m.finalType === '7-8') && (
                    <>
                      {isTeamUser && (
                        <button
                          title="Vota MVP"
                          onClick={() => {
                            const match = finalMatches.find(m => m.finalType === '7-8')
                            if (match) openVoteDialog(match)
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
                          }}
                        >
                          <Trophy size={14} />
                          Vota MVP
                        </button>
                      )}
                      {(() => {
                        const match = finalMatches.find(m => m.finalType === '7-8')
                        const canEditMatch = isAdmin || (isRilevatore && currentRilevatoreId && match?.rilevatore_id === currentRilevatoreId)
                        return canEditMatch && (
                        <>
                          <button
                            title="Rilevazione live"
                            onClick={async () => {
                              if (match) {
                                setLiveMatchId(match.id)
                                loadAtletiForLiveScoring(match.id)
                                setLiveModalOpen(true)
                                // Imposta partita come live
                                await supabase.from('partite').update({ is_live: true }).eq('id', match.id)
                              }
                            }}
                            style={{
                              background:'#10b981',
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
                            <Zap size={14} />
                            Live
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                title="Modifica risultato"
                                onClick={() => {
                                  const match = finalMatches.find(m => m.finalType === '7-8')
                                  if (match) {
                                    setEditMatchId(match.id)
                                    setEditHomeScore(match.home_score?.toString() || '')
                                    setEditAwayScore(match.away_score?.toString() || '')
                                    setEditCampo(match.campo || '')
                                    setEditOrario(match.orario || '')
                                    setEditModalOpen(true)
                                  }
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
                                }}
                              >
                                <Edit2 size={14} />
                                Modifica
                              </button>
                            </>
                          )}
                        </>
                        )
                      })()}
                      {/* Pulsante Visualizza Tabellino */}
                      {(() => {
                        const match = finalMatches.find(m => m.finalType === '7-8')
                        return (match && (match.home_score != null || match.away_score != null)) && (
                          <button
                            title="Visualizza Tabellino"
                            onClick={() => {
                              if (match) {
                                setTabellinoMatchId(match.id)
                                loadTabellinoForMatch(match.id)
                                setTabellinoModalOpen(true)
                              }
                            }}
                            style={{
                              background:'#10b981',
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
                            <FileText size={14} />
                            Tabellino
                          </button>
                        )
                      })()}
                    </>
                  )}
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                <div style={{flex:1,padding:12,background:'#f8fafc',borderRadius:6,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:80}}>
                  {allPhasesCompleted && standingsA[3] ? (
                    standingsA[3].logo_url ? (
                      <img src={standingsA[3].logo_url} alt={standingsA[3].name} style={{width:50,height:50,objectFit:'contain'}} />
                    ) : (
                      <div style={{fontWeight:700,fontSize:15}}>{standingsA[3].name}</div>
                    )
                  ) : (
                    <div style={{fontWeight:700,fontSize:15,color:'#64748b'}}>4° Girone A</div>
                  )}
                  <div style={{fontSize:12,color:'#64748b',marginTop:4}}>Girone A</div>
                </div>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                  {(() => {
                    const match = finalMatches.find(m => m.finalType === '7-8')
                    if (match && match.home_score != null && match.away_score != null) {
                      return (
                        <div style={{fontWeight:700,fontSize:24,color:'#0f172a'}}>
                          {match.home_score} — {match.away_score}
                        </div>
                      )
                    }
                    return <div style={{fontWeight:700,fontSize:20,color:'#64748b'}}>VS</div>
                  })()}
                </div>
                <div style={{flex:1,padding:12,background:'#fef2f2',borderRadius:6,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:80}}>
                  {allPhasesCompleted && standingsB[3] ? (
                    standingsB[3].logo_url ? (
                      <img src={standingsB[3].logo_url} alt={standingsB[3].name} style={{width:50,height:50,objectFit:'contain'}} />
                    ) : (
                      <div style={{fontWeight:700,fontSize:15}}>{standingsB[3].name}</div>
                    )
                  ) : (
                    <div style={{fontWeight:700,fontSize:15,color:'#64748b'}}>4° Girone B</div>
                  )}
                  <div style={{fontSize:12,color:'#64748b',marginTop:4}}>Girone B</div>
                </div>
              </div>
              {(() => {
                const match = finalMatches.find(m => m.finalType === '7-8')
                const campo = match?.campo || 'MATTIOLI'
                const orarioDate = match?.orario ? new Date(match.orario) : new Date('2026-01-05T09:00:00')
                const dateStr = orarioDate.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
                const timeStr = orarioDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
                if (campo || dateStr || timeStr) {
                  return (
                    <div style={{display:'flex',gap:12,alignItems:'center',marginTop:12,color:'#475569',fontSize:13,flexWrap:'wrap',paddingTop:8,borderTop:'1px solid #e2e8f0'}}>
                      {campo && (
                        <div style={{display:'flex',alignItems:'center',gap:4}}>
                          <MapPin size={14} />
                          <span style={{textTransform:'uppercase',fontWeight:600}}>{campo}</span>
                        </div>
                      )}
                      {dateStr && (
                        <div style={{display:'flex',alignItems:'center',gap:4}}>
                          <Calendar size={14} />
                          <span>{dateStr}</span>
                        </div>
                      )}
                      {timeStr && (
                        <div style={{display:'flex',alignItems:'center',gap:4}}>
                          <Clock size={14} />
                          <span>{timeStr}</span>
                        </div>
                      )}
                    </div>
                  )
                }
                return null
              })()}
            </div>
          </div>

          {!allPhasesCompleted && (
            <div style={{marginTop:24,padding:16,background:'#fef3c7',border:'1px solid #fbbf24',borderRadius:8}}>
              <div style={{fontWeight:600,color:'#78350f',marginBottom:4}}>ℹ️ Nota</div>
              <div style={{fontSize:14,color:'#92400e'}}>
                Le squadre effettive verranno determinate al completamento di tutte le partite dei gironi.
              </div>
            </div>
          )}
        </section>
        )}

        {view === 'classifica' && (
        <section style={{marginTop:24}}>
          <h2 style={{fontSize:18,margin:0,marginBottom:16}}>Classifica Finale</h2>

          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.9rem'}}>
              <thead>
                <tr style={{background:'#f1f5f9',borderBottom:'2px solid #cbd5e1'}}>
                  <th style={{padding:'12px 8px',textAlign:'left',fontWeight:700}}>Pos</th>
                  <th style={{padding:'12px 8px',textAlign:'left',fontWeight:700}}>Squadra</th>
                  <th style={{padding:'12px 8px',textAlign:'center',fontWeight:700}}>Girone Orig.</th>
                  <th style={{padding:'12px 8px',textAlign:'center',fontWeight:700}}>Punti</th>
                  <th style={{padding:'12px 8px',textAlign:'center',fontWeight:700}}>V</th>
                  <th style={{padding:'12px 8px',textAlign:'center',fontWeight:700}}>PF</th>
                  <th style={{padding:'12px 8px',textAlign:'center',fontWeight:700}}>PS</th>
                  <th style={{padding:'12px 8px',textAlign:'center',fontWeight:700}}>Diff</th>
                </tr>
              </thead>
              <tbody>
                {finalRankings.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{padding:20,textAlign:'center',color:'#64748b'}}>
                      Nessun dato disponibile. Completa gli incroci finali per vedere la classifica.
                    </td>
                  </tr>
                ) : (
                  finalRankings.map((team, idx) => (
                    <tr 
                      key={team.id}
                      style={{
                        borderBottom:'1px solid #e2e8f0',
                        background: idx < 3 ? (idx === 0 ? '#fef3c7' : idx === 1 ? '#dbeafe' : '#fed7aa') : 'white'
                      }}
                    >
                      <td style={{padding:'12px 8px',fontWeight:700}}>{idx + 1}</td>
                      <td style={{padding:'12px 8px',fontWeight:600}}>{team.name}</td>
                      <td style={{padding:'12px 8px',textAlign:'center'}}>
                        <span style={{
                          background: team.girone === 'A' ? '#dbeafe' : '#fce7f3',
                          color: team.girone === 'A' ? '#1e40af' : '#be185d',
                          padding:'2px 8px',
                          borderRadius:4,
                          fontSize:13,
                          fontWeight:600
                        }}>
                          {team.girone}
                        </span>
                      </td>
                      <td style={{padding:'12px 8px',textAlign:'center',fontWeight:700}}>{team.points}</td>
                      <td style={{padding:'12px 8px',textAlign:'center'}}>{team.wins}</td>
                      <td style={{padding:'12px 8px',textAlign:'center'}}>{team.pts_for}</td>
                      <td style={{padding:'12px 8px',textAlign:'center'}}>{team.pts_against}</td>
                      <td style={{
                        padding:'12px 8px',
                        textAlign:'center',
                        fontWeight:600,
                        color: (team.pts_for - team.pts_against) > 0 ? '#059669' : (team.pts_for - team.pts_against) < 0 ? '#dc2626' : '#64748b'
                      }}>
                        {team.pts_for - team.pts_against > 0 ? '+' : ''}{team.pts_for - team.pts_against}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {finalRankings.length === 0 && (
            <div style={{marginTop:24,padding:16,background:'#fef3c7',border:'1px solid #fbbf24',borderRadius:8}}>
              <div style={{fontWeight:600,color:'#78350f',marginBottom:4}}>ℹ️ Nota</div>
              <div style={{fontSize:14,color:'#92400e'}}>
                La classifica finale verrà calcolata in base ai risultati degli incroci finali (Finale 1°/2° posto, Finale 3°/4° posto, Finale 5°/6° posto, Finale 7°/8° posto).
              </div>
            </div>
          )}
        </section>
        )}
        </>
      )}

      {/* Vote Dialog */}
      {selectedMatch && (
        <Suspense fallback={<div>Caricamento...</div>}>
          <LazyFinalVoteDialog
            open={voteModalOpen}
            onOpenChange={setVoteModalOpen}
            partitaId={selectedMatch.partitaId}
            squadraCasa={selectedMatch.squadraCasa}
            squadraOspite={selectedMatch.squadraOspite}
            finalType={selectedMatch.finalType}
          />
        </Suspense>
      )}

      {/* Live Scoring Modal */}
      <Dialog.Root open={liveModalOpen} onOpenChange={async (open) => {
        setLiveModalOpen(open)
        // Rimuovi flag is_live quando si chiude
        if (!open && liveMatchId) {
          await supabase.from('partite').update({ is_live: false }).eq('id', liveMatchId)
        }
      }}>
        <Dialog.Portal>
          <Dialog.Overlay style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:50}} />
          <Dialog.Content style={{
            position:'fixed',
            top:'50%',
            left:'50%',
            transform:'translate(-50%,-50%)',
            background:'white',
            padding:24,
            borderRadius:12,
            width:'90%',
            maxWidth:700,
            maxHeight:'90vh',
            overflow:'auto',
            zIndex:60
          }}>
            <Dialog.Title style={{fontSize:20,fontWeight:700,marginBottom:16}}>
              Rilevazione Punti Live - Finale
            </Dialog.Title>

            {loadingLive ? (
              <div style={{textAlign:'center',padding:40,color:'#64748b'}}>Caricamento atleti...</div>
            ) : (
              <>
                <div style={{marginBottom:20,padding:16,background:'#f0fdf4',border:'1px solid #86efac',borderRadius:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                    <div style={{fontSize:18,fontWeight:700,color:'#166534'}}>Punteggio Corrente</div>
                  </div>
                  <div style={{display:'flex',gap:16,fontSize:32,fontWeight:700,justifyContent:'center'}}>
                    <div style={{color:'#2563eb'}}>{homeTeamScore}</div>
                    <div style={{color:'#64748b'}}>-</div>
                    <div style={{color:'#ec4899'}}>{awayTeamScore}</div>
                  </div>
                </div>

                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
                  {/* Home Team */}
                  <div>
                    <h3 style={{fontSize:16,fontWeight:700,marginBottom:12,color:'#2563eb'}}>Squadra Casa</h3>
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      {homeAtleti.map(atleta => (
                        <div key={atleta.id} style={{padding:12,background:'#f8fafc',borderRadius:6,border:'1px solid #e2e8f0'}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                            <div>
                              <div style={{fontWeight:600,fontSize:14}}>#{atleta.numero_maglia} {atleta.cognome}</div>
                              <div style={{fontSize:12,color:'#64748b'}}>{atleta.nome}</div>
                            </div>
                            <div style={{fontSize:20,fontWeight:700,color:'#2563eb'}}>
                              {atletiPunti[atleta.id] || 0}
                            </div>
                          </div>
                          <div style={{display:'flex',gap:4}}>
                            {[1, 2, 3].map(pts => (
                              <button
                                key={pts}
                                onClick={() => handleAddPoint(atleta.id, pts)}
                                style={{
                                  flex:1,
                                  padding:'6px 8px',
                                  background:'#2563eb',
                                  color:'white',
                                  border:0,
                                  borderRadius:4,
                                  fontSize:13,
                                  fontWeight:600,
                                  cursor:'pointer'
                                }}
                              >
                                +{pts}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Away Team */}
                  <div>
                    <h3 style={{fontSize:16,fontWeight:700,marginBottom:12,color:'#ec4899'}}>Squadra Ospite</h3>
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      {awayAtleti.map(atleta => (
                        <div key={atleta.id} style={{padding:12,background:'#fef2f2',borderRadius:6,border:'1px solid #fecdd3'}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                            <div>
                              <div style={{fontWeight:600,fontSize:14}}>#{atleta.numero_maglia} {atleta.cognome}</div>
                              <div style={{fontSize:12,color:'#64748b'}}>{atleta.nome}</div>
                            </div>
                            <div style={{fontSize:20,fontWeight:700,color:'#ec4899'}}>
                              {atletiPunti[atleta.id] || 0}
                            </div>
                          </div>
                          <div style={{display:'flex',gap:4}}>
                            {[1, 2, 3].map(pts => (
                              <button
                                key={pts}
                                onClick={() => handleAddPoint(atleta.id, pts)}
                                style={{
                                  flex:1,
                                  padding:'6px 8px',
                                  background:'#ec4899',
                                  color:'white',
                                  border:0,
                                  borderRadius:4,
                                  fontSize:13,
                                  fontWeight:600,
                                  cursor:'pointer'
                                }}
                              >
                                +{pts}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {liveStatus && (
                  <div style={{padding:12,background:'#fef3c7',border:'1px solid #fbbf24',borderRadius:6,marginBottom:16,textAlign:'center'}}>
                    {liveStatus}
                  </div>
                )}

                <div style={{display:'flex',gap:12,justifyContent:'flex-end'}}>
                  <button
                    onClick={() => {
                      setLiveModalOpen(false)
                      setLiveStatus(null)
                    }}
                    style={{
                      padding:'10px 20px',
                      background:'#e2e8f0',
                      border:0,
                      borderRadius:6,
                      cursor:'pointer',
                      fontWeight:600
                    }}
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleFinishLiveScoring}
                    style={{
                      padding:'10px 20px',
                      background:'#10b981',
                      color:'white',
                      border:0,
                      borderRadius:6,
                      cursor:'pointer',
                      fontWeight:600
                    }}
                  >
                    Salva Punteggio
                  </button>
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Edit Match Modal */}
      <Dialog.Root open={editModalOpen} onOpenChange={setEditModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:50}} />
          <Dialog.Content style={{
            position:'fixed',
            top:'50%',
            left:'50%',
            transform:'translate(-50%,-50%)',
            background:'white',
            padding:24,
            borderRadius:12,
            width:'90%',
            maxWidth:500,
            zIndex:60
          }}>
            <Dialog.Title style={{fontSize:20,fontWeight:700,marginBottom:16}}>
              Modifica Punteggio Finale
            </Dialog.Title>

            <form onSubmit={handleEditMatch}>
              <div style={{marginBottom:16}}>
                <label style={{display:'block',marginBottom:8,fontWeight:600}}>Punteggio Casa</label>
                <input
                  type="number"
                  value={editHomeScore}
                  onChange={(e) => setEditHomeScore(e.target.value)}
                  placeholder="Punteggio casa"
                  style={{
                    width:'100%',
                    padding:10,
                    border:'1px solid #cbd5e1',
                    borderRadius:6,
                    fontSize:14
                  }}
                />
              </div>

              <div style={{marginBottom:16}}>
                <label style={{display:'block',marginBottom:8,fontWeight:600}}>Punteggio Ospite</label>
                <input
                  type="number"
                  value={editAwayScore}
                  onChange={(e) => setEditAwayScore(e.target.value)}
                  placeholder="Punteggio ospite"
                  style={{
                    width:'100%',
                    padding:10,
                    border:'1px solid #cbd5e1',
                    borderRadius:6,
                    fontSize:14
                  }}
                />
              </div>

              <div style={{marginBottom:16}}>
                <label style={{display:'block',marginBottom:8,fontWeight:600}}>Campo</label>
                <input
                  type="text"
                  value={editCampo}
                  onChange={(e) => setEditCampo(e.target.value)}
                  placeholder="Es: Palestra MORIGIA"
                  style={{
                    width:'100%',
                    padding:10,
                    border:'1px solid #cbd5e1',
                    borderRadius:6,
                    fontSize:14
                  }}
                />
              </div>

              <div style={{marginBottom:16}}>
                <label style={{display:'block',marginBottom:8,fontWeight:600}}>Orario</label>
                <input
                  type="datetime-local"
                  value={editOrario}
                  onChange={(e) => setEditOrario(e.target.value)}
                  style={{
                    width:'100%',
                    padding:10,
                    border:'1px solid #cbd5e1',
                    borderRadius:6,
                    fontSize:14
                  }}
                />
              </div>

              {editStatus && (
                <div style={{padding:12,background:'#fef3c7',border:'1px solid #fbbf24',borderRadius:6,marginBottom:16,textAlign:'center'}}>
                  {editStatus}
                </div>
              )}

              <div style={{display:'flex',gap:12,justifyContent:'flex-end'}}>
                <button
                  type="button"
                  onClick={() => {
                    setEditModalOpen(false)
                    setEditStatus(null)
                  }}
                  style={{
                    padding:'10px 20px',
                    background:'#e2e8f0',
                    border:0,
                    borderRadius:6,
                    cursor:'pointer',
                    fontWeight:600
                  }}
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  style={{
                    padding:'10px 20px',
                    background:'#3b82f6',
                    color:'white',
                    border:0,
                    borderRadius:6,
                    cursor:'pointer',
                    fontWeight:600
                  }}
                >
                  Salva
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Tabellino Modal (read-only) */}
      <Dialog.Root open={tabellinoModalOpen} onOpenChange={setTabellinoModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="rw-overlay" />
          <Dialog.Content className="rw-dialog" style={{maxWidth:'600px'}}>
            <Dialog.Title style={{fontSize: '1.05rem', fontWeight:700}}>
              Tabellino Finale
            </Dialog.Title>
            <Dialog.Description style={{fontSize: '0.9rem', color: '#64748b', marginTop: 8}}>
              Visualizza i punti degli atleti per questa partita
            </Dialog.Description>
            
            {loadingTabellino ? (
              <div style={{padding:20,textAlign:'center',color:'#64748b'}}>Caricamento...</div>
            ) : (
              <div style={{marginTop:16,display:'grid',gap:16}}>
                {/* Team selector */}
                {tabellinoSelectedTeam === '' && (
                  <>
                    <div>
                      <div style={{marginBottom:8,fontWeight:600}}>Seleziona squadra</div>
                      <select 
                        className="rw-input" 
                        value=""
                        onChange={async (e) => {
                          if (e.target.value === 'home' && tabellinoHomeTeam) {
                            setTabellinoSelectedTeam('home')
                            const match = finalMatches.find(m => m.id === tabellinoMatchId)
                            if (match) await loadTabellinoForTeam(match.home_team_id)
                          } else if (e.target.value === 'away' && tabellinoAwayTeam) {
                            setTabellinoSelectedTeam('away')
                            const match = finalMatches.find(m => m.id === tabellinoMatchId)
                            if (match) await loadTabellinoForTeam(match.away_team_id)
                          }
                        }}
                      >
                        <option value="">-- seleziona squadra --</option>
                        {tabellinoHomeTeam && <option value="home">{tabellinoHomeTeam.name}</option>}
                        {tabellinoAwayTeam && <option value="away">{tabellinoAwayTeam.name}</option>}
                      </select>
                    </div>
                  </>
                )}

                {/* Athletes list (read-only) */}
                {tabellinoSelectedTeam && tabellinoAtletiList.length > 0 && (
                  <div>
                    <div style={{marginBottom:12,fontWeight:600,fontSize:'1rem'}}>
                      Punti atleti — {tabellinoSelectedTeam === 'home' ? tabellinoHomeTeam?.name : tabellinoAwayTeam?.name}
                    </div>
                    <div style={{display:'grid',gap:8,maxHeight:'400px',overflowY:'auto'}}>
                      {tabellinoAtletiList.map((atleta) => (
                        <div key={atleta.id} style={{
                          display:'flex',
                          alignItems:'center',
                          justifyContent:'space-between',
                          padding:'8px 12px',
                          background:'#f8fafc',
                          borderRadius:8,
                          border:'1px solid #e2e8f0'
                        }}>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
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
                          </div>
                          <div style={{
                            fontWeight:700,
                            fontSize:16,
                            color:'#3b82f6',
                            minWidth:40,
                            textAlign:'center'
                          }}>
                            {atleta.punti}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{
                      marginTop:16,
                      padding:'12px 16px',
                      background:'#f1f5f9',
                      borderRadius:8,
                      display:'flex',
                      justifyContent:'space-between',
                      alignItems:'center',
                      fontWeight:700,
                      fontSize:'1.1rem'
                    }}>
                      <span>Totale</span>
                      <span style={{color:'#3b82f6'}}>
                        {tabellinoAtletiList.reduce((sum, a) => sum + a.punti, 0)}
                      </span>
                    </div>
                  </div>
                )}

                <div style={{display:'flex',justifyContent:'space-between',gap:8,marginTop:12}}>
                  {tabellinoSelectedTeam && (
                    <button 
                      type="button" 
                      className="btn secondary"
                      onClick={() => {
                        setTabellinoSelectedTeam('')
                        setTabellinoAtletiList([])
                      }}
                    >
                      ← Cambia squadra
                    </button>
                  )}
                  <Dialog.Close asChild>
                    <button type="button" className="btn">
                      Chiudi
                    </button>
                  </Dialog.Close>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  )
}
