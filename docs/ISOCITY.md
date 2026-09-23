# IsoCity rendering integration

QALA uses code and assets from [amilich/isometric-city](https://github.com/amilich/isometric-city) as an offline visual layer. The HackAlem decision model remains the authority for budgets, legal choices, indicator effects, synergies, and the Quality of Life score.

## Pinned source and license

- Upstream: `https://github.com/amilich/isometric-city`
- Commit: `f1bbce8a93fae61d2446d1ece50309f26531d987`
- License: MIT, copyright (c) 2025 amilich.
- License text: [`src/vendor/isocity/LICENSE`](../src/vendor/isocity/LICENSE), also reproduced in [`THIRD-PARTY-NOTICES.md`](../THIRD-PARTY-NOTICES.md).
- Local asset hashes and original paths: [`src/assets/isocity/manifest.json`](../src/assets/isocity/manifest.json).

The WebP files were copied without image editing. Upstream's runtime red-background removal is retained in `imageLoader.ts`. These are actual upstream assets and drawing functions, including its procedural cars and pedestrians.

## What is reused

| Local module                                                                                                     | Upstream source                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `renderConfig.ts`                                                                                                | `src/lib/renderConfig.ts`                                                                                                                                                              |
| `model.ts`                                                                                                       | Rendering types from `src/games/isocity/types/{buildings,zones,game}.ts`, cardinal directions from `src/core/types/grid.ts`, footprint/waterfront helpers from `src/lib/simulation.ts` |
| `drawing.ts`, `roadDrawing.ts`, `trafficSystem.ts`                                                               | Same filenames under `src/components/game/`                                                                                                                                            |
| `buildingSprite.ts`, `imageLoader.ts`                                                                            | Same filenames under `src/components/game/`                                                                                                                                            |
| `vehicleSystems.ts`, `pedestrianSystem.ts`, `drawPedestrians.ts`                                                 | Same filenames under `src/components/game/`                                                                                                                                            |
| `types.ts`, `constants.ts`, `utils.ts`, `gridFinders.ts`, `railSystem.ts`, `incidentData.ts`, `renderHelpers.ts` | Same filenames under `src/components/game/`                                                                                                                                            |
| `index.ts`                                                                                                       | QALA adapter exports                                                                                                                                                                   |

Traffic support dependencies remain available because the original vehicle hook uses them. The QALA wrapper chooses which visual update methods run. The upstream economy, random incidents, construction game, React context, accounts, multiplayer, Next.js application, translation service, and Supabase integration are not imported into QALA's decision simulation.

## Bundled assets

| Local file in `src/assets/isocity/` | Upstream path                                       |   Bytes |
| ----------------------------------- | --------------------------------------------------- | ------: |
| `base.webp`                         | `public/assets/sprites_red_water_new.webp`          | 547,908 |
| `dense.webp`                        | `public/assets/sprites_red_water_new_dense.webp`    | 595,526 |
| `modern.webp`                       | `public/assets/sprites_red_water_new_modern.webp`   | 527,882 |
| `parks.webp`                        | `public/assets/sprites_red_water_new_parks.webp`    | 626,448 |
| `services.webp`                     | `public/assets/sprites_red_water_new_services.webp` | 146,898 |
| `water.webp`                        | `public/assets/water.webp`                          |  23,974 |

Total: 2,468,636 bytes before bundling. Assets are imported through Vite and embedded by QALA's existing single-file build. No asset CDN, external tiles, or network access is required for the packaged game.

## Adaptations

1. Replaced upstream `@/` path aliases with local imports.
2. Extracted a small `model.ts` instead of importing the upstream type barrel, which would also pull unrelated application dependencies.
3. Kept the default `sprites4` pack. Removed unbundled alternate themes and optional sheet URLs, retaining the upstream fallback to the base sheet. The imported pack supports base, dense, modern, parks, and services variants.
4. Replaced root-relative sprite paths with bundled WebP imports. The unused aircraft image constant is empty because QALA does not load aircraft sprites.
5. Preserved upstream coordinate overlap corrections, sprite scale/offset maps, construction-independent source selection, road junctions/sidewalks/traffic lights, vehicle drawing, and pedestrian animation algorithms.
6. Tuned ambient rendering for the 64×64 city: cars remain visible down to zoom 0.25, pedestrians to 0.30. Counts are capped at 90 cars / 120 pedestrians on desktop and 36 cars / 48 pedestrians on mobile. Movement and drawing algorithms remain upstream.
7. Added in-flight sprite loading deduplication so city rendering and policy cards share the same image decode and chroma-key pass. `IsoCityPolicyArt` uses the same upstream sprite selection/crop rules for school, hospital, park and utility assets; non-building policies keep descriptive symbols.
8. Preserved the upstream MIT notice and documented the pinned source. Formatting may be normalized by the QALA formatter.

## Wrapper API

Import from `src/vendor/isocity/index.ts`:

```ts
import {
  TILE_WIDTH,
  TILE_HEIGHT,
  drawGreenBaseTile,
  drawGreyBaseTile,
  drawRoad,
  createMergeInfoCache,
  getActiveSpritePack,
  selectSpriteSource,
  getSpriteRenderInfo,
  loadSpriteImage,
  getCachedImage,
  gridToScreen,
  screenToGrid,
  useVehicleSystems,
  type Tile,
  type Building,
  type VehicleSystemRefs,
  type VehicleSystemState,
} from '../vendor/isocity';
```

The wrapper supplies a deterministic illustrative Astana grid, camera state, pointer controls, and policy-linked visual additions. `useVehicleSystems` retains its original ref/state interface; its render/update functions are called from the wrapper's animation loop. Population fields in this visual grid control ambience only, never the HackAlem population weights or score. Pause and reduced-motion handling belong to the QALA wrapper.

The city is an artistic representation with Astana landmarks, not surveyed geography or a predictive traffic model. Movement and ambient activity do not add hidden bonuses or alter any policy's computed effect.
