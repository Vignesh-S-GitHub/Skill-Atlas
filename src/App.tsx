import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import {
  ArrowDownToLine, ArrowRight, Braces, CodeXml, Compass, Database, FlaskConical, GitCompareArrows, GitFork,
  Globe2, Heart, Moon, Plus, Search, SlidersHorizontal, Sun, Waypoints, X,
} from 'lucide-react'
import { AtlasGraphic } from './components/AtlasGraphic'
import { GitHubSkillsDialog } from './components/GitHubSkillsDialog'
import { CompareTable, EmptyState, FilterPanel, SiteCard, Skeletons } from './components/CatalogUI'
import { DetailDialog, Dialog, EverywhereDialog, IssueDialog, ToastContext } from './components/Dialogs'
import { createSearch, emptyFilters, filterKeys, matchesFilters, searchSites } from './catalog'
import type { FilterKey, Filters, Site } from './catalog'

const loadSites = () => import('../data/sites.json').then(module => module.default as Site[])
const quickFocus = [
  { name: 'UI design', value: 'UI/Design', Icon: Waypoints },
  { name: 'Frontend', value: 'Frontend', Icon: CodeXml },
  { name: 'Backend', value: 'Backend', Icon: Database },
  { name: 'Testing', value: 'Testing', Icon: FlaskConical },
  { name: 'DevOps', value: 'DevOps', Icon: Braces },
]
const tabs = [
  { id: 'all', label: 'All sources', Icon: Compass },
  { id: 'favorites', label: 'Favorites', Icon: Heart },
  { id: 'compare', label: 'Compare', Icon: GitCompareArrows },
] as const
type Tab = typeof tabs[number]['id']
type Overlay =
  | { kind: 'detail'; site: Site }
  | { kind: 'issue'; site?: Site }
  | { kind: 'everywhere'; initialQuery?: string }
  | { kind: 'github'; initialQuery: string; fromEverywhere?: boolean }
  | { kind: 'filters' }
const noSites: Site[] = []

function initialFavorites(): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem('skillatlas-favorites') ?? '[]')
    return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

