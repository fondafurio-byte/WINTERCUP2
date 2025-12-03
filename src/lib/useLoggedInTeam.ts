import { useContext } from 'react'
import { TeamContext } from './teamContext'

export function useLoggedInTeam() {
  return useContext(TeamContext)
}
