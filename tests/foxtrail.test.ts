import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

/** A page as small as the real one is large: all the hooks module needs of it is its <head>. */
const PAGE = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<link rel="stylesheet" href="fonts.css">\n</head>\n<body></body>\n</html>\n'

/** `/foxtrail` as a person types it at the prompt of a terminal. */
const TYPED = { command: 'foxtrail', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 120 } } as const

/** Stands in for Claude Code and the computer: answers what the module asks, and keeps what it wrote and ran. */
function computer(on: On, env: Record<string, string>, system = 'Darwin', missing: string[] = [], answers: Record<string, string> = {}) {
  const written = new Map<string, string>()
  const ran: { argv: readonly string[]; cwd: string | undefined }[] = []
  const clock = mock.clock(on)
  mock.env(on, env)
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: { command: 'foxtrail' } }))
  on('agent.list', () => ({ value: [] }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.log', () => ({ value: undefined }))
  on('fs.read', ($, e) => (e.path.endsWith('index.html') ? { value: PAGE } : { deny: 'no such file' }))
  on('fs.write', ($, e) => {
    written.set(e.path, e.text)
    return { value: undefined }
  })
  on('process.run', ($, e) => {
    ran.push({ argv: e.argv, cwd: e.init?.cwd })
    const exitCode = missing.includes(e.argv[0] ?? '') ? 127 : 0
    const stdout = answers[e.argv.join(' ')] ?? (e.argv[0] === 'uname' ? system : '')
    return { value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  return { written, ran, clock, answers }
}

type Fox = { tool: string; busy: number; commitsToday: number; events: { type: string; text: string }[] }

/** The pack as the page reads it: every session in the status file. */
function pack(written: Map<string, string>): Record<string, Fox> {
  const text = written.get('/home/maker/.claude/foxtrail/state.js') ?? ''
  return (JSON.parse(text.slice(text.indexOf('(') + 1, text.lastIndexOf(')'))) as { sessions: Record<string, Fox> }).sessions
}

const START = { surface: 'terminal', isInteractive: true, cwd: '/work/project' } as const

test('the page is set up beside the status file and reads the rest from the plugin folder', async ($, on) => {
  const { written } = computer(on, { HOME: '/home/maker' })

  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work/project' })

  // The copy is the page itself with one line added: where three.js, the models and the fonts are.
  const page = written.get('/home/maker/.claude/foxtrail/index.html') ?? ''
  expect(page).toMatch(/<head>\n<base href="file:\/\/\/[^"<>]+\/web\/">\n<meta charset="utf-8">/)
  expect(page.replace(/<base [^>]+>\n/, '')).toBe(PAGE)

  // The status names the project folder, never its path, and nothing else is written.
  const status = written.get('/home/maker/.claude/foxtrail/state.js') ?? ''
  expect(status).toMatch(/^window\.__foxtrail && window\.__foxtrail\(\{.*"project":"project".*\}\)\n$/)
  expect([...written.keys()].sort()).toEqual(['/home/maker/.claude/foxtrail/index.html', '/home/maker/.claude/foxtrail/state.js'])
})

test('/foxtrail opens the page with a fixed command, run inside its folder', async ($, on) => {
  const { ran } = computer(on, { HOME: '/home/maker' })

  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work/project' })
  const answer = await $.command.run(TYPED)

  expect(answer.text).toBe('The pack sets out. The fox trail is open in your browser.')
  expect(ran.at(-1)).toEqual({ argv: ['open', 'index.html'], cwd: '/home/maker/.claude/foxtrail' })
})

test('on Windows the home folder comes from USERPROFILE and the file handler opens the page', async ($, on) => {
  const { written, ran } = computer(on, { OS: 'Windows_NT', USERPROFILE: 'C:\\Users\\maker' })

  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: 'C:\\work\\project' })
  await $.command.run(TYPED)

  // The test runs on any system, where a Windows path is not absolute, so only its end is compared.
  expect([...written.keys()].some(path => path.endsWith('C:\\Users\\maker/.claude/foxtrail/index.html'))).toBe(true)
  expect(ran.at(-1)).toEqual({ argv: ['rundll32', 'url.dll,FileProtocolHandler', 'index.html'], cwd: 'C:\\Users\\maker/.claude/foxtrail' })
})

test('on Linux it falls back from xdg-open to gio', async ($, on) => {
  const { ran } = computer(on, { HOME: '/home/maker' }, 'Linux', ['xdg-open'])

  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work/project' })
  const answer = await $.command.run(TYPED)

  expect(answer.text).toBe('The pack sets out. The fox trail is open in your browser.')
  expect(ran.at(-1)).toEqual({ argv: ['gio', 'open', 'index.html'], cwd: '/home/maker/.claude/foxtrail' })
})

test('a session nobody is watching sets nothing up', async ($, on) => {
  const { written, ran } = computer(on, { HOME: '/home/maker' })

  await $.session.start({ surface: 'terminal', isInteractive: false, cwd: '/work/project' })

  expect(written.size).toBe(0)
  expect(ran.length).toBe(0)
})

test('a test run is read for its counts, and one that fails is noticed', async ($, on) => {
  const { written, clock } = computer(on, { HOME: '/home/maker' })
  on('tool.call', ($, e) => {
    if (e.tool !== 'Bash') return { result: {} }
    if (e.command.startsWith('vendor/bin/pest')) return { result: {}, text: 'Exit code 1\n3 failed, 9 passed', isError: true }
    if (e.command.startsWith('pytest')) return { result: {}, text: 'Exit code 2\nno such option', isError: true }
    if (e.command.startsWith('go test')) return { result: { interrupted: true }, text: 'Interrupted', isError: true }
    return { result: { stdout: 'secret output\nℹ tests 17\nℹ pass 17\nℹ fail 0', stderr: '' } }
  })

  await $.session.start(START)
  await $.tool.call({ tool: 'Bash', command: 'node --test tests/' })
  await $.tool.call({ tool: 'Bash', command: 'vendor/bin/pest' })
  await $.tool.call({ tool: 'Bash', command: 'pytest -q' })
  await $.tool.call({ tool: 'Bash', command: 'go test ./...' })
  await clock.advance(1000)

  const [fox] = Object.values(pack(written))
  expect(fox?.events.map(e => [e.type, e.text])).toEqual([['tests-green', '17 tests passed'], ['tests-red', '3 tests failed'], ['tests-red', 'Tests failed']])
  expect(written.get('/home/maker/.claude/foxtrail/state.js')).not.toContain('secret')
})

test('a commit becomes a cairn, and a command that only mentions one does not', async ($, on) => {
  const { written, ran, clock, answers } = computer(on, { HOME: '/home/maker' }, 'Darwin', [], { 'git config user.name': 'Maker', 'git log --all --since=midnight --format=%an': 'Maker' })
  on('tool.call', () => ({ result: { stdout: '5 passed', stderr: '' } }))
  const logs = () => ran.filter(r => r.argv[1] === 'log').length

  await $.session.start(START)
  const before = logs()
  answers['git log --all --since=midnight --format=%an'] = 'Maker\nSomeone else\nMaker'
  await $.tool.call({ tool: 'Bash', command: 'tmux send-keys -t other "Run this: node --test tests/ and then git commit -m x"' })
  await $.tool.call({ tool: 'Bash', command: "grep -n 'npm test' README.md" })
  await $.tool.call({ tool: 'Bash', command: "python3 - <<'EOF'\nprint('git commit and git push, then pytest')\nEOF" })
  await clock.advance(1000)
  expect(Object.values(pack(written))[0]?.events).toEqual([])
  expect(logs()).toBe(before)

  await $.tool.call({ tool: 'Bash', command: 'git commit -m "A subject nobody else should read, about the pest tests"' })
  await $.tool.call({ tool: 'Bash', command: "docker compose exec app sh -c 'php artisan test'" })
  await clock.advance(1000)
  const [fox] = Object.values(pack(written))
  expect(fox?.events.map(e => [e.type, e.text])).toEqual([['commit', ''], ['tests-green', '5 tests passed']])
  expect(fox?.commitsToday).toBe(2)
  expect(written.get('/home/maker/.claude/foxtrail/state.js')).not.toContain('nobody else')
})

test('after /clear the same fox walks on, and an exit takes it off the trail', async ($, on) => {
  const { written, clock } = computer(on, { HOME: '/home/maker' })
  on('session.end', ($, e) => ({ sessionId: e.sessionId }))

  await $.session.start(START)
  const [id] = Object.keys(pack(written))
  await $.session.end({ reason: 'clear', sessionId: 'one', resume: { id: 'one' } })
  await clock.advance(1000)
  expect(Object.keys(pack(written))).toEqual([id])

  await $.session.end({ reason: 'prompt_input_exit', sessionId: 'two', resume: { id: 'two' } })
  await clock.advance(3000)
  expect(Object.keys(pack(written))).toEqual([])
})

test("a cub's own tool calls set the pace but not the sign above its fox", async ($, on) => {
  const { written, clock } = computer(on, { HOME: '/home/maker' })
  on('tool.call', () => ({ result: {} }))

  await $.session.start(START)
  await $.tool.call({ tool: 'Grep', pattern: 'x', agentId: 'agent-1' })
  await clock.advance(1000)
  expect(Object.values(pack(written))[0]?.tool).toBe('')
  expect(Object.values(pack(written))[0]?.busy).toBeGreaterThan(0)

  await $.tool.call({ tool: 'Read', file_path: '/work/project/a.ts' })
  await clock.advance(1000)
  expect(Object.values(pack(written))[0]?.tool).toBe('Read')
})
