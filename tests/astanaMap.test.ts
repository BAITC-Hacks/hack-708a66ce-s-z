import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createAstanaMap,
  ASTANA_SIZE,
  ASTANA_DISTRICTS,
  ASTANA_LANDMARKS,
  distanceToRiver,
  neighbourhoodAt,
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

test('the expanded city has distinct urban character rather than uniformly mixed towers', () => {
  const scene = createAstanaMap();
  assert.equal(ASTANA_SIZE, 64);
  const inArea = (name: ReturnType<typeof neighbourhoodAt>) =>
    scene.grid.flat().filter((tile) => neighbourhoodAt(tile.x, tile.y) === name);
  const types = (name: ReturnType<typeof neighbourhoodAt>) =>
    new Set(inArea(name).map((tile) => tile.building.type));
  assert.ok(types('civic').has('office_high'));
  assert.ok(types('civic').has('city_hall'));
  assert.ok(types('expo').has('university'));
  assert.ok(types('expo').has('museum'));
  assert.ok(types('industrial').has('warehouse'));
  assert.ok(types('industrial').has('factory_small'));
  assert.ok(!types('old-town').has('office_high'));
  assert.ok(!types('old-town').has('apartment_high'));
  assert.ok(types('garden').has('house_small'));
  assert.ok(!types('garden').has('office_high'));
  const woods = inArea('greenbelt').filter((tile) => tile.building.type === 'tree').length;
  assert.ok(woods > 180, 'greenbelt remains wooded');
  assert.ok(scene.grid.flat().filter((tile) => tile.building.type === 'road').length > 750);
});

test('every road and road bridge is in one connected driveable network', () => {
  const scene = createAstanaMap();
  const roads = scene.grid.flat().filter((tile) => ['road', 'bridge'].includes(tile.building.type));
  assert.ok(roads.some((tile) => tile.building.type === 'bridge'));
  const visited = new Set<string>(),
    queue = [roads[0]];
  visited.add(`${roads[0].x},${roads[0].y}`);
  for (let i = 0; i < queue.length; i++) {
    const tile = queue[i];
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const next = scene.grid[tile.y + dy]?.[tile.x + dx];
      if (
        !next ||
        !['road', 'bridge'].includes(next.building.type) ||
        visited.has(`${next.x},${next.y}`)
      )
        continue;
      visited.add(`${next.x},${next.y}`);
      queue.push(next);
    }
  }
  assert.equal(visited.size, roads.length);
  assert.ok(queue.some((tile) => tile.x < 12));
  assert.ok(queue.some((tile) => tile.x > 54));
});

test('Astana landmarks preserve the civic axis, opposite banks and southern EXPO relationship', () => {
  const scene = createAstanaMap();
  const [khan, baiterek, aqOrda, pyramid, hazret, expo] = ASTANA_LANDMARKS;
  assert.ok(khan.x < baiterek.x && baiterek.x < aqOrda.x && aqOrda.x < pyramid.x);
  assert.ok(hazret.x > pyramid.x && hazret.y < pyramid.y);
  assert.ok(expo.y > baiterek.y + 15 && expo.x < baiterek.x);
  assert.ok(distanceToRiver(aqOrda.x, aqOrda.y) > 3.5, 'palace has a dry plaza, not a river lot');
  const crossing = scene.grid[Math.round(aqOrda.y)].slice(
    Math.ceil(aqOrda.x),
    Math.floor(pyramid.x),
  );
  assert.ok(
    crossing.some((tile) => tile.building.type === 'water'),
    'river separates palace from pyramid',
  );
  for (const landmark of ASTANA_LANDMARKS) {
    const tile = scene.grid[Math.round(landmark.y)][Math.round(landmark.x)];
    assert.ok(['grass', 'tree'].includes(tile.building.type), landmark.name);
    assert.equal(scene.surfaces[tile.y][tile.x], 'plaza', landmark.name);
  }
});

test('avenues avoid dense two-by-two junction patches that break IsoCity road art', () => {
  const scene = createAstanaMap();
  const driveable = (x: number, y: number) =>
    ['road', 'bridge'].includes(scene.grid[y]?.[x]?.building.type ?? '');
  for (let y = 0; y < ASTANA_SIZE - 1; y++)
    for (let x = 0; x < ASTANA_SIZE - 1; x++)
      assert.ok(
        !(driveable(x, y) && driveable(x + 1, y) && driveable(x, y + 1) && driveable(x + 1, y + 1)),
        `Adjacent lane tiles produce a checkerboard at ${x},${y}`,
      );
});
