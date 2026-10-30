import type { EngineInterface, Register } from 'claude-code'

type Agent = { id: string; type: string; startedAt: number }
type Event = { id: number; type: 'commit' | 'push' | 'tests-green' | 'tests-red'; at: number; text: string }
type Entry = {
  id: string
  project: string
  startedAt: number
  updatedAt: number
  busy: number
  tool: string
  agents: Agent[]
  events: Event[]
  commitsToday: number
}

const BUSY_WINDOW_MS = 90_000
const STALE_MS = 15_000

let dir = ''
let sessionId = ''
let project = ''
let startedAt = 0
let active = false
let tool = ''
let toolUntil = 0
let calls: number[] = []
let events: Event[] = []
let eventId = 0
let agents: Agent[] = []
let commitsToday = -1
const seen = new Map<string, number>()

const GIT_TIMEOUT_MS = 4000

/** Runs git with a time limit; any failure, a missing git, or a folder that is no repository gives an empty answer. */
async function git($: EngineInterface, args: string[], cwd?: string): Promise<string> {
  try {
    const ran = await $.process.run(['git', ...args], { timeoutMs: GIT_TIMEOUT_MS, ...(cwd ? { cwd } : {}) })
    return ran.exitCode === 0 ? ran.stdout.trim() : ''
  } catch {
    return ''
  }
}

async function home($: EngineInterface): Promise<string> {
  const out = await $.process.run(['printenv', 'HOME'], { timeoutMs: 2000 })
  return out.stdout.trim()
}

async function install($: EngineInterface): Promise<void> {
  dir = `${await home($)}/.claude/foxtrail`
  await $.fs.write(`${dir}/index.html`, await $.fs.read(`${$.plugin.root}/web/index.html`))
}

function push(type: Event['type'], now: number, text = ''): void {
  events.push({ id: ++eventId, type, at: now, text: text.slice(0, 120) })
  events = events.slice(-30)
}

/** How many commits the maker made today. Only the count leaves git: subjects stay private and may be in any language. */
async function todaysCommits($: EngineInterface): Promise<number> {
  const name = await git($, ['config', 'user.name'])
  if (!name) return 0
  const midnight = new Date()
  midnight.setHours(0, 0, 0, 0)
  const log = await git($, ['log', '--all', `--since=${midnight.toISOString()}`, '--format=%h', `--author=${name}`])
  return log.split('\n').filter(Boolean).length
}

async function refreshCommits($: EngineInterface): Promise<void> {
  const count = await todaysCommits($)
  if (commitsToday >= 0 && count > commitsToday) {
    const now = await $.clock.now()
    for (let i = commitsToday; i < count; i++) push('commit', now)
  }
  commitsToday = count
}

async function refreshAgents($: EngineInterface): Promise<void> {
  const now = await $.clock.now()
  const list = await $.agent.list().catch(() => [])
  agents = list
    .filter(a => a.status === 'pending' || a.status === 'running' || a.status === 'waiting')
    .map(a => {
      if (!seen.has(a.id)) seen.set(a.id, now)
      return { id: a.id, type: a.type, startedAt: seen.get(a.id)! }
    })
}

/** Reads the shared state file: one entry per running session. */
async function readShared($: EngineInterface): Promise<Record<string, Entry>> {
  try {
    const text = await $.fs.read(`${dir}/state.js`)
    const json = text.slice(text.indexOf('(') + 1, text.lastIndexOf(')'))
    const parsed = JSON.parse(json) as { sessions?: Record<string, Entry> }
    return parsed.sessions ?? {}
  } catch {
    return {}
  }
}

/**
 * Puts this session's entry into the shared file and drops entries that stopped
 * reporting. Sessions write in turn every second; a lost race costs one second.
 */
