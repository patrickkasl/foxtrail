// Writes the 3D models into the plugin's web/models/ folder as readable text.
//
// The plugin directory only reads text files of under 256 KiB, and a .glb is neither. So each model in
// models/ is written out in full instead: its glTF description as JSON, then the numbers of every accessor,
// and its texture as runs of colour. web/models/reader.js (part of the plugin) packs that back into the
// binary layout three.js reads. This tool checks its own work: it reads the text back with that same
// reader and compares every number and every pixel with the source model.
//
// Usage: node tools/make-models.mjs <path to the plugin folder>
import { Logger, NodeIO } from '@gltf-transform/core'
import { KHRMeshQuantization } from '@gltf-transform/extensions'
import { dedup, prune, quantize, resample, weld } from '@gltf-transform/functions'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInThisContext } from 'node:vm'
import { inflateSync } from 'node:zlib'

const workshop = join(dirname(fileURLToPath(import.meta.url)), '..')
if (!process.argv[2]) throw new Error('Give the path to the plugin folder: node tools/make-models.mjs ../foxtrail')
const out = join(resolve(process.argv[2]), 'web/models')
const reader = join(out, 'reader.js')
if (!existsSync(reader)) throw new Error(`${reader} is missing: it belongs to the plugin and reads these files`)

/** The directory holds every file that is not an image or a font to 256 KiB; files aim well below it. */
const LIMIT = 256 * 1024
const AIM = 200 * 1024
const WIDTH = 150

/** Who made each model, for the note at the top of its files. */
const FOX_CREDIT = [
  'The glTF sample Fox: model by PixelMannen (CC0), rigging and animation by tomkranis (CC-BY 4.0),',
  'glTF conversion by AsoboStudio and scurest (CC-BY 4.0).',
]
const ANIMAL_CREDIT = ['By Quaternius (CC0), via Poly Pizza. Slimmed for the trail: only the clips it plays, resampled, with quantized meshes.']

/** Per animal: the clips the page uses, by their short name (the part after the last "|"). */
const ANIMAL_CLIPS = {
  deer: ['Walk', 'Eating', 'Idle', 'Idle_Headlow', 'Gallop'],
  stag: ['Walk', 'Eating', 'Idle', 'Idle_Headlow', 'Gallop'],
  wolf: ['Walk', 'Eating', 'Idle', 'Idle_2', 'Idle_2_HeadLow', 'Gallop'],
  bat: ['Bat_Flying'],
  fish: ['Swim'],
  whale: ['Swim'],
  manta: ['Swim'],
  dolphin: ['Swim'],
  ghost: ['Flying_Idle', 'Fast_Flying'],
  dragon: ['Dragon_Flying'],
}

/** An animal's model with only the clips the trail plays, resampled, and its meshes quantized. */
async function slim(file, keep) {
  const io = new NodeIO().registerExtensions([KHRMeshQuantization])
  const doc = await io.read(file)
  doc.setLogger(new Logger(Logger.Verbosity.ERROR))
  const seen = new Set()
  for (const anim of doc.getRoot().listAnimations()) {
    const name = anim.getName().split('|').pop()
    if (!keep.includes(name) || seen.has(name) || !anim.listChannels().length) {
      for (const sampler of anim.listSamplers()) sampler.dispose()
      for (const channel of anim.listChannels()) channel.dispose()
      anim.dispose()
      continue
    }
    seen.add(name)
    anim.setName(name)
  }
  await doc.transform(resample({ tolerance: 1e-3 }), dedup(), weld(), quantize({ quantizePosition: 12, quantizeNormal: 8, quantizeWeight: 8 }), prune())
  for (const a of doc.getRoot().listAccessors()) if (a.listParents().every(p => p.propertyType === 'Root')) a.dispose()
  return Buffer.from(await io.writeBinary(doc))
}

// ---------- reading a .glb ----------

