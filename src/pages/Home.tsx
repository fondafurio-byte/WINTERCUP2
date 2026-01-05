import React, { useState, useEffect, Suspense } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { supabase } from '../lib/supabase'
import { Info, Users, Trophy, LogIn, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLoggedInTeam } from '../lib/useLoggedInTeam'

const LazyTeamLoginDialog = React.lazy(() => import('../components/TeamLoginDialog'))

type Team = {
  id: string
  name: string
  girone: string
  logo_url?: string | null
  team_photo_url?: string | null
}

type Athlete = {
  id: string
  nome: string
  cognome: string
  numero_maglia: string
}

type Staff = {
  id: string
  nome: string
  cognome: string
  ruolo: string
}

type Standing = {
  id: string
  name: string
  girone: string
  logo_url?: string | null
  wins: number
  losses: number
  pts_for: number
  pts_against: number
  points: number
  games: number
}

// Team Photos Carousel Component
function TeamPhotosCarousel({ teams, color }: { teams: Team[], color: string }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)

  const teamsWithPhotos = teams.filter(t => t.team_photo_url)

  if (teamsWithPhotos.length === 0) return null

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % teamsWithPhotos.length)
  }

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + teamsWithPhotos.length) % teamsWithPhotos.length)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      // Swipe left - next photo
      goToNext()
    }

    if (touchStart - touchEnd < -75) {
      // Swipe right - prev photo
      goToPrev()
    }
  }

  const currentTeam = teamsWithPhotos[currentIndex]

  return (
    <div style={{ position: 'relative', marginBottom: 24 }}>
      {/* Previous button */}
      {teamsWithPhotos.length > 1 && (
        <button
          onClick={goToPrev}
          style={{
            position: 'absolute',
            left: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            background: 'white',
            border: `2px solid ${color}`,
            borderRadius: '50%',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}
        >
          <ChevronLeft size={24} color={color} />
        </button>
      )}

      {/* Photo container */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '8px 0',
          userSelect: 'none'
        }}
      >
        <div
          style={{
            maxWidth: 600,
            width: '100%',
            borderRadius: 12,
            overflow: 'hidden',
            border: `3px solid ${color}`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            transition: 'opacity 0.3s ease'
          }}
        >
          <img
            src={currentTeam.team_photo_url!}
            alt={`${currentTeam.name} team photo`}
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: 400,
              objectFit: 'contain',
              display: 'block'
            }}
          />
          <div style={{
            padding: 16,
            background: 'white',
            textAlign: 'center',
            fontWeight: 700,
            fontSize: '1.1rem',
            color: '#1e293b'
          }}>
            {currentTeam.name}
          </div>
        </div>
      </div>

      {/* Next button */}
      {teamsWithPhotos.length > 1 && (
        <button
          onClick={goToNext}
          style={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            background: 'white',
            border: `2px solid ${color}`,
            borderRadius: '50%',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}
        >
          <ChevronRight size={24} color={color} />
        </button>
      )}

      {/* Dots indicator */}
      {teamsWithPhotos.length > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
          marginTop: 12
        }}>
          {teamsWithPhotos.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                border: 'none',
                background: index === currentIndex ? color : '#cbd5e1',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.3s ease'
              }}
              aria-label={`Go to photo ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [athletesModalOpen, setAthletesModalOpen] = useState(false)
  const [infoModalOpen, setInfoModalOpen] = useState(false)
  const [standingsModalOpen, setStandingsModalOpen] = useState(false)
  const [standingsA, setStandingsA] = useState<Standing[]>([])
  const [standingsB, setStandingsB] = useState<Standing[]>([])
  const [showTeamLogin, setShowTeamLogin] = useState(false)
  const [mvpInfoModalOpen, setMvpInfoModalOpen] = useState(false)
  const [mvpDetailsModalOpen, setMvpDetailsModalOpen] = useState(false)
  const [mvpListModalOpen, setMvpListModalOpen] = useState(false)
  const [scorerDetailsModalOpen, setScorerDetailsModalOpen] = useState(false)
  const [scorerListModalOpen, setScorerListModalOpen] = useState(false)
  const [selectedScorer, setSelectedScorer] = useState<{
    nome: string
    cognome: string
    numero_maglia: string
    squadra_nome: string
    logo_url: string | null
    totalPoints: number
    matches: Array<{
      partita_id: string
      opponent_team: string
      punti: number
      data: string
    }>
  } | null>(null)
  const [loadingScorerDetails, setLoadingScorerDetails] = useState(false)
  const [allScorers, setAllScorers] = useState<Array<{
    id: string
    nome: string
    cognome: string
    numero_maglia: string
    squadra_nome: string
    logo_url: string | null
    totalPoints: number
  }>>([])
  const [loadingAllScorers, setLoadingAllScorers] = useState(false)
  const [allMVPs, setAllMVPs] = useState<Array<{
    id: string
    nome: string
    cognome: string
    numero_maglia: string
    squadra_nome: string
    logo_url: string | null
    voteCount: number
  }>>([])
  const [loadingAllMVPs, setLoadingAllMVPs] = useState(false)
  const [selectedMVP, setSelectedMVP] = useState<{
    nome: string
    cognome: string
    numero_maglia: string
    squadra_nome: string
    squadra_id?: string
    logo_url: string | null
    voteCount: number
  } | null>(null)
  const [topScorers, setTopScorers] = useState<Array<{
    id: string
    nome: string
    cognome: string
    numero_maglia: string
    totalPoints: number
    squadra_nome: string
    logo_url: string | null
  }>>([])
  const [topMVPs, setTopMVPs] = useState<Array<{
    id: string
    nome: string
    cognome: string
    numero_maglia: string
    squadra_id: string
    squadra_nome: string
    logo_url: string | null
    voteCount: number
  }>>([])

  const { loggedInTeamId } = useLoggedInTeam()

  // Helper function to get team color (red if logged in team)
  function getTeamNameColor(teamId: string | undefined): string {
    if (loggedInTeamId && teamId === loggedInTeamId) {
      return '#dc2626' // Red for logged in team
    }
    return '#64748b' // Default gray color
  }

  useEffect(() => {
    loadTeams()
    loadStandings()
    loadTopScorers()
    loadTopMVPs()
  }, [])

  function openMVPDetails(mvp: typeof topMVPs[0]) {
    setSelectedMVP({
      nome: mvp.nome,
      cognome: mvp.cognome,
      numero_maglia: mvp.numero_maglia,
      squadra_nome: mvp.squadra_nome,
      squadra_id: mvp.squadra_id,
      logo_url: mvp.logo_url,
      voteCount: mvp.voteCount
    })
    setMvpDetailsModalOpen(true)
  }

  async function loadAllMVPs() {
    setLoadingAllMVPs(true)
    try {
      // Carica tutti i voti
      const { data: votesData, error: votesError } = await supabase
        .from('votes')
        .select('atleta_id, vote_type')

      if (votesError || !votesData || votesData.length === 0) {
        console.error('Error loading all votes:', votesError)
        setLoadingAllMVPs(false)
        return
      }

      // Raggruppa per atleta - conta solo voti team
      const voteStats: Record<string, number> = {}
      votesData.forEach((vote: any) => {
        const atletaId = vote.atleta_id
        if (vote.vote_type === 'team') {
          voteStats[atletaId] = (voteStats[atletaId] || 0) + 1
        }
      })

      // Ottieni ID atleti con voti
      const athleteIds = Object.keys(voteStats)

      if (athleteIds.length === 0) {
        setAllMVPs([])
        setLoadingAllMVPs(false)
        return
      }

      // Carica dettagli atleti
      const { data: athletesData, error: athletesError } = await supabase
        .from('atleti')
        .select('id, nome, cognome, numero_maglia, squadra_id, squadre!inner(name, logo_url)')
        .in('id', athleteIds)

      if (athletesError || !athletesData) {
        console.error('Error loading all MVP athletes:', athletesError)
        setLoadingAllMVPs(false)
        return
      }

      // Combina dati
      const allMVPsList = athletesData.map((athlete: any) => ({
        id: athlete.id,
        nome: athlete.nome,
        cognome: athlete.cognome,
        numero_maglia: athlete.numero_maglia,
        squadra_nome: athlete.squadre.name,
        logo_url: athlete.squadre.logo_url,
        voteCount: voteStats[athlete.id] || 0
      }))

      // Ordina per voti
      allMVPsList.sort((a, b) => b.voteCount - a.voteCount)

      setAllMVPs(allMVPsList)
    } catch (err) {
      console.error('Error loading all MVPs:', err)
    } finally {
      setLoadingAllMVPs(false)
    }
  }

  function openAllMVPsList() {
    loadAllMVPs()
    setMvpListModalOpen(true)
  }

  async function openScorerDetails(scorer: typeof topScorers[0]) {
    setLoadingScorerDetails(true)
    setScorerDetailsModalOpen(true)
    
    try {
      // Query ottimizzata: una singola chiamata con join per ottenere tutti i dati necessari
      const [pointsResult, athleteResult] = await Promise.all([
        supabase
          .from('punti_atleti')
          .select(`
            partita_id,
            punti,
            partite!inner(
              id,
              orario,
              home_team_id,
              away_team_id,
              home_team:squadre!partite_home_team_id_fkey(name),
              away_team:squadre!partite_away_team_id_fkey(name)
            )
          `)
          .eq('atleta_id', scorer.id),
        supabase
          .from('atleti')
          .select('squadra_id')
          .eq('id', scorer.id)
          .single()
      ])

      if (pointsResult.error || athleteResult.error) {
        console.error('Error loading scorer details:', pointsResult.error || athleteResult.error)
        setSelectedScorer({
          nome: scorer.nome,
          cognome: scorer.cognome,
          numero_maglia: scorer.numero_maglia,
          squadra_nome: scorer.squadra_nome,
          logo_url: scorer.logo_url,
          totalPoints: scorer.totalPoints,
          matches: []
        })
        setLoadingScorerDetails(false)
        return
      }

      if (!pointsResult.data || pointsResult.data.length === 0) {
        setSelectedScorer({
          nome: scorer.nome,
          cognome: scorer.cognome,
          numero_maglia: scorer.numero_maglia,
          squadra_nome: scorer.squadra_nome,
          logo_url: scorer.logo_url,
          totalPoints: scorer.totalPoints,
          matches: []
        })
        setLoadingScorerDetails(false)
        return
      }

      const playerTeamId = athleteResult.data?.squadra_id

      // Raggruppa punti per partita e costruisci lista
      const matchesMap = new Map<string, { opponent_team: string, punti: number, data: string }>()
      
      pointsResult.data.forEach((point: any) => {
        const match = point.partite
        const matchId = match.id
        
        // Determina squadra avversaria
        const isHome = match.home_team_id === playerTeamId
        const opponentTeam = isHome ? match.away_team.name : match.home_team.name
        
        // Aggrega punti per partita
        if (matchesMap.has(matchId)) {
          matchesMap.get(matchId)!.punti += point.punti
        } else {
          matchesMap.set(matchId, {
            opponent_team: opponentTeam,
            punti: point.punti,
            data: match.orario
          })
        }
      })

      // Converti in array e ordina per data
      const matches = Array.from(matchesMap.entries()).map(([partita_id, data]) => ({
        partita_id,
        ...data
      }))

      matches.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())

      setSelectedScorer({
        nome: scorer.nome,
        cognome: scorer.cognome,
        numero_maglia: scorer.numero_maglia,
        squadra_nome: scorer.squadra_nome,
        logo_url: scorer.logo_url,
        totalPoints: scorer.totalPoints,
        matches
      })
    } catch (err) {
      console.error('Error in openScorerDetails:', err)
      setSelectedScorer({
        nome: scorer.nome,
        cognome: scorer.cognome,
        numero_maglia: scorer.numero_maglia,
        squadra_nome: scorer.squadra_nome,
        logo_url: scorer.logo_url,
        totalPoints: scorer.totalPoints,
        matches: []
      })
    } finally {
      setLoadingScorerDetails(false)
    }
  }

  async function loadTopScorers() {
    try {
      // Get all points
      const pointsRes = await supabase.from('punti_atleti').select('atleta_id, punti')

      console.log('Points data:', { 
        pointsData: pointsRes.data, 
        pointsError: pointsRes.error,
        isArray: Array.isArray(pointsRes.data),
        length: pointsRes.data?.length,
        firstItem: pointsRes.data?.[0]
      })

      if (pointsRes.error) {
        console.error('Error loading points:', pointsRes.error)
        return
      }

      if (!pointsRes.data || pointsRes.data.length === 0) {
        console.log('No points data found - table is empty')
        return
      }

      // Group by athlete and sum points
      const athletePointsMap: Record<string, number> = {}
      pointsRes.data.forEach((point: any) => {
        const athleteId = point.atleta_id
        athletePointsMap[athleteId] = (athletePointsMap[athleteId] || 0) + point.punti
      })

      // Get unique athlete IDs with points
      const athleteIds = Object.keys(athletePointsMap)

      // Load athlete details
      const { data: athletesData, error: athletesError } = await supabase
        .from('atleti')
        .select('id, nome, cognome, numero_maglia, squadra_id, squadre!inner(name, logo_url)')
        .in('id', athleteIds)

      console.log('Athletes data:', { athletesData, athletesError })

      if (athletesError || !athletesData) {
        console.error('Error loading athletes:', athletesError)
        return
      }

      // Combine data
      const scorers = athletesData.map((athlete: any) => ({
        id: athlete.id,
        nome: athlete.nome,
        cognome: athlete.cognome,
        numero_maglia: athlete.numero_maglia,
        squadra_nome: athlete.squadre.name,
        logo_url: athlete.squadre.logo_url,
        totalPoints: athletePointsMap[athlete.id]
      }))

      // Sort by points and take top 3
      const topThree = scorers
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .slice(0, 3)

      console.log('Top scorers:', topThree)
      setTopScorers(topThree)
    } catch (err) {
      console.error('Error loading top scorers:', err)
    }
  }

  async function loadAllScorers() {
    setLoadingAllScorers(true)
    try {
      // Get all points
      const { data: pointsData, error: pointsError } = await supabase
        .from('punti_atleti')
        .select('atleta_id, punti')

      if (pointsError || !pointsData || pointsData.length === 0) {
        console.log('No points data for all scorers')
        setAllScorers([])
        setLoadingAllScorers(false)
        return
      }

      // Group by athlete and sum points
      const athletePointsMap: Record<string, number> = {}
      pointsData.forEach((point: any) => {
        const athleteId = point.atleta_id
        athletePointsMap[athleteId] = (athletePointsMap[athleteId] || 0) + point.punti
      })

      // Get unique athlete IDs with points
      const athleteIds = Object.keys(athletePointsMap)

      // Load athlete details
      const { data: athletesData, error: athletesError } = await supabase
        .from('atleti')
        .select('id, nome, cognome, numero_maglia, squadra_id, squadre!inner(name, logo_url)')
        .in('id', athleteIds)

      if (athletesError || !athletesData) {
        console.error('Error loading all scorers:', athletesError)
        setAllScorers([])
        setLoadingAllScorers(false)
        return
      }

      // Combine data
      const scorers = athletesData.map((athlete: any) => ({
        id: athlete.id,
        nome: athlete.nome,
        cognome: athlete.cognome,
        numero_maglia: athlete.numero_maglia,
        squadra_nome: athlete.squadre.name,
        logo_url: athlete.squadre.logo_url,
        totalPoints: athletePointsMap[athlete.id]
      }))

      // Sort by points (highest first)
      const sortedScorers = scorers.sort((a, b) => b.totalPoints - a.totalPoints)

      setAllScorers(sortedScorers)
    } catch (err) {
      console.error('Error loading all scorers:', err)
      setAllScorers([])
    } finally {
      setLoadingAllScorers(false)
    }
  }

  async function loadTopMVPs() {
    try {
      // Get all votes
      const votesRes = await supabase.from('votes').select('atleta_id, vote_type')

      if (votesRes.error || !votesRes.data || votesRes.data.length === 0) {
        console.log('No votes data found')
        return
      }

      // Calculate vote counts - only team votes
      const voteStats: Record<string, number> = {}
      
      votesRes.data.forEach((vote: any) => {
        if (vote.vote_type === 'team') {
          voteStats[vote.atleta_id] = (voteStats[vote.atleta_id] || 0) + 1
        }
      })

      // Get athlete IDs with votes
      const athleteIds = Object.keys(voteStats)

      // Load athlete details
      const { data: athletesData, error: athletesError } = await supabase
        .from('atleti')
        .select('id, nome, cognome, numero_maglia, squadra_id, squadre!inner(name, logo_url)')
        .in('id', athleteIds)

      if (athletesError || !athletesData) {
        console.error('Error loading MVP athletes:', athletesError)
        return
      }

      // Combine data
      const mvps = athletesData.map((athlete: any) => ({
        id: athlete.id,
        nome: athlete.nome,
        cognome: athlete.cognome,
        numero_maglia: athlete.numero_maglia,
        squadra_id: athlete.squadra_id,
        squadra_nome: athlete.squadre.name,
        logo_url: athlete.squadre.logo_url,
        voteCount: voteStats[athlete.id] || 0
      }))

      // Sort by vote count and take top 3
      const topThree = mvps
        .sort((a, b) => b.voteCount - a.voteCount)
        .slice(0, 3)

      console.log('Top MVPs:', topThree)
      setTopMVPs(topThree)
    } catch (err) {
      console.error('Error loading top MVPs:', err)
    }
  }

  async function loadTeams() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('squadre')
        .select('id, name, girone, logo_url, team_photo_url')
        .order('girone')
        .order('name')

      if (error) {
        console.error('Error loading teams:', error)
      } else {
        setTeams(data || [])
      }
    } catch (err) {
      console.error('Error:', err)
    }
    setLoading(false)
  }

  async function loadStandings() {
    try {
      const { data: teamsData } = await supabase
        .from('squadre')
        .select('id, name, girone, logo_url')
        .order('name')

      const { data: matchesData } = await supabase
        .from('partite')
        .select('id, home_team_id, away_team_id, home_score, away_score, girone, fase')
        .in('fase', ['1', '2'])

      if (!teamsData || !matchesData) return

      const calculateStandings = (gironeTeams: Team[], matches: any[]) => {
        const map: Record<string, Standing> = {}

        gironeTeams.forEach(t => {
          map[t.id] = {
            id: t.id,
            name: t.name,
            girone: t.girone,
            logo_url: t.logo_url,
            wins: 0,
            losses: 0,
            pts_for: 0,
            pts_against: 0,
            points: 0,
            games: 0
          }
        })

        matches.forEach(m => {
          if (m.home_score == null || m.away_score == null) return
          const hs = m.home_score
          const as = m.away_score

          if (map[m.home_team_id]) {
            map[m.home_team_id].pts_for += hs
            map[m.home_team_id].pts_against += as
            map[m.home_team_id].games += 1
            if (hs > as) {
              map[m.home_team_id].wins += 1
              map[m.home_team_id].points += 2
            } else if (hs < as) {
              map[m.home_team_id].losses += 1
            }
          }

          if (map[m.away_team_id]) {
            map[m.away_team_id].pts_for += as
            map[m.away_team_id].pts_against += hs
            map[m.away_team_id].games += 1
            if (as > hs) {
              map[m.away_team_id].wins += 1
              map[m.away_team_id].points += 2
            } else if (as < hs) {
              map[m.away_team_id].losses += 1
            }
          }
        })

        return Object.values(map).sort((a, b) => {
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
              const hs = m.home_score ?? 0
              const as = m.away_score ?? 0
              if (m.home_score != null && m.away_score != null) {
                if (m.home_team_id === a.id) {
                  if (hs > as) aDirectPoints += 2
                  if (hs < as) bDirectPoints += 2
                } else {
                  if (as > hs) aDirectPoints += 2
                  if (as < hs) bDirectPoints += 2
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
          return b.pts_for - a.pts_for
        })
      }

      const teamsA = teamsData.filter(t => t.girone === 'A')
      const teamsB = teamsData.filter(t => t.girone === 'B')
      const matchesA = matchesData.filter(m => m.girone === 'A')
      const matchesB = matchesData.filter(m => m.girone === 'B')

      setStandingsA(calculateStandings(teamsA, matchesA))
      setStandingsB(calculateStandings(teamsB, matchesB))
    } catch (err) {
      console.error('Error loading standings:', err)
    }
  }

  async function handleTeamClick(team: Team) {
    setSelectedTeam(team)
    try {
      const [athletesRes, staffRes, votesRes, pointsRes] = await Promise.all([
        supabase
          .from('atleti')
          .select('id, nome, cognome, numero_maglia')
          .eq('squadra_id', team.id)
          .order('numero_maglia'),
        supabase
          .from('staff')
          .select('id, nome, cognome, ruolo')
          .eq('squadra_id', team.id),
        supabase
          .from('votes')
          .select('atleta_id, vote_type'),
        supabase
          .from('punti_atleti')
          .select('atleta_id, punti')
      ])

      if (athletesRes.error) {
        console.error('Error loading athletes:', athletesRes.error)
      } else {
        // Calculate vote counts - only team votes (100%)
        const voteStats: Record<string, number> = {}
        
        if (votesRes.data) {
          votesRes.data.forEach((vote: any) => {
            if (vote.vote_type === 'team') {
              voteStats[vote.atleta_id] = (voteStats[vote.atleta_id] || 0) + 1
            }
          })
        }

        // Sum points for each athlete
        const pointTotals: Record<string, number> = {}
        if (pointsRes.data) {
          pointsRes.data.forEach((point: any) => {
            pointTotals[point.atleta_id] = (pointTotals[point.atleta_id] || 0) + point.punti
          })
        }

        // Add vote stats and points to each athlete
        const athletesWithStats = (athletesRes.data || []).map(athlete => ({
          ...athlete,
          voteCount: voteStats[athlete.id] || 0,
          totalPoints: pointTotals[athlete.id] || 0
        }))

        const sorted = [...athletesWithStats].sort((a, b) => {
          const numA = parseInt(a.numero_maglia, 10)
          const numB = parseInt(b.numero_maglia, 10)
          if (isNaN(numA) && isNaN(numB)) return a.numero_maglia.localeCompare(b.numero_maglia)
          if (isNaN(numA)) return 1
          if (isNaN(numB)) return -1
          return numA - numB
        })
        setAthletes(sorted as any)
      }

      if (staffRes.error) {
        console.error('Error loading staff:', staffRes.error)
      } else {
        const staffOrder = { 'Head Coach': 1, 'Assistente': 2, 'Accompagnatore': 3, 'Istruttore 1': 1, 'Istruttore 2': 2 }
        const sorted = [...(staffRes.data || [])].sort((a, b) => {
          return (staffOrder[a.ruolo as keyof typeof staffOrder] || 999) - (staffOrder[b.ruolo as keyof typeof staffOrder] || 999)
        })
        setStaff(sorted)
      }
    } catch (err) {
      console.error('Error:', err)
    }
    setAthletesModalOpen(true)
  }

  const gironiA = teams.filter(t => t.girone === 'A')
  const gironiB = teams.filter(t => t.girone === 'B')

  return (
    <main style={{ padding: '20px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 900, marginBottom: 8, color: '#1e293b', whiteSpace: 'nowrap' }}>
          Winter Cup 2° Edizione
        </h1>
      </div>

      {/* Action Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
        <button
          onClick={() => setInfoModalOpen(true)}
          style={{
            background: 'linear-gradient(135deg, #5cd4ff 0%, #0c6b94 100%)',
            border: 'none',
            borderRadius: 12,
            padding: 24,
            cursor: 'pointer',
            color: 'white',
            textAlign: 'left',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}
        >
          <Info size={32} style={{ marginBottom: 12 }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>Info Torneo</h3>
          <p style={{ fontSize: '0.9rem', opacity: 0.9 }}>Formula, regolamento e logica del torneo</p>
        </button>

        <button
          onClick={() => setStandingsModalOpen(true)}
          style={{
            background: 'linear-gradient(135deg, #b8160f 0%, #3d0705 100%)',
            border: 'none',
            borderRadius: 12,
            padding: 24,
            cursor: 'pointer',
            color: 'white',
            textAlign: 'left',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}
        >
          <Trophy size={32} style={{ marginBottom: 12 }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>Classifiche</h3>
          <p style={{ fontSize: '0.9rem', opacity: 0.9 }}>Visualizza le classifiche dei gironi</p>
        </button>

        <button
          onClick={() => setShowTeamLogin(true)}
          style={{
            background: 'linear-gradient(135deg, #d9d9d9 0%, #5c5c5c 100%)',
            border: 'none',
            borderRadius: 12,
            padding: 24,
            cursor: 'pointer',
            color: 'white',
            textAlign: 'left',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}
        >
          <LogIn size={32} style={{ marginBottom: 12 }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>Login</h3>
          <p style={{ fontSize: '0.9rem', opacity: 0.9 }}>Accedi o registrati</p>
        </button>
      </div>

      {/* Teams Grid */}
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 16, color: '#1e293b' }}>
        <Users size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />
        Squadre Partecipanti
      </h2>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Caricamento squadre...</div>
      ) : (
        <>
          {/* Girone A */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 16, color: '#17b3ff' }}>
              Girone A
            </h3>
            
            {/* Team Photos Carousel for Girone A */}
            <TeamPhotosCarousel teams={gironiA} color="#17b3ff" />
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {gironiA.map(team => (
                <button
                  key={team.id}
                  onClick={() => handleTeamClick(team)}
                  style={{
                    background: 'linear-gradient(135deg, #e0f4ff 0%, #b8e6ff 100%)',
                    border: '2px solid #17b3ff',
                    borderRadius: 12,
                    padding: 20,
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#17b3ff'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(23,179,255,0.3)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#17b3ff'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                >
                  {team.logo_url && (
                    <img
                      src={team.logo_url}
                      alt={team.name}
                      style={{ width: 60, height: 60, objectFit: 'contain', marginBottom: 12 }}
                    />
                  )}
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>{team.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Girone B */}
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 16, color: '#b8160f' }}>
              Girone B
            </h3>
            
            {/* Team Photos Carousel for Girone B */}
            <TeamPhotosCarousel teams={gironiB} color="#b8160f" />
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {gironiB.map(team => (
                <button
                  key={team.id}
                  onClick={() => handleTeamClick(team)}
                  style={{
                    background: 'linear-gradient(135deg, #fde8e7 0%, #fbb8b4 100%)',
                    border: '2px solid #b8160f',
                    borderRadius: 12,
                    padding: 20,
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#b8160f'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(184,22,15,0.3)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#b8160f'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                >
                  {team.logo_url && (
                    <img
                      src={team.logo_url}
                      alt={team.name}
                      style={{ width: 60, height: 60, objectFit: 'contain', marginBottom: 12 }}
                    />
                  )}
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>{team.name}</div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Top 3 Scorers Section */}
      {topScorers.length > 0 && (
        <div style={{ background: 'white', borderRadius: 16, padding: 24, marginBottom: 32, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              🏀 Top 3 Realizzatori
            </h2>
            <button
              onClick={() => {
                loadAllScorers()
                setScorerListModalOpen(true)
              }}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                borderRadius: 8,
                padding: '6px 12px',
                cursor: 'pointer',
                color: 'white',
                fontSize: '0.8rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <Users size={14} />
              Lista Completa
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 12 }}>
            {topScorers.map((scorer, index) => (
              <button
                key={scorer.id}
                onClick={() => openScorerDetails(scorer)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 16,
                  background: index === 0 ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : index === 1 ? 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)' : 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)',
                  borderRadius: 12,
                  border: index === 0 ? '2px solid #f59e0b' : index === 1 ? '2px solid #9ca3af' : '2px solid #f97316',
                  position: 'relative',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: index === 0 ? '#f59e0b' : index === 1 ? '#6b7280' : '#f97316',
                  minWidth: 32,
                  textAlign: 'center'
                }}>
                  {index + 1}
                </div>
                {scorer.logo_url && (
                  <img 
                    src={scorer.logo_url} 
                    alt={scorer.squadra_nome}
                    style={{ width: 32, height: 32, objectFit: 'contain' }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>
                    #{scorer.numero_maglia} {scorer.nome} {scorer.cognome}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {scorer.squadra_nome}
                  </div>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 700,
                  minWidth: 50,
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  🏀 {scorer.totalPoints}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Top 3 MVP Section */}
      {topMVPs.length > 0 && (
        <div style={{ background: 'white', borderRadius: 16, padding: 24, marginBottom: 32, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              🏆 MVP
            </h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => openAllMVPsList()}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  borderRadius: 8,
                  padding: '6px 12px',
                  cursor: 'pointer',
                  color: 'white',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <Users size={14} />
                Lista Completa
              </button>
              <button
                onClick={() => setMvpInfoModalOpen(true)}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: 8,
                  padding: '6px 12px',
                  cursor: 'pointer',
                  color: 'white',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <Info size={14} />
                Info
              </button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 12 }}>
            {topMVPs.map((mvp, index) => (
              <button
                key={mvp.id}
                onClick={() => openMVPDetails(mvp)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 16,
                  background: index === 0 ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : index === 1 ? 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)' : 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)',
                  borderRadius: 12,
                  border: index === 0 ? '2px solid #f59e0b' : index === 1 ? '2px solid #9ca3af' : '2px solid #f97316',
                  position: 'relative',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: index === 0 ? '#f59e0b' : index === 1 ? '#6b7280' : '#f97316',
                  minWidth: 32,
                  textAlign: 'center'
                }}>
                  {index + 1}
                </div>
                {mvp.logo_url && (
                  <img 
                    src={mvp.logo_url} 
                    alt={mvp.squadra_nome}
                    style={{ width: 32, height: 32, objectFit: 'contain' }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>
                    #{mvp.numero_maglia} {mvp.nome} {mvp.cognome}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: getTeamNameColor(mvp.squadra_id) }}>
                    {mvp.squadra_nome}
                  </div>
                </div>
                <div 
                  style={{
                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: 12,
                    fontSize: 16,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'help'
                  }}
                  title={`Voti MVP: ${mvp.voteCount}`}
                >
                  🏆 {mvp.voteCount}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Athletes Modal */}
      <Dialog.Root open={athletesModalOpen} onOpenChange={setAthletesModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="rw-overlay" />
          <Dialog.Content className="rw-dialog" style={{ maxWidth: 500, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <Dialog.Title style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 16, flexShrink: 0 }}>
              {selectedTeam?.logo_url && (
                <img
                  src={selectedTeam.logo_url}
                  alt={selectedTeam.name}
                  style={{ width: 40, height: 40, objectFit: 'contain', verticalAlign: 'middle', marginRight: 12 }}
                />
              )}
              {selectedTeam?.name}
            </Dialog.Title>
            <div style={{ marginBottom: 20, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', paddingRight: 4 }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748b', marginBottom: 12, flexShrink: 0 }}>
                ATLETI ({athletes.length})
              </h4>
              {athletes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>
                  Nessun atleta registrato
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                  {athletes.map((athlete: any) => (
                    <div
                      key={athlete.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: 12,
                        background: '#f8fafc',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        flexShrink: 0
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 14,
                          color: '#64748b',
                          minWidth: 36,
                          textAlign: 'center',
                          background: 'white',
                          padding: '4px 8px',
                          borderRadius: 4
                        }}
                      >
                        #{athlete.numero_maglia}
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 600, flex: 1 }}>
                        {athlete.nome} {athlete.cognome}
                      </span>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {athlete.totalPoints > 0 && (
                          <span
                            style={{
                              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                              color: 'white',
                              padding: '4px 10px',
                              borderRadius: 12,
                              fontSize: 13,
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            🏀 {athlete.totalPoints}
                          </span>
                        )}
                        {athlete.voteCount > 0 && (
                          <span
                            style={{
                              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                              color: 'white',
                              padding: '4px 10px',
                              borderRadius: 12,
                              fontSize: 13,
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                            title={`Voti MVP: ${athlete.voteCount}`}
                          >
                            🏆 {athlete.voteCount}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Staff Section */}
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748b', marginBottom: 12, flexShrink: 0 }}>
                STAFF ({staff.length})
              </h4>
              {staff.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>
                  Nessun membro dello staff registrato
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {staff.map(member => {
                    const roleDisplay = member.ruolo === 'Istruttore 1' ? 'Head Coach' : member.ruolo === 'Istruttore 2' ? 'Assistente' : member.ruolo
                    return (
                      <div
                        key={member.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: 12,
                          background: '#fef3c7',
                          borderRadius: 8,
                          border: '1px solid #fde68a',
                          flexShrink: 0
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: 13,
                            color: '#92400e',
                            minWidth: 100,
                            textAlign: 'center',
                            background: 'white',
                            padding: '4px 8px',
                            borderRadius: 4
                          }}
                        >
                          {roleDisplay}
                        </span>
                        <span style={{ fontSize: 15, fontWeight: 600 }}>
                          {member.nome} {member.cognome}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <Dialog.Close asChild>
              <button type="button" className="btn" style={{ flexShrink: 0 }}>Chiudi</button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Info Modal */}
      <Dialog.Root open={infoModalOpen} onOpenChange={setInfoModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="rw-overlay" />
          <Dialog.Content className="rw-dialog" style={{ maxWidth: 600, maxHeight: '85vh', overflow: 'auto' }}>
            <Dialog.Title style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 20 }}>
              ℹ️ Informazioni Torneo
            </Dialog.Title>
            
            <div style={{ lineHeight: 1.7, color: '#334155' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12, color: '#1e293b' }}>
                Date e Campi
              </h3>
              <p style={{ marginBottom: 8 }}>
                <strong>Date:</strong> dal 03/01 al 05/01/2026
              </p>
              <p style={{ marginBottom: 8 }}>
                <strong>Campi:</strong>
              </p>
              <ul style={{ marginBottom: 20, paddingLeft: 24 }}>
                <li>Palestra MORIGIA, via Pietro Sighinolfi</li>
                <li>Palestra MATTIOLI, via Celso Cicognani, 8</li>
              </ul>

              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12, color: '#1e293b' }}>
                Formula del Torneo
              </h3>
              
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 8, color: '#475569' }}>
                Gironi:
              </h4>
              <p style={{ marginBottom: 16, paddingLeft: 16 }}>
                Le squadre sono divise in due gironi (A e B). 
                Ogni squadra affronta tutte le altre del proprio girone per determinare la posizione in classifica.
              </p>

              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 8, color: '#475569' }}>
                Finali:
              </h4>
              <p style={{ marginBottom: 20, paddingLeft: 16 }}>
                Le squadre incontreranno le pari classificate di ogni girone per determinare il posizionamento finale.
              </p>

              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12, color: '#1e293b' }}>
                Sistema di Punteggio
              </h3>
              <ul style={{ marginBottom: 20, paddingLeft: 24 }}>
                <li>Vittoria: <strong>2 punti</strong></li>
              </ul>

              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12, color: '#1e293b' }}>
                Criteri di Classifica
              </h3>
              <p style={{ marginBottom: 20 }}>
                In caso di parità in classifica, prevarrà la squadra che si è aggiudicata lo scontro diretto nei gironi.
              </p>

              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12, color: '#1e293b' }}>
                Formato Partite
              </h3>
              <p style={{ marginBottom: 8 }}>
                Attenendosi al regolamento FIP ci saranno alcune variazioni:
              </p>
              <ul style={{ marginBottom: 16, paddingLeft: 24 }}>
                <li>Bonus dal 6° fallo di squadra</li>
                <li>Min 8 ­ Max 12 giocatori iscrivibili a referto</li>
              </ul>
            </div>

            <Dialog.Close asChild>
              <button type="button" className="btn">Chiudi</button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Standings Modal */}
      <Dialog.Root open={standingsModalOpen} onOpenChange={setStandingsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="rw-overlay" />
          <Dialog.Content className="rw-dialog" style={{ maxWidth: 700, maxHeight: '85vh', overflow: 'auto' }}>
            <Dialog.Title style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 20 }}>
              🏆 Classifiche
            </Dialog.Title>

            {/* Girone A */}
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 12, color: '#17b3ff' }}>
                Girone A
              </h3>
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                  <thead>
                    <tr style={{ background: '#e0f4ff', borderBottom: '2px solid #17b3ff' }}>
                      <th style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap', fontSize: '0.7rem' }}>Pos</th>
                      <th style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap', fontSize: '0.7rem' }}>Squadra</th>
                      <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700, whiteSpace: 'nowrap', fontSize: '0.7rem' }}>Pt</th>
                      <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700, whiteSpace: 'nowrap', fontSize: '0.7rem' }}>V</th>
                      <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700, whiteSpace: 'nowrap', fontSize: '0.7rem' }}>S</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standingsA.map((team, idx) => {
                      const diff = team.pts_for - team.pts_against
                      return (
                        <tr key={team.id} style={{ borderBottom: '1px solid #e2e8f0', background: idx === 0 ? '#e0f4ff' : '#fff' }}>
                          <td style={{ padding: '6px 4px', fontWeight: 700, color: '#64748b', fontSize: '0.75rem' }}>{idx + 1}</td>
                          <td style={{ padding: '6px 4px', fontWeight: 600 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {team.logo_url && (
                                <img 
                                  src={team.logo_url} 
                                  alt={`${team.name} logo`} 
                                  style={{ width: 24, height: 24, objectFit: 'contain', borderRadius: 3, flexShrink: 0 }}
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                />
                              )}
                              <span style={{ fontSize: '0.75rem', color: '#1e293b' }}>{team.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700, fontSize: '0.9rem' }}>{team.points}</td>
                          <td style={{ padding: '6px 4px', textAlign: 'center', color: '#16a34a', fontSize: '0.75rem' }}>{team.wins}</td>
                          <td style={{ padding: '6px 4px', textAlign: 'center', color: '#dc2626', fontSize: '0.75rem' }}>{team.losses}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Girone B */}
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 12, color: '#b8160f' }}>
                Girone B
              </h3>
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                  <thead>
                    <tr style={{ background: '#fde8e7', borderBottom: '2px solid #b8160f' }}>
                      <th style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap', fontSize: '0.7rem' }}>Pos</th>
                      <th style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap', fontSize: '0.7rem' }}>Squadra</th>
                      <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700, whiteSpace: 'nowrap', fontSize: '0.7rem' }}>Pt</th>
                      <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700, whiteSpace: 'nowrap', fontSize: '0.7rem' }}>V</th>
                      <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700, whiteSpace: 'nowrap', fontSize: '0.7rem' }}>S</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standingsB.map((team, idx) => {
                      const diff = team.pts_for - team.pts_against
                      return (
                        <tr key={team.id} style={{ borderBottom: '1px solid #e2e8f0', background: idx === 0 ? '#fde8e7' : '#fff' }}>
                          <td style={{ padding: '6px 4px', fontWeight: 700, color: '#64748b', fontSize: '0.75rem' }}>{idx + 1}</td>
                          <td style={{ padding: '6px 4px', fontWeight: 600 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {team.logo_url && (
                                <img 
                                  src={team.logo_url} 
                                  alt={`${team.name} logo`} 
                                  style={{ width: 24, height: 24, objectFit: 'contain', borderRadius: 3, flexShrink: 0 }}
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                />
                              )}
                              <span style={{ fontSize: '0.75rem', color: '#1e293b' }}>{team.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700, fontSize: '0.9rem' }}>{team.points}</td>
                          <td style={{ padding: '6px 4px', textAlign: 'center', color: '#16a34a', fontSize: '0.75rem' }}>{team.wins}</td>
                          <td style={{ padding: '6px 4px', textAlign: 'center', color: '#dc2626', fontSize: '0.75rem' }}>{team.losses}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <Dialog.Close asChild>
                <button type="button" className="btn">Chiudi</button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Team Login Dialog */}
      {showTeamLogin && (
        <Suspense fallback={<div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>Caricamento...</div>}>
          <LazyTeamLoginDialog open={showTeamLogin} onOpenChange={setShowTeamLogin} />
        </Suspense>
      )}

      {/* MVP Info Modal */}
      <Dialog.Root open={mvpInfoModalOpen} onOpenChange={setMvpInfoModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="rw-overlay" />
          <Dialog.Content className="rw-dialog" style={{ maxWidth: 600, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <Dialog.Title style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 16, flexShrink: 0 }}>
              🏆 Come viene calcolata la Valutazione MVP
            </Dialog.Title>
            <div style={{ display: 'grid', gap: 20, color: '#475569', overflowY: 'auto', paddingRight: 8 }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
                  Sistema di Voto delle Squadre
                </h3>
                <p style={{ marginBottom: 12, lineHeight: 1.6 }}>
                  La valutazione MVP è basata esclusivamente sui <strong>voti espressi dalle squadre</strong> partecipanti al torneo.
                </p>
              </div>

              <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>📊 Formula di Calcolo</h4>
                <div style={{ fontFamily: 'monospace', background: 'white', padding: 12, borderRadius: 6, marginBottom: 12, fontSize: '0.9rem', border: '1px solid #cbd5e1' }}>
                  Valutazione MVP = Totale Voti Squadre
                </div>
                <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
                  <li><strong>Voti Squadre:</strong> peso <span style={{ color: '#f59e0b', fontWeight: 700 }}>100%</span></li>
                </ul>
              </div>

              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>💡 Esempio Pratico</h4>
                <div style={{ background: '#fef3c7', padding: 12, borderRadius: 8, border: '1px solid #fde68a', marginBottom: 8 }}>
                  <div style={{ marginBottom: 4 }}>
                    <strong>Atleta A:</strong> 5 voti squadre
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#92400e' }}>
                    Valutazione MVP = <strong>5</strong>
                  </div>
                </div>
                <div style={{ background: '#dbeafe', padding: 12, borderRadius: 8, border: '1px solid #bfdbfe' }}>
                  <div style={{ marginBottom: 4 }}>
                    <strong>Atleta B:</strong> 10 voti squadre
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#1e40af' }}>
                    Valutazione MVP = <strong>10</strong>
                  </div>
                </div>
              </div>

              <div style={{ background: '#f0fdf4', padding: 16, borderRadius: 8, border: '1px solid #bbf7d0' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#166534', marginBottom: 8 }}>✅ Perché questo sistema?</h4>
                <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8, color: '#166534' }}>
                  <li>Valorizza <strong>l'opinione tecnica delle squadre</strong></li>
                  <li>Sistema <strong>semplice e diretto</strong></li>
                  <li>Basato sulla <strong>conoscenza diretta del gioco</strong></li>
                </ul>
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="btn" style={{ width: '100%', marginTop: 20, flexShrink: 0 }}>
                Ho capito
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* MVP Details Modal */}
      <Dialog.Root open={mvpDetailsModalOpen} onOpenChange={setMvpDetailsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="rw-overlay" />
          <Dialog.Content className="rw-dialog" style={{ maxWidth: 500 }}>
            <Dialog.Title style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 20 }}>
              📊 Dettaglio Voti MVP
            </Dialog.Title>
            
            {selectedMVP && (
              <div style={{ display: 'grid', gap: 20 }}>
                {/* Player Info */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 16,
                  padding: 16,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: 12,
                  color: 'white'
                }}>
                  {selectedMVP.logo_url && (
                    <img 
                      src={selectedMVP.logo_url} 
                      alt={selectedMVP.squadra_nome}
                      style={{ width: 48, height: 48, objectFit: 'contain', background: 'white', borderRadius: 8, padding: 4 }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 }}>
                      #{selectedMVP.numero_maglia} {selectedMVP.nome} {selectedMVP.cognome}
                    </div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.9, fontWeight: loggedInTeamId && selectedMVP.squadra_id === loggedInTeamId ? 700 : 400 }}>
                      {selectedMVP.squadra_nome}
                    </div>
                  </div>
                </div>

                {/* Vote Breakdown */}
                <div style={{ display: 'grid', gap: 12 }}>
                  {/* Team Votes - Now 100% */}
                  <div style={{ 
                    padding: 16, 
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    borderRadius: 12,
                    border: '2px solid #f59e0b'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontSize: '1.5rem' }}>🏀</div>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#92400e' }}>
                            Voti Squadre
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#78350f' }}>
                            Peso: 100%
                          </div>
                        </div>
                      </div>
                      <div style={{ 
                        fontSize: '2rem', 
                        fontWeight: 800, 
                        color: '#f59e0b'
                      }}>
                        {selectedMVP.voteCount}
                      </div>
                    </div>
                  </div>

                  {/* Total */}
                  <div style={{ 
                    padding: 20, 
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    borderRadius: 12,
                    color: 'white',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '0.9rem', marginBottom: 8, opacity: 0.9 }}>
                      Valutazione Totale MVP
                    </div>
                    <div style={{ fontSize: '3rem', fontWeight: 800 }}>
                      🏆 {selectedMVP.voteCount}
                    </div>
                  </div>
                </div>

                <Dialog.Close asChild>
                  <button className="btn" style={{ width: '100%' }}>
                    Chiudi
                  </button>
                </Dialog.Close>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* MVP Full List Modal */}
      <Dialog.Root open={mvpListModalOpen} onOpenChange={setMvpListModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="rw-overlay" />
          <Dialog.Content className="rw-dialog" style={{ maxWidth: 700, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <Dialog.Title style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 16, flexShrink: 0 }}>
              🏆 Classifica Completa MVP
            </Dialog.Title>
            
            {loadingAllMVPs ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                Caricamento...
              </div>
            ) : allMVPs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                Nessun voto registrato
              </div>
            ) : (
              <div style={{ overflowY: 'auto', paddingRight: 8, flexGrow: 1 }}>
                <div style={{ display: 'grid', gap: 8 }}>
                  {allMVPs.map((mvp, index) => (
                    <button
                      key={mvp.id}
                      onClick={() => {
                        setMvpListModalOpen(false)
                        openMVPDetails(mvp)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: 12,
                        background: index < 3 
                          ? (index === 0 ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' 
                            : index === 1 ? 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)' 
                            : 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)')
                          : 'white',
                        border: index < 3
                          ? (index === 0 ? '2px solid #f59e0b'
                            : index === 1 ? '2px solid #9ca3af'
                            : '2px solid #f97316')
                          : '1px solid #e5e7eb',
                        borderRadius: 12,
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateX(4px)'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateX(0)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      {/* Ranking Number */}
                      <div style={{
                        fontSize: index < 3 ? '1.5rem' : '1rem',
                        fontWeight: 800,
                        color: index === 0 ? '#f59e0b' : index === 1 ? '#6b7280' : index === 2 ? '#f97316' : '#64748b',
                        minWidth: 40,
                        textAlign: 'center'
                      }}>
                        {index < 3 ? (index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉') : `${index + 1}°`}
                      </div>

                      {/* Team Logo */}
                      {mvp.logo_url && (
                        <img 
                          src={mvp.logo_url} 
                          alt={mvp.squadra_nome}
                          style={{ width: 32, height: 32, objectFit: 'contain' }}
                        />
                      )}

                      {/* Player Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
                          #{mvp.numero_maglia} {mvp.nome} {mvp.cognome}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {mvp.squadra_nome}
                        </div>
                      </div>

                      {/* Vote Count */}
                      <div style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        padding: '8px 12px',
                        borderRadius: 8,
                        fontSize: '1rem',
                        fontWeight: 700,
                        minWidth: 60,
                        textAlign: 'center'
                      }}>
                        {mvp.voteCount}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Dialog.Close asChild>
              <button className="btn secondary" style={{ width: '100%', marginTop: 16, flexShrink: 0 }}>
                Chiudi
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Scorer Details Modal */}
      <Dialog.Root open={scorerDetailsModalOpen} onOpenChange={setScorerDetailsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="rw-overlay" />
          <Dialog.Content className="rw-dialog" style={{ maxWidth: 600, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Dialog.Title style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 20, flexShrink: 0 }}>
              🏀 Dettaglio Punti Realizzati
            </Dialog.Title>
            
            {loadingScorerDetails ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                Caricamento...
              </div>
            ) : selectedScorer ? (
              <div style={{ display: 'grid', gap: 20, flexGrow: 1, minHeight: 0, overflowY: 'auto', paddingRight: 8 }}>
                {/* Player Info */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 16,
                  padding: 16,
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  borderRadius: 12,
                  color: 'white',
                  flexShrink: 0
                }}>
                  {selectedScorer.logo_url && (
                    <img 
                      src={selectedScorer.logo_url} 
                      alt={selectedScorer.squadra_nome}
                      style={{ width: 48, height: 48, objectFit: 'contain', background: 'white', borderRadius: 8, padding: 4 }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 }}>
                      #{selectedScorer.numero_maglia} {selectedScorer.nome} {selectedScorer.cognome}
                    </div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                      {selectedScorer.squadra_nome}
                    </div>
                  </div>
                  <div style={{
                    background: 'rgba(255,255,255,0.2)',
                    padding: '12px 16px',
                    borderRadius: 12,
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '0.8rem', opacity: 0.9, marginBottom: 4 }}>
                      Totale
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800 }}>
                      {selectedScorer.totalPoints}
                    </div>
                  </div>
                </div>

                {/* Matches List */}
                <div style={{ display: 'grid', gap: 8 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                    Partite Giocate ({selectedScorer.matches.length})
                  </h3>
                  {selectedScorer.matches.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 20, color: '#64748b', fontSize: '0.9rem' }}>
                      Nessuna partita trovata
                    </div>
                  ) : (
                    selectedScorer.matches.map((match, index) => (
                      <div
                        key={match.partita_id}
                        style={{
                          padding: 14,
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12
                        }}
                      >
                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' }}>
                          vs {match.opponent_team}
                        </div>
                        <div style={{
                          background: match.punti > 0 
                            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                            : 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
                          color: 'white',
                          padding: '6px 14px',
                          borderRadius: 8,
                          fontSize: '1.1rem',
                          fontWeight: 700,
                          minWidth: 50,
                          textAlign: 'center'
                        }}>
                          {match.punti}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}

            <Dialog.Close asChild>
              <button className="btn" style={{ width: '100%', marginTop: 16, flexShrink: 0 }}>
                Chiudi
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Scorer List Modal */}
      <Dialog.Root open={scorerListModalOpen} onOpenChange={setScorerListModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="rw-overlay" />
          <Dialog.Content className="rw-dialog" style={{ maxWidth: 700, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Dialog.Title style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 20, flexShrink: 0 }}>
              🏀 Tutti i Realizzatori
            </Dialog.Title>

            {loadingAllScorers ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                Caricamento...
              </div>
            ) : allScorers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                Nessun giocatore ha ancora realizzato punti
              </div>
            ) : (
              <div style={{ flexGrow: 1, minHeight: 0, overflowY: 'auto', paddingRight: 8 }}>
                <div style={{ display: 'grid', gap: 10 }}>
                  {allScorers.map((scorer, index) => (
                    <button
                      key={scorer.id}
                      onClick={() => {
                        setScorerListModalOpen(false)
                        openScorerDetails(scorer)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: 16,
                        background: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: 12,
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f8fafc'
                        e.currentTarget.style.borderColor = '#3b82f6'
                        e.currentTarget.style.transform = 'translateX(4px)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white'
                        e.currentTarget.style.borderColor = '#e5e7eb'
                        e.currentTarget.style.transform = 'translateX(0)'
                      }}
                    >
                      <div style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: '#64748b',
                        minWidth: 32,
                        textAlign: 'center'
                      }}>
                        {index + 1}
                      </div>
                      {scorer.logo_url && (
                        <img 
                          src={scorer.logo_url} 
                          alt={scorer.squadra_nome}
                          style={{ width: 36, height: 36, objectFit: 'contain' }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>
                          #{scorer.numero_maglia} {scorer.nome} {scorer.cognome}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {scorer.squadra_nome}
                        </div>
                      </div>
                      <div style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        color: 'white',
                        padding: '8px 14px',
                        borderRadius: 10,
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        minWidth: 60,
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4
                      }}>
                        🏀 {scorer.totalPoints}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Dialog.Close asChild>
              <button className="btn" style={{ width: '100%', marginTop: 16, flexShrink: 0 }}>
                Chiudi
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  )
}
