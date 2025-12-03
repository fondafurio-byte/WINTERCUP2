import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useLoggedInTeam } from '../lib/useLoggedInTeam'

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
  losses: number
  pts_for: number
  pts_against: number
  points: number
}

export default function Statistiche(){
  const [standingsA, setStandingsA] = useState<Standing[]>([])
  const [standingsB, setStandingsB] = useState<Standing[]>([])
  const [loading, setLoading] = useState(false)

  const { loggedInTeamId } = useLoggedInTeam()

  function getTeamNameColor(teamId: string | undefined): string {
    if (loggedInTeamId && teamId === loggedInTeamId) {
      return '#dc2626' // Red
    }
    return 'inherit' // Default
  }

  useEffect(() => {
    loadStandings(true) // Initial load with loading state
    
    // Poll for live updates every 3 seconds
    const interval = setInterval(() => {
      loadStandings(false) // Silent updates without loading state
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  async function loadStandings(showLoading = true) {
    if (showLoading) setLoading(true)
    try {
      console.log('📊 Loading standings...')
      // Caricare tutte le squadre
      const { data: teamsData, error: teamsError } = await supabase
        .from('squadre')
        .select('id, name, girone, logo_url')
        .order('name')
      
      console.log('Teams loaded:', teamsData?.length || 0, 'teams')
      
      if (teamsError) {
        console.error('❌ Error loading teams:', teamsError)
        if (showLoading) setLoading(false)
        return
      }

      // Caricare tutte le partite
      const { data: matchesData, error: matchesError } = await supabase
        .from('partite')
        .select('id, home_team_id, away_team_id, home_score, away_score, girone')
      
      if (matchesError) {
        console.error('Error loading matches:', matchesError)
        if (showLoading) setLoading(false)
        return
      }

      // Function to calculate standings for a girone
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
            points: 0 
          }
        })

        matches.forEach(m => {
          const homeScore = m.home_score
          const awayScore = m.away_score
          if (homeScore == null || awayScore == null) return
          if (!map[m.home_team_id] || !map[m.away_team_id]) return

          map[m.home_team_id].pts_for += homeScore
          map[m.home_team_id].pts_against += awayScore
          map[m.away_team_id].pts_for += awayScore
          map[m.away_team_id].pts_against += homeScore

          if (homeScore > awayScore) {
            map[m.home_team_id].wins += 1
            map[m.away_team_id].losses += 1
          } else if (awayScore > homeScore) {
            map[m.away_team_id].wins += 1
            map[m.home_team_id].losses += 1
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
        return arr
      }

      // Calculate separate standings for Girone A and B
      const teamsA = teamsData.filter((t: Team) => t.girone === 'A')
      const teamsB = teamsData.filter((t: Team) => t.girone === 'B')
      const matchesA = matchesData.filter((m: any) => m.girone === 'A')
      const matchesB = matchesData.filter((m: any) => m.girone === 'B')

      const stA = calculateStandings(teamsA, matchesA)
      const stB = calculateStandings(teamsB, matchesB)

      setStandingsA(stA)
      setStandingsB(stB)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  return (
    <main style={{width:'100%',maxWidth:900,margin:'24px auto',padding:'12px',boxSizing:'border-box'}}>
      <h1>Classifiche</h1>

      <div style={{marginTop:16,display:'grid',gap:12}}>
        <div style={{padding:'8px',border:'1px solid #eef2f7',borderRadius:8,background:'#fff',boxSizing:'border-box'}}>
          {loading ? (
            <div style={{textAlign:'center',padding:20,color:'#64748b'}}>Caricamento...</div>
          ) : standingsA.length === 0 && standingsB.length === 0 ? (
            <div style={{textAlign:'center',padding:20,color:'#64748b'}}>Nessuna squadra disponibile.</div>
          ) : (
              <div style={{display:'grid',gap:24,marginTop:12}}>
                {/* Girone A */}
                <div>
                  <h3 style={{margin:0,marginBottom:12,fontSize:18,color:'#17b3ff',display:'flex',alignItems:'center',gap:8}}>
                    <span>Girone A</span>
                  </h3>
                  <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.75rem'}}>
                      <thead>
                        <tr style={{background:'#e0f4ff',borderBottom:'2px solid #17b3ff'}}>
                          <th style={{padding:'6px 4px',textAlign:'left',fontWeight:700,whiteSpace:'nowrap',fontSize:'0.7rem'}}>Pos</th>
                          <th style={{padding:'6px 4px',textAlign:'center',fontWeight:700,whiteSpace:'nowrap',fontSize:'0.7rem'}}></th>
                          <th className="team-name-column" style={{padding:'6px 4px',textAlign:'left',fontWeight:700,whiteSpace:'nowrap',fontSize:'0.7rem'}}>Squadra</th>
                          <th style={{padding:'6px 4px',textAlign:'center',fontWeight:700,whiteSpace:'nowrap',fontSize:'0.7rem'}}>Pt</th>
                          <th style={{padding:'6px 4px',textAlign:'center',fontWeight:700,whiteSpace:'nowrap',fontSize:'0.7rem'}}>G</th>
                          <th style={{padding:'6px 4px',textAlign:'center',fontWeight:700,whiteSpace:'nowrap',fontSize:'0.7rem'}}>V</th>
                          <th style={{padding:'6px 4px',textAlign:'center',fontWeight:700,whiteSpace:'nowrap',fontSize:'0.7rem'}}>S</th>
                          <th style={{padding:'6px 4px',textAlign:'center',fontWeight:700,whiteSpace:'nowrap',fontSize:'0.7rem'}}>PF</th>
                          <th style={{padding:'6px 4px',textAlign:'center',fontWeight:700,whiteSpace:'nowrap',fontSize:'0.7rem'}}>PS</th>
                          <th style={{padding:'6px 4px',textAlign:'center',fontWeight:700,whiteSpace:'nowrap',fontSize:'0.7rem'}}>Diff</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standingsA.map((s, idx) => {
                          const giocate = s.wins + s.losses
                          const diff = s.pts_for - s.pts_against
                          return (
                            <tr key={s.id} style={{borderBottom:'1px solid #e2e8f0',background: idx === 0 ? '#e0f4ff' : '#fff'}}>
                              <td style={{padding:'6px 4px',fontWeight:700,color:'#64748b',fontSize:'0.75rem'}}>{idx + 1}</td>
                              <td style={{padding:'6px 4px',fontWeight:600}}>
                                <div style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
                                  {s.logo_url ? (
                                    <img 
                                      src={s.logo_url} 
                                      alt={`${s.name} logo`} 
                                      style={{width:24,height:24,objectFit:'contain',borderRadius:3}}
                                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                    />
                                  ) : (
                                    <span style={{fontSize:'0.6rem',color:'#94a3b8'}}>-</span>
                                  )}
                                </div>
                              </td>
                              <td className="team-name-column" style={{padding:'6px 8px',fontWeight:600,fontSize:'0.75rem',whiteSpace:'nowrap',color:getTeamNameColor(s.id)}}>{s.name}</td>
                              <td style={{padding:'6px 4px',textAlign:'center',fontWeight:700,fontSize:'0.9rem'}}>{s.points}</td>
                              <td style={{padding:'6px 4px',textAlign:'center',fontSize:'0.75rem'}}>{giocate}</td>
                              <td style={{padding:'6px 4px',textAlign:'center',color:'#16a34a',fontSize:'0.75rem'}}>{s.wins}</td>
                              <td style={{padding:'6px 4px',textAlign:'center',color:'#dc2626',fontSize:'0.75rem'}}>{s.losses}</td>
                              <td style={{padding:'6px 4px',textAlign:'center',fontSize:'0.75rem'}}>{s.pts_for}</td>
                              <td style={{padding:'6px 4px',textAlign:'center',fontSize:'0.75rem'}}>{s.pts_against}</td>
                              <td style={{
                                padding:'6px 4px',
                                textAlign:'center',
                                fontWeight:600,
                                fontSize:'0.75rem',
                                color: diff > 0 ? '#16a34a' : diff < 0 ? '#dc2626' : '#64748b'
                              }}>
                                {diff > 0 ? '+' : ''}{diff}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Girone B */}
                <div>
                  <h3 style={{margin:0,marginBottom:12,fontSize:18,color:'#b8160f',display:'flex',alignItems:'center',gap:8}}>
                    <span>Girone B</span>
                  </h3>
                  <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.75rem'}}>
                      <thead>
                        <tr style={{background:'#fde8e7',borderBottom:'2px solid #b8160f'}}>
                          <th style={{padding:'6px 4px',textAlign:'left',fontWeight:700,whiteSpace:'nowrap',fontSize:'0.7rem'}}>Pos</th>
                          <th style={{padding:'6px 4px',textAlign:'center',fontWeight:700,whiteSpace:'nowrap',fontSize:'0.7rem'}}></th>
                          <th className="team-name-column" style={{padding:'6px 4px',textAlign:'left',fontWeight:700,whiteSpace:'nowrap',fontSize:'0.7rem'}}>Squadra</th>
                          <th style={{padding:'6px 4px',textAlign:'center',fontWeight:700,whiteSpace:'nowrap',fontSize:'0.7rem'}}>Pt</th>
                          <th style={{padding:'6px 4px',textAlign:'center',fontWeight:700,whiteSpace:'nowrap',fontSize:'0.7rem'}}>G</th>
                          <th style={{padding:'6px 4px',textAlign:'center',fontWeight:700,whiteSpace:'nowrap',fontSize:'0.7rem'}}>V</th>
                          <th style={{padding:'6px 4px',textAlign:'center',fontWeight:700,whiteSpace:'nowrap',fontSize:'0.7rem'}}>S</th>
                          <th style={{padding:'6px 4px',textAlign:'center',fontWeight:700,whiteSpace:'nowrap',fontSize:'0.7rem'}}>PF</th>
                          <th style={{padding:'6px 4px',textAlign:'center',fontWeight:700,whiteSpace:'nowrap',fontSize:'0.7rem'}}>PS</th>
                          <th style={{padding:'6px 4px',textAlign:'center',fontWeight:700,whiteSpace:'nowrap',fontSize:'0.7rem'}}>Diff</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standingsB.map((s, idx) => {
                          const giocate = s.wins + s.losses
                          const diff = s.pts_for - s.pts_against
                          return (
                            <tr key={s.id} style={{borderBottom:'1px solid #e2e8f0',background: idx === 0 ? '#fde8e7' : '#fff'}}>
                              <td style={{padding:'6px 4px',fontWeight:700,color:'#64748b',fontSize:'0.75rem'}}>{idx + 1}</td>
                              <td style={{padding:'6px 4px',fontWeight:600}}>
                                <div style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
                                  {s.logo_url ? (
                                    <img 
                                      src={s.logo_url} 
                                      alt={`${s.name} logo`} 
                                      style={{width:24,height:24,objectFit:'contain',borderRadius:3}}
                                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                    />
                                  ) : (
                                    <span style={{fontSize:'0.6rem',color:'#94a3b8'}}>-</span>
                                  )}
                                </div>
                              </td>
                              <td className="team-name-column" style={{padding:'6px 8px',fontWeight:600,fontSize:'0.75rem',whiteSpace:'nowrap',color:getTeamNameColor(s.id)}}>{s.name}</td>
                              <td style={{padding:'6px 4px',textAlign:'center',fontWeight:700,fontSize:'0.9rem'}}>{s.points}</td>
                              <td style={{padding:'6px 4px',textAlign:'center',fontSize:'0.75rem'}}>{giocate}</td>
                              <td style={{padding:'6px 4px',textAlign:'center',color:'#16a34a',fontSize:'0.75rem'}}>{s.wins}</td>
                              <td style={{padding:'6px 4px',textAlign:'center',color:'#dc2626',fontSize:'0.75rem'}}>{s.losses}</td>
                              <td style={{padding:'6px 4px',textAlign:'center',fontSize:'0.75rem'}}>{s.pts_for}</td>
                              <td style={{padding:'6px 4px',textAlign:'center',fontSize:'0.75rem'}}>{s.pts_against}</td>
                              <td style={{
                                padding:'6px 4px',
                                textAlign:'center',
                                fontWeight:600,
                                fontSize:'0.75rem',
                                color: diff > 0 ? '#16a34a' : diff < 0 ? '#dc2626' : '#64748b'
                              }}>
                                {diff > 0 ? '+' : ''}{diff}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
      </div>
    </main>
  )
}
