# Motion graphics

Real motion design, not a slideshow: a virtual camera, choreographed beats,
objects that travel with trails, spring-settled type, text that decodes, and
colour changes that carry meaning. Fades, line-draws and a counter on their
own read as low effort. `templates/motion-graphics.html` is a complete
23-second example; adapt it.

## Structure

One SVG world under a camera: `camera(cx, cy, s)` maps a world point to the
frame centre. Each act is a group with its own build and seek; acts hand off
through an implosion, a dive or a cross-fade. Ambient motion (a drifting
mesh, dust on the end card) keeps holds alive.

## Recipes

| Effect | Helper in the template | Notes |
|---|---|---|
| Spring type | `kinetic()` + `springLetters()` | Letters drop in on a damped spring, 35 ms apart |
| Decode | `decode(node, text, t, start, length, colour)` | Characters scramble through glyphs, then resolve left to right; can morph from old text |
| Pop | `pop(node, cx, cy, u)` | Scale on a spring around a point |
| Comet | cubic Bézier + `trail()` | 6 to 8 trailing segments, fading and thinning |
| Implosion | scale and rotate a whole act into a core | Streak lines pulled in, then a shockwave ring and a flash |
| Shatter | seeded shards with velocity, spin and gravity | Pair with sparks and a crack at the impact point |
| Slow motion | `warp(real)` | Integrate time at 0.3x around the decisive beat, then snap back |
| Camera | `keyframes([[t, cx, cy, s], ...], t)` | Dive in, follow, snap back; add a short shake on impacts |
| Counter | update the number each frame | Count up with an ease-out over half a second; the product demo's pop-out shows it |

## Page contract extras

- `window.lintSkip` lists the implosion, the dive, the punch-in, the exit and the close.
- The miniature cards carry `data-lint="decor"`: their tiny text is illustration, not reading.
- `brand.json` next to the page overrides colours (`ink`, `surface`, `line`, `lineStrong`, `quiet`, `paper`, `signal`, `teal`, `heat`, `go`) and fonts (classes `fr`, `sans`, `mono`).

## Rules

- Land the message within the first 5 to 10 seconds; the hook within 3.
- Every frame a pure function of t; seed all randomness.
- Show a keyframe sheet before rendering; this style takes iterations to read right.
