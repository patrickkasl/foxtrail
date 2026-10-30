# Changelog

All notable changes to Fox Trail. Versions follow [semantic versioning](https://semver.org).

## Unreleased

- Real animated 3D animals instead of silhouettes: deer led by a stag and wolves on the hills, bats in the caves, fish, dolphins, a manta ray and whales under water, glowing spirits and a dragon in the fantasy lands. They walk at the pace of their own stride and sink into the same haze as the land.
- Animals catch a little moonlight at night.
- The foxes run into view once they have loaded, instead of a placeholder fox showing first.
- Everything on the trail is in English: commit messages and subagent descriptions are no longer shown, only the trail's own words. Commit messages no longer leave git at all.
- A showcase GIF and stills in `assets/showcase/`.
- `/foxtrail` opens the page with `xdg-open`, `gio open` or `wslview` on Linux and WSL, never with Linux's unrelated `open` command.
- Windows support: the home folder is read from `HOME` or `USERPROFILE`, and `/foxtrail` opens the page with Windows' own file handler. If the page cannot be set up, `/foxtrail` says why.
- A clearer icon: the fox is larger and sits against the moon, so it still reads at small sizes.

## 0.4.0

- First public release candidate.
- A pack of foxes, one per Claude Code session, each with its own coat; subagents run along as cubs.
- Generated worlds across earth, underground, space and fantasy, with changing weather, wildlife and a real day and night.
- Commits become cairns, obstacles on the trail, sitting and jumping.
- Generated ambient music, nature sounds and soft cues, with a tinnitus comfort mode.
- Quiet signs, a journal, a welcome, and a still mode.
