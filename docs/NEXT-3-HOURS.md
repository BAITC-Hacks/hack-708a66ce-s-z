# Decision workspace: three-hour execution plan

User direction, September 23: prioritize a useful map-based municipal decision workflow, with a left control panel inspired by the supplied 2GIS screenshot. Preserve the verified five-turn simulation. Keep the handcrafted Phaser city as a secondary view. This replaces the card-hand cockpit as the default.

## Critical assessment

The reattached case PDF and five-page dataset confirm the implemented numerical contract. The strongest existing features are exact calculation, enforced rules, valid completion, scenario export and offline reproducibility. The weakest parts are competing UI panels and AI advice being secondary to a visual game. The case explicitly requires an LLM to explain engine-generated results, compare alternatives and advise; local rules alone must never be presented as that LLM.

Real map coordinates do not make synthetic indicators real observations. Current Astana includes Sarayshyk, while the challenge contains five districts. Preserve the challenge's IDs, population shares and historical/synthetic baseline. Keep geographic provenance separate. Imported boundaries affect display only.

## Hour 1: choose and see

One map, one left panel, a compact budget/turn/score strip. The panel progresses from district needs to available policies to an inline consequence preview. Before, current plan and proposed change are distinguishable. Apply updates the map, indicators and chronological decision journal. Existing report/archive and handbook remain accessible without competing with the main task.

Use attributed, locally bundled OSM vector data where obtainable. Support GeoJSON/KML boundary overlays with size/geometry validation. Do not bulk-download public OSM raster tiles. Add optional online basemap only if useful and clearly labeled.

## Hour 2: structured advice

JSON Schemas define decisions, advisor requests, recommendations and audit events. Business rules stay in the deterministic engine. Jev is a model, not a file format: use its typed Choice among engine-validated, finishable candidates. Model confidence describes a recommendation, not a probability of actual urban success. Low confidence remains visible and every recommendation goes through human preview.

The server supports TypeSafe Jev for structured selection and OpenAI for grounded explanations. It computes all candidate outcomes itself and validates provider outputs. Browser never receives keys. No keys means an explicitly labeled local fallback. Keys can be added later via `.env`; live calls remain unverified until then.

## Hour 3: prove and pitch

Run full five-decision browser flows, before/after preview, structured-advisor failure/malformed/stale-response tests, imported geometry validation and first-launch offline play. Refresh screenshots and RU/EN/Kazakh README. Verify meaningful checkpoints before pushing. Do not claim a real digital twin, a globally optimal planner, verified GIS boundaries or live AI without evidence.

## References

- [Palantir Vertex scenarios](https://www.palantir.com/docs/foundry/vertex/scenarios-getting-started): baseline, proposed actions, simulated alternatives and comparison.
- [Jev typed primitives](https://docs.typesafe.ai/introduction), [HTTP API](https://docs.typesafe.ai/api), [current models](https://docs.typesafe.ai/models).
- [OpenStreetMap tile policy](https://operations.osmfoundation.org/policies/tiles/): public raster tiles cannot be bulk-downloaded for offline use.
- [Astana: Sarayshyk](https://www.gov.kz/memleket/entities/astana/press/news/details/1130845?lang=ru): current administrative context differs from the five-district challenge.
