import Fuse from 'fuse.js'
import type { Expression } from 'fuse.js'
import repositorySnapshots from '../data/github-skills.json'

interface RepositorySkills {
  repository: string
  label: string
  paths: string[]
}

interface TreeEntry {
  path?: string
  type?: string
}

export interface GitHubSkill {
  repository: string
  path: string
  name: string
}

interface SkillIndex {
  repositories: RepositorySkills[]
  updatedCount: number
}

export const savedSkillIndex: SkillIndex = { repositories: repositorySnapshots, updatedCount: 0 }

const refreshInterval = 10 * 60 * 1000
let cachedIndex: { data: SkillIndex; expiresAt: number } | undefined
let pendingRefresh: Promise<SkillIndex> | undefined

function isSkillPath(path: string) {
  return path.startsWith('skills/') && path.endsWith('/SKILL.md')
}

async function fetchRepositorySkills(source: RepositorySkills): Promise<RepositorySkills> {
  const url = `https://api.github.com/repos/${source.repository}/git/trees/HEAD?recursive=1`
  const response = await fetch(url, { signal: AbortSignal.timeout(6500) })
  if (!response.ok) throw new Error(`GitHub request failed (${response.status})`)
  const data: { tree?: TreeEntry[]; truncated?: boolean } = await response.json()
  if (data.truncated || !Array.isArray(data.tree)) throw new Error('GitHub returned an incomplete file tree')
  const paths = data.tree.flatMap(entry =>
    entry.type === 'blob' && typeof entry.path === 'string' && isSkillPath(entry.path) ? [entry.path] : [],
  )
  return { ...source, paths }
}

export function getSkillIndex(force = false): Promise<SkillIndex> {
  if (pendingRefresh) return pendingRefresh
  if (!force && cachedIndex && cachedIndex.expiresAt > Date.now()) return Promise.resolve(cachedIndex.data)

  const previous = cachedIndex?.data.repositories ?? repositorySnapshots
  pendingRefresh = Promise.allSettled(repositorySnapshots.map(fetchRepositorySkills)).then(results => {
    const data = {
      repositories: results.map((result, index) => result.status === 'fulfilled' ? result.value : previous[index]),
      updatedCount: results.filter(result => result.status === 'fulfilled').length,
    }
    cachedIndex = { data, expiresAt: Date.now() + (data.updatedCount ? refreshInterval : 60_000) }
    return data
  }).finally(() => { pendingRefresh = undefined })
  return pendingRefresh
}

export function collectSkills(repositories: RepositorySkills[]): GitHubSkill[] {
  const lists = repositories.map(({ repository, paths }) => paths.map(path => {
    const folder = path.split('/').at(-2) ?? 'Skill'
    const name = folder.replaceAll('-', ' ').replaceAll('_', ' ')
    return { repository, path, name: name.charAt(0).toUpperCase() + name.slice(1) }
  }))

  // Mix repositories in the initial view so the largest source can't crowd out the others.
  const longest = Math.max(0, ...lists.map(list => list.length))
  return Array.from({ length: longest }, (_, i) => lists.flatMap(list => list[i] ? [list[i]] : [])).flat()
}

export function createSkillSearch(skills: GitHubSkill[]) {
  return new Fuse(skills, {
    keys: [{ name: 'name', weight: 4 }, 'repository'],
    threshold: 0.22,
    ignoreLocation: true,
    minMatchCharLength: 2,
  })
}

export function filterSkills(
  skills: GitHubSkill[],
  index: ReturnType<typeof createSkillSearch>,
  query: string,
  repository: string,
) {
  const terms = query.toLowerCase().trim().match(/[\p{L}\p{N}]+/gu) ?? []
  const hits = terms.length
    ? index.search({ $and: terms.map<Expression>(term => ({
      $or: [{ $path: ['name'], $val: term }, { $path: ['repository'], $val: term }],
    })) }).map(result => result.item)
    : skills
  return repository ? hits.filter(skill => skill.repository === repository) : hits
}

export function skillFileUrl({ repository, path }: GitHubSkill) {
  return `https://github.com/${repository}/blob/HEAD/${path.split('/').map(encodeURIComponent).join('/')}`
}

export function githubCodeSearchUrl(query: string) {
  const exactFile = String.raw`path:/(^|\/)SKILL\.md$/`
  return `https://github.com/search?${new URLSearchParams({ q: [exactFile, query.trim()].filter(Boolean).join(' '), type: 'code' })}`
}

export function githubRepositorySearchUrl(query: string) {
  return `https://github.com/search?${new URLSearchParams({ q: [query.trim(), 'topic:agent-skills'].filter(Boolean).join(' '), type: 'repositories' })}`
}
