# Fox Trail workshop

The tools behind [Fox Trail](https://github.com/patrickkasl/foxtrail). They are kept on this branch, away from the plugin on `main`, so that installing the plugin downloads and builds nothing.

The plugin directory reads every file of a plugin, and it only reads text files of under 256 KiB. Two things the trail needs are not like that from the start: three.js is about 1.3 MB, and a 3D model is a binary file. The tools here write both out as plain text, in parts that stay under the limit.

## What is here

- `models/`: the fox and the animals as they came, as `.glb` files.
- `tools/make-three.mjs`: bundles three.js from its own source modules, without minifying, into the parts in the plugin's `web/three/`.
- `tools/make-models.mjs`: slims the animals, then writes every model out as text into the plugin's `web/models/`. It reads the text back with the plugin's own reader and compares every number and every pixel with the model it started from.
- `tools/check.mjs`: checks the plugin folder against the directory's file rules before a push.

## Use

Check out `main` beside this branch, for example with `git worktree add ../foxtrail main`, then:

```
npm install
npm run three -- ../foxtrail
npm run models -- ../foxtrail
npm run check -- ../foxtrail
```

Each tool prints the files it wrote. When the list of files changes, `make-three` and `make-models` also print the script tags that `web/index.html` needs, in order.

The page itself (`web/index.html`), the reader (`web/models/reader.js`) and the hooks module are written by hand on `main` and need no tool.

## Credits

- Fox model: [glTF Sample Assets, Fox](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox). Model by PixelMannen (CC0), rigging and animation by tomkranis (CC-BY 4.0), glTF conversion by AsoboStudio and scurest (CC-BY 4.0).
- Animals: by [Quaternius](https://quaternius.com), via [Poly Pizza](https://poly.pizza/u/Quaternius) (CC0).
- [three.js](https://threejs.org) (MIT), [glTF Transform](https://gltf-transform.dev) (MIT), [Rollup](https://rollupjs.org) (MIT).

MIT © SynAI B.V. The models keep their own licenses, listed above.
