import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'
import { EVENT_NAMES, STALE_MS, handle } from '../hooks/trail.mjs'

/** A page as small as the real one is large: all the hooks need of it is its <head>. */
const PAGE = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n</head>\n<body></body>\n</html>\n'

/**
 * Stands in for the computer: a home folder and a plugin folder that exist only for this test, a clock
 * the test moves, and programs that answer what the test says and are never really run.
 */
function computer({ platform = 'darwin', attended = true, answers = {} } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'foxtrail-'))
  const web = join(root, 'plugin', 'web')
  mkdirSync(web, { recursive: true })
  writeFileSync(join(web, 'index.html'), PAGE)
  const ran = []
  const c = {
    home: join(root, 'home'),
    web,
    platform,
    attended,
    at: 1_000_000,
    now: () => c.at,
    answers: { 'git rev-parse --show-toplevel': '/work/project', 'git config user.name': 'Maker', 'git log --all --since=midnight --format=%an': '', ...answers },
    run(program, args, cwd) {
      const line = [program, ...args].join(' ')
      ran.push({ line, cwd })
      return line in c.answers ? c.answers[line] : null
    },
    ran,
  }
  const folder = join(c.home, '.claude', 'foxtrail')
  const pack = () => {
    const text = readFileSync(join(folder, 'pack.js'), 'utf8')
    return JSON.parse(text.slice(text.indexOf('(') + 1, text.lastIndexOf(')')))
  }
  return { c, folder, pack, fox: id => pack().sessions[id] }
}

const session = (id = 's1', more = {}) => ({ session_id: id, cwd: '/work/project/src', ...more })
let calls = 0
const bash = (command, more = {}) => session('s1', { tool_name: 'Bash', tool_input: { command }, tool_use_id: `toolu_${++calls}`, hook_event_name: 'PostToolUse', ...more })

test('a session sets the page up and joins the pack under its project folder', () => {
  const { c, folder, fox } = computer()

  handle('session-start', session('s1', { source: 'startup' }), c)

  const page = readFileSync(join(folder, 'index.html'), 'utf8')
  assert.ok(page.includes(`<head>\n<base href="${pathToFileURL(c.web + '/').href}">`), 'the copy reads the rest from the plugin folder')
  assert.equal(page.replace(/<base [^>]*>\n/, ''), PAGE, 'the copy is the page itself with one line added')
  assert.equal(fox('s1').project, 'project')
  assert.equal(fox('s1').startedAt, 1_000_000)
  assert.equal(fox('s1').commitsToday, 0)
})

test('a session nobody is watching stays off the trail', () => {
  const { c, folder } = computer({ attended: false })

  handle('session-start', session(), c)
  handle('tool-start', bash('ls'), c)

  const said = JSON.parse(handle('open', session(), c))

  assert.equal(existsSync(folder), false)
  assert.deepEqual(c.ran, [])
  assert.equal(said.hookSpecificOutput.additionalContext, 'Fox Trail outcome: Nobody is watching this session, so the trail stays closed.')
})

test('a tool call sets the pace and the sign, and its end takes the sign down again', () => {
  const { c, fox } = computer()
  handle('session-start', session(), c)

  c.at += 1000
  handle('tool-start', session('s1', { tool_name: 'Read', tool_use_id: 'a' }), c)
  assert.equal(fox('s1').tool, 'Read')
  assert.equal(fox('s1').toolUntil, c.at + 60_000)
  assert.deepEqual(fox('s1').calls, [c.at])

  c.at += 500
  handle('tool-end', session('s1', { tool_name: 'Read', tool_use_id: 'a', hook_event_name: 'PostToolUse' }), c)
  assert.equal(fox('s1').toolUntil, c.at + 3000)
})

test('a start that is reported after its own end does not put the sign back up', () => {
  const { c, fox } = computer()
  handle('session-start', session(), c)
  handle('tool-end', session('s1', { tool_name: 'Read', tool_use_id: 'late', hook_event_name: 'PostToolUse' }), c)
  const until = fox('s1').toolUntil

  handle('tool-start', session('s1', { tool_name: 'Read', tool_use_id: 'late' }), c)

  assert.equal(fox('s1').toolUntil, until)
  assert.equal(fox('s1').calls.length, 1, 'it still counts towards the pace')
})

test("a cub's own tool calls set the pace but not the fox's sign", () => {
  const { c, fox } = computer()
  handle('session-start', session(), c)

  handle('tool-start', session('s1', { tool_name: 'Grep', tool_use_id: 'c', agent_id: 'agent-1', agent_type: 'Explore' }), c)

  assert.equal(fox('s1').tool, '')
  assert.equal(fox('s1').calls.length, 1)
})

