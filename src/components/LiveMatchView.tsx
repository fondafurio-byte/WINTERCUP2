import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Trophy } from 'lucide-react'

interface Team {
  id: string
  name: string
  logo_url?: string
}

interface Atleta {
  id: string
  nome: string
  cognome: string
  numero_maglia: string
  punti: number
}

interface LiveMatchViewProps {
  matchId: string
  homeTeam: Team
  awayTeam: Team
}

export default function LiveMatchView({ matchId, homeTeam, awayTeam }: LiveMatchViewProps) {
  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [homeTopScorers, setHomeTopScorers] = useState<Atleta[]>([])
  const [awayTopScorers, setAwayTopScorers] = useState<Atleta[]>([])
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    console.log('🔴 LiveMatchView MOUNTED - matchId:', matchId, 'homeTeam:', homeTeam.name, 'awayTeam:', awayTeam.name)
    
    // Carica dati iniziali
    loadMatchData()

    // Poll ogni 2 secondi per aggiornamenti live
    const interval = setInterval(() => {
      console.log('⏱️ LiveMatchView polling...', new Date().toLocaleTimeString())
      loadMatchData()
    }, 2000)

    return () => {
      console.log('🔴 LiveMatchView UNMOUNTED - stopping polling')
      clearInterval(interval)
    }
  }, [matchId, homeTeam.id, awayTeam.id])

  async function loadMatchData() {
    console.log('📊 Loading match data...', new Date().toLocaleTimeString())
    try {
      // Carica flag is_live della partita
      const { data: matchData } = await supabase
        .from('partite')
        .select('is_live')
        .eq('id', matchId)
        .single()

      if (matchData) {
        // Partita è live se il campo is_live è true
        setIsLive(matchData.is_live ?? false)
      }

      // Carica tutte le statistiche atleti della partita (senza join)
      const { data: puntiData, error: puntiError } = await supabase
        .from('punti_atleti')
        .select('punti, atleta_id')
        .eq('partita_id', matchId)

      console.log('📈 Punti data received:', { 
        count: puntiData?.length || 0, 
        data: puntiData,
        error: puntiError 
      })

      if (puntiError) {
        console.error('❌ Error loading punti:', puntiError)
        setHomeScore(0)
        setAwayScore(0)
        setHomeTopScorers([])
        setAwayTopScorers([])
        return
      }

      if (puntiData && puntiData.length > 0) {
        // Carica info atleti
        const atletiIds = puntiData.map(p => p.atleta_id)
        const { data: atletiData, error: atletiError } = await supabase
          .from('atleti')
          .select('id, nome, cognome, numero_maglia, team_id')
          .in('id', atletiIds)

        console.log('👥 Atleti data received:', {
          count: atletiData?.length || 0,
          error: atletiError
        })

        if (atletiError || !atletiData) {
          console.error('❌ Error loading atleti:', atletiError)
          return
        }

        // Combina i dati
        const combinedData = puntiData.map(p => {
          const atleta = atletiData.find(a => a.id === p.atleta_id)
          return {
            ...p,
            atleta
          }
        }).filter(item => item.atleta)

        console.log('🔗 Combined data:', {
          total: combinedData.length,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id
        })

        // Filtra e ordina per squadra casa
        const homeStatsFiltered = combinedData
          .filter(s => s.atleta && s.atleta.team_id === homeTeam.id && s.punti > 0)
          .map(s => ({
            id: s.atleta!.id,
            nome: s.atleta!.nome,
            cognome: s.atleta!.cognome,
            numero_maglia: s.atleta!.numero_maglia,
            punti: s.punti
          }))
          .sort((a, b) => b.punti - a.punti)
          .slice(0, 3)
        
        setHomeTopScorers(homeStatsFiltered)

        // Filtra e ordina per squadra ospite
        const awayStatsFiltered = combinedData
          .filter(s => s.atleta && s.atleta.team_id === awayTeam.id && s.punti > 0)
          .map(s => ({
            id: s.atleta!.id,
            nome: s.atleta!.nome,
            cognome: s.atleta!.cognome,
            numero_maglia: s.atleta!.numero_maglia,
            punti: s.punti
          }))
          .sort((a, b) => b.punti - a.punti)
          .slice(0, 3)
        
        setAwayTopScorers(awayStatsFiltered)

        // Calcola i punteggi totali dalla somma dei punti atleti
        const homeTotal = combinedData
          .filter(s => s.atleta && s.atleta.team_id === homeTeam.id)
          .reduce((sum, s) => sum + s.punti, 0)
        
        const awayTotal = combinedData
          .filter(s => s.atleta && s.atleta.team_id === awayTeam.id)
          .reduce((sum, s) => sum + s.punti, 0)
        
        console.log('⚽ SCORES UPDATED:', {
          home: homeTotal,
          away: awayTotal,
          homeTopScorers: homeStatsFiltered.length,
          awayTopScorers: awayStatsFiltered.length
        })
        
        setHomeScore(homeTotal)
        setAwayScore(awayTotal)
      } else {
        console.log('📭 No punti data found - resetting to 0')
        setHomeScore(0)
        setAwayScore(0)
        setHomeTopScorers([])
        setAwayTopScorers([])
      }
    } catch (err) {
      console.error('❌ Error loading live match data:', err)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      zIndex: 9999,
      overflow: 'auto',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: 800,
        margin: '0 auto',
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        overflow: 'hidden'
      }}>
        {/* Header con badge LIVE */}
        {isLive && (
          <div style={{
            background: '#ef4444',
            color: 'white',
            padding: '8px 16px',
            textAlign: 'center',
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: 2,
            animation: 'pulse 2s infinite'
          }}>
            🔴 LIVE
          </div>
        )}

        {/* Risultato e loghi */}
        <div style={{
          padding: '40px 20px',
          background: 'linear-gradient(to bottom, #f8fafc, white)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            gap: 20
          }}>
            {/* Squadra Casa */}
            <div style={{
              flex: 1,
              textAlign: 'center'
            }}>
              {homeTeam.logo_url && (
                <img 
                  src={homeTeam.logo_url} 
                  alt={homeTeam.name}
                  style={{
                    width: 100,
                    height: 100,
                    objectFit: 'contain',
                    marginBottom: 12,
                    filter: homeScore > awayScore ? 'drop-shadow(0 0 12px rgba(34,197,94,0.6))' : 'none'
                  }}
                />
              )}
              <div style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#1e293b'
              }}>
                {homeTeam.name}
              </div>
            </div>

            {/* Punteggio */}
            <div style={{
              fontSize: 64,
              fontWeight: 900,
              color: '#1e293b',
              letterSpacing: -2,
              textAlign: 'center',
              minWidth: 200
            }}>
              {homeScore} — {awayScore}
            </div>

            {/* Squadra Ospite */}
            <div style={{
              flex: 1,
              textAlign: 'center'
            }}>
              {awayTeam.logo_url && (
                <img 
                  src={awayTeam.logo_url} 
                  alt={awayTeam.name}
                  style={{
                    width: 100,
                    height: 100,
                    objectFit: 'contain',
                    marginBottom: 12,
                    filter: awayScore > homeScore ? 'drop-shadow(0 0 12px rgba(34,197,94,0.6))' : 'none'
                  }}
                />
              )}
              <div style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#1e293b'
              }}>
                {awayTeam.name}
              </div>
            </div>
          </div>
        </div>

        {/* Top Scorers */}
        <div style={{
          padding: 30,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 30
        }}>
          {/* Top Scorers Casa */}
          <div>
            <h3 style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#64748b',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <Trophy size={18} color="#f59e0b" />
              Top 3 {homeTeam.name}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {homeTopScorers.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: 14, fontStyle: 'italic' }}>
                  Nessun punto ancora
                </div>
              ) : (
                homeTopScorers.map((atleta, idx) => (
                  <div
                    key={atleta.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 12,
                      background: idx === 0 ? '#fef3c7' : '#f1f5f9',
                      borderRadius: 8,
                      border: idx === 0 ? '2px solid #f59e0b' : '1px solid #e2e8f0'
                    }}
                  >
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: idx === 0 ? '#f59e0b' : '#64748b',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 14
                    }}>
                      {atleta.numero_maglia}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
                        {atleta.nome} {atleta.cognome}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 20,
                      fontWeight: 900,
                      color: idx === 0 ? '#f59e0b' : '#64748b'
                    }}>
                      {atleta.punti}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Scorers Ospite */}
          <div>
            <h3 style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#64748b',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <Trophy size={18} color="#f59e0b" />
              Top 3 {awayTeam.name}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {awayTopScorers.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: 14, fontStyle: 'italic' }}>
                  Nessun punto ancora
                </div>
              ) : (
                awayTopScorers.map((atleta, idx) => (
                  <div
                    key={atleta.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 12,
                      background: idx === 0 ? '#fef3c7' : '#f1f5f9',
                      borderRadius: 8,
                      border: idx === 0 ? '2px solid #f59e0b' : '1px solid #e2e8f0'
                    }}
                  >
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: idx === 0 ? '#f59e0b' : '#64748b',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 14
                    }}>
                      {atleta.numero_maglia}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
                        {atleta.nome} {atleta.cognome}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 20,
                      fontWeight: 900,
                      color: idx === 0 ? '#f59e0b' : '#64748b'
                    }}>
                      {atleta.punti}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `}
      </style>
    </div>
  )
}
