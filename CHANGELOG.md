# Changelog

## 0.2.0

- **Live preview** (`preview.mjs`): scrub, play and step a scene while editing it; reload keeps the moment; marked moments become a ready `keys` command.
- **Lint** (`capture.mjs lint`): the same moment must render the same frame whatever was shown before it (compared with a tolerance, since the renderer may anti-alias an edge a shade differently), text must be about 20 px or more at 1080 wide, and inside the frame. `window.lintSkip` and `data-lint="decor"` mark what's deliberate.
- **Brand file:** a `brand.json` next to a template overrides its colours and fonts; `templates/brand.example.json` lists the keys.
- **Captions:** `capture.mjs srt` writes an SRT from `window.captions`; the product demo sets them.
- **Music:** `encode.sh` takes an optional track, trims it to the video, fades it and levels it.
- **Release-to-clip** guidance in the skill, from `gh release view` or `gh pr view`.
- **Fixes found by lint:** both templates now load every font face before `ready` (web-font subsets could arrive mid-capture), and their eyebrows, window titles and tile notes are big enough to read on a phone.
- **CI** checks, lints and renders both templates on every push.
- The README points to HyperFrames for narration, voiceover and stock effects.

## 0.1.0

- First release: the `clip` skill with two templates (product demo, motion graphics), `capture.mjs` (check, keyframes, full frames, with its own local server), `sheet.sh` (contact sheets from frames or an MP4) and `encode.sh` (H.264 MP4 and cover image).