const KINDS = {
  5120: { array: Int8Array, name: 'byte' }, 5121: { array: Uint8Array, name: 'unsigned byte' }, 5122: { array: Int16Array, name: 'short' },
  5123: { array: Uint16Array, name: 'unsigned short' }, 5125: { array: Uint32Array, name: 'unsigned int' }, 5126: { array: Float32Array, name: 'float' },
}
const PER_ELEMENT = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 }

/** The description and the binary chunk of a .glb. */
function openGlb(glb) {
  if (glb.readUInt32LE(0) !== 0x46546c67) throw new Error('not a .glb')
  const jsonLength = glb.readUInt32LE(12)
  const gltf = JSON.parse(glb.subarray(20, 20 + jsonLength).toString('utf8'))
  const binary = glb.subarray(28 + jsonLength, 28 + jsonLength + glb.readUInt32LE(20 + jsonLength))
  return { gltf, binary }
}

/** The numbers of one accessor, read element by element so interleaved buffers come out right. */
function accessorValues(gltf, binary, accessor) {
  if (accessor.sparse || accessor.bufferView === undefined) throw new Error('sparse or empty accessors are not handled')
  const kind = KINDS[accessor.componentType]
  const per = PER_ELEMENT[accessor.type]
  if (accessor.type.startsWith('MAT') && accessor.componentType !== 5126) throw new Error('only float matrices are handled')
  const view = gltf.bufferViews[accessor.bufferView]
  const size = kind.array.BYTES_PER_ELEMENT
  const stride = view.byteStride || per * size
  const start = (view.byteOffset || 0) + (accessor.byteOffset || 0)
  const values = new kind.array(accessor.count * per)
  const bytes = new Uint8Array(values.buffer)
  for (let i = 0; i < accessor.count; i++) bytes.set(binary.subarray(start + i * stride, start + i * stride + per * size), i * per * size)
  return values
}

/** The pixels of an 8-bit RGB or RGBA PNG that is not interlaced, as RGB. */
function decodePng(png) {
  let at = 8, width = 0, height = 0, depth = 0, type = 0, interlace = 0
  const data = []
  while (at < png.length) {
    const length = png.readUInt32BE(at), name = png.toString('latin1', at + 4, at + 8), body = png.subarray(at + 8, at + 8 + length)
    if (name === 'IHDR') { width = body.readUInt32BE(0); height = body.readUInt32BE(4); depth = body[8]; type = body[9]; interlace = body[12] }
    if (name === 'IDAT') data.push(body)
    at += 12 + length
  }
  if (depth !== 8 || (type !== 2 && type !== 6) || interlace) throw new Error('only plain 8-bit RGB or RGBA PNG textures are handled')
  const bpp = type === 2 ? 3 : 4, stride = width * bpp, raw = inflateSync(Buffer.concat(data)), lines = Buffer.alloc(height * stride)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)], row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? lines[y * stride + x - bpp] : 0, b = y ? lines[(y - 1) * stride + x] : 0, c = x >= bpp && y ? lines[(y - 1) * stride + x - bpp] : 0
      let v = row[x]
      if (filter === 1) v += a
      else if (filter === 2) v += b
      else if (filter === 3) v += (a + b) >> 1
      else if (filter === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c }
      lines[y * stride + x] = v & 255
    }
  }
  const rgb = Buffer.alloc(width * height * 3)
  for (let i = 0; i < width * height; i++) {
    if (bpp === 4 && lines[i * 4 + 3] !== 255) throw new Error('textures with transparency are not handled')
    lines.copy(rgb, i * 3, i * bpp, i * bpp + 3)
  }
  return { width, height, rgb }
}

// ---------- writing text ----------

/** The shortest decimal that gives back exactly this 32-bit float. */
function float(v) {
  if (!Number.isFinite(v)) throw new Error('a model holds a number that is not finite')
  if (Object.is(v, -0)) return '-0'
  for (let digits = 1; digits <= 9; digits++) {
    const text = String(Number(v.toPrecision(digits)))
    if (Math.fround(Number(text)) === v) return text
  }
  throw new Error(`no decimal found for ${v}`)
}

