import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createAstanaMap,
  ASTANA_SIZE,
  ASTANA_DISTRICTS,
  ASTANA_LANDMARKS,
  distanceToRiver,
} from '../src/game/astanaMap';
import { getBuildingSize } from '../src/vendor/isocity/model';
import { DISTRICTS, MEASURES, EXAMPLE } from '../src/game/data';
import { simulate, type Decision } from '../src/game/engine';

test('Astana scene is deterministic, reversible and independent of the official score', () => {
  const base = createAstanaMap(),
    input = structuredClone(EXAMPLE),
    result = simulate(input);
  Object.freeze(input);
  const preview = createAstanaMap(input);
  assert.deepEqual(preview, createAstanaMap(input));
  assert.deepEqual(createAstanaMap(), base);
  assert.deepEqual(simulate(input), result);
  assert.notDeepEqual(preview.grid, base.grid);
  assert.equal(preview.grid.length, ASTANA_SIZE);
  assert.ok(preview.grid.every((row) => row.length === ASTANA_SIZE));
});

test('all case policies have visible effects in the correct target scope', () => {
  for (const measure of MEASURES) {
    for (const district of measure.scope === 'district' ? DISTRICTS : [DISTRICTS[0]]) {
      const decision: Decision = {
        measureId: measure.id,
        ...(measure.scope === 'district' ? { districtId: district.id } : {}),
      };
      const scene = createAstanaMap([decision]);
      const effects = scene.changes.filter((change) => change.id === measure.id);
      assert.deepEqual(
        new Set(effects.map((e) => e.district)),
        new Set(measure.scope === 'district' ? [district.id] : DISTRICTS.map((d) => d.id)),
        measure.id,
      );
      for (const effect of effects) {
        assert.ok(
          effect.x >= 0 && effect.x < ASTANA_SIZE && effect.y >= 0 && effect.y < ASTANA_SIZE,
        );
      }
    }
  }
});

test('landmarks and occupied building footprints stay on land and off roads', () => {
  assert.equal(ASTANA_LANDMARKS.length, 6);
  assert.deepEqual(Object.keys(ASTANA_DISTRICTS).sort(), DISTRICTS.map((d) => d.id).sort());
  for (const landmark of ASTANA_LANDMARKS)
    assert.ok(distanceToRiver(landmark.x, landmark.y) > 1.55, landmark.name);
  for (const choices of [[], EXAMPLE]) {
    const scene = createAstanaMap(choices);
    for (const row of scene.grid)
      for (const tile of row) {
        if (['grass', 'empty', 'water', 'road', 'bridge', 'tree'].includes(tile.building.type))
          continue;
        const size = getBuildingSize(tile.building.type);
        for (let y = tile.y; y < tile.y + size.height; y++)
          for (let x = tile.x; x < tile.x + size.width; x++) {
            assert.ok(scene.grid[y]?.[x], `${tile.building.type} out of bounds`);
            assert.ok(
              !['water', 'road', 'bridge'].includes(scene.grid[y][x].building.type),
              `${tile.building.type} on road/water at ${x},${y}`,
            );
          }
      }
  }
});
