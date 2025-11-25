import React from 'react'
import { Menu } from 'lucide-react'

type Props = {
  title?: string
  onHamburger?: () => void
}

export default function Topbar({ title = 'App', onHamburger }: Props){
  return (
    <header className="rw-topbar">
      <button className="rw-hamburger" onClick={onHamburger} aria-label="Apri menu">
        <Menu size={20} />
      </button>
      <div className="rw-topbar-title">{title}</div>
    </header>
  )
}
