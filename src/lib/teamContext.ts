import { createContext } from 'react'

export interface TeamContextType {
  loggedInTeamId: string | null
  setLoggedInTeamId: (teamId: string | null) => void
}

export const TeamContext = createContext<TeamContextType>({
  loggedInTeamId: null,
  setLoggedInTeamId: () => {},
})
