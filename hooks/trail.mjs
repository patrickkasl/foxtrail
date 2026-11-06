/**
 * Fox Trail's hooks. Claude Code runs this file on a few session events (see hooks.json), hands it the
 * event as JSON, and it keeps the pack's status file up to date for the page in your browser.
 *
 * Everything it does is in this one file:
 * - it reads the event, the page (web/index.html in the plugin's folder) and its own status file;
 * - it writes two files, both in ~/.claude/foxtrail/: index.html and pack.js;
 * - it runs git (four fixed commands, read-only) and, for /foxtrail:open, the system's own "open this file";
 * - it sends nothing anywhere.
 *
 * It never blocks or changes anything in the session: whatever goes wrong, it ends quietly.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, renameSync, rmdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, join, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/** How long a tool call counts towards the pace of the pack. */
export const BUSY_WINDOW_MS = 90_000
/** How long the sign above a fox shows a tool whose end was never reported. */
const TOOL_SHOWN_MS = 60_000
/** How long the sign stays after a tool has finished. */
const TOOL_LINGER_MS = 3000
/** A session that reported nothing for this long has left the pack (a closed terminal says no goodbye). */
export const STALE_MS = 12 * 60 * 60 * 1000
/** How long a fox waits for the next conversation after /clear or /resume, so it stays the same fox. */
const HANDOVER_MS = 15_000
/** A cub whose return was never reported is taken home after this long. */
const CUB_STALE_MS = 6 * 60 * 60 * 1000
const GIT_TIMEOUT_MS = 4000
const OPEN_TIMEOUT_MS = 5000
/** A session that ended is remembered this long, so a report that arrives late does not bring its fox back. */
const LEFT_MS = 10 * 60 * 1000
const TEST_RUN = /artisan test|\bpest\b|\bphpunit(?![.\w])|\bpytest\b|\bgo test\b|\bcargo test\b|\bvitest\b|\bjest\b|\bnode --test\b|\b(npm|pnpm|yarn|bun) (run )?test\b/

/**
 * Runs one program and gives its output, or null when it is missing, fails or takes too long.
 * Every command is written out in full where it is called, so a reader sees exactly what runs.
 */
function run(program, args, cwd, timeoutMs = GIT_TIMEOUT_MS) {
  try {
    return execFileSync(program, args, { cwd, timeout: timeoutMs, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true }).trim()
  } catch {
    return null
  }
}

/** What this file needs from the computer. The tests hand in their own. */
export function computer() {
  return {
    home: homedir(),
    web: join(dirname(fileURLToPath(import.meta.url)), '..', 'web'),
    platform: process.platform,
    /** Claude Code marks sessions nobody is watching (claude -p, scripts) with a 0; those stay off the trail. */
    attended: process.env.CLAUDE_CODE_SESSION_ATTENDED !== '0',
    now: () => Date.now(),
    run,
  }
}

const folder = c => join(c.home, '.claude', 'foxtrail')

/**
 * Puts the page in ~/.claude/foxtrail/, where it keeps one address across updates. The copy only adds
 * a <base>, so three.js, the models and the fonts are read from the plugin's own web/ folder.
 */
function install(c) {
  const page = readFileSync(join(c.web, 'index.html'), 'utf8')
  if (!page.includes('<head>')) throw new Error('the page in web/index.html has no <head>')
  const base = pathToFileURL(c.web + sep).href.replace(/&/g, '&amp;')
  const copy = page.replace('<head>', () => `<head>\n<base href="${base}">`)
  const file = join(folder(c), 'index.html')
  let current = ''
  try {
    current = readFileSync(file, 'utf8')
  } catch {}
  if (current !== copy) writeFileSync(file, copy)
}

/** Reads the status file: one entry per fox, and the sessions that ended a moment ago. */
function readPack(c) {
  try {
    const text = readFileSync(join(folder(c), 'pack.js'), 'utf8')
    const parsed = JSON.parse(text.slice(text.indexOf('(') + 1, text.lastIndexOf(')')))
    return {
      sessions: parsed.sessions && typeof parsed.sessions === 'object' ? parsed.sessions : {},
      left: Array.isArray(parsed.left) ? parsed.left : [],
    }
  } catch {
    return { sessions: {}, left: [] }
  }
}

