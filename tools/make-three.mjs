// Writes three.js into the plugin's web/three/ folder as plain, readable script files.
//
// The plugin directory reads every file of a plugin, and it only reads text files of under 256 KiB.
// three.js is about 1.3 MB of source, so it cannot be one file, and the page is opened from disk
// (file://), where a browser refuses to import ES modules. So this tool bundles three's own source
// modules, without minifying them, into a row of parts that each stay under the limit. A part is an
// ordinary script that registers itself with web/three/parts.js and is handed the parts it builds on.
//
// Usage: node tools/make-three.mjs <path to the plugin folder>
import { rollup } from 'rollup'
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const workshop = join(dirname(fileURLToPath(import.meta.url)), '..')
const plugin = resolve(process.argv[2] || '')
if (!process.argv[2]) throw new Error('Give the path to the plugin folder: node tools/make-three.mjs ../foxtrail')
const out = join(plugin, 'web/three')

const threeRoot = join(workshop, 'node_modules/three')
const revision = JSON.parse(readFileSync(join(threeRoot, 'package.json'), 'utf8')).version.split('.')[1]

/** The directory holds every file that is not an image or a font to 256 KiB; parts aim well below it. */
const LIMIT = 256 * 1024
const AIM = 215 * 1024

const ENTRY = 'foxtrail-libs'
const entrySource = `
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'

// What the page uses of three.js: the library itself, the glTF reader and the helper that clones a rigged model.
window.foxtrailLibs = { THREE, GLTFLoader, SkeletonUtils }
`

/** Resolves three to its source modules, so the bundle can be cut between them. */
const threeFromSource = {
  name: 'three-from-source',
  resolveId(id) {
    if (id === ENTRY) return ENTRY
    if (id === 'three') return join(threeRoot, 'src/Three.js')
    if (id.startsWith('three/addons/')) return join(threeRoot, 'examples/jsm', id.slice('three/addons/'.length))
    return null
  },
  load(id) {
    return id === ENTRY ? entrySource : null
  },
  // The glTF reader can also take WebP and AVIF textures, and to ask the browser whether it can, it carries
  // two tiny test pictures as base64. The trail's models have no such textures, so those two extensions are
  // left out: nothing in the plugin is packed or encoded. The bundler then drops their code as unused.
  transform(code, id) {
    if (!id.endsWith('/loaders/GLTFLoader.js')) return null
    let left = code
    for (const extension of ['GLTFTextureWebPExtension', 'GLTFTextureAVIFExtension']) {
      const registered = new RegExp(`\\t\\tthis\\.register\\( function \\( parser \\) \\{\\s+return new ${extension}\\( parser \\);\\s+\\} \\);\\n\\n`)
      if (!registered.test(left)) throw new Error(`GLTFLoader no longer registers ${extension} the way this tool expects`)
      left = left.replace(registered, '')
    }
    return { code: left, map: null }
  },
}

const isCore = id => id.startsWith(join(threeRoot, 'src') + '/')

// First pass: one bundle, to learn the order the modules run in and how much text each one comes to.
const whole = await rollup({ input: ENTRY, plugins: [threeFromSource] })
const { output: [single] } = await whole.generate({ format: 'es' })
await whole.close()

// Cut that order into consecutive stretches. A part then only ever builds on parts before it.
const partOf = new Map()
let part = 1
let size = 0
for (const [id, module] of Object.entries(single.modules)) {
  if (!isCore(id)) continue
  if (size && size + module.renderedLength > AIM) { part++; size = 0 }
  partOf.set(id, `three.${part}`)
  size += module.renderedLength
}

const banner = name => `// three.js r${revision} (https://threejs.org), part "${name}".
// Copyright 2010-2023 three.js authors, MIT License: see the LICENSE file in this folder.
// This is three's own source, bundled without minifying and cut into parts by the Fox Trail workshop
// (tools/make-three.mjs), because the page is opened from disk and each file must stay small enough to read.
// One thing is left out: the glTF reader's WebP and AVIF texture extensions, which the trail does not use.`

// Second pass: the same bundle, cut along those stretches.
const bundle = await rollup({ input: ENTRY, plugins: [threeFromSource] })
const { output } = await bundle.generate({
  format: 'amd',
  amd: { define: 'foxtrailPart', autoId: true },
  entryFileNames: 'extras.js',
  chunkFileNames: '[name].js',
  manualChunks: id => partOf.get(id),
  banner: chunk => banner(chunk.fileName.replace(/\.js$/, '')),
  generatedCode: { constBindings: true, objectShorthand: true },
  minifyInternalExports: false,
  hoistTransitiveImports: false,
  strict: true,
})
await bundle.close()

const chunks = output.filter(o => o.type === 'chunk')
const order = [...new Set(partOf.values()), 'extras']
const place = name => order.indexOf(name.replace(/\.js$/, ''))
chunks.sort((a, b) => place(a.fileName) - place(b.fileName))

for (const chunk of chunks) {
  const bytes = Buffer.byteLength(chunk.code)
  if (place(chunk.fileName) < 0) throw new Error(`unexpected part ${chunk.fileName}`)
  if (bytes >= LIMIT) throw new Error(`${chunk.fileName} is ${bytes} bytes, over the ${LIMIT} byte limit: lower AIM`)
  for (const need of chunk.imports) {
    if (place(need) >= place(chunk.fileName)) throw new Error(`${chunk.fileName} builds on ${need}, which comes after it`)
  }
  if (chunk.dynamicImports.length) throw new Error(`${chunk.fileName} imports at run time, which a page on disk cannot do`)
}

const registry = `/**
 * three.js is too large for one readable file, so it comes in parts: three.1.js, three.2.js and so on,
 * then extras.js. Every part is an ordinary script file, listed in index.html in the order it runs.
 * A part calls foxtrailPart with its own name, the names of the earlier parts it builds on, and a
 * function that fills in what it offers. Nothing is fetched and no text is turned into code here.
 */
(() => {
  const parts = {}
  window.foxtrailPart = (name, needs, make) => {
    const offers = {}
    make(...needs.map(need => {
      if (need === 'exports') return offers
      const earlier = parts[need.replace(/^\\.\\//, '')]
      if (!earlier) throw new Error(\`three.js part "\${name}" needs "\${need}", which has not loaded\`)
      return earlier
    }))
    parts[name] = offers
  }
})()
`

rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
writeFileSync(join(out, 'parts.js'), registry)
writeFileSync(join(out, 'LICENSE'), readFileSync(join(threeRoot, 'LICENSE'), 'utf8'))
for (const chunk of chunks) writeFileSync(join(out, chunk.fileName), chunk.code)

console.log(`three.js r${revision} → ${out}`)
for (const name of readdirSync(out).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))) {
  console.log(`  ${name.padEnd(12)} ${String(readFileSync(join(out, name)).length).padStart(7)} bytes`)
}
console.log('\nScript tags for web/index.html, in this order:')
for (const name of ['parts.js', ...chunks.map(c => c.fileName)]) console.log(`<script src="three/${name}"></script>`)
