# Living city art and layout

> Historical design record. The active release uses the IsoCity game experience described in [README](../README.md), [the final-hour plan](FINAL-HOUR.md), and [the current city integration](ISOCITY.md). Earlier renderer, palette and map-first proposals below are retained as project history.

The playable city is an illustrative isometric Astana, not a surveyed geographic model. The official district dataset and deterministic policy engine remain the source of all simulation results. Movement, architecture and street life are presentation only.

## City life sprite atlas

- File: `src/assets/city-life-atlas.png`
- Generated with the built-in image generation tool on 23 September 2026.
- Original: `exec-e7ae93ac-b452-4698-99b0-dc94c1c84c6d.png`.
- 1536 × 1024 RGBA; alpha preserved; bundled locally for offline play.
- Four directional views each of one sedan and one city bus, followed by four pedestrians. Pedestrians retain their original clothing as they turn.
- Rendered with the same warm, detailed isometric art direction as the existing building and landmark atlases.

Generation prompt:

> Use case: stylized-concept. Asset type: transparent isometric sprite atlas for an Astana city simulation in Phaser. Create exactly 12 individual small game sprites arranged in a strict 4-column by 3-row grid, evenly sized cells, landscape 1536x1024. Row 1: the SAME pearl white compact sedan seen driving towards bottom-right, bottom-left, top-left, top-right, respectively. Row 2: the SAME contemporary teal city bus seen driving towards bottom-right, bottom-left, top-left, top-right, respectively. Row 3: four individual adult pedestrians walking towards bottom-right, bottom-left, top-left, top-right respectively, varied restrained navy, ivory, coral and sage clothing. Each individual person stands full length, no groups. Classical detailed realistic isometric city-building game style: finely shaded painterly 3D pre-render, warm sunlight from top-left, soft contact shadow directly under each object, clean cutout silhouettes, convincing roof surfaces and body proportions, approximately 30-degree isometric view. All vehicles identical scale across views; pedestrians large enough within their own cells to preserve details; rendering engine will scale them down. Every sprite wholly inside its cell, centered horizontally with wheels/feet aligned about 85% down cell, ample clean gutters between sprites. Actual transparent alpha background everywhere outside sprites and their contact shadows. No painted scenery or ground tiles. No text, no labels, no grid lines, no watermarks, no visible checkerboard. This must be a production-ready sprite sheet, with exactly four equal columns and three equal rows.

## Geometry and animation

Connected streets have a two-level road hierarchy, sidewalks, crossing stripes and bridge rails. The river is continuous and lined with embankment paths and trees. Districts have varied building footprints, residential courts, public gardens and a civic promenade linking Aq Orda, Baiterek and Khan Shatyr. The six recognisable landmarks use the existing generated landmark atlas.

82 actors follow defined road or sidewalk circuits, including cross-river journeys and bus routes. Movement uses constant world distance rather than a fixed fraction of each street, so a long street does not cause sudden acceleration. Cars briefly pause at junctions. Reduced motion and the pause control freeze movement; day/night tint remains supported. No animation changes scores or implies a calibrated traffic model.
