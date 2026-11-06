import type { EngineInterface, ProcessRunResult, Register } from 'claude-code'

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
const TEST_RUN = /artisan test|\bpest\b|\bphpunit(?![.\w])|\bpytest\b|\bgo test\b|\bcargo test\b|\bvitest\b|\bjest\b|\bnode --test\b|\b(npm|pnpm|yarn|bun) (run )?test\b/

/**
 * The output of a command that may fail quietly: a missing program, a non-zero exit
 * or a folder that is no repository all give an empty answer. Every command is written
 * out in full where it is run, so a reader (and the plugin directory) sees exactly what runs.
 */
async function quietly(run: Promise<ProcessRunResult>): Promise<string> {
  try {
    const ran = await run
    return ran.exitCode === 0 ? ran.stdout.trim() : ''
  } catch {
    return ''
  }
}

/** Whether a command started and exited cleanly. */
async function succeeded(run: Promise<ProcessRunResult>): Promise<boolean> {
  return run.then(r => r.exitCode === 0, () => false)
}

/** Windows names the home folder USERPROFILE; Git Bash and every Unix name it HOME. */
async function home($: EngineInterface): Promise<string> {
  return ((await $.env.get('HOME')) || (await $.env.get('USERPROFILE')) || '').replace(/[\\/]+$/, '')
}

async function isWindows($: EngineInterface): Promise<boolean> {
  return (await $.env.get('OS')) === 'Windows_NT'
}

