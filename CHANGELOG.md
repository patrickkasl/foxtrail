# Changelog

All notable changes to Fox Trail. Versions follow [semantic versioning](https://semver.org).

## 0.6.0

- Fox Trail no longer runs code inside Claude Code. The trail is now kept by ordinary hooks: one small, readable program (`hooks/trail.mjs`) that Claude Code starts with Node.js on a few session events. It reads and writes the same things as before, and runs the same git commands.
- The trail opens with `/foxtrail:open` instead of `/foxtrail`.
- Node.js 18 or newer is now needed.
- The short status line in Claude Code is gone; hooks cannot set one.
- The pack's status file is now `~/.claude/foxtrail/pack.js`. An older `state.js` beside it can be deleted.
- After `/clear` or `/resume` the same fox walks on, instead of one leaving and another joining.
- Failing test runs are now always noticed, also when the test command itself exits with an error.
- A cub's own tool calls set the pace of the pack, but no longer change the sign above its fox.
- Fixed: the first commit or test result of a session was never shown on the trail.
- Fixed: the music and the nature sounds stopped being made while the tab was out of sight, so only a held note and the weather went on. The sound now carries on while you work in another tab.
- Fixed: opening the page played back what had happened before it was opened.
- A command that only mentions a commit or a test run, in a message or a search, no longer sets a cairn or a test sign.
- Test counts are also read the way Node's own test runner and TAP write them.
- A session that reports nothing for twelve hours leaves the pack, so a closed terminal never leaves a fox behind.

## 0.5.0

- The page is now made of plain, readable files instead of one packed file: three.js as unminified source in parts, the fox and the animals written out as text, and the fonts as font files. It looks and sounds the same.
- Installing the plugin no longer downloads anything. The build tools and their `package.json` moved to the `workshop` branch; before, Claude Code installed them along with the plugin.
- The page in `~/.claude/foxtrail/` is a small copy that reads everything else from the plugin's own folder.
- `/foxtrail` opens the page with fixed commands, run inside `~/.claude/foxtrail/`.
- Keep a picture of today's trail with P or the new picture button: the world's name, the date and the size of the pack, copied and ready to share. It never shows a project's name.
- Real animated 3D animals instead of silhouettes: deer led by a stag and wolves on the hills, bats in the caves, fish, dolphins, a manta ray and whales under water, glowing spirits and a dragon in the fantasy lands. They walk at the pace of their own stride and sink into the same haze as the land.
- Animals catch a little moonlight at night.
- The foxes run into view once they have loaded, instead of a placeholder fox showing first.
- Everything on the trail is in English: commit messages and subagent descriptions are no longer shown, only the trail's own words. Commit messages no longer leave git at all.
- Showcase stills in the assets folder; the GIF lives on the `showcase` branch.
- `/foxtrail` opens the page with `xdg-open`, `gio open` or `wslview` on Linux and WSL, never with Linux's unrelated `open` command.
- Windows support: the home folder is read from `HOME` or `USERPROFILE`, and `/foxtrail` opens the page with Windows' own file handler (rundll32). If the page cannot be set up, `/foxtrail` says why.
- A clearer icon: the fox is larger and sits against the moon, so it still reads at small sizes.

## 0.4.0

- First public release candidate.
- A pack of foxes, one per Claude Code session, each with its own coat; subagents run along as cubs.
- Generated worlds across earth, underground, space and fantasy, with changing weather, wildlife and a real day and night.
- Commits become cairns, obstacles on the trail, sitting and jumping.
- Generated ambient music, nature sounds and soft cues, with a tinnitus comfort mode.
- Quiet signs, a journal, a welcome, and a still mode.
