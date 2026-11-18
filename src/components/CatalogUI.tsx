import { useEffect, useRef, useState } from 'react'
import {
  ArrowUpRight, Check, CircleHelp, Flag, GitCompareArrows, Globe2, Heart, Link2, Plus,
} from 'lucide-react'
import {
  filterKeys, filterLabels, filterOptions, formatDate, hostName, matchesFilters, siteStats,
} from '../catalog'
import type { FilterKey, Filters, Highlights, Site, SiteResult } from '../catalog'

export function Highlight({ value, field, highlights = {} }: { value: string; field: string; highlights?: Highlights }) {
  const ranges = highlights[field]?.[value]
  if (!ranges?.length) return value
  const merged: { start: number; end: number }[] = []
  for (const range of [...ranges].sort((a, b) => a.start - b.start)) {
    const last = merged.at(-1)
    if (last && range.start <= last.end) last.end = Math.max(last.end, range.end)
    else merged.push({ ...range })
  }
  return <>
    {merged.map(({ start, end }, i) => <span key={start}>
      {value.slice(merged[i - 1]?.end ?? 0, start)}
      <mark>{value.slice(start, end)}</mark>
    </span>)}
    {value.slice(merged.at(-1)?.end)}
  </>
}

export function Favicon({ site }: { site: Site }) {
  const [failed, setFailed] = useState(false)
  return <span className={`favicon icon-${site.id}`} aria-hidden="true">
    {failed ? <Globe2 size={21} /> : <img src={`${import.meta.env.BASE_URL}icons/${site.favicon}`} alt="" onError={() => setFailed(true)} />}
  </span>
}

interface CardProps {
  result: SiteResult
  favorite: boolean
  compared: boolean
  onFavorite: () => void
  onCompare: () => void
  onDetails: () => void
  onCopy: () => void
  onReport: () => void
}

export function SiteCard({ result, favorite, compared, onFavorite, onCompare, onDetails, onCopy, onReport }: CardProps) {
  const { site, highlights } = result
  const cardRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const card = cardRef.current
    if (!card || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      card.dataset.visible = 'true'
      observer.disconnect()
    }, { threshold: 0.15 })
    observer.observe(card)
    return () => observer.disconnect()
  }, [])

  const chipFields = ['focus', 'platforms', 'installMethod', 'features']
  const metadata = chipFields.flatMap(field => Object.keys(highlights[field] ?? {}).map(value => ({ value, field })))
  const descriptionMatch = Object.entries(highlights.description ?? {})[0]
  const excerptStart = Math.max(0, (descriptionMatch?.[1][0]?.start ?? 0) - 22)
  return <article ref={cardRef} className="site-card">
    <div className="card-top">
      <Favicon site={site} />
      <div className="card-tools">
        <button type="button" className="icon-button icon-subtle" aria-label={`Report broken link for ${site.name}`} title="Report broken link" onClick={onReport}><Flag size={16} /></button>
        <button type="button" className="icon-button icon-subtle" aria-label={`Copy link to ${site.name}`} title="Copy link" onClick={onCopy}><Link2 size={17} /></button>
        <button type="button" className="icon-button icon-subtle favorite" aria-label={`Favorite ${site.name}`} aria-pressed={favorite} title={favorite ? 'Remove favorite' : 'Add favorite'} onClick={onFavorite}><Heart size={18} fill={favorite ? 'currentColor' : 'none'} /></button>
      </div>
    </div>
    <div className="card-heading">
      <span className={`type-label type-${site.type.split(' ')[0].toLowerCase()}`}><Highlight value={site.type} field="type" highlights={highlights} /></span>
      <h3><button type="button" onClick={onDetails}><Highlight value={site.name} field="name" highlights={highlights} /></button></h3>
    </div>
    <p className="card-summary"><Highlight value={site.summary} field="summary" highlights={highlights} /></p>
    <p className="best-for"><strong>Best for</strong> <Highlight value={site.bestFor} field="bestFor" highlights={highlights} /></p>
    {descriptionMatch && Object.keys(highlights).length === 1 && <p className="description-match">
      {excerptStart > 0 && '…'}{descriptionMatch[0].slice(excerptStart, descriptionMatch[1][0].start)}
      <mark>{descriptionMatch[0].slice(descriptionMatch[1][0].start, descriptionMatch[1][0].end)}</mark>
      {descriptionMatch[0].slice(descriptionMatch[1][0].end, descriptionMatch[1][0].end + 36)}…
    </p>}
    <div className="card-meta">
      {!!siteStats(site).length && <div className="stat-line">{siteStats(site).map(stat => <span className="stat" key={stat}>{stat}</span>)}</div>}
      <div className="tag-line">
        {site.tags.map(tag => <span className="tag" key={tag}><Highlight value={tag} field="tags" highlights={highlights} /></span>)}
        {metadata.slice(0, 4).map(({ value, field }) => <span className="tag" key={`${field}/${value}`}><Highlight value={value} field={field} highlights={highlights} /></span>)}
      </div>
    </div>
    <div className="card-footer">
      <a className="visit-button" href={site.url} target="_blank" rel="noreferrer" aria-label={`Visit ${site.name}`}>Visit site <ArrowUpRight size={15} /></a>
      <button type="button" className="compare-button" aria-label={`Compare ${site.name}`} aria-pressed={compared} onClick={onCompare}>{compared ? <Check size={15} /> : <Plus size={15} />} Compare</button>
    </div>
  </article>
}

