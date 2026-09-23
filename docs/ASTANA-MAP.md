# Recognizable Astana, reproducible case data

The playable scene adapts IsoCity's rendering and artwork to a compressed Astana layout. It preserves recognizable relationships between landmarks instead of treating them as interchangeable decorations. It is an illustration, not a geographic survey.

The [President's official Aq Orda page](https://mirror.akorda.kz/public/ru/republic_of_kazakhstan/akorda) describes the civic axis from Khan Shatyr through Baiterek and Aq Orda to the Palace of Peace and Reconciliation and Kazakh Eli. The [official Visit Astana map](https://visitastana.kz/en/map/) supports their relative positions, with the EXPO/Nur Alem site south of the central boulevard.

The scene therefore puts Khan Shatyr, Baiterek and Aq Orda on the same bank, continues the axis across the Ishim to the Pyramid, places Hazret Sultan northeast of the Pyramid, and separates the EXPO area to the south. Nurzhol is a pedestrian green corridor with parallel traffic routes. The river bends, green buffers and bridge crossings are compressed for readable play; road and bridge positions are illustrative.

District markers identify the **five districts in the supplied challenge dataset**. They do not represent current administrative polygons. The [official 2025 planning map](https://www.gov.kz/uploads/2025/12/29/7902097b2dbd6bc3e3f7375c35ea7781_original.9856233.pdf) includes six contemporary districts, including Sarayshyq. Adding a sixth scoring district would change the supplied population shares and break the benchmark, so the numerical game keeps the five supplied IDs.

Every policy's score, affected district, delay, synergy and incompatibility comes from the challenge engine. Animated traffic and visible construction explain the scene; they are not calibrated traffic or municipal forecasts. There is no hidden score change from visual time of day, movement or random city growth.

## A larger city with neighbourhood character

The illustration uses a deterministic **64 × 64** grid. The northern old-town blocks use modest apartments, houses and neighbourhood shops. A planned left-bank centre groups taller offices and apartments around the civic axis; the southern EXPO area has university and museum campuses. Garden streets, a small industrial edge, planted riverbanks and an outer green belt provide distinct surroundings. These are artistic neighbourhoods, not extra scoring districts or claims about individual real buildings.

Khan Shatyr, Baiterek and Aq Orda have protected plaza lots. A tree-lined pedestrian axis and fountain courts connect them, with traffic on parallel avenues. The Pyramid and Hazret Sultan stand across the river. All roads and bridges form one connected driveable network. The six named landmarks have their own generated artwork; ordinary streets and buildings, traffic and pedestrians reuse the bundled IsoCity assets and rendering described in [ISOCITY.md](ISOCITY.md).

Map navigation and policy targeting are deliberately separate: drag to pan, wheel or pinch to zoom, and use a named district marker or the district selector to choose a target. Clicking unlabelled ground does not change the district. A short gesture guard rejects clicks generated at the end of a scroll or drag, while keyboard activation of district markers remains available. All navigation leaves the numerical simulation unchanged.

The city is rendered from two static canvas caches capped at 3,200 pixels wide, plus a separate traffic layer. The larger world does not require proportionally larger backing stores; the animation loop stays bounded at 30 frames per second, with the existing actor caps and pause/reduced-motion support. Policy previews rebuild from the original grid, so returning to the baseline or undoing a decision removes its visual effects.
