# Artwork provenance

Asset: `src/assets/astana-key-art.png`.

Created for this project with the built-in image-generation tool, not the CLI fallback. The image is bundled in the offline HTML and used in the introduction, report and renderer-failure fallback. The original Phaser prototype used generated architecture sprites over procedural streets. The active city now adapts IsoCity Canvas with locally bundled upstream assets; the generated Astana landmarks remain in use.

Final generation prompt:

> Create a polished wide landscape key art image for a browser strategy game called QALA about being mayor of Astana. No text, no lettering, no UI, no logos. Use-case: stylized-concept. A beautiful miniature isometric architectural diorama of Astana, Kazakhstan, with recognizable golden spherical Baiterek tower as central landmark, elegant modern teal and cream buildings, small neighborhoods, a flowing turquoise Ishim river, little bridges, lush rounded trees and a few amber autumn trees. Physical wooden architectural model / premium indie city-builder aesthetic, detailed but clean, warm ivory ground, soft peach late afternoon sun, soft ambient occlusion, muted sage greens and pale turquoise river, ochre golden highlights. Composition panoramic 3:2, entire small city island visible with spacious warm off-white negative space around its edge, elevated three-quarter camera. Charming, optimistic, human and sophisticated, no sci-fi, no photographic skyline, no labels. Final image is a locally bundled game introduction and GitHub pitch asset.

The supplied output was copied unchanged into this repository. Original generation retained in the local Codex generated-images directory.

Other visuals: Lucide React icons (ISC license), procedural terrain, actor sprites and CSS artwork. Screenshots in `docs/screenshots/` are actual browser captures, not generated UI mockups. No remote fonts, tile APIs, textures or image CDNs are needed at runtime.

## Isometric architecture atlas

`src/assets/building-atlas.png` — original generated 1536×1024 RGBA atlas, three columns by two rows, equal 512-pixel cells. Six detailed, warm-lit isometric building types: older red-roof apartment block; modern Astana glass tower; school; clinic; courtyard houses; heating/utility facility. Runtime frames use these six cells. The supplied PNG is copied unchanged.

Generation brief: a cohesive classic prerendered city-builder sprite sheet, 2:1 isometric perspective, detailed facades and roof furniture, isolated small ground diamonds, lighting from the upper left, transparent surroundings, no text or UI. Exact cell order: apartment / tower / school; clinic / houses / utilities. These are illustrative structures, not six surveyed real buildings.

## Astana landmark atlas

`src/assets/landmark-atlas.png` — original generated 1536×1024 RGBA atlas with six cells: Baiterek / Aq Orda / Khan Shatyr; Hazret Sultan Mosque / Palace of Peace and Reconciliation / Nur Alem. Generation brief: recognizable architecture, matching isometric camera and lighting, white Baiterek lattice supporting its gold sphere, broad white Aq Orda facade with blue-and-gold dome, sloping translucent Khan Shatyr tent, four-minaret mosque, stone-and-blue-glass pyramid and reflective blue sphere on a podium. Transparent surroundings, complete ground footprints, no text. Copied unchanged; artistic approximations, not architectural models.

Architecture references checked against [Visit Astana: Baiterek](https://visitastana.kz/en/about-city/what-to-see/monument-astana-bayterek/), [Visit Astana: Palace of Peace](https://visitastana.kz/en/about-city/what-to-see/dvorets-mira-i-soglasiya9509/), and the [official Aq Orda description](https://mirror.akorda.kz/public/ru/republic_of_kazakhstan/akorda). No photographs or commercial game assets were copied.

## Fictional advisor

`src/assets/advisor-aida.png` — original generated portrait, copied unchanged. Brief: a fictional Kazakh woman in her thirties, shoulder-length dark hair, petrol jacket and ivory blouse, approachable city planner, painterly game-portrait finish, pale slate backdrop, no words or logos. Aida does not depict or impersonate a real official.

## Fonts and handbook

Manrope and Unbounded variable fonts are bundled through Fontsource, including Cyrillic subsets; their OFL licenses remain in the package metadata. The handbook contains original multilingual writing inspired by topics in the user-supplied 20-page excerpt of _100 советов мэру_, Ilya Varlamov and Maxim Katz, Alpina Non-Fiction, 2020, ISBN 978-5-00139-255-2. Only front matter and contents were available. Full chapters were not read or reproduced. The private PDF is not part of this repository.

## IsoCity integration

The active city uses six unchanged WebP packs from amilich/isometric-city. See [pinned source, checksums, adaptation details and MIT license](ISOCITY.md). Astana landmark art, the welcome illustration and Aida portrait remain generated QALA assets. The city-life atlas documented in [CITY-ART.md](CITY-ART.md) belongs to the preserved Phaser prototype; the active IsoCity view uses the upstream ambient rendering modules.
