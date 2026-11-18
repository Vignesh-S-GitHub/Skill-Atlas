import { useEffect, useId, useMemo, useState } from 'react'
import { ArrowUpRight, ChevronDown, FileText, GitFork, RefreshCw, Search, X } from 'lucide-react'
import { Dialog } from './Dialogs'
import {
  collectSkills, createSkillSearch, filterSkills, getSkillIndex, githubCodeSearchUrl,
  githubRepositorySearchUrl, savedSkillIndex, skillFileUrl,
} from '../githubSkills'

const pageSize = 18

export function GitHubSkillsDialog({ initialQuery, onClose, onBack }: {
  initialQuery: string; onClose: () => void; onBack?: () => void
}) {
  const searchId = useId()
  const [query, setQuery] = useState(initialQuery)
  const [repository, setRepository] = useState('')
  const [visibleCount, setVisibleCount] = useState(pageSize)
  const [index, setIndex] = useState(savedSkillIndex)
  const [refresh, setRefresh] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    getSkillIndex(refresh > 0).then(next => {
      if (!active) return
      setIndex(next)
      setLoading(false)
    })
    return () => { active = false }
  }, [refresh])

  const skills = useMemo(() => collectSkills(index.repositories), [index])
  const search = useMemo(() => createSkillSearch(skills), [skills])
  const results = useMemo(() => filterSkills(skills, search, query, repository), [skills, search, query, repository])
  const status = loading
    ? 'Checking GitHub for updates…'
    : index.updatedCount === index.repositories.length
      ? 'Updated from GitHub'
      : index.updatedCount ? 'Some repositories are showing saved results' : 'Showing saved results'

  function changeQuery(value: string) {
    setQuery(value)
    setVisibleCount(pageSize)
  }

  function changeRepository(value: string) {
    setRepository(value)
    setVisibleCount(pageSize)
  }

  return <Dialog title={<><span className="destination-icon"><GitFork size={20} /></span><h2>GitHub skills</h2></>}
    onClose={onClose} kind="git-skill-dialog">
    <div className="dialog-content">
      {onBack && <button type="button" className="text-button git-back" onClick={onBack}>Back to Search everywhere</button>}
      <p className="modal-description">Browse public <code>SKILL.md</code> files by name or repository. No GitHub sign-in required.</p>
      <div className="modal-search git-search"><Search size={19} aria-hidden="true" />
        <label className="sr-only" htmlFor={searchId}>Search GitHub skills</label>
        <input id={searchId} type="search" data-initial-focus value={query} onChange={event => changeQuery(event.target.value)}
          placeholder="Try “react” or “pdf”" maxLength={200} />
        {!!query && <button className="icon-button" type="button" aria-label="Clear skill search" onClick={() => changeQuery('')}><X size={17} /></button>}
      </div>
      <div className="git-repos" role="group" aria-label="Filter GitHub skills by repository">
        <button type="button" className="helper-chip" aria-pressed={!repository} onClick={() => changeRepository('')}>All repositories</button>
        {index.repositories.map(source => <button key={source.repository} type="button" className="helper-chip"
          aria-pressed={repository === source.repository} onClick={() => changeRepository(source.repository)}>{source.label}</button>)}
      </div>
      <div className="git-status">
        <p role="status"><strong>{results.length} {results.length === 1 ? 'skill' : 'skills'}</strong><span>{status}</span></p>
        <button type="button" className="icon-button bordered-icon" aria-label="Refresh GitHub skills" title="Refresh GitHub skills" disabled={loading} aria-busy={loading}
          onClick={() => { setLoading(true); setRefresh(value => value + 1) }}><RefreshCw size={16} aria-hidden="true" /></button>
      </div>
      {results.length ? <>
        <ul className="git-skill-list" aria-label="GitHub skill files">
          {results.slice(0, visibleCount).map(skill => <li key={`${skill.repository}/${skill.path}`}>
            <a className="destination" href={skillFileUrl(skill)} target="_blank" rel="noreferrer">
              <span className="destination-icon"><FileText size={17} /></span>
              <span><strong>{skill.name}</strong><small>{skill.repository}</small></span>
              <ArrowUpRight size={17} aria-hidden="true" />
            </a>
          </li>)}
        </ul>
        {visibleCount < results.length && <button type="button" className="secondary-button git-more" onClick={() => setVisibleCount(value => value + pageSize)}>
          Show more skills <ChevronDown size={15} />
        </button>}
      </> : <div className="git-empty">
        <strong>No matching skill names</strong>
        <p>Try a shorter keyword or search file contents across GitHub.</p>
      </div>}
    </div>
    <div className="dialog-footer git-search-links">
      <a className="secondary-button" href={githubRepositorySearchUrl(query)} target="_blank" rel="noreferrer">Find repositories <ArrowUpRight size={15} /></a>
      <a className="secondary-button" href={githubCodeSearchUrl(query)} target="_blank" rel="noreferrer" aria-describedby="github-sign-in">
        GitHub code search <ArrowUpRight size={15} />
      </a>
      <p id="github-sign-in">GitHub requires sign-in for code search.</p>
    </div>
  </Dialog>
}
