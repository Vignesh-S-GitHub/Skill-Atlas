import Fuse from 'fuse.js'
import type { FuseResultMatch } from 'fuse.js'

export const filterOptions = {
  type: ['Directory', 'Marketplace', 'GitHub awesome-list', 'Niche hub'],
  focus: ['General', 'UI/Design', 'Frontend', 'Backend', 'Testing', 'DevOps', 'Data/AI'],
  installMethod: ['One-line CLI (npx)', 'Manual download', 'Plugin marketplace'],
  features: ['Instant search', 'Category browse', 'Inspect SKILL.md before install', 'Compatibility matrix', 'Community-vetted'],
  platforms: ['Claude Code', 'Codex CLI', 'Cursor', 'Copilot', 'Gemini CLI', 'Windsurf'],
} as const

export type FilterKey = keyof typeof filterOptions
export type Filters = Record<FilterKey, string[]>
export const filterLabels: Record<FilterKey, string> = {
  type: 'Type', focus: 'Focus', installMethod: 'Install method', features: 'Features', platforms: 'Platforms',
}
export const filterKeys = Object.keys(filterOptions) as FilterKey[]
export const emptyFilters: Filters = { type: [], focus: [], installMethod: [], features: [], platforms: [] }

export interface Site {
  id: string
  name: string
  url: string
  favicon: string
  searchUrlTemplate: string
  searchKind: 'native' | 'site' | 'github'
  summary: string
  description: string
  bestFor: string
  type: typeof filterOptions.type[number]
  focus: string[]
  installMethod: string | string[]
  features: string[]
  platforms: string[]
  stats: { skills?: string; categories?: number; platformsSupported?: number; listings?: string; stars?: string }
  tags: string[]
  addedAt: string
  lastVerified: string
  installGuide: string
  installExample?: string
  installUrl?: string
  pros: string[]
  cons: string[]
  sources: { label: string; url: string }[]
}

interface MatchRange { start: number; end: number }
export type Highlights = Record<string, Record<string, MatchRange[]>>
export interface SiteResult { site: Site; highlights: Highlights }

export function createSearch(sites: Site[]) {
  return new Fuse(sites, {
    keys: [
      { name: 'name', weight: 3 }, { name: 'tags', weight: 2.4 },
      { name: 'focus', weight: 2.2 }, { name: 'platforms', weight: 2 },
      { name: 'summary', weight: 1.7 }, { name: 'bestFor', weight: 1.5 },
      'description', 'type', 'installMethod', 'features',
    ],
    threshold: 0.22,
    ignoreLocation: true,
    includeMatches: true,
    includeScore: true,
    minMatchCharLength: 2,
  })
}

function collectHighlights(matches: readonly FuseResultMatch[]): Highlights {
  const highlights: Highlights = {}
  for (const { key, value, indices } of matches) {
    if (!key || !value) continue
    const fields = highlights[key] ??= {}
    const ranges = fields[value] ??= []
    for (const [start, end] of indices) ranges.push({ start, end: end + 1 })
  }
  return highlights
}

export function searchSites(index: ReturnType<typeof createSearch>, sites: Site[], query: string): SiteResult[] {
  const terms = query.trim().split(/\s+/).filter(Boolean)
  if (!terms.length) return sites.map(site => ({ site, highlights: {} }))
  const searches = terms.map(term => new Map(index.search(term).map(result => [result.item.id, result])))
  return [...searches[0].values()]
    .flatMap(first => {
      const matches = searches.flatMap(search => {
        const result = search.get(first.item.id)
        return result ? [result] : []
      })
      if (matches.length !== searches.length) return []
      return [{
        site: first.item,
        score: matches.reduce((sum, match) => sum + (match.score ?? 0), 0),
        highlights: collectHighlights(matches.flatMap(match => match.matches ?? [])),
      }]
    })
    .sort((left, right) => left.score - right.score)
}

export function matchesFilters(site: Site, filters: Filters, ignore?: FilterKey) {
  return filterKeys.every(key => {
    const selection = filters[key]
    return key === ignore || !selection.length || selection.some(value => {
      const entries = site[key]
      return typeof entries === 'string' ? entries === value : entries.includes(value)
    })
  })
}

export function siteStats(site: Site) {
  const { skills, categories, platformsSupported, listings, stars } = site.stats
  return [
    skills && `${skills} skills`,
    categories && `${categories} categories`,
    platformsSupported && `${platformsSupported} platforms`,
    listings && `${listings} listings`,
    stars && `${stars} stars`,
  ].filter((stat): stat is string => Boolean(stat))
}

export const hostName = (site: Site) => new URL(site.url).hostname.replace(/^www\./, '')

export function searchUrl(template: string, query: string) {
  return template.replaceAll('{query}', encodeURIComponent(query.trim()))
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(date))
}

export const githubRepository = (import.meta.env.VITE_GITHUB_REPOSITORY as string | undefined)?.trim() || ''
export const hasIssueRepository = /^[\w.-]+\/[\w.-]+$/.test(githubRepository)