interface FilterPanelProps {
  filters: Filters
  candidates: SiteResult[]
  onToggle: (key: FilterKey, value: string) => void
  onReset: () => void
}

export function FilterPanel({ filters, candidates, onToggle, onReset }: FilterPanelProps) {
  const selectedCount = filterKeys.reduce((sum, key) => sum + filters[key].length, 0)
  return <>
    <div className="filter-title"><strong>Filters</strong><button type="button" className="text-button" onClick={onReset} disabled={!selectedCount}>Reset</button></div>
    {filterKeys.map(key => {
      const eligible = candidates.filter(({ site }) => matchesFilters(site, filters, key))
      return <details className="filter-group" key={key} open={key === 'type' || key === 'focus' || key === 'platforms' ? true : undefined}>
        <summary><span>{filterLabels[key]}{filters[key].length > 0 && <span className="facet-number">{filters[key].length}</span>}</span></summary>
        <div className="filter-options">
          {filterOptions[key].map(value => {
            const selected = filters[key].includes(value)
            const count = eligible.filter(({ site }) => {
              const entries = site[key]
              return typeof entries === 'string' ? entries === value : entries.includes(value)
            }).length
            return <button type="button" className="facet-option" key={value} aria-pressed={selected} onClick={() => onToggle(key, value)}>
              <span className="facet-check">{selected && <Check size={11} strokeWidth={3} />}</span>
              <span>{value}</span><span className="option-count" aria-hidden="true">{count}</span>
            </button>
          })}
        </div>
      </details>
    })}
  </>
}

export function EmptyState({ kind, onAction }: { kind: 'search' | 'favorites' | 'compare'; onAction: () => void }) {
  const options = {
    search: { Icon: CircleHelp, title: 'No matching sources', body: 'Try a shorter search or clear your filters.', action: 'Clear search and filters' },
    favorites: { Icon: Heart, title: 'Your shortlist starts here', body: 'Select the heart on any source to save it here.', action: 'Explore sources' },
    compare: { Icon: GitCompareArrows, title: 'Compare your shortlist', body: 'Select Compare on up to three cards to see their installation methods and platforms side by side.', action: 'Explore sources' },
  }[kind]
  return <div className="empty-state">
    <options.Icon size={26} aria-hidden="true" />
    <h3>{options.title}</h3><p>{options.body}</p>
    <button type="button" className="secondary-button" onClick={onAction}>{options.action}</button>
  </div>
}

export function CompareTable({ sites, onRemove, onDetails }: { sites: Site[]; onRemove: (id: string) => void; onDetails: (site: Site) => void }) {
  const rows = [
    { label: 'Type', value: (site: Site) => site.type },
    { label: 'Best for', value: (site: Site) => site.bestFor },
    { label: 'Install methods', value: (site: Site) => [site.installMethod].flat().join(', ') },
    { label: 'Platforms', value: (site: Site) => site.platforms.join(', ') || 'Varies by skill' },
    { label: 'Features', value: (site: Site) => site.features.join(', ') || '—' },
    { label: 'Published stats', value: (site: Site) => siteStats(site).join(' · ') || '—' },
    { label: 'Last verified', value: (site: Site) => formatDate(site.lastVerified) },
  ]
  return <div className="table-scroll" tabIndex={0} role="region" aria-label="Scrollable site comparison">
    <table className="compare-table">
      <caption className="sr-only">Compare selected agent skills sources</caption>
      <thead><tr><th scope="col">Source</th>{sites.map(site => <th scope="col" key={site.id}>
        <Favicon site={site} />
        <button className="compare-name" type="button" onClick={() => onDetails(site)}>{site.name}</button>
        <span className="compare-host">{hostName(site)}</span>
        <button type="button" className="text-button compare-remove" onClick={() => onRemove(site.id)} aria-label={`Remove ${site.name} from comparison`}>Remove</button>
      </th>)}</tr></thead>
      <tbody>
        {rows.map(row => <tr key={row.label}><th scope="row">{row.label}</th>{sites.map(site => <td key={site.id}>{row.value(site)}</td>)}</tr>)}
        <tr><th scope="row">Website</th>{sites.map(site => <td key={site.id}>
          <a className="visit-button" href={site.url} target="_blank" rel="noreferrer">Visit site <ArrowUpRight size={15} /></a>
        </td>)}</tr>
      </tbody>
    </table>
  </div>
}

export function Skeletons() {
  return <div className="card-grid" aria-label="Loading sources" aria-busy="true">
    {[1, 2, 3].map(slot => <div className="site-card skeleton" key={slot} aria-hidden="true">
      <span /><span /><span /><span /><span />
    </div>)}
  </div>
}