function App() {
  const [sites, setSites] = useState<Site[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [tab, setTab] = useState<Tab>('all')
  const [favorites, setFavorites] = useState(initialFavorites)
  const [compared, setCompared] = useState<string[]>([])
  const [overlay, setOverlay] = useState<Overlay | null>(null)
  const [theme, setTheme] = useState(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')
  const [toast, setToast] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    let current = true
    loadSites().then(data => { if (current) setSites(data) }).catch(() => { if (current) setLoadError(true) })
    return () => { current = false }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', theme === 'dark' ? '#141511' : '#f7f7ee')
    try { localStorage.setItem('skillatlas-theme', theme) } catch { /* theme still applies in this tab */ }
  }, [theme])

  useEffect(() => {
    try { localStorage.setItem('skillatlas-favorites', JSON.stringify(favorites)) } catch { /* favorites still work in this tab */ }
  }, [favorites])

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      const target = event.target
      if (overlay || event.key !== '/' || event.altKey || event.metaKey || event.ctrlKey ||
        (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select')))) return
      event.preventDefault()
      inputRef.current?.focus()
    }
    document.addEventListener('keydown', shortcut)
    return () => document.removeEventListener('keydown', shortcut)
  }, [overlay])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const catalog = sites ?? noSites
  const index = useMemo(() => createSearch(catalog), [catalog])
  const matches = useMemo(() => searchSites(index, catalog, query), [index, catalog, query])
  const favoriteSites = catalog.filter(site => favorites.includes(site.id))
  const compareSites = compared.flatMap(id => {
    const site = catalog.find(entry => entry.id === id)
    return site ? [site] : []
  })
  const candidates = tab === 'favorites' ? matches.filter(({ site }) => favorites.includes(site.id)) : matches
  const results = candidates.filter(({ site }) => matchesFilters(site, filters))
  const selectionCount = filterKeys.reduce((sum, key) => sum + filters[key].length, 0)
  const resultCount = results.length
  const sourceCount = `${resultCount} ${resultCount === 1 ? 'source' : 'sources'}`

  function showToast(message: string) {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 3200)
  }

  async function copy(value: string, message: string) {
    try {
      if (navigator.clipboard) await navigator.clipboard.writeText(value)
      else throw new Error('Clipboard API unavailable')
    } catch {
      const field = document.createElement('textarea')
      const previous = document.activeElement
      field.value = value
      field.readOnly = true
      field.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
      const parent = document.querySelector('dialog[open] .dialog-inner') ?? document.body
      parent.appendChild(field)
      field.select()
      let copied = false
      try { copied = document.execCommand('copy') } catch { /* clipboard can be blocked */ }
      field.remove()
      if (previous instanceof HTMLElement) previous.focus()
      if (!copied) {
        showToast('Clipboard access is unavailable.')
        return
      }
    }
    showToast(message)
  }

  function toggleFilter(key: FilterKey, value: string) {
    setFilters(current => ({
      ...current,
      [key]: current[key].includes(value) ? current[key].filter(item => item !== value) : [...current[key], value],
    }))
  }

  function chooseFocus(value: string) {
    setFilters(current => ({ ...current, focus: current.focus.length === 1 && current.focus[0] === value ? [] : [value] }))
    if (tab === 'compare') setTab('all')
  }

  function toggleFavorite(id: string) {
    setFavorites(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id])
  }

  function toggleCompare(id: string) {
    if (compared.includes(id)) setCompared(compared.filter(value => value !== id))
    else if (compared.length === 3) showToast('Remove a source before comparing another.')
    else setCompared([...compared, id])
  }

  function clearSearch() {
    setFilters(emptyFilters)
    setQuery('')
  }

  function explore() {
    clearSearch()
    setTab('all')
    requestAnimationFrame(() => document.getElementById('tab-all')?.focus())
  }

  function changeTab(event: ReactKeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, Home: -currentIndex, End: tabs.length - currentIndex - 1 }
    if (!(event.key in offsets)) return
    event.preventDefault()
    const next = tabs[(currentIndex + offsets[event.key] + tabs.length) % tabs.length].id
    setTab(next)
    document.getElementById(`tab-${next}`)?.focus()
  }

  function exportFavorites() {
    const file = new Blob([
      '# SkillAtlas favorites\n\n',
      ...favoriteSites.map(site => `- [${site.name.replace(/[\[\]\\]/g, '\\$&')}](<${site.url}>) — ${site.summary}\n`),
    ], { type: 'text/markdown;charset=utf-8' })
    const download = document.createElement('a')
    download.href = URL.createObjectURL(file)
    download.download = 'skillatlas-favorites.md'
    download.click()
    window.setTimeout(() => URL.revokeObjectURL(download.href), 1000)
    showToast('Favorites exported')
  }

  const filterPanel = {
    filters, candidates, onToggle: toggleFilter, onReset: () => setFilters(emptyFilters),
  }
  const closeOverlay = () => { setOverlay(null); setToast('') }

  return <ToastContext.Provider value={toast}>
    <a className="skip-link" href="#directory">Skip to directory</a>
    <header className="topbar">
      <div className="shell nav">
        <a className="brand" href={import.meta.env.BASE_URL} aria-label="SkillAtlas home">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width="35" height="35" />
          <span>SkillAtlas</span>
        </a>
        <div className="nav-actions">
          <button className="icon-button theme-toggle" type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <button className="secondary-button nav-submit" type="button" onClick={() => setOverlay({ kind: 'issue' })} aria-label="Submit a site"><Plus size={17} /><span>Submit<span className="submit-suffix"> a site</span></span></button>
        </div>
      </div>
    </header>

    <main className="shell">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy"><h1 id="hero-title">Find your next<br /><em>agent skill.</em></h1>
          <p>Every place to find agent skills, in one search.</p>
        </div>
        <AtlasGraphic active={Boolean(query.trim() || selectionCount)} />
      </section>

      <div className="sticky-search">
        <div className="search-row">
          <div className="main-search" role="search">
            <label htmlFor="directory-search" className="sr-only">Search the directory</label><Search size={22} aria-hidden="true" />
            <input id="directory-search" ref={inputRef} type="search" value={query} maxLength={200} onChange={event => {
              setQuery(event.target.value)
              if (tab === 'compare') setTab('all')
            }} placeholder="Name, topic, or agent…" aria-keyshortcuts="/" />
            {query
              ? <button type="button" className="icon-button" aria-label="Clear search" onClick={() => { setQuery(''); inputRef.current?.focus() }}><X size={18} /></button>
              : <kbd aria-hidden="true">/</kbd>}
          </div>
          <button className="everywhere-button" type="button" onClick={() => setOverlay({ kind: 'everywhere' })} aria-label="Search everywhere"><Globe2 size={19} /><span><span className="everywhere-prefix">Search </span>everywhere</span><ArrowRight size={16} className="everywhere-arrow" /></button>
        </div>
      </div>

      <div className="helper-row">
        <span>I want to explore:</span>
        <div className="helper-chips">
          {quickFocus.map(({ name, value, Icon }) => <button type="button" className="helper-chip" key={value} aria-pressed={filters.focus.includes(value)} onClick={() => chooseFocus(value)}>
            <Icon size={15} aria-hidden="true" />{name}
          </button>)}
        </div>
      </div>

      <section className="directory" id="directory" aria-label="Skills directory" tabIndex={-1}>
        <div className="directory-bar">
          <div role="tablist" aria-label="Directory views" className="tabs">
            {tabs.map(({ id, label, Icon }, i) => <button type="button" role="tab" id={`tab-${id}`} key={id} aria-selected={tab === id}
              aria-controls={`panel-${id}`} tabIndex={tab === id ? 0 : -1} onClick={() => setTab(id)} onKeyDown={event => changeTab(event, i)}>
              <Icon size={17} aria-hidden="true" /><span>{label}</span>
              {id === 'favorites' && favoriteSites.length > 0 && <span className="tab-count">{favoriteSites.length}</span>}
              {id === 'compare' && compareSites.length > 0 && <span className="tab-count">{compareSites.length}</span>}
            </button>)}
          </div>
          {tab !== 'compare' && <button type="button" className="secondary-button mobile-filters" onClick={() => setOverlay({ kind: 'filters' })}>
            <SlidersHorizontal size={16} /><span>Filters{selectionCount ? ` (${selectionCount})` : ''}</span>
          </button>}
        </div>

        {tab === 'compare' ? <div className="compare-panel" id="panel-compare" role="tabpanel" aria-labelledby="tab-compare" tabIndex={0}>
          <div className="results-heading"><div><h2>Compare sources</h2><p>{compareSites.length} of 3 selected</p></div>
            {!!compareSites.length && <button type="button" className="secondary-button" onClick={() => setTab('all')}><Plus size={16} /> Browse sources</button>}
          </div>
          {compareSites.length ? <CompareTable sites={compareSites} onRemove={toggleCompare} onDetails={site => setOverlay({ kind: 'detail', site })} /> : <EmptyState kind="compare" onAction={explore} />}
        </div> : <div className="directory-layout" id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
          <aside className="sidebar" aria-label="Directory filters"><FilterPanel {...filterPanel} /></aside>
          <div className="result-area">
            <div className="results-heading">
              <div><h2>{tab === 'favorites' ? 'Saved sources' : 'Browse sources'}</h2>
                <p aria-live="polite">{loadError ? 'Directory unavailable' : sites ? `${sourceCount}${query.trim() ? ' found' : ''}` : 'Loading sources…'}</p>
              </div>
              {tab === 'all' && <button type="button" className="secondary-button github-launch" aria-label="Browse GitHub skills"
                onClick={() => setOverlay({ kind: 'github', initialQuery: query })}><GitFork size={17} aria-hidden="true" /> GitHub skills</button>}
              {tab === 'favorites' && favoriteSites.length > 0 && <button type="button" className="secondary-button export-button" onClick={exportFavorites}><ArrowDownToLine size={17} /> Export Markdown</button>}
            </div>

            {!!selectionCount && <div className="active-filters" aria-label="Active filters">
              {filterKeys.flatMap(key => filters[key].map(value => <button type="button" key={`${key}-${value}`} aria-label={`Remove ${value} filter`} onClick={() => toggleFilter(key, value)}>{value} <X size={13} /></button>))}
            </div>}
            {loadError ? <div className="empty-state"><h3>Couldn’t load the directory</h3><p>Reload the page to try again.</p><button className="secondary-button" type="button" onClick={() => location.reload()}>Reload</button></div>
              : !sites ? <Skeletons />
              : !resultCount ? <EmptyState kind={tab === 'favorites' && !favoriteSites.length ? 'favorites' : 'search'} onAction={tab === 'favorites' && !favoriteSites.length ? explore : clearSearch} />
              : <div className="card-grid">{results.map(result => {
                const site = result.site
                return <SiteCard key={site.id} result={result} favorite={favorites.includes(site.id)} compared={compared.includes(site.id)}
                  onFavorite={() => toggleFavorite(site.id)} onCompare={() => toggleCompare(site.id)}
                  onDetails={() => setOverlay({ kind: 'detail', site })}
                  onCopy={() => { void copy(site.url, 'Link copied') }} onReport={() => setOverlay({ kind: 'issue', site })} />
              })}</div>}
          </div>
        </div>}
      </section>
    </main>

    <footer className="page-footer"><div className="shell footer-inner">
      <span className="footer-brand"><img alt="" src={`${import.meta.env.BASE_URL}icon.svg`} width="22" height="22" /> SkillAtlas</span>
      <button className="text-button" type="button" onClick={() => setOverlay({ kind: 'issue' })}>Suggest a source <ArrowRight size={15} /></button>
    </div></footer>

    {!overlay && <div className={`toast${toast ? ' toast-visible' : ''}`} role="status">{toast}</div>}
    {overlay?.kind === 'detail' && <DetailDialog site={overlay.site} onClose={closeOverlay} copy={copy} />}
    {overlay?.kind === 'issue' && <IssueDialog site={overlay.site} onClose={closeOverlay} copy={copy} />}
    {overlay?.kind === 'everywhere' && <EverywhereDialog sites={catalog} initialQuery={overlay.initialQuery ?? query}
      onClose={closeOverlay} onBrowseGitHub={initialQuery => setOverlay({ kind: 'github', initialQuery, fromEverywhere: true })} />}
    {overlay?.kind === 'github' && <GitHubSkillsDialog initialQuery={overlay.initialQuery} onClose={closeOverlay}
      onBack={overlay.fromEverywhere ? () => setOverlay({ kind: 'everywhere', initialQuery: overlay.initialQuery }) : undefined} />}
    {overlay?.kind === 'filters' && <Dialog title={<h2>Directory filters</h2>} onClose={closeOverlay} kind="filter-sheet">
      <div className="dialog-content"><FilterPanel {...filterPanel} /></div>
      <div className="dialog-footer"><button type="button" className="primary-button" onClick={closeOverlay}>Show {sourceCount} <ArrowRight size={17} /></button></div>
    </Dialog>}
  </ToastContext.Provider>
}

export default App