/** A folder as a file: address ending in a slash, whatever the system writes its paths like. */
function folderUrl(path: string): string {
  const slashed = path.replace(/\\/g, '/').replace(/\/+$/, '')
  const address = encodeURI(slashed).replace(/\?/g, '%3F').replace(/#/g, '%23').replace(/&/g, '&amp;')
  if (address.startsWith('//')) return `file:${address}/`
  return `file://${address.startsWith('/') ? '' : '/'}${address}/`
}

/**
 * Puts the page in ~/.claude/foxtrail/, where it keeps one address across updates. The copy only adds
 * a <base>, so three.js, the models and the fonts are read from the plugin's own web/ folder.
 */
async function install($: EngineInterface): Promise<void> {
  const base = await home($)
  if (!base) throw new Error('Fox Trail could not find your home folder (HOME or USERPROFILE).')
  dir = `${base}/.claude/foxtrail`
  const page = await $.fs.read(`${$.plugin.root}/web/index.html`)
  if (!page.includes('<head>')) throw new Error('the page in web/index.html has no <head>')
  const based = `<head>\n<base href="${folderUrl(`${$.plugin.root}/web`)}">`
  await $.fs.write(`${dir}/index.html`, page.replace('<head>', () => based))
}

/**
 * The command as the shell runs it: without here-documents and without quoted text, so a command that only
 * mentions `git commit` or `npm test` (in a message, a search or a file it writes) is not taken for one.
 * Text handed to a shell with -c is kept, because that text is run.
 */
function bare(command: string): string {
  return command
    .split(/<<-?\s*['"]?\w+/)[0]!
    .replace(/(\s-l?c\s+)(['"])(.*?)\2/g, '$1$3')
    .replace(/'[^']*'|"(?:[^"\\]|\\.)*"/g, ' ')
}

/** How many tests a run reports: "3 failed" as most runners print it, or "fail 3" as Node's own runner and TAP do. */
function counted(word: string, out: string): number {
  const found = new RegExp(`(\\d+) ${word}|\\b${word}(?:ed)? (\\d+)`, 'i').exec(out)
  return Number(found?.[1] ?? found?.[2] ?? 0)
}

function push(type: Event['type'], now: number, text = ''): void {
  events.push({ id: ++eventId, type, at: now, text: text.slice(0, 120) })
  events = events.slice(-30)
}

/** How many commits the maker made today. Only the count leaves git: subjects stay private and may be in any language. */
async function todaysCommits($: EngineInterface): Promise<number> {
  const name = await quietly($.process.run(['git', 'config', 'user.name'], { timeoutMs: GIT_TIMEOUT_MS }))
  if (!name) return 0
  const authors = await quietly($.process.run(['git', 'log', '--all', '--since=midnight', '--format=%an'], { timeoutMs: GIT_TIMEOUT_MS }))
  return authors.split('\n').filter(author => author === name).length
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

/**
 * Opens the page in the default browser. Windows hands the file to its own file handler (rundll32);
 * macOS has `open`; on Linux `open` is often openvt, so there it is `xdg-open`, then `gio open`,
 * and `wslview` under WSL. Each command runs inside ~/.claude/foxtrail/ and names only `index.html`,
 * so every command is fixed text.
 */
async function openPage($: EngineInterface): Promise<string> {
  const file = `${dir}/index.html`
  const here = { timeoutMs: 5000, cwd: dir }
  if (await isWindows($)) return (await succeeded($.process.run(['rundll32', 'url.dll,FileProtocolHandler', 'index.html'], here))) ? file : ''
  const system = await quietly($.process.run(['uname', '-s'], { timeoutMs: 2000 }))
  if (system === 'Darwin') return (await succeeded($.process.run(['open', 'index.html'], here))) ? file : ''
  if (await succeeded($.process.run(['xdg-open', 'index.html'], here))) return file
  if (await succeeded($.process.run(['gio', 'open', 'index.html'], here))) return file
  if (await succeeded($.process.run(['wslview', 'index.html'], here))) return file
  return ''
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'foxtrail', description: 'Open the fox trail in your browser' })
    if (!e.isInteractive) return next(e)
    active = true
    startedAt = await $.clock.now()
    sessionId = `${startedAt.toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`
    const root = (await quietly($.process.run(['git', 'rev-parse', '--show-toplevel'], { timeoutMs: GIT_TIMEOUT_MS, cwd: e.cwd }))) || e.cwd
    project = root.split(/[\\/]/).filter(Boolean).pop() || 'session'
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
    // After /clear or a resume this process goes on with another conversation, so the same fox walks on.
    if (e.reason !== 'clear' && e.reason !== 'resume') {
      await writeState($, true).catch(() => undefined)
      active = false
    }
    return next(e)
  })

  on('command.run', { command: 'foxtrail' }, async $ => {
    if (!dir) {
      const failed = await install($).then(() => '', err => String(err))
      if (failed) return { text: `The trail could not be set up: ${failed}` }
    }
    await writeState($).catch(() => undefined)
    const file = await openPage($)
    return { text: file ? 'The pack sets out. The fox trail is open in your browser.' : `Open this file in your browser: ${dir}/index.html` }
  })

  on('tool.call', async ($, e, next) => {
    const now = await $.clock.now()
    calls.push(now)
    // A cub's own tool calls set the pace of the pack, but the sign above the fox shows what the fox itself does.
    const own = !e.agentId
    if (own) {
      tool = e.tool
      toolUntil = now + 60_000
    }
    const ran = await next(e)
    if (own) toolUntil = (await $.clock.now()) + 3000
    return ran
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny !== undefined) return ran
    const now = await $.clock.now()
    const command = bare(e.command)
    const res = (ran.result ?? {}) as { stdout?: string; stderr?: string; interrupted?: boolean }
    const failed = ran.isError === true
    if (!failed && /\bgit\b.*\bcommit\b/.test(command)) await refreshCommits($).catch(() => undefined)
    if (!failed && /\bgit\b.*\bpush\b/.test(command)) {
      const named = /\bpush\b(?:\s+-\S+)*\s+\S+\s+([\w./-]+)/.exec(command)?.[1]
      const branch = named ?? await quietly($.process.run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], { timeoutMs: GIT_TIMEOUT_MS }))
      push('push', now, branch)
    }
    if (TEST_RUN.test(command) && !res.interrupted) {
      // A test run that fails ends as an error, and then its output is in the text the model reads.
      const out = failed ? ran.text ?? '' : `${res.stdout ?? ''}\n${res.stderr ?? ''}`
      const red = counted('fail', out)
      const green = counted('pass', out)
      if (red > 0) push('tests-red', now, `${red} ${red === 1 ? 'test' : 'tests'} failed`)
      else if (failed) push('tests-red', now, 'Tests failed')
      else push('tests-green', now, green ? `${green} tests passed` : 'Tests passed')
    }
    return ran
  }).catch(($, e, next) => next(e))
}