test('a commit becomes a cairn, and only the count leaves git', () => {
  const { c, fox } = computer()
  handle('session-start', session(), c)
  c.answers['git log --all --since=midnight --format=%an'] = 'Maker\nSomeone else\nMaker'

  handle('tool-end', bash('git commit -m "A subject nobody else should read"'), c)

  assert.equal(fox('s1').commitsToday, 2)
  assert.deepEqual(fox('s1').events.map(e => [e.type, e.text]), [['commit', ''], ['commit', '']])
  assert.ok(!JSON.stringify(fox('s1')).includes('nobody else'))
})

test('a push names its branch, from the command or else from git', () => {
  const { c, fox } = computer({ answers: { 'git rev-parse --abbrev-ref HEAD': 'main' } })
  handle('session-start', session(), c)

  handle('tool-end', bash('git push origin feat/trail'), c)
  handle('tool-end', bash('git push'), c)

  assert.deepEqual(fox('s1').events.map(e => [e.type, e.text]), [['push', 'feat/trail'], ['push', 'main']])
})

test('a test run reports how many passed or failed, and nothing else of its output', () => {
  const { c, fox } = computer()
  handle('session-start', session(), c)

  handle('tool-end', bash('npm test', { tool_response: { stdout: 'secret output\n12 passed', stderr: '' } }), c)
  handle('tool-end', bash('vendor/bin/pest', { hook_event_name: 'PostToolUseFailure', error: 'Exit code 1\n3 failed, 9 passed' }), c)
  handle('tool-end', bash('pytest', { hook_event_name: 'PostToolUseFailure', error: 'Exit code 2\nno such option' }), c)
  handle('tool-end', bash('go test ./...', { hook_event_name: 'PostToolUseFailure', error: '', is_interrupt: true }), c)
  handle('tool-end', bash('cat phpunit.xml', { tool_response: { stdout: '1 passed', stderr: '' } }), c)

  assert.deepEqual(fox('s1').events.map(e => [e.type, e.text]), [['tests-green', '12 tests passed'], ['tests-red', '3 tests failed'], ['tests-red', 'Tests failed']])
})

test('a command that only mentions a commit or a test run is not taken for one', () => {
  const { c, fox } = computer({ answers: { 'git log --all --since=midnight --format=%an': 'Maker' } })
  handle('session-start', session(), c)
  c.answers['git log --all --since=midnight --format=%an'] = 'Maker\nMaker'
  const passed = { tool_response: { stdout: '5 passed', stderr: '' } }

  handle('tool-end', bash('tmux send-keys -t other "Run this: node --test tests/ and then git commit -m x"', passed), c)
  handle('tool-end', bash("grep -n 'npm test' README.md", passed), c)
  handle('tool-end', bash("python3 - <<'EOF'\nprint('git commit and git push, then pytest')\nEOF", passed), c)
  assert.deepEqual(fox('s1').events, [])
  assert.equal(fox('s1').commitsToday, 1)

  handle('tool-end', bash('git commit -m "fix the pest tests"'), c)
  handle('tool-end', bash('cd app && npm test -- --grep "login" 2>&1 | tail -5', passed), c)
  handle('tool-end', bash("docker compose exec app sh -c 'php artisan test'", passed), c)
  assert.deepEqual(fox('s1').events.map(e => [e.type, e.text]), [['commit', ''], ['tests-green', '5 tests passed'], ['tests-green', '5 tests passed']])
})

test("it reads the counts as Node's own runner and TAP write them", () => {
  const { c, fox } = computer()
  handle('session-start', session(), c)

  handle('tool-end', bash('node --test tests/', { tool_response: { stdout: 'ℹ tests 17\nℹ pass 17\nℹ fail 0', stderr: '' } }), c)
  handle('tool-end', bash('node --test tests/', { hook_event_name: 'PostToolUseFailure', error: 'Exit code 1\nℹ tests 2\nℹ pass 1\nℹ fail 1' }), c)

  assert.deepEqual(fox('s1').events.map(e => [e.type, e.text]), [['tests-green', '17 tests passed'], ['tests-red', '1 test failed']])
})

test('a subagent runs along as a cub until it is done', () => {
  const { c, fox } = computer()
  handle('session-start', session(), c)

  handle('cub-out', session('s1', { agent_id: 'agent-1', agent_type: 'Explore' }), c)
  handle('cub-out', session('s1', { agent_id: 'agent-1', agent_type: 'Explore' }), c)
  assert.deepEqual(fox('s1').agents, [{ id: 'agent-1', type: 'Explore', startedAt: c.at }])

  handle('cub-home', session('s1', { agent_id: 'agent-1', agent_type: 'Explore' }), c)
  assert.deepEqual(fox('s1').agents, [])
})

test('a session that ends leaves the pack, and a late report does not bring it back', () => {
  const { c, pack } = computer()
  handle('session-start', session(), c)

  handle('session-end', session('s1', { reason: 'prompt_input_exit' }), c)
  handle('tool-end', bash('ls'), c)

  assert.deepEqual(pack().sessions, {})
})