/** JSON that reads well: whatever fits on a line stays on it, the rest is broken up and indented. */
function tidy(value, indent = '') {
  const flat = JSON.stringify(value)
  if (flat === undefined || flat.length + indent.length <= WIDTH || typeof value !== 'object' || value === null) return flat
  const inner = indent + '  '
  if (Array.isArray(value)) {
    if (value.every(v => typeof v === 'number')) return '[\n' + wrap(value.map(String), inner) + '\n' + indent + ']'
    return '[\n' + value.map(v => inner + tidy(v, inner)).join(',\n') + '\n' + indent + ']'
  }
  return '{\n' + Object.entries(value).map(([k, v]) => `${inner}${JSON.stringify(k)}: ${tidy(v, inner)}`).join(',\n') + '\n' + indent + '}'
}

/** Words joined by ", " into lines of at most WIDTH characters. */
function wrap(words, indent) {
  const lines = []
  let line = indent
  for (const [i, word] of words.entries()) {
    const piece = word + (i < words.length - 1 ? ',' : '')
    if (line.length > indent.length && line.length + 1 + piece.length > WIDTH) { lines.push(line); line = indent }
    line += (line.length > indent.length ? ' ' : '') + piece
  }
  lines.push(line)
  return lines.join('\n')
}

/** What each accessor is for, so a reader of the text knows what the numbers are. */
function purposes(gltf) {
  const what = []
  const note = (at, text) => { if (at !== undefined) (what[at] ||= []).push(text) }
  for (const mesh of gltf.meshes || []) {
    for (const primitive of mesh.primitives) {
      const of = `of mesh "${mesh.name || gltf.meshes.indexOf(mesh)}"`
      note(primitive.indices, `triangle indices ${of}`)
      for (const [attribute, at] of Object.entries(primitive.attributes)) note(at, `${attribute} ${of}`)
    }
  }
  for (const skin of gltf.skins || []) note(skin.inverseBindMatrices, `inverse bind matrices of skin "${skin.name || gltf.skins.indexOf(skin)}"`)
  for (const animation of gltf.animations || []) {
    for (const channel of animation.channels) {
      const sampler = animation.samplers[channel.sampler]
      const node = gltf.nodes[channel.target.node]?.name ?? channel.target.node
      note(sampler.input, `keyframe times in clip "${animation.name}"`)
      note(sampler.output, `${channel.target.path} of "${node}" in clip "${animation.name}"`)
    }
  }
  return what.map(texts => { const unique = [...new Set(texts)]; return unique.length > 2 ? `${unique[0]}, and ${unique.length - 1} more uses` : unique.join('; ') })
}

/** A picture as runs of colour per row. The most used colours get a letter; a row equal to the one above is counted. */
function pictureText(name, at, { width, height, rgb }) {
  const hexAt = i => '#' + rgb.toString('hex', i * 3, i * 3 + 3)
  const counts = new Map()
  for (let i = 0; i < width * height; i++) counts.set(hexAt(i), (counts.get(hexAt(i)) || 0) + 1)
  const letters = 'abcdefghijklmnopqrstuvwxyz'
  const common = [...counts.entries()].sort((a, b) => b[1] - a[1]).filter(([, n]) => n >= width).slice(0, letters.length)
  const letterOf = new Map(common.map(([hex], i) => [hex, letters[i]]))
  const rows = []
  for (let y = 0; y < height; y++) {
    const runs = []
    for (let x = 0; x < width;) {
      const hex = hexAt(y * width + x)
      let n = 1
      while (x + n < width && hexAt(y * width + x + n) === hex) n++
      runs.push((n > 1 ? n : '') + (letterOf.get(hex) || hex))
      x += n
    }
    const row = runs.join(' ')
    if (rows.length && row === rows.findLast(r => typeof r === 'string')) {
      if (typeof rows.at(-1) === 'number') rows[rows.length - 1]++
      else rows.push(1)
    } else rows.push(row)
  }
  const colours = common.map(([hex], i) => `${letters[i]}: '${hex}'`).join(', ')
  return [
    `foxtrailModels.picture('${name}', ${at}, {`,
    `  width: ${width},`,
    `  height: ${height},`,
    `  // The colours that fill most of the picture. Any other colour is written as its hex value.`,
    `  colours: { ${colours} },`,
    `  // One line per row of pixels, as runs of "count colour". A number on its own repeats the row above that many times.`,
    `  rows: [`,
    ...rows.map(row => (typeof row === 'number' ? `    ${row},` : `    '${row}',`)),
    `  ],`,
    `})`,
  ].join('\n')
}

