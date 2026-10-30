# Fox Trail

**A calm companion for coding with Claude Code.**

![A pack of foxes walking through a meadow, a night, a cave, the sea, a fantasy land and space](assets/showcase/trail.gif)

While you build, your work goes for a quiet walk. Every Claude Code session becomes a fox in a small pack, wandering an endless trail through generated worlds: alpine meadows, mountain lakes, crystal caves, ringed planets, gardens beneath the waves. Subagents run along as cubs, every commit becomes a cairn by the path, and the pack sits down to enjoy the view when things go quiet.

It is made to give you rest while you work, whether you have written code for twenty years or you are making your very first thing.

## Why I made this

I spend my days building with Claude Code, and for a long time that meant staring at terminals from morning to night. I got tired of it. I also live with tinnitus, and a quiet room is not always kind to it.

So I made something for myself. A place to rest my eyes and my ears while the work goes on: a small pack of foxes walking through worlds that never repeat, soft sound that fills the silence, and nothing that asks for my attention. It helps me switch off from everything around me and sink into what I am building.

I hope it does the same for you.

Patrick Kasl, [SynAI](https://www.synai.eu)

## What you will find on the trail

- **A pack of foxes**, one per Claude Code session, each with its own coat and a small sign of what it is doing.
- **Cubs** for subagents, running along while their task lasts.
- **Cairns** for commits. Click one to see which fox set it, and when. Your commit messages never leave git.
- **Worlds that never repeat**, with real day and night and changing weather. Deer and wolves on the hills, bats in the caves, fish, dolphins and whales under water, spirits and a dragon in the fantasy lands. New kinds of worlds arrive with updates.
- **A generated soundtrack** of ambient music and nature sounds that follows the world, with soft cues for commits and tests.
- **Tinnitus comfort**, a soft breathing sound bed without sharp high sounds, with an optional notch tuned to your own tone.
- **A journal** of the day, a **still mode** that hides every word, and a quiet welcome every time you arrive.

## Install

```
/plugin install foxtrail --marketplace patrickkasl/foxtrail
```

Then open the trail with `/foxtrail`. It opens in your browser; put it on a second screen, or let it sit behind your editor.

## Update

Fox Trail updates like any other plugin:

```
claude plugin update foxtrail
```

Then run `/reload-plugins` in an open session, or start a new one.

## Keys

| Key | What it does |
| --- | --- |
| Space | the pack jumps |
| Z | sit down, or walk on |
| M | sound on or off |
| H | still mode |
| Esc | close a panel |
| Scroll | zoom in and out |

## Privacy

Everything stays on your computer. Fox Trail writes a small status file to `~/.claude/foxtrail/` with, per session, the project folder's name, what kind of tool is running, the kinds of subagents at work, and how many commits you made today. Commit messages and task descriptions are never written there. The page reads that file and nothing else. There is no account, no tracking and no analytics.

The trail does show your project folders' names, so keep still mode (H) in mind when you share your screen.

## Requirements

- Claude Code
- macOS, Linux or Windows (Windows support is new; tell us how it goes)
- A modern browser with WebGL2 (Chrome, Edge, Firefox or Safari)

## Ideas and problems

Found something that does not look or sound right, or have an idea for a world, a sound or a feature? [Open an issue](../../issues/new/choose). Every issue is read and answered.

## Made by

Fox Trail is made by Patrick Kasl at [SynAI B.V.](https://www.synai.eu), and free for everyone.

## Credits

- Fox model: [glTF Sample Assets, Fox](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox). Model by PixelMannen (CC0), rigging and animation by tomkranis (CC-BY 4.0), glTF conversion by AsoboStudio and scurest (CC-BY 4.0).
- Animals: deer, stag, wolf, bat, fish, dolphin, manta ray, whale, ghost and dragon by [Quaternius](https://quaternius.com), via [Poly Pizza](https://poly.pizza/u/Quaternius) (CC0).
- [three.js](https://threejs.org) (MIT).
- Fonts: Cormorant Garamond and Inter (SIL Open Font License).

## License

MIT © SynAI B.V. The fox and animal models keep their own licenses, listed above.