test('after /clear the same fox walks on with the conversation that follows', () => {
  const { c, pack, fox } = computer()
  handle('session-start', session('s1', { source: 'startup' }), c)

  handle('session-end', session('s1', { reason: 'clear' }), c)
  c.at += 400
  handle('session-start', session('s2', { source: 'clear' }), c)
  handle('tool-start', session('s2', { tool_name: 'Edit', tool_use_id: 'e' }), c)

  assert.deepEqual(Object.keys(pack().sessions), ['s1'], 'the fox keeps its place in the pack')
  assert.equal(fox('s1').session, 's2')
  assert.equal(fox('s1').tool, 'Edit')
  assert.equal(fox('s1').handoverAt, undefined)
})

test('a fox nobody took over, and a session that fell silent, leave the pack', () => {
  const { c, pack } = computer()
  handle('session-start', session('s1'), c)
  handle('session-start', session('s2'), c)
  handle('session-end', session('s1', { reason: 'clear' }), c)

  c.at += 20_000
  handle('tool-start', session('s2', { tool_name: 'Read', tool_use_id: 'r' }), c)
  assert.deepEqual(Object.keys(pack().sessions), ['s2'])

  c.at += STALE_MS + 1
  handle('session-start', session('s3'), c)
  assert.deepEqual(Object.keys(pack().sessions), ['s3'])
})

test('a session that was already running when the plugin arrived gets its fox on its first report', () => {
  const { c, fox } = computer({ answers: { 'git log --all --since=midnight --format=%an': 'Maker\nMaker' } })

  handle('tool-start', session('s9', { tool_name: 'Bash', tool_use_id: 'b' }), c)

  assert.equal(fox('s9').project, 'project')
  assert.equal(fox('s9').tool, 'Bash')
  assert.equal(fox('s9').commitsToday, 2, 'it knows the commits already made today')
  assert.deepEqual(fox('s9').events, [], 'and does not show them again')

  c.at += 1000
  c.answers['git log --all --since=midnight --format=%an'] = 'Maker\nMaker\nMaker'
  handle('tool-end', bash('git commit -m next', { session_id: 's9' }), c)
  assert.deepEqual(fox('s9').events.map(e => e.type), ['commit'])
})

test('a fox that joins with a commit sets one cairn for it', () => {
  const { c, fox } = computer({ answers: { 'git log --all --since=midnight --format=%an': 'Maker\nMaker\nMaker' } })

  handle('tool-end', bash('git commit -m first', { session_id: 's8' }), c)

  assert.equal(fox('s8').commitsToday, 3)
  assert.deepEqual(fox('s8').events.map(e => e.type), ['commit'])
})

test('/foxtrail:open opens the page with the system\'s own command, inside its folder', () => {
  for (const [platform, line] of [['darwin', 'open index.html'], ['win32', 'rundll32 url.dll,FileProtocolHandler index.html'], ['linux', 'xdg-open index.html']]) {
    const { c, folder } = computer({ platform, answers: { [line]: '' } })

    const said = JSON.parse(handle('open', session(), c))

    assert.deepEqual(c.ran, [{ line, cwd: folder }])
    assert.equal(said.hookSpecificOutput.hookEventName, 'UserPromptExpansion')
    assert.equal(said.hookSpecificOutput.additionalContext, 'Fox Trail outcome: The pack sets out. The fox trail is open in your browser.')
    assert.ok(existsSync(join(folder, 'index.html')))
  }
})

test('on Linux it tries xdg-open, gio and wslview, and names the file when none of them is there', () => {
  const { c, folder } = computer({ platform: 'linux' })

  const said = JSON.parse(handle('open', session(), c))

  assert.deepEqual(c.ran.map(r => r.line), ['xdg-open index.html', 'gio open index.html', 'wslview index.html'])
  assert.equal(said.hookSpecificOutput.additionalContext, `Fox Trail outcome: Open this file in your browser: ${join(folder, 'index.html')}`)
})

test('hooks.json runs this file with node and names only events it knows', () => {
  const { hooks } = JSON.parse(readFileSync(new URL('../hooks/hooks.json', import.meta.url), 'utf8'))
  const commands = Object.values(hooks).flat().flatMap(group => group.hooks)

  assert.ok(commands.length >= 8)
  for (const hook of commands) {
    assert.equal(hook.type, 'command')
    assert.equal(hook.command, 'node')
    assert.equal(hook.args[0], '${CLAUDE_PLUGIN_ROOT}/hooks/trail.mjs')
    assert.ok(EVENT_NAMES.includes(hook.args[1]), `unknown event ${hook.args[1]}`)
    assert.equal(hook.args.length, 2)
  }
})