/** Splits a model into statements, then packs those into files that stay under the size the directory reads. */
function modelFiles(name, credit, glb) {
  const { gltf, binary } = openGlb(glb)
  if ((gltf.buffers || []).length !== 1) throw new Error(`${name}: expected one buffer`)
  const values = gltf.accessors.map(accessor => accessorValues(gltf, binary, accessor))
  const pictures = (gltf.images || []).map(image => {
    if (image.bufferView === undefined) throw new Error(`${name}: an image that is not inside the model is not handled`)
    if (image.mimeType !== 'image/png') throw new Error(`${name}: only PNG textures are handled`)
    const view = gltf.bufferViews[image.bufferView]
    return decodePng(binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength))
  })

  // The description, without what the reader works out again: where each accessor sits in the binary buffer.
  const described = JSON.parse(JSON.stringify(gltf))
  delete described.buffers
  delete described.bufferViews
  for (const accessor of described.accessors) { delete accessor.bufferView; delete accessor.byteOffset }
  for (const image of described.images || []) delete image.bufferView

  const what = purposes(gltf)
  const statements = [`foxtrailModels.describe('${name}', ${tidy(described)})`]
  gltf.accessors.forEach((accessor, at) => {
    const per = PER_ELEMENT[accessor.type]
    const isFloat = accessor.componentType === 5126
    const words = Array.from(values[at], v => (isFloat ? float(v) : String(v)))
    const label = `accessor ${at}: ${accessor.count} × ${accessor.type} of ${KINDS[accessor.componentType].name}${what[at] ? `, ${what[at]}` : ''}`
    // A long accessor is handed over in several calls, cut between elements, so that no file grows too large.
    const perCall = Math.max(per, Math.floor(AIM * 0.9 / 11 / per) * per)
    for (let from = 0, piece = 1; from < words.length || (from === 0 && piece === 1); from += perCall, piece++) {
      const pieces = Math.max(1, Math.ceil(words.length / perCall))
      statements.push(`// ${label}${pieces > 1 ? ` (piece ${piece} of ${pieces})` : ''}\nfoxtrailModels.numbers('${name}', ${at}, [\n${wrap(words.slice(from, from + perCall), '  ')}\n])`)
    }
  })
  pictures.forEach((picture, at) => statements.push(`// image ${at}: the texture, ${picture.width} × ${picture.height} pixels\n${pictureText(name, at, picture)}`))

  const groups = [[]]
  let size = 0
  for (const statement of statements) {
    const bytes = Buffer.byteLength(statement) + 2
    if (size && size + bytes > AIM) { groups.push([]); size = 0 }
    groups.at(-1).push(statement)
    size += bytes
  }
  const title = name[0].toUpperCase() + name.slice(1)
  const files = groups.map((group, i) => ({
    file: `${name}.${i + 1}.js`,
    text: [
      `// ${title}, file ${i + 1} of ${groups.length}.`,
      ...credit.map(line => `// ${line}`),
      `// A glTF 2.0 model written out as text: its description, then the numbers of every accessor in full.`,
      `// reader.js in this folder packs them for three.js. Made by the Fox Trail workshop (tools/make-models.mjs).`,
      '',
      group.join('\n\n'),
      '',
    ].join('\n'),
  }))
  return { files, gltf, values, pictures }
}

