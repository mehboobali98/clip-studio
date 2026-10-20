---
name: clip
description: Use when the user wants a short video, clip, animated demo, launch or announcement video, release or PR video, product walkthrough or motion graphic, for LinkedIn, a portfolio, Upwork, a README or social media, especially one showing a CLI, a terminal, a Claude Code session or a product UI.
---

# Clip

A video here is code: one HTML page whose every frame is a pure function of
`t`, captured frame by frame with Playwright and encoded with ffmpeg. Two
proven styles ship as working templates. Start from one; never from a blank page.

| Style | Looks like | Template | Guide |
|---|---|---|---|
| Product demo | A launch video: a real-looking app window, camera moves inside it, spotlight, 3D depth | `templates/product-demo.html` | `references/product-demo.md` |
| Motion graphics | Kinetic type, a virtual camera, comets, implosions, shatter, slow motion | `templates/motion-graphics.html` | `references/motion-graphics.md` |

If the user hasn't named a style, ask, with this table. If they need narration,
a voiceover or a library of stock effects, say that [HyperFrames](https://github.com/heygen-com/hyperframes)
does those and this kit doesn't.

## Workflow

`$S` below is `${CLAUDE_PLUGIN_ROOT}/skills/clip/scripts`. Each step ends at a checkpoint; don't skip ahead to rendering.

1. **Brief.** Platform and format (table below), the one message, who watches, the claims on screen and where each is proven, and the style.
2. **Storyboard** as timed beats. The message lands in the first 3 seconds. Show it to the user.
3. **Build.** Copy the template (and `templates/brand.example.json` as `brand.json`, if the user has brand colours or fonts) into the user's project; never edit the plugin's copy. Read the style guide, adapt.
4. **Preview while building:** `node $S/preview.mjs <page>` opens a scrubber; marked moments become a ready keyframe command.
5. **Check and lint:** `node $S/capture.mjs <page> check`, then `lint` (determinism, text below about 20 px, text off the frame). Fix until both are clean; mark deliberate transitions in `window.lintSkip`.
6. **Keyframes:** `capture.mjs <page> keys <dir> <t>...`, then `bash $S/sheet.sh <dir> <sheet.png>`. Look at the sheet yourself, then show the user. **Full renders wait for their approval.**
7. **Render** in the background: `capture.mjs <page> all <frames-dir> --fps 60`, then `bash $S/encode.sh <frames-dir> <out.mp4> 60 <cover-second> [music]`. If the page sets `window.captions`, also `capture.mjs <page> srt <out.srt>`.
8. **Verify:** `bash $S/sheet.sh <out.mp4> <check.png>`, look at it, delete the frames directory, open the MP4 for the user.

First run on a machine: `npm install --prefix ${CLAUDE_PLUGIN_ROOT}` and `npx --prefix ${CLAUDE_PLUGIN_ROOT} playwright install chromium`. ffmpeg must be on PATH.

## From a release or a PR

`gh release view <tag> --json name,body` or `gh pr view <n> --json title,body,files`. Pick the one change a user would notice, open on it, show it working in two or three beats (the product-demo template), and end on where to get it. Claims come from the release notes or the diff, not from guesses about impact.

## Formats

| Where | Size | Notes |
|---|---|---|
| LinkedIn feed | 1080×1350 (4:5) | Autoplays muted: captions carry the story; upload the SRT with it |
| Square posts | 1080×1080 | |
| Upwork portfolio, catalog | 1440×1080 (4:3) | Catalog: up to 60 s |
| README, X, YouTube | 1920×1080 (16:9) | |

Set `window.frame = { width, height }` in the page; 60 fps.

## On-screen content

- Every claim is true and has a source. If the user keeps an evidence or profile file, check claims against it.
- Screens show made-up data (`#12345`, `example.com`, "A. Engineer"), never real tickets, code, customers or colleagues.
- No employer or client name unless the user asks for it.
- Captions follow the user's writing rules (their CLAUDE.md or memory).
- Text must read on a phone; `lint` enforces about 20 px at 1080 wide. Mark deliberately tiny illustration text `data-lint="decor"`.
- Every effect explains something. A spotlight points at the line that matters; frosted glass means "hidden". Nothing decorative loops.

## Common mistakes

| Mistake | Fix |
|---|---|
| Zooming the whole window crops its frame | Zoom the content inside the window; the frame stays whole |
| Big text over other text | Put a dark backing behind pop-outs; dim the rest |
| A prompt glyph the mono font lacks (`❯`) shifts the caret | ASCII in prompts (`$`, `>`) |
| `the page never set window.ready` | A build-time exception; `check` prints it |
| Web fonts finishing mid-capture | Load every face before `ready` (the templates do) |
| Rendering before the user saw keyframes | A full render is 5 to 10 minutes; get the yes first |
| Random values that change between frames | Seed every random value (`rng(seed)`, `hash(i, frame)`) |