async function writeState($: EngineInterface, leaving = false): Promise<void> {
  if (!dir || !active) return
  const now = await $.clock.now()
  calls = calls.filter(at => now - at < BUSY_WINDOW_MS)
  const sessions = await readShared($)
  for (const [id, entry] of Object.entries(sessions)) if (now - entry.updatedAt > STALE_MS) delete sessions[id]
  if (leaving) delete sessions[sessionId]
  else {
    sessions[sessionId] = {
      id: sessionId, project, startedAt, updatedAt: now,
      busy: Math.min(1, calls.length / 25), tool: now < toolUntil ? tool : '', agents, events, commitsToday,
    }
  }
  await $.fs.write(`${dir}/state.js`, `window.__foxtrail && window.__foxtrail(${JSON.stringify({ now, sessions })})\n`)
}

async function status($: EngineInterface): Promise<void> {
  const sessions = await readShared($)
  const pack = Object.keys(sessions).length
  const parts = [pack > 1 ? `fox trail · pack of ${pack}` : 'fox trail']
  if (agents.length) parts.push(`${agents.length} ${agents.length === 1 ? 'cub' : 'cubs'}`)
  $.ui.status(parts.join(' · '))
}

async function openPage($: EngineInterface): Promise<string> {
  const file = `${dir}/index.html`
  for (const opener of ['open', 'xdg-open']) {
    const ran = await $.process.run([opener, file], { timeoutMs: 5000 }).catch(() => null)
    if (ran && ran.exitCode === 0) return file
  }
  return ''
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'foxtrail', description: 'Open the fox trail in your browser' })
    if (!e.isInteractive) return next(e)
    active = true
    startedAt = await $.clock.now()
    sessionId = `${startedAt.toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`
    const root = (await git($, ['rev-parse', '--show-toplevel'], e.cwd)) || e.cwd
    project = root.split('/').filter(Boolean).pop() || 'session'
    await install($).catch(err => $.ui.log(`foxtrail: could not set up the page (${String(err)})`))
    await refreshCommits($).catch(() => undefined)
    await refreshAgents($)
    await writeState($).catch(() => undefined)
    await status($)
    $.clock.every(1000, () => {
      void refreshAgents($)
        .then(() => writeState($))
        .then(() => status($))
        .catch(() => undefined)
    })
    $.clock.every(30_000, () => void refreshCommits($).catch(() => undefined))

    return next(e)
  })

  on('session.end', async ($, e, next) => {
    await writeState($, true).catch(() => undefined)
    return next(e)
  })

  on('command.run', { command: 'foxtrail' }, async $ => {
    if (!dir) await install($)
    await writeState($).catch(() => undefined)
    const file = await openPage($)
    return { text: file ? 'The pack sets out. The fox trail is open in your browser.' : `Open this file in your browser: ${dir}/index.html` }
  })

  on('tool.call', async ($, e, next) => {
    const now = await $.clock.now()
    calls.push(now)
    tool = e.tool
    toolUntil = now + 60_000
    const ran = await next(e)
    toolUntil = (await $.clock.now()) + 3000
    return ran
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny !== undefined || ran.isError) return ran
    const now = await $.clock.now()
    if (/\bgit\b.*\bcommit\b/.test(e.command)) await refreshCommits($).catch(() => undefined)
    if (/\bgit\b.*\bpush\b/.test(e.command)) {
      const named = /\bpush\b(?:\s+-\S+)*\s+\S+\s+([\w./-]+)/.exec(e.command)?.[1]
      const branch = named ?? await git($, ['rev-parse', '--abbrev-ref', 'HEAD'])
      push('push', now, branch)
    }
    if (/artisan test|\bpest\b|phpunit|\bnpm (run )?test\b|\bpytest\b|\bgo test\b|\bcargo test\b/.test(e.command)) {
      const res = (ran.result ?? {}) as { stdout?: string; stderr?: string }
      const out = `${res.stdout ?? ''}\n${res.stderr ?? ''}`
      const failed = Number(/(\d+) fail/i.exec(out)?.[1] ?? 0)
      const passed = Number(/(\d+) pass/i.exec(out)?.[1] ?? 0)
      if (failed > 0) push('tests-red', now, `${failed} ${failed === 1 ? 'test' : 'tests'} failed`)
      else push('tests-green', now, passed ? `${passed} tests passed` : 'Tests passed')
    }
    return ran
  }).catch(($, e, next) => next(e))
}
