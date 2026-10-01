# SNR Animation

The "noise → custom solution → signal" hero animation from Artisan Technology v25, extracted as a standalone component. Plain HTML, CSS and JavaScript — no dependencies, no build step.

## Files

| File | What it is |
| --- | --- |
| `snr-animation.css` | All styles, scoped under `.snr`: background haze, film grain, NOISE / SIGNAL headings, the glass lens and the `[ custom solution ]` caption. |
| `snr-animation.js` | Draws the wave field on the canvas: noisy strands and static on the left, the glowing pure sine on the right, the halo behind the lens and the drifting dust motes. |
| `index.html` | A minimal working demo. Open it in a browser. |

## Use it

```html
<link rel="stylesheet" href="snr-animation.css">

<section class="snr" data-snr>
  <div class="snr__mist" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
  <canvas class="snr__field" aria-hidden="true"></canvas>

  <p class="snr__word snr__word--noise" aria-hidden="true">noise<small>problems that don't fit</small></p>
  <p class="snr__word snr__word--signal" aria-hidden="true">signal<small>creative leading edge</small></p>

  <div class="snr__lens" aria-hidden="true"></div>
  <p class="snr__lens-cap snr__tiny snr__bracket">custom solution</p>

  <div class="snr__grain" aria-hidden="true"></div>
</section>

<script src="snr-animation.js"></script>
```

Any element with `data-snr` mounts automatically. Put your own content (a title, nav, etc.) inside the section with `position: absolute; z-index: 3` or higher to sit above the animation.

### Mount manually / customise

Leave off `data-snr` and call:

```js
const anim = SNRAnimation.mount(document.querySelector('.snr'), {
  noiseColors:  ['217,164,91', '79,124,255', '58,224,200', '150,165,185'], // rgb triplets
  signalColors: ['79,124,255', '58,224,200', '220,245,255'],               // start, middle, end
  haloColor:  '58,224,200',
  moteColor:  '160,240,228',
  strands: 7,     // noisy wave lines
  specks: 520,    // static dots per frame
  speed: 1.7,     // wave speed
  centerY: .52,   // vertical centre of the waves (0–1)
  lensX: .5,      // where noise becomes signal (0–1); move .snr__lens to match
});

anim.destroy();   // stop and clean up
```

### Size and colours

- Height: set `--snr-height` on `.snr` (defaults to `100vh`, minimum 620px).
- Colours and fonts: override the `--snr-*` custom properties at the top of `snr-animation.css`.
- Fonts used in the original: Space Grotesk (headings) and JetBrains Mono (labels), loaded from Google Fonts in the demo. Without them the component falls back to system fonts.

## Behaviour notes

- The canvas redraws only while the section is on screen (IntersectionObserver), and resizes with the window.
- With `prefers-reduced-motion`, it draws a single still frame and the CSS animations stop.
- The haze and grain are contained inside the section (they were full-page `position: fixed` layers in the original site).
