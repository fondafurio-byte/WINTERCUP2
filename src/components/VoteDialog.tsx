import React, { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { supabase } from '../lib/supabase'
import { Trophy, X } from 'lucide-react'

interface Athlete {
  id: string
  nome: string
  cognome: string
  numero_maglia: number
  squadra_id: string
}

interface Team {
  id: string
  name: string
  logo_url?: string | null
}

interface VoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  partitaId: string
  squadraCasa: Team
  squadraOspite: Team
}

export default function VoteDialog({ open, onOpenChange, partitaId, squadraCasa, squadraOspite }: VoteDialogProps) {
  const [atletiCasa, setAtletiCasa] = useState<Athlete[]>([])
  const [atletiOspite, setAtletiOspite] = useState<Athlete[]>([])
  const [selectedAtleta, setSelectedAtleta] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [hasVoted, setHasVoted] = useState(false)
  const [currentVote, setCurrentVote] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open, partitaId])

  async function loadData() {
    setLoading(true)
    setStatus(null)

    try {
      // Carica atleti di entrambe le squadre
      const [casaRes, ospiteRes] = await Promise.all([
        supabase
          .from('atleti')
          .select('*')
          .eq('squadra_id', squadraCasa.id)
          .order('numero_maglia'),
        supabase
          .from('atleti')
          .select('*')
          .eq('squadra_id', squadraOspite.id)
          .order('numero_maglia')
      ])

      if (casaRes.data) setAtletiCasa(casaRes.data)
      if (ospiteRes.data) setAtletiOspite(ospiteRes.data)

      // Controlla se l'utente ha già votato per questa partita
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: voteData } = await supabase
          .from('votes')
          .select('atleta_id')
          .eq('partita_id', partitaId)
          .eq('user_id', user.id)
          .maybeSingle()

        if (voteData) {
          setHasVoted(true)
          setCurrentVote(voteData.atleta_id)
          setSelectedAtleta(voteData.atleta_id)
        }
      }
    } catch (err) {
      console.error('Error loading data:', err)
      setStatus('Errore nel caricamento dei dati')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedAtleta) {
      setStatus('Seleziona un atleta')
      return
    }

    setSubmitting(true)
    setStatus(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setStatus('Devi essere autenticato per votare')
        setSubmitting(false)
        return
      }

      // Determina il tipo di voto: controlla prima users (team), poi public_users
      let voteType = 'public'
      
      // Controlla se è un utente squadra
      const { data: teamUser } = await supabase
        .from('users')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (teamUser) {
        voteType = 'team'
        console.log('Vote type: team (user in users table)')
      } else {
        // Controlla se è un utente pubblico
        const { data: publicUser } = await supabase
          .from('public_users')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle()
        
        if (publicUser) {
          voteType = 'public'
          console.log('Vote type: public (user in public_users table)')
        }
      }

      if (hasVoted) {
        // Aggiorna voto esistente
        const { error } = await supabase
          .from('votes')
          .update({ 
            atleta_id: selectedAtleta,
            vote_type: voteType 
          })
          .eq('partita_id', partitaId)
          .eq('user_id', user.id)

        if (error) throw error
        setStatus('✅ Voto aggiornato!')
      } else {
        // Inserisci nuovo voto
        const { error } = await supabase
          .from('votes')
          .insert({
            partita_id: partitaId,
            atleta_id: selectedAtleta,
            user_id: user.id,
            vote_type: voteType
          })

        if (error) throw error
        setStatus('✅ Voto registrato!')
        setHasVoted(true)
      }

      setTimeout(() => {
        onOpenChange(false)
      }, 1500)
    } catch (err: any) {
      console.error('Error submitting vote:', err)
      setStatus('Errore nel salvataggio del voto: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function renderAthleteList(atleti: Athlete[], teamName: string, teamLogo?: string | null) {
    return (
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          {teamLogo && (
            <img 
              src={teamLogo} 
              alt={teamName} 
              style={{ width: 32, height: 32, objectFit: 'contain' }}
            />
          )}
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>{teamName}</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {atleti.map(atleta => (
            <label
              key={atleta.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px',
                background: selectedAtleta === atleta.id ? '#dbeafe' : '#f8fafc',
                border: `2px solid ${selectedAtleta === atleta.id ? '#3b82f6' : '#e2e8f0'}`,
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <input
                type="radio"
                name="atleta"
                value={atleta.id}
                checked={selectedAtleta === atleta.id}
                onChange={(e) => setSelectedAtleta(e.target.value)}
                style={{ accentColor: '#3b82f6' }}
              />
              <span style={{
                minWidth: 32,
                height: 32,
                background: '#3b82f6',
                color: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.875rem'
              }}>
                {atleta.numero_maglia}
              </span>
              <span style={{ flex: 1, fontWeight: 600, color: '#1e293b' }}>
                {atleta.nome} {atleta.cognome}
              </span>
            </label>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="rw-overlay" />
        <Dialog.Content className="rw-dialog" style={{ maxWidth: 600, maxHeight: '90vh', overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Dialog.Title style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Trophy size={24} color="#f59e0b" />
              Vota MVP della Partita
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={24} color="#64748b" />
              </button>
            </Dialog.Close>
          </div>

          <Dialog.Description style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: 20 }}>
            {hasVoted 
              ? 'Hai già votato per questa partita. Puoi modificare il tuo voto.'
              : 'Seleziona il miglior giocatore della partita'}
          </Dialog.Description>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
              Caricamento...
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {renderAthleteList(atletiCasa, squadraCasa.name, squadraCasa.logo_url)}
              {renderAthleteList(atletiOspite, squadraOspite.name, squadraOspite.logo_url)}

              {status && (
                <div style={{
                  padding: 12,
                  background: status.includes('✅') ? '#dcfce7' : '#fee2e2',
                  color: status.includes('✅') ? '#166534' : '#991b1b',
                  borderRadius: 8,
                  marginBottom: 16,
                  textAlign: 'center',
                  fontSize: '0.875rem'
                }}>
                  {status}
                </div>
              )}

              <button
                type="submit"
                className="btn"
                disabled={submitting || !selectedAtleta}
                style={{ width: '100%' }}
              >
                {submitting ? 'Invio...' : hasVoted ? 'Aggiorna Voto' : 'Conferma Voto'}
              </button>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
