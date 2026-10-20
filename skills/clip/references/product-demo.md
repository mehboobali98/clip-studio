# Product demo

A launch-video look: a believable app window that does the real thing, a
camera that moves to what matters, and depth that feels expensive without
particles. `templates/product-demo.html` is a complete 28-second example
(a terminal, then a Claude Code session); adapt it rather than rebuilding.

## Layers, back to front

1. `#bg`: a dark gradient with three slow-drifting colour blobs (CSS blur). They pulse on big beats.
2. `#persp > #win3d`: the window, in CSS 3D. It swoops in from a tilt, turns like a page at scene changes, drifts slightly on holds and tilts away at the end (`seekWin3d`).
3. Inside the window SVG: a static frame (title bar, traffic lights) and `#inner`, the content under the camera, clipped to the screen.
4. `#top`: screen-space captions, the opening hook, pop-outs and the end card.

## Timing

- `HOOK` seconds of opening type first ("Redmine tickets. / Claude Code. / One workflow."): three short lines that blur into focus, then rush past the camera.
- Scene time `u = t - HOOK` drives everything else.
- About 3 to 4 seconds per beat; captions change with the beat; the whole clip 25 to 30 seconds.

## Recipes

| Want | Do |
|---|---|
| Captions | Eyebrow (mono, accent, letter-spaced), headline (bold, about 41 px in an 800-wide viewBox), one sub line at a time. Blur in and out with an SVG feGaussianBlur. |
| Typing | `typingTimes(text, seed)` gives uneven, seeded gaps; `typed()` reads it at t. Caret blinks when idle. |
| Terminal output | One line per text node; reveal lines about 0.05 s apart. Copy the CLI's real output format from its source. |
| Claude Code UI | Bordered welcome box in the accent colour, an input box with `> `, a slash menu (command left, description dim), `● Tool(args)` lines with `⎿ result` under them, a spinner cycling `· ✢ ✳ ✶ ✻ ✽`. |
| Camera | `cameraAt(u)` keyframes `[time, cx, cy, scale]`. Visible half-width is `(screen width / 2) / scale` (383 / scale here). Left-aligned text needs `cx - 383/scale` to stay left of its margin. Hold 1.25 to 1.45 for readability on phones. |
| Spotlight | `focusTargets` `[from, to, x, y, w, h]` in content coordinates: a mask dims everything else and a glowing ring frames the target. |
| Hidden information | A frosted pane slides over it, the text under it blurs, and a small tag names what's hidden. |
| A key number | Pop it out in screen space, big, with a rolling count and a dark radial backing, then let it settle back. |
| Polish | A light sweep crosses the window glass on the entrance and at scene changes. |

## Fonts

SF Pro and Menlo on macOS, with Inter and JetBrains Mono from Google Fonts as
fallbacks elsewhere. Menlo's advance is 0.602 em; caret maths assumes it.
