/**
 * The trail's 3D models, kept as readable text.
 *
 * A model is a glTF 2.0 file written out in full: its description (nodes, meshes, materials, animations)
 * and, for every accessor, the numbers themselves. The files beside this one hand those over:
 *
 *   foxtrailModels.describe(name, gltf)             the description, without its binary buffers
 *   foxtrailModels.numbers(name, accessor, values)  the numbers of one accessor; a long one comes in several calls
 *   foxtrailModels.picture(name, image, picture)    a texture, as runs of colour per row of pixels
 *
 * `glb(name)` packs a model into the binary layout of glTF, which three.js reads. Nothing is fetched and
 * nothing is run: the text only ever becomes vertices, keyframes and pixels.
 */
(() => {
  const models = {}
  const model = name => (models[name] ||= { gltf: null, numbers: [], pictures: [] })

  /** How glTF names the kinds of numbers an accessor can hold, and how many make up one element. */
  const ARRAYS = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }
  const PER_ELEMENT = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 }

  /** The red, green and blue of a colour written as #rrggbb. */
  const rgb = hex => [1, 3, 5].map(at => parseInt(hex.slice(at, at + 2), 16))

  /**
   * Paints a picture and returns it as a PNG data URL. Each row is a line of runs, "count colour",
   * where a colour is a letter from `colours` or a hex value, and a missing count means one pixel.
   * A number instead of a line repeats the row above that many times.
   */
  function paint({ width, height, colours, rows }) {
    const known = Object.fromEntries(Object.entries(colours).map(([letter, hex]) => [letter, rgb(hex)]))
    const pixels = new Uint8ClampedArray(width * height * 4)
    let y = 0
    for (const row of rows) {
      if (typeof row === 'number') {
        for (let n = 0; n < row; n++, y++) pixels.copyWithin(y * width * 4, (y - 1) * width * 4, y * width * 4)
        continue
      }
      let x = 0
      for (const run of row.split(' ')) {
        const [, count, colour] = /^(\d*)(.+)$/.exec(run)
        const [r, g, b] = known[colour] || rgb(colour)
        for (let n = Number(count || 1); n > 0; n--, x++) {
          const at = (y * width + x) * 4
          pixels[at] = r
          pixels[at + 1] = g
          pixels[at + 2] = b
          pixels[at + 3] = 255
        }
      }
      if (x !== width) throw new Error(`row ${y} of a picture is ${x} pixels wide, not ${width}`)
      y++
    }
    if (y !== height) throw new Error(`a picture has ${y} rows, not ${height}`)
    const canvas = Object.assign(document.createElement('canvas'), { width, height })
    canvas.getContext('2d').putImageData(new ImageData(pixels, width, height), 0, 0)
    return canvas.toDataURL('image/png')
  }

  window.foxtrailModels = {
    describe(name, gltf) { model(name).gltf = gltf },
    numbers(name, accessor, values) { (model(name).numbers[accessor] ||= []).push(values) },
    picture(name, image, picture) { model(name).pictures[image] = picture },

    /** The names of the models whose description has loaded. */
    names: () => Object.keys(models).filter(name => models[name].gltf),

    /** The model as a binary glTF (.glb) in memory: a header, the description as JSON, then every accessor's numbers. */
    glb(name) {
      const { gltf: described, numbers, pictures } = models[name] || {}
      if (!described) throw new Error(`the model "${name}" has not loaded`)
      const gltf = JSON.parse(JSON.stringify(described))

      const arrays = gltf.accessors.map((accessor, at) => {
        const array = new ARRAYS[accessor.componentType]((numbers[at] || []).flat())
        const expected = accessor.count * PER_ELEMENT[accessor.type]
        if (array.length !== expected) throw new Error(`accessor ${at} of "${name}" holds ${array.length} numbers, not ${expected}`)
        return array
      })
      let length = 0
      gltf.bufferViews = arrays.map((array, at) => {
        const view = { buffer: 0, byteOffset: length, byteLength: array.byteLength }
        gltf.accessors[at].bufferView = at
        length = Math.ceil((length + array.byteLength) / 4) * 4
        return view
      })
      gltf.buffers = [{ byteLength: length }]
      const binary = new Uint8Array(length)
      arrays.forEach((array, at) => binary.set(new Uint8Array(array.buffer), gltf.bufferViews[at].byteOffset))

      for (const [at, image] of (gltf.images || []).entries()) if (pictures[at]) image.uri = paint(pictures[at])

      const text = new TextEncoder().encode(JSON.stringify(gltf))
      const json = new Uint8Array(Math.ceil(text.length / 4) * 4).fill(0x20)
      json.set(text)

      const glb = new Uint8Array(12 + 8 + json.length + 8 + binary.length)
      const words = new DataView(glb.buffer)
      words.setUint32(0, 0x46546c67, true) // "glTF"
      words.setUint32(4, 2, true)
      words.setUint32(8, glb.length, true)
      words.setUint32(12, json.length, true)
      words.setUint32(16, 0x4e4f534a, true) // "JSON"
      glb.set(json, 20)
      words.setUint32(20 + json.length, binary.length, true)
      words.setUint32(24 + json.length, 0x004e4942, true) // "BIN"
      glb.set(binary, 28 + json.length)
      return glb.buffer
    },
  }
})()
