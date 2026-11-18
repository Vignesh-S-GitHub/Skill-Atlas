import { createContext, useContext, useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { ArrowUpRight, Check, ChevronRight, Clipboard, ExternalLink, GitFork, Search, X } from 'lucide-react'
import { filterOptions, formatDate, githubRepository, hasIssueRepository, hostName, searchUrl, siteStats } from '../catalog'
import type { Site } from '../catalog'
import { Favicon } from './CatalogUI'

export const ToastContext = createContext('')

export function Dialog({ title, children, onClose, kind = '' }: {
  title: ReactNode; children: ReactNode; onClose: () => void; kind?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const toast = useContext(ToastContext)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const focused = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (focused instanceof HTMLElement && focused.isConnected) focused.focus()
    }
  }, [])
  return <dialog ref={ref} className={`dialog ${kind}`} aria-labelledby={titleId} onCancel={event => {
    event.preventDefault()
    onClose()
  }} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className="dialog-inner">
      <header className="dialog-header"><div id={titleId} className="dialog-title">{title}</div>
        <button autoFocus type="button" className="icon-button bordered-icon" aria-label="Close dialog" onClick={onClose}><X size={20} /></button>
      </header>
      {children}
      <div className={`toast dialog-toast${toast ? ' toast-visible' : ''}`} role="status">{toast}</div>
    </div>
  </dialog>
}

export function DetailDialog({ site, onClose, copy }: { site: Site; onClose: () => void; copy: (value: string, label: string) => void }) {
  const stats = siteStats(site)
  return <Dialog title={<><Favicon site={site} /><div><h2>{site.name}</h2><p>{hostName(site)}</p></div></>} onClose={onClose} kind="detail-dialog">
    <div className="dialog-content detail-content">
      <div className="detail-intro">
        <span className="type-label">{site.type}</span>
        <span className="verified"><Check size={15} /> Verified <time dateTime={site.lastVerified}>{formatDate(site.lastVerified)}</time></span>
      </div>
      <p>{site.description}</p>
      <p className="best-for"><strong>Best for</strong> {site.bestFor}</p>
      {stats.length > 0 && <div className="stat-line">{stats.map(stat => <span key={stat} className="stat">{stat}</span>)}</div>}
      <section className="detail-section"><h3>How to install</h3>
        <p>{site.installGuide}</p>
        {site.installExample && <div className="code-block"><code>{site.installExample}</code>
          <button type="button" className="icon-button" aria-label="Copy install command" onClick={() => copy(site.installExample!, 'Install command copied')}><Clipboard size={17} /></button></div>}
        {site.installUrl && <a href={site.installUrl} className="inline-link" target="_blank" rel="noreferrer">Installation instructions <ArrowUpRight size={15} /></a>}
      </section>
      <section className="detail-section"><h3>Supported platforms</h3>
        {site.platforms.length ? <div className="tag-line">{site.platforms.map(platform => <span className="tag" key={platform}>{platform}</span>)}</div> : <p>Check compatibility on the individual skill page.</p>}
      </section>
      <div className="detail-tradeoffs">
        <section><h3>Pros</h3><ul>{site.pros.map(item => <li key={item}>{item}</li>)}</ul></section>
        <section><h3>Cons</h3><ul>{site.cons.map(item => <li key={item}>{item}</li>)}</ul></section>
      </div>
      <section className="detail-section"><h3>Verification sources</h3>
        {site.sources.map(source => <a href={source.url} className="inline-link source-link" key={source.url} target="_blank" rel="noreferrer">{source.label} <ArrowUpRight size={15} /></a>)}
      </section>
    </div>
    <div className="dialog-footer"><a className="primary-button" href={site.url} target="_blank" rel="noreferrer">Visit {site.name} <ArrowUpRight size={17} /></a></div>
  </Dialog>
}

