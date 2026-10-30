// Builds web/index.html: one self-contained page with three.js, the fox, the animals and the fonts inlined,
// so the trail works offline and talks to no server.
import { build } from 'esbuild'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { slimAnimals } from './animals.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = readFileSync(join(root, 'src/index.html'), 'utf8')
const asset = name => readFileSync(join(root, 'src/assets', name))

const moduleStart = src.indexOf('<script type="module">')
const moduleEnd = src.indexOf('</script>', moduleStart)
if (moduleStart < 0 || moduleEnd < 0) throw new Error('src/index.html has no module script')
let code = src.slice(moduleStart + '<script type="module">'.length, moduleEnd)

const FOX_CDN = /const FOX_URL = '[^']+'/
if (!FOX_CDN.test(code)) throw new Error('FOX_URL not found in the page script')
code = code.replace(FOX_CDN, `const FOX_URL = 'data:model/gltf-binary;base64,${asset('Fox.glb').toString('base64')}'`)

const ANIMALS_SLOT = /const ANIMAL_URLS = \{[^}]*\}/
if (!ANIMALS_SLOT.test(code)) throw new Error('ANIMAL_URLS not found in the page script')
const animals = await slimAnimals(join(root, 'src/assets/animals'))
const animalUrls = Object.entries(animals).map(([kind, glb]) => `${kind}: 'data:model/gltf-binary;base64,${glb.toString('base64')}'`).join(', ')
code = code.replace(ANIMALS_SLOT, `const ANIMAL_URLS = { ${animalUrls} }`)

const bundled = await build({
  stdin: { contents: code, resolveDir: root, loader: 'js' },
  bundle: true,
  format: 'esm',
  minify: true,
  target: 'es2020',
  write: false,
  legalComments: 'none',
  tsconfigRaw: '{}',
})
const js = bundled.outputFiles[0].text

const font = (family, file, style) =>
  `@font-face { font-family: '${family}'; font-style: ${style}; font-weight: 300 700; font-display: swap; src: url(data:font/woff2;base64,${asset(`fonts/${file}`).toString('base64')}) format('woff2'); }`
const fonts = [
  font('Cormorant Garamond', 'CormorantGaramond-Italic.woff2', 'italic'),
  font('Inter', 'Inter.woff2', 'normal'),
].join('\n')

let page = src.slice(0, moduleStart) + '<script type="module">' + js + src.slice(moduleEnd)
page = page
  .replace(/<link rel="preconnect"[^>]*>\n?/g, '')
  .replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>\n?/g, '')
  .replace(/<script type="importmap">[\s\S]*?<\/script>\n?/, '')
  .replace('<style>', `<style>\n${fonts}\n`)

if (/https?:\/\/(cdn|fonts|unpkg)/.test(page.replace(/\/\/[^\n]*\n/g, ''))) console.warn('warning: the page still mentions a CDN')
mkdirSync(join(root, 'web'), { recursive: true })
writeFileSync(join(root, 'web/index.html'), page)
console.log(`web/index.html: ${(page.length / 1024).toFixed(0)} KB`)
