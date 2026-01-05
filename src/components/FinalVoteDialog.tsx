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

interface FinalVoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  partitaId: string
  squadraCasa: Team
  squadraOspite: Team
  finalType: '1-2' | '3-4' | '5-6' | '7-8'
}

// Pesi per ogni tipo di finale (solo team - 100%)
const FINAL_WEIGHTS = {
  '1-2': { team: 1.10 },
  '3-4': { team: 1.05 },
  '5-6': { team: 1.00 },
  '7-8': { team: 0.95 }
}

const FINAL_LABELS = {
  '1-2': 'Finale 1°/2° Posto',
  '3-4': 'Finale 3°/4° Posto',
  '5-6': 'Finale 5°/6° Posto',
  '7-8': 'Finale 7°/8° Posto'
}

export default function FinalVoteDialog({ open, onOpenChange, partitaId, squadraCasa, squadraOspite, finalType }: FinalVoteDialogProps) {
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

      if (casaRes.error || ospiteRes.error) {
        throw new Error('Errore nel caricamento degli atleti')
      }

      setAtletiCasa(casaRes.data || [])
      setAtletiOspite(ospiteRes.data || [])

      // Verifica se l'utente ha già votato
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

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

    } catch (err) {
      console.error('Error loading data:', err)
      setStatus('Errore nel caricamento dei dati')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit() {
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

      // Determina il tipo di voto: sempre 'team' (voti pubblici non più utilizzati)
      const voteType = 'team'

      if (hasVoted && currentVote) {
        // Aggiorna il voto esistente
        const { error } = await supabase
          .from('votes')
          .update({ 
            atleta_id: selectedAtleta,
            vote_type: voteType,
            final_type: finalType
          })
          .eq('partita_id', partitaId)
          .eq('user_id', user.id)

        if (error) throw error
        setStatus('Voto modificato con successo!')
      } else {
        // Inserisci un nuovo voto
        const { error } = await supabase
          .from('votes')
          .insert({
            partita_id: partitaId,
            atleta_id: selectedAtleta,
            user_id: user.id,
            vote_type: voteType,
            final_type: finalType
          })

        if (error) throw error
        setStatus('Voto registrato con successo!')
        setHasVoted(true)
        setCurrentVote(selectedAtleta)
      }

      setTimeout(() => {
        onOpenChange(false)
        setStatus(null)
      }, 1500)

    } catch (err: any) {
      console.error('Error submitting vote:', err)
      setStatus('Errore: ' + (err.message || 'Impossibile registrare il voto'))
    } finally {
      setSubmitting(false)
    }
  }

  const weights = FINAL_WEIGHTS[finalType]
  const label = FINAL_LABELS[finalType]

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="rw-overlay" />
        <Dialog.Content className="rw-dialog" style={{ maxWidth: 650, maxHeight: '90vh', overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Dialog.Title style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Trophy size={24} style={{ color: '#fbbf24' }} />
              Vota MVP - {label}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  color: '#64748b'
                }}
              >
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>

          <Dialog.Description style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: 16 }}>
            {hasVoted 
              ? 'Hai già votato per questa finale. Puoi modificare il tuo voto.'
              : 'Seleziona il miglior giocatore della finale'}
          </Dialog.Description>

          {/* Info sui pesi */}
          <div style={{
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            padding: 12,
            borderRadius: 8,
            marginBottom: 20,
            border: '1px solid #fbbf24'
          }}>
            <div style={{ fontSize: '0.85rem', color: '#78350f', fontWeight: 600, marginBottom: 4 }}>
              ⚖️ Peso di votazione per questa finale
            </div>
            <div style={{ fontSize: '0.8rem', color: '#92400e' }}>
              Voti Squadre: <strong>{(weights.team * 100).toFixed(0)}%</strong>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
              Caricamento atleti...
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                {/* Squadra Casa */}
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 12,
                    padding: 12,
                    background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                    borderRadius: 8
                  }}>
                    {squadraCasa.logo_url && (
                      <img src={squadraCasa.logo_url} alt={squadraCasa.name} style={{ width: 32, height: 32, objectFit: 'contain' }} />
                    )}
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{squadraCasa.name}</div>
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {atletiCasa.map(atleta => (
                      <button
                        key={atleta.id}
                        onClick={() => setSelectedAtleta(atleta.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: 12,
                          background: selectedAtleta === atleta.id ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'white',
                          color: selectedAtleta === atleta.id ? 'white' : '#1e293b',
                          border: selectedAtleta === atleta.id ? '2px solid #1e40af' : '1px solid #e2e8f0',
                          borderRadius: 8,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          textAlign: 'left',
                          fontWeight: selectedAtleta === atleta.id ? 600 : 400
                        }}
                      >
                        <span style={{
                          minWidth: 32,
                          height: 32,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: selectedAtleta === atleta.id ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                          color: selectedAtleta === atleta.id ? 'white' : '#64748b',
                          borderRadius: 6,
                          fontWeight: 700,
                          fontSize: '0.85rem'
                        }}>
                          #{atleta.numero_maglia}
                        </span>
                        <span style={{ fontSize: '0.9rem' }}>
                          {atleta.nome} {atleta.cognome}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Squadra Ospite */}
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 12,
                    padding: 12,
                    background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
                    borderRadius: 8
                  }}>
                    {squadraOspite.logo_url && (
                      <img src={squadraOspite.logo_url} alt={squadraOspite.name} style={{ width: 32, height: 32, objectFit: 'contain' }} />
                    )}
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{squadraOspite.name}</div>
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {atletiOspite.map(atleta => (
                      <button
                        key={atleta.id}
                        onClick={() => setSelectedAtleta(atleta.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: 12,
                          background: selectedAtleta === atleta.id ? 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)' : 'white',
                          color: selectedAtleta === atleta.id ? 'white' : '#1e293b',
                          border: selectedAtleta === atleta.id ? '2px solid #be185d' : '1px solid #e2e8f0',
                          borderRadius: 8,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          textAlign: 'left',
                          fontWeight: selectedAtleta === atleta.id ? 600 : 400
                        }}
                      >
                        <span style={{
                          minWidth: 32,
                          height: 32,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: selectedAtleta === atleta.id ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                          color: selectedAtleta === atleta.id ? 'white' : '#64748b',
                          borderRadius: 6,
                          fontWeight: 700,
                          fontSize: '0.85rem'
                        }}>
                          #{atleta.numero_maglia}
                        </span>
                        <span style={{ fontSize: '0.9rem' }}>
                          {atleta.nome} {atleta.cognome}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {status && (
                <div style={{
                  padding: 12,
                  background: status.includes('successo') ? '#d1fae5' : '#fee2e2',
                  color: status.includes('successo') ? '#065f46' : '#991b1b',
                  borderRadius: 8,
                  marginBottom: 16,
                  fontSize: '0.9rem',
                  fontWeight: 600
                }}>
                  {status}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Dialog.Close asChild>
                  <button className="btn secondary">
                    Annulla
                  </button>
                </Dialog.Close>
                <button
                  className="btn"
                  onClick={handleSubmit}
                  disabled={!selectedAtleta || submitting}
                  style={{
                    opacity: !selectedAtleta || submitting ? 0.5 : 1,
                    cursor: !selectedAtleta || submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting ? 'Invio...' : hasVoted ? 'Modifica Voto' : 'Conferma Voto'}
                </button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