/** Writes the status file in one move, so the page never reads half a file. */
function writePack(c, pack, now) {
  const file = join(folder(c), 'pack.js')
  const text = `window.__foxtrail && window.__foxtrail(${JSON.stringify({ now, sessions: pack.sessions, left: pack.left })})\n`
  const draft = `${file}.${process.pid}.tmp`
  writeFileSync(draft, text)
  try {
    renameSync(draft, file)
  } catch {
    writeFileSync(file, text)
    try {
      unlinkSync(draft)
    } catch {}
  }
}

function pause(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

/**
 * Sessions report at the same moment, each from its own process. A folder that only one of them can
 * make keeps them in turn; one that was left behind is cleared after two seconds.
 */
function inTurn(c, work) {
  const lock = join(folder(c), 'pack.lock')
  let held = false
  for (let tries = 0; tries < 40 && !held; tries++) {
    try {
      mkdirSync(lock)
      held = true
    } catch {
      try {
        if (Date.now() - statSync(lock).mtimeMs > 2000) rmdirSync(lock)
      } catch {}
      pause(15)
    }
  }
  try {
    return work()
  } finally {
    if (held) {
      try {
        rmdirSync(lock)
      } catch {}
    }
  }
}

/** Takes out what stopped reporting: sessions, foxes nobody took over, and cubs that never came home. */
function tidy(pack, now) {
  for (const [id, entry] of Object.entries(pack.sessions)) {
    const waited = entry.handoverAt ? now - entry.handoverAt > HANDOVER_MS : false
    if (waited || now - (entry.updatedAt || 0) > STALE_MS) delete pack.sessions[id]
    else entry.agents = (entry.agents || []).filter(a => now - (a.startedAt || 0) < CUB_STALE_MS)
  }
  pack.left = pack.left.filter(gone => now - gone.at < LEFT_MS)
}

/** The fox is named after the project's folder. */
function projectOf(cwd, c) {
  const root = c.run('git', ['rev-parse', '--show-toplevel'], cwd) || cwd || ''
  return root.split(/[\\/]/).filter(Boolean).pop() || 'session'
}

/** How many commits the maker made today. Only the count leaves git: subjects stay private and may be in any language. */
function todaysCommits(cwd, c) {
  const name = c.run('git', ['config', 'user.name'], cwd)
  if (!name) return 0
  const authors = c.run('git', ['log', '--all', '--since=midnight', '--format=%an'], cwd)
  return authors ? authors.split('\n').filter(author => author === name).length : 0
}

function fresh(id, project, now) {
  return {
    id, session: id, project, startedAt: now, updatedAt: now,
    calls: [], tool: '', toolUntil: 0, ended: [], agents: [], events: [], eventId: 0, commitsToday: -1,
  }
}

/** Something for the pack to notice: a commit, a push, tests passing or failing. */
function note(entry, type, now, text = '') {
  entry.events.push({ id: ++entry.eventId, type, at: now, text: String(text).slice(0, 120) })
  entry.events = entry.events.slice(-30)
}

/**
 * A cairn for every commit since the last count. A fox that joined with this very commit has no last
 * count to compare with (`justOne`): the commit that just succeeded is its one cairn.
 */
function countCommits(entry, count, now, justOne = false) {
  if (justOne) {
    if (count > 0) note(entry, 'commit', now)
  } else if (entry.commitsToday >= 0) {
    for (let i = entry.commitsToday; i < count; i++) note(entry, 'commit', now)
  }
  entry.commitsToday = count
}

/** Finds this session's fox (a session that was already running when the plugin arrived gets one here) and changes it. */
function report(input, c, change) {
  const now = c.now()
  const before = readPack(c)
  if (before.left.some(gone => gone.session === input.session_id)) return
  const known = Object.values(before.sessions).some(e => e.session === input.session_id)
  const project = known ? '' : projectOf(input.cwd, c)
  const commits = known ? -1 : todaysCommits(input.cwd, c)
  inTurn(c, () => {
    const pack = readPack(c)
    if (pack.left.some(gone => gone.session === input.session_id)) return
    let entry = Object.values(pack.sessions).find(e => e.session === input.session_id)
    const joined = !entry
    if (joined) {
      entry = pack.sessions[input.session_id] = fresh(input.session_id, project || projectOf(input.cwd, c), now)
      entry.commitsToday = commits
    }
    entry.updatedAt = now
    entry.calls = (entry.calls || []).filter(at => now - at < BUSY_WINDOW_MS)
    change(entry, now, joined)
    tidy(pack, now)
    writePack(c, pack, now)
  })
}

/** A session begins, or goes on after /clear, /resume or a compaction. */
function sessionStart(input, c) {
  try {
    install(c)
  } catch (err) {
    process.stderr.write(`foxtrail: could not set up the page (${String(err)})\n`)
  }
  const now = c.now()
  const project = projectOf(input.cwd, c)
  const commits = todaysCommits(input.cwd, c)
  inTurn(c, () => {
    const pack = readPack(c)
    let entry = Object.values(pack.sessions).find(e => e.session === input.session_id)
    if (!entry && (input.source === 'clear' || input.source === 'resume')) {
      entry = Object.values(pack.sessions)
        .filter(e => e.handoverAt && now - e.handoverAt <= HANDOVER_MS)
        .sort((a, b) => b.handoverAt - a.handoverAt)[0]
    }
    if (!entry) entry = pack.sessions[input.session_id] = fresh(input.session_id, project, now)
    entry.session = input.session_id
    entry.project = project
    entry.updatedAt = now
    delete entry.handoverAt
    pack.left = pack.left.filter(gone => gone.session !== input.session_id)
    countCommits(entry, commits, now)
    tidy(pack, now)
    writePack(c, pack, now)
  })
}

/** A session ends. After /clear or /resume the fox waits a moment for the conversation that follows. */
function sessionEnd(input, c) {
  const now = c.now()
  inTurn(c, () => {
    const pack = readPack(c)
    for (const [id, entry] of Object.entries(pack.sessions)) {
      if (entry.session !== input.session_id) continue
      if (input.reason === 'clear' || input.reason === 'resume') entry.handoverAt = now
      else delete pack.sessions[id]
    }
    pack.left.push({ session: input.session_id, at: now })
    tidy(pack, now)
    writePack(c, pack, now)
  })
}

/** A tool call begins: it sets the pace, and the small sign above the fox. Only the tool's name is used. */
function toolStart(input, c) {
  report(input, c, (entry, now) => {
    entry.calls.push(now)
    const mine = !input.agent_id
    const over = (entry.ended || []).includes(input.tool_use_id)
    if (mine && !over) {
      entry.tool = String(input.tool_name || '')
      entry.toolUntil = now + TOOL_SHOWN_MS
    }
  })
}

/**
 * The command as the shell runs it: without here-documents and without quoted text, so a command that only
 * mentions `git commit` or `npm test` (in a message, a search or a file it writes) is not taken for one.
 * Text handed to a shell with -c is kept, because that text is run.
 */
function bare(command) {
  return command
    .split(/<<-?\s*['"]?\w+/)[0]
    .replace(/(\s-l?c\s+)(['"])(.*?)\2/g, '$1$3')
    .replace(/'[^']*'|"(?:[^"\\]|\\.)*"/g, ' ')
}

/**
 * A tool call ended, well or badly. For a Bash command this looks at three things only: whether it was
 * a git commit, a git push or a test run. For a test run it reads the number of passed and failed tests.
 */
function toolEnd(input, c) {
  const failed = input.hook_event_name === 'PostToolUseFailure'
  const command = input.tool_name === 'Bash' ? bare(String(input.tool_input?.command ?? '')) : ''
  const committed = !failed && /\bgit\b.*\bcommit\b/.test(command)
  const pushed = !failed && /\bgit\b.*\bpush\b/.test(command)
  const tested = TEST_RUN.test(command) && !input.is_interrupt
  const commits = committed ? todaysCommits(input.cwd, c) : -1
  let branch = ''
  if (pushed) {
    branch = /\bpush\b(?:\s+-\S+)*\s+\S+\s+([\w./-]+)/.exec(command)?.[1] ?? c.run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], input.cwd) ?? ''
  }
  report(input, c, (entry, now, joined) => {
    entry.ended = [...(entry.ended || []), input.tool_use_id].filter(Boolean).slice(-24)
    if (!input.agent_id) entry.toolUntil = now + TOOL_LINGER_MS
    if (commits >= 0) countCommits(entry, commits, now, joined || entry.commitsToday < 0)
    if (pushed) note(entry, 'push', now, branch)
    if (tested) {
      const out = failed ? String(input.error ?? '') : `${input.tool_response?.stdout ?? ''}\n${input.tool_response?.stderr ?? ''}`
      const red = counted('fail', out)
      const green = counted('pass', out)
      if (red > 0) note(entry, 'tests-red', now, `${red} ${red === 1 ? 'test' : 'tests'} failed`)
      else if (failed) note(entry, 'tests-red', now, 'Tests failed')
      else note(entry, 'tests-green', now, green ? `${green} tests passed` : 'Tests passed')
    }
  })
}

/** How many tests a run reports: "3 failed" as most runners print it, or "fail 3" as Node's own runner and TAP do. */
function counted(word, out) {
  const found = new RegExp(`(\\d+) ${word}|\\b${word}(?:ed)? (\\d+)`, 'i').exec(out)
  return Number(found?.[1] ?? found?.[2] ?? 0)
}

/** A subagent sets out as a cub. Only its kind (Explore, Plan and so on) is kept, never its task. */
function cubOut(input, c) {
  if (!input.agent_id) return
  report(input, c, (entry, now) => {
    if (!entry.agents.some(a => a.id === input.agent_id)) entry.agents.push({ id: input.agent_id, type: String(input.agent_type || ''), startedAt: now })
  })
}

/** A subagent finished: the cub comes home. */
function cubHome(input, c) {
  if (!input.agent_id) return
  report(input, c, entry => {
    entry.agents = entry.agents.filter(a => a.id !== input.agent_id)
  })
}

/**
 * Opens the page in the default browser. Windows hands the file to its own file handler (rundll32);
 * macOS has `open`; on Linux `open` is often openvt, so there it is `xdg-open`, then `gio open`,
 * and `wslview` under WSL. Each command runs inside ~/.claude/foxtrail/ and names only `index.html`.
 */
function openPage(c) {
  const here = folder(c)
  if (c.platform === 'win32') return c.run('rundll32', ['url.dll,FileProtocolHandler', 'index.html'], here, OPEN_TIMEOUT_MS) !== null
  if (c.platform === 'darwin') return c.run('open', ['index.html'], here, OPEN_TIMEOUT_MS) !== null
  if (c.run('xdg-open', ['index.html'], here, OPEN_TIMEOUT_MS) !== null) return true
  if (c.run('gio', ['open', 'index.html'], here, OPEN_TIMEOUT_MS) !== null) return true
  return c.run('wslview', ['index.html'], here, OPEN_TIMEOUT_MS) !== null
}

/** The maker typed /foxtrail:open. Opens the page and tells Claude, in one line, how that went. */
function open(input, c) {
  const file = join(folder(c), 'index.html')
  let outcome = 'Nobody is watching this session, so the trail stays closed.'
  if (c.attended) {
    try {
      install(c)
      outcome = openPage(c) ? 'The pack sets out. The fox trail is open in your browser.' : `Open this file in your browser: ${file}`
    } catch (err) {
      outcome = `The trail could not be set up: ${String(err)}`
    }
  }
  return JSON.stringify({ hookSpecificOutput: { hookEventName: 'UserPromptExpansion', additionalContext: `Fox Trail outcome: ${outcome}` } })
}

const EVENTS = {
  'session-start': sessionStart,
  'session-end': sessionEnd,
  'tool-start': toolStart,
  'tool-end': toolEnd,
  'cub-out': cubOut,
  'cub-home': cubHome,
  open,
}

/** The events hooks.json may name. */
export const EVENT_NAMES = Object.keys(EVENTS)

/** Handles one event. Gives the text Claude Code should read back, which is empty for all but `open`. */
export function handle(event, input, c = computer()) {
  const act = EVENTS[event]
  if (!act || !input || typeof input.session_id !== 'string') return ''
  if (!c.attended) return act === open ? open(input, c) : ''
  mkdirSync(folder(c), { recursive: true })
  return act(input, c) || ''
}

if (basename(process.argv[1] || '') === 'trail.mjs') {
  try {
    let text = ''
    process.stdin.setEncoding('utf8')
    for await (const chunk of process.stdin) text += chunk
    const said = handle(process.argv[2], JSON.parse(text))
    if (said) process.stdout.write(said)
  } catch (err) {
    process.stderr.write(`foxtrail: ${String(err)}\n`)
  }
}
