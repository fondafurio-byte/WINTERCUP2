import React from 'react'

type Item = { key: string; label: string; onClick?: () => void }

type Props = {
  open: boolean
  onClose: () => void
  items: Item[]
}

export default function SideMenu({ open, onClose, items }: Props){
  return (
    <div className={open ? 'side-overlay visible' : 'side-overlay'} onClick={onClose}>
      <nav className={open ? 'side-drawer open' : 'side-drawer'} onClick={e => e.stopPropagation()}>
        <div className="side-drawer-header">
          <strong>Menu</strong>
        </div>
        <ul className="side-drawer-list">
          {items.map(i => (
            <li key={i.key}>
              <button className="side-item" onClick={() => { i.onClick?.(); onClose() }}>{i.label}</button>
            </li>
          ))}
        </ul>
        <div style={{flex:1}} />
      </nav>
    </div>
  )
}
