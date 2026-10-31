import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon, type IconName } from './dashboard/ui'
import { displayName, profileInitial } from '../config/profile'

const navigation: { id: string; title: string; icon: IconName }[] = [
  { id: 'today', title: 'Today', icon: 'home' },
  { id: 'tasks', title: 'Tasks', icon: 'check' },
  { id: 'projects', title: 'Projects', icon: 'layers' },
  { id: 'schedule', title: 'Calendar', icon: 'calendar' },
]

export function AppShell({
  children,
  now,
  search,
  onSearch,
  calendarControl,
}: {
  children: ReactNode
  now: Date
  search: string
  onSearch: (value: string) => void
  calendarControl: ReactNode
}) {
  const [active, setActive] = useState(
    () => window.location.hash.slice(1) || 'today'
  )
  const [menuOpen, setMenuOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onHashChange = () => {
      setActive(window.location.hash.slice(1) || 'today')
      setMenuOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('hashchange', onHashChange)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('hashchange', onHashChange)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to dashboard
      </a>
      {menuOpen && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        id="app-navigation"
        className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}
      >
        <a
          href="#today"
          className="brand"
          onClick={() => {
            setActive('today')
            setMenuOpen(false)
          }}
        >
          <span className="brand-mark">PH</span>
          <span>Personal Hub</span>
        </a>
        <span className="nav-caption">YOUR WORKSPACE</span>
        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              aria-label={item.title}
              title={item.title}
              className={`nav-item ${active === item.id ? 'active' : ''}`}
              aria-current={active === item.id ? 'location' : undefined}
              onClick={() => {
                setActive(item.id)
                setMenuOpen(false)
              }}
            >
              <Icon name={item.icon} />
              <span>{item.title}</span>
              {active === item.id && <span className="nav-active-dot" />}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {calendarControl}
          <div className="profile">
            <span className="avatar">{profileInitial}</span>
            <div>
              <strong>{displayName || 'Your workspace'}</strong>
              <span>Personal workspace</span>
            </div>
            <span className="connection-dot connected" />
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menuOpen}
            aria-controls="app-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} />
          </button>
          <div className="dashboard-search" role="search">
            <Icon name="search" size={17} />
            <input
              ref={searchRef}
              aria-label="Search today’s tasks, projects and events"
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Search today’s tasks, projects, events…"
            />
            {search ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => onSearch('')}
              >
                <Icon name="close" size={14} />
              </button>
            ) : (
              <kbd aria-hidden="true">Ctrl K</kbd>
            )}
          </div>
          <div className="topbar-date">
            <Icon name="calendar" size={14} />
            <time dateTime={now.toISOString()}>
              {now.toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </time>
          </div>
        </header>
        <main id="main-content" className="dashboard-content">
          {children}
        </main>
        <footer className="workspace-footer">
          <span>Personal Hub</span>
        </footer>
      </div>
    </div>
  )
}
