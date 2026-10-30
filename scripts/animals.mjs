// The background animals: Quaternius models (CC0) from poly.pizza, slimmed for the page.
// Keeps only the clips the trail plays, resamples them and quantizes the meshes,
// so each model weighs a fraction of the original.
import { Logger, NodeIO } from '@gltf-transform/core'
import { KHRMeshQuantization } from '@gltf-transform/extensions'
import { dedup, prune, quantize, resample, weld } from '@gltf-transform/functions'
import { join } from 'node:path'

/** Per animal: the clips the page uses, by their short name (the part after the last "|"). */
export const ANIMAL_CLIPS = {
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

const short = name => name.split('|').pop()

export async function slimAnimals(dir) {
  const io = new NodeIO().registerExtensions([KHRMeshQuantization])
  const out = {}
  for (const [kind, keep] of Object.entries(ANIMAL_CLIPS)) {
    const doc = await io.read(join(dir, `${kind}.glb`))
    doc.setLogger(new Logger(Logger.Verbosity.ERROR))
    const seen = new Set()
    for (const anim of doc.getRoot().listAnimations()) {
      const name = short(anim.getName())
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
    out[kind] = Buffer.from(await io.writeBinary(doc))
  }
  return out
}
