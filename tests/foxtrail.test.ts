import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

/** A page as small as the real one is large: all the hooks module needs of it is its <head>. */
const PAGE = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<link rel="stylesheet" href="fonts.css">\n</head>\n<body></body>\n</html>\n'

/** `/foxtrail` as a person types it at the prompt of a terminal. */
const TYPED = { command: 'foxtrail', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 120 } } as const

/** Stands in for Claude Code and the computer: answers what the module asks, and keeps what it wrote and ran. */
function computer(on: On, env: Record<string, string>, system = 'Darwin', missing: string[] = []) {
  const written = new Map<string, string>()
  const ran: { argv: readonly string[]; cwd: string | undefined }[] = []
  mock.clock(on)
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
    return { value: { exitCode, stdout: e.argv[0] === 'uname' ? system : '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  return { written, ran }
}

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
