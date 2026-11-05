// Checks the plugin folder against the plugin directory's file rules, before a push.
// It covers what the pre-submission checklist says about files (claude.com/docs/plugins/pre-submission-checklist);
// the directory's own validation and security scan remain the judge.
//
// Usage: node tools/check.mjs <path to the plugin folder>
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { basename, extname, join, resolve } from 'node:path'

if (!process.argv[2]) throw new Error('Give the path to the plugin folder: node tools/check.mjs ../foxtrail')
const plugin = resolve(process.argv[2])
const KIB = 1024
const IMAGES = ['.png', '.jpg', '.jpeg', '.gif', '.webp']
const FONTS = ['.woff', '.woff2', '.ttf', '.otf']

// Every file git would commit: tracked or new, not ignored, and still on disk.
const files = execFileSync('git', ['-C', plugin, 'ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
  .split('\n').filter(Boolean).filter(file => existsSync(join(plugin, file)))

const problems = []
const notes = []
const say = (file, text) => problems.push(`${file}: ${text}`)

/** Whether a picture starts and ends the way its format says it should. */
function isCompletePicture(file, bytes) {
  const ext = extname(file).toLowerCase()
  if (ext === '.png') return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) && bytes.subarray(-8, -4).toString('latin1') === 'IEND'
  if (ext === '.jpg' || ext === '.jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9
  if (ext === '.gif') return /^GIF8[79]a/.test(bytes.toString('latin1', 0, 6)) && bytes.at(-1) === 0x3b
  if (ext === '.webp') return bytes.toString('latin1', 0, 4) === 'RIFF' && bytes.toString('latin1', 8, 12) === 'WEBP'
  return false
}
const isFont = (file, bytes) => ['wOFF', 'wOF2', 'OTTO', '\0\x01\0\0'].includes(bytes.toString('latin1', 0, 4)) && FONTS.includes(extname(file).toLowerCase())

const assets = []
const texts = new Map()
for (const file of files) {
  const bytes = readFileSync(join(plugin, file))
  const ext = extname(file).toLowerCase()
  if (['.DS_Store', 'Thumbs.db', 'desktop.ini'].includes(basename(file)) || file.includes('__MACOSX')) say(file, 'a macOS or Windows system file')
  if (statSync(join(plugin, file)).isSymbolicLink?.()) say(file, 'a symbolic link')
  if (bytes.length >= 5 * KIB * KIB) say(file, 'over 5 MiB')
  if (IMAGES.includes(ext)) {
    if (!isCompletePicture(file, bytes)) say(file, 'not a complete picture of the kind its name says')
    assets.push(file)
  } else if (FONTS.includes(ext)) {
    if (!isFont(file, bytes)) say(file, 'not a font file of the kind its name says')
    assets.push(file)
  } else {
    if (bytes.length >= 256 * KIB) say(file, `${bytes.length} bytes: a file that is not an image or a font must stay under 256 KiB`)
    const text = bytes.toString('utf8')
    if (bytes.includes(0) || Buffer.byteLength(text) !== bytes.length || text.includes('�')) say(file, 'not a text file')
    else texts.set(file, text)
  }
}
if (files.length > 512) problems.push(`${files.length} files: the directory holds a plugin to 512`)
for (const lock of ['package-lock.json', 'npm-shrinkwrap.json', 'bun.lock', 'bun.lockb']) {
  if (files.includes('package.json') && files.includes(lock)) problems.push(`package.json beside ${lock}: Claude Code would install those packages with the plugin`)
}
if (!files.some(f => /^LICENSE/i.test(f))) problems.push('no LICENSE file')
const readme = texts.get('README.md') || ''
if (readme.replace(/```[\s\S]*?```/g, '').split(/\s+/).filter(Boolean).length < 40) problems.push('README.md: fewer than 40 words outside code blocks')

for (const [file, text] of texts) {
  const ext = extname(file).toLowerCase()
  const lines = text.split('\n')
  const longest = Math.max(...lines.map(l => l.length))
  const isCode = ['.js', '.mjs', '.ts', '.tsx', '.html', '.css', '.json'].includes(ext)
  // Minified or packed code shows as very long lines and as long runs without a space.
  if (isCode && longest > 2000) say(file, `a line of ${longest} characters: minified or packed code is not read by the security scan`)
  const blob = /[A-Za-z0-9+/=]{300,}/.exec(text)
  if (blob) say(file, `a run of ${blob[0].length} characters without a space, as packed or encoded data would be`)
  if (/\beval\s*\(|new Function\s*\(|\batob\s*\(|WebAssembly\./.test(text) && file.startsWith('web/')) notes.push(`${file}: names eval, new Function, atob or WebAssembly: look at why`)
  // Bundled pictures and fonts may be shown, never run: no script, hook or command should name them.
  for (const asset of assets) {
    if (!text.includes(basename(asset))) continue
    if (ext === '.css') continue
    if (ext === '.md') {
      const coded = new RegExp('`[^`\\n]*' + basename(asset).replace(/[.]/g, '\\.') + '[^`\\n]*`').test(text) || [...text.matchAll(/```[\s\S]*?```/g)].some(m => m[0].includes(basename(asset)))
      if (coded) say(file, `writes the path of ${asset} in backticks or a code block`)
      continue
    }
    if (file === '.claude-plugin/plugin.json') continue
    say(file, `names the bundled file ${asset}: scripts, hooks and commands must not refer to pictures or fonts`)
  }
}

const bytesOf = list => list.reduce((sum, file) => sum + statSync(join(plugin, file)).size, 0)
console.log(`${files.length} files, ${(bytesOf(files) / KIB / KIB).toFixed(1)} MiB: ${texts.size} text files, ${assets.length} pictures and fonts`)
const largest = [...texts.keys()].map(f => [f, statSync(join(plugin, f)).size]).sort((a, b) => b[1] - a[1])[0]
console.log(`largest text file: ${largest[0]}, ${largest[1]} bytes (the limit is ${256 * KIB})`)
for (const note of notes) console.log(`note: ${note}`)
if (problems.length) {
  console.log(`\n${problems.length} problem${problems.length > 1 ? 's' : ''}:`)
  for (const problem of problems) console.log(`  ${problem}`)
  process.exit(1)
}
console.log('nothing found that the directory holds a plugin for')