// ---------- checking the text against the source ----------

/** Loads the plugin's reader and the written files the way the page does, and compares the result with the source. */
function check(name, files, source) {
  let painted = null
  globalThis.window = globalThis
  globalThis.ImageData = class { constructor(data, width, height) { Object.assign(this, { data, width, height }) } }
  globalThis.document = {
    createElement: () => ({ getContext: () => ({ putImageData: image => { painted = image } }), toDataURL: () => 'data:image/png;base64,' }),
  }
  runInThisContext(readFileSync(reader, 'utf8'), { filename: reader })
  for (const { file, text } of files) runInThisContext(text, { filename: file })
  const { gltf, binary } = openGlb(Buffer.from(globalThis.foxtrailModels.glb(name)))

  if (gltf.accessors.length !== source.gltf.accessors.length) throw new Error(`${name}: the number of accessors changed`)
  gltf.accessors.forEach((accessor, at) => {
    const back = Buffer.from(accessorValues(gltf, binary, accessor).buffer)
    if (!back.equals(Buffer.from(source.values[at].buffer))) throw new Error(`${name}: accessor ${at} did not come back the same`)
  })
  const bare = g => {
    const copy = JSON.parse(JSON.stringify(g))
    delete copy.buffers
    delete copy.bufferViews
    for (const accessor of copy.accessors) { delete accessor.bufferView; delete accessor.byteOffset }
    for (const image of copy.images || []) { delete image.bufferView; delete image.uri }
    return JSON.stringify(copy)
  }
  if (bare(gltf) !== bare(source.gltf)) throw new Error(`${name}: the description did not come back the same`)
  for (const picture of source.pictures) {
    if (!painted || painted.width !== picture.width || painted.height !== picture.height) throw new Error(`${name}: the texture was not painted`)
    for (let i = 0; i < picture.width * picture.height; i++) {
      if (painted.data[i * 4] !== picture.rgb[i * 3] || painted.data[i * 4 + 1] !== picture.rgb[i * 3 + 1] || painted.data[i * 4 + 2] !== picture.rgb[i * 3 + 2] || painted.data[i * 4 + 3] !== 255) {
        throw new Error(`${name}: pixel ${i} of the texture did not come back the same`)
      }
    }
  }
}

// ---------- the run ----------

const sources = { fox: { credit: FOX_CREDIT, glb: readFileSync(join(workshop, 'models/fox.glb')) } }
for (const [kind, clips] of Object.entries(ANIMAL_CLIPS)) {
  sources[kind] = { credit: ANIMAL_CREDIT, glb: await slim(join(workshop, `models/${kind}.glb`), clips) }
}

mkdirSync(out, { recursive: true })
for (const old of readdirSync(out)) if (/^[a-z]+\.\d+\.js$/.test(old)) rmSync(join(out, old))

const written = []
for (const [name, { credit, glb }] of Object.entries(sources)) {
  const { files, ...source } = modelFiles(name, credit, glb)
  check(name, files, source)
  for (const { file, text } of files) {
    const bytes = Buffer.byteLength(text)
    if (bytes >= LIMIT) throw new Error(`${file} is ${bytes} bytes, over the ${LIMIT} byte limit: lower AIM`)
    writeFileSync(join(out, file), text)
    written.push(file)
    console.log(`  ${file.padEnd(14)} ${String(bytes).padStart(7)} bytes`)
  }
  console.log(`${name}: ${glb.length} bytes of .glb → ${files.length} file${files.length > 1 ? 's' : ''}, every number and pixel read back the same`)
}

console.log('\nScript tags for web/index.html:')
console.log('<script src="models/reader.js"></script>')
for (const file of written) console.log(`<script src="models/${file}"></script>`)
