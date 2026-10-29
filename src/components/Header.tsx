import { useEffect, useState } from 'react'
import { ChevronDown, Clock3, FileText, Menu, Upload, Download, History, X } from 'lucide-react'
import type { DocumentType } from '../types'
import { formatNepaliDate, today } from '../dateUtils'

type Props = {
  onNew: (type: DocumentType) => void
  onHistory: () => void
  onExport: () => void
  onImport: (file: File) => void
  activePage: string
}

const billOptions: { type: DocumentType; label: string }[] = [
  { type: 'normal', label: 'Normal Bill' },
  { type: 'receipt', label: 'Receipt Bill' },
  { type: 'payment', label: 'Payment Bill' },
]

export default function Header({ onNew, onHistory, onExport, onImport, activePage }: Props) {
  const [billOpen, setBillOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const openNew = (type: DocumentType) => {
    onNew(type)
    setBillOpen(false)
    setMenuOpen(false)
  }
  const formattedDate = formatNepaliDate(today())

  return (
    <header className="topbar no-print">
      <div className="topbar-inner">
        <div className="topbar-time" aria-label="Current time">
          <Clock3 size={15} />
          <span>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <button className="brand" type="button" onClick={() => openNew('normal')} aria-label="Global Tax Nepal home">
          <span className="brand-mark"><FileText size={17} /></span>
          <span>Global Tax Nepal</span>
        </button>
        <span className="topbar-date">B.S. {formattedDate}</span>

        <nav className="topbar-nav" aria-label="Main navigation">
          <div className="dropdown-wrap">
            <button
              type="button"
              className={`nav-button ${activePage !== 'history' ? 'active' : ''}`}
              aria-expanded={billOpen}
              onClick={() => { setBillOpen(!billOpen); setMenuOpen(false) }}
            >
              Bill <ChevronDown size={15} />
            </button>
            {billOpen && (
              <div className="dropdown-menu bill-menu">
                {billOptions.map((option) => (
                  <button type="button" key={option.type} onClick={() => openNew(option.type)}>
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" className={`nav-button ${activePage === 'history' ? 'active' : ''}`} onClick={onHistory}>
            History
          </button>
          <div className="dropdown-wrap menu-wrap">
            <button
              className="icon-button menu-button"
              type="button"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => { setMenuOpen(!menuOpen); setBillOpen(false) }}
            >
              {menuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
            {menuOpen && (
              <div className="dropdown-menu utility-menu">
                <button type="button" onClick={() => { onHistory(); setMenuOpen(false) }}><History size={15} /> History</button>
                <button type="button" onClick={() => { onExport(); setMenuOpen(false) }}><Download size={15} /> Export backup</button>
                <label className="menu-upload">
                  <Upload size={15} /> Import backup
                  <input
                    type="file"
                    accept="application/json,.json"
                    aria-label="Import backup JSON"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0]
                      if (file) onImport(file)
                      event.currentTarget.value = ''
                      setMenuOpen(false)
                    }}
                  />
                </label>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}