export function EverywhereDialog({ sites, initialQuery, onClose }: { sites: Site[]; initialQuery: string; onClose: () => void }) {
  const [query, setQuery] = useState(initialQuery)
  const term = query.trim()
  const kindLabels = { native: 'Site search', site: 'Site-scoped web search', github: 'Repository code search' }
  return <Dialog title={<h2>Search everywhere</h2>} onClose={onClose} kind="everywhere-dialog">
    <div className="dialog-content">
      <p className="modal-description">Send one query to any source in the directory.</p>
      <label className="modal-search"><Search size={19} /><span className="sr-only">Skill keyword</span>
        <input type="search" placeholder="Try “react testing”" value={query} onChange={event => setQuery(event.target.value)} maxLength={200} />
      </label>
      {term ? <div className="destination-list">
        <a className="destination github-destination" target="_blank" rel="noreferrer" href={searchUrl('https://github.com/search?type=code&q=filename%3ASKILL.md%20{query}', term)}>
          <span className="destination-icon"><GitFork size={20} /></span>
          <span><strong>GitHub code search</strong><small>Search files named SKILL.md</small></span><ExternalLink size={16} />
        </a>
        {sites.map(site => <a className="destination" key={site.id} target="_blank" rel="noreferrer" href={searchUrl(site.searchUrlTemplate, term)}>
          <Favicon site={site} /><span><strong>{site.name}</strong><small>{kindLabels[site.searchKind]}</small></span><ArrowUpRight size={17} />
        </a>)}
      </div> : <p className="everywhere-empty">Enter a keyword to see search links for all {sites.length} sources and GitHub.</p>}
    </div>
  </Dialog>
}

export function IssueDialog({ site, onClose, copy }: { site?: Site; onClose: () => void; copy: (value: string, label: string) => void }) {
  const [repository, setRepository] = useState(hasIssueRepository ? githubRepository : '')
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [type, setType] = useState<string>(filterOptions.type[0])
  const [notes, setNotes] = useState('')
  const repo = repository.trim()
  const validRepo = /^[\w.-]+\/[\w.-]+$/.test(repo)
  const title = site ? `Broken link: ${site.name}` : `Site suggestion: ${name.trim()}`
  const body = site
    ? `## Broken link\n\n- Site: ${site.name}\n- URL: ${site.url}\n\n## What happened?\n\n${notes.trim() || 'Please describe the error or suggest a replacement URL.'}`
    : `## Suggested source\n\n- Name: ${name.trim()}\n- URL: ${url.trim()}\n- Type: ${type}\n\n## Why it belongs in SkillAtlas\n\n${notes.trim() || 'Please describe what the site offers.'}`
  const validWebsite = /^https?:\/\//i.test(url.trim())
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const submitter = (event.nativeEvent as SubmitEvent).submitter
    if (submitter?.getAttribute('value') === 'copy') {
      copy(`# ${title}\n\n${body}`, 'Issue draft copied')
      return
    }
    if (validRepo) window.open(`https://github.com/${repo}/issues/new?${new URLSearchParams({ title, body })}`, '_blank', 'noopener,noreferrer')
  }

  return <Dialog title={<h2>{site ? 'Report a broken link' : 'Submit a site'}</h2>} onClose={onClose}>
    <form onSubmit={submit}>
      <div className="dialog-content issue-fields">
        <p className="modal-description">{site ? `Report a problem with ${site.name}.` : 'Suggest a directory or repository that helps people discover agent skills.'}</p>
        {!site && <>
          <label>Site name<input required value={name} onChange={event => setName(event.target.value)} maxLength={100} placeholder="Name of the site" /></label>
          <label>Website URL<input required type="url" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://…" maxLength={400} /></label>
          <label>Type<select value={type} onChange={event => setType(event.target.value)}>{filterOptions.type.map(option => <option key={option}>{option}</option>)}</select></label>
        </>}
        <label>{site ? 'What happened?' : 'Why should it be listed?'}<textarea rows={3} value={notes} onChange={event => setNotes(event.target.value)} maxLength={1200} placeholder={site ? 'Error message or replacement URL' : 'What makes this source useful?'} /></label>
        {!hasIssueRepository && <label>GitHub repository<input value={repository} onChange={event => setRepository(event.target.value)} placeholder="owner/repository" maxLength={160} autoComplete="off" /><small>Use a repository with GitHub Issues enabled, or copy the draft below.</small></label>}
      </div>
      <div className="dialog-footer issue-actions">
        <button type="submit" className="secondary-button" value="copy" disabled={!site && (!name.trim() || !validWebsite)}><Clipboard size={16} /> Copy draft</button>
        <button type="submit" className="primary-button" value="github" disabled={!validRepo || (!site && (!name.trim() || !validWebsite))}>Open GitHub issue <ChevronRight size={17} /></button>
      </div>
    </form>
  </Dialog>
}
