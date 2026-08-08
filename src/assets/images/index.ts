// Active hero carousel images, with responsive WebP variants.
//
// Each export is `{ src, srcSet, sizes }`:
//   - src:     the 2560px source (fallback)
//   - srcSet:  responsive sources for <img srcset>
//   - sizes:   tells the browser the image is full-viewport width
//
// Variant files are `<name>-768.webp` / `<name>-1280.webp` / `<name>-1920.webp`
// / `<name>.webp` (2560). Unused candidates live in ./archive/ and are not exported.

import hero03src from './hero-03.webp'
import hero03_768 from './hero-03-768.webp'
import hero03_1280 from './hero-03-1280.webp'
import hero03_1920 from './hero-03-1920.webp'
import hero04src from './hero-04.webp'
import hero04_768 from './hero-04-768.webp'
import hero04_1280 from './hero-04-1280.webp'
import hero04_1920 from './hero-04-1920.webp'
import hero06src from './hero-06.webp'
import hero06_768 from './hero-06-768.webp'
import hero06_1280 from './hero-06-1280.webp'
import hero06_1920 from './hero-06-1920.webp'
import hero07src from './hero-07.webp'
import hero07_768 from './hero-07-768.webp'
import hero07_1280 from './hero-07-1280.webp'
import hero07_1920 from './hero-07-1920.webp'
import hero08src from './hero-08.webp'
import hero08_768 from './hero-08-768.webp'
import hero08_1280 from './hero-08-1280.webp'
import hero08_1920 from './hero-08-1920.webp'
import hero11src from './hero-11.webp'
import hero11_768 from './hero-11-768.webp'
import hero11_1280 from './hero-11-1280.webp'
import hero11_1920 from './hero-11-1920.webp'
import hero12src from './hero-12.webp'
import hero12_768 from './hero-12-768.webp'
import hero12_1280 from './hero-12-1280.webp'
import hero12_1920 from './hero-12-1920.webp'
import hero14src from './hero-14.webp'
import hero14_768 from './hero-14-768.webp'
import hero14_1280 from './hero-14-1280.webp'
import hero14_1920 from './hero-14-1920.webp'

export interface HeroImage {
  src: string
  srcSet: string
  sizes: string
}

const build = (
  src: string,
  variant768: string,
  variant1280: string,
  variant1920: string,
): HeroImage => ({
  src,
  srcSet: [
    `${variant768} 768w`,
    `${variant1280} 1280w`,
    `${variant1920} 1920w`,
    `${src} 2560w`,
  ].join(', '),
  sizes: '100vw',
})

export const hero03 = build(hero03src, hero03_768, hero03_1280, hero03_1920)
export const hero04 = build(hero04src, hero04_768, hero04_1280, hero04_1920)
export const hero06 = build(hero06src, hero06_768, hero06_1280, hero06_1920)
export const hero07 = build(hero07src, hero07_768, hero07_1280, hero07_1920)
export const hero08 = build(hero08src, hero08_768, hero08_1280, hero08_1920)
export const hero11 = build(hero11src, hero11_768, hero11_1280, hero11_1920)
export const hero12 = build(hero12src, hero12_768, hero12_1280, hero12_1920)
export const hero14 = build(hero14src, hero14_768, hero14_1280, hero14_1920)
