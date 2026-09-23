import {
  getBuildingSize,
  type Building,
  type BuildingType,
  type Tile,
} from '../vendor/isocity/model';
import type { DistrictId } from './data';
import type { Decision } from './engine';

export const ASTANA_SIZE = 48;
export const ASTANA_DISTRICTS: Record<DistrictId, { x: number; y: number }> = {
  saryarka: { x: 8, y: 6 },
  baikonur: { x: 26, y: 6 },
  almaty: { x: 41, y: 17 },
  nura: { x: 9, y: 33 },
  esil: { x: 24, y: 39 },
};
export const ASTANA_LANDMARKS = [
  { x: 7, y: 21, frame: 2, name: 'Khan Shatyr · Хан Шатыр', width: 205 },
  { x: 19, y: 24, frame: 0, name: 'Baiterek · Бәйтерек', width: 196 },
  { x: 26.3, y: 25, frame: 1, name: 'Aq Orda · Ақорда', width: 190 },
  { x: 35, y: 26, frame: 4, name: 'Palace of Peace · Бейбітшілік сарайы', width: 170 },
  { x: 40, y: 24, frame: 3, name: 'Hazret Sultan · Әзірет Сұлтан', width: 190 },
  { x: 13, y: 43, frame: 5, name: 'Nur Alem · Нұр Әлем', width: 180 },
];
const river = [
  [-2, 10],
  [8, 11],
  [16, 11],
  [22, 14],
  [28, 17],
  [32, 20],
  [31, 23],
  [30, 27],
  [30, 31],
  [35, 36],
  [42, 41],
  [50, 45],
];
const hash = (x: number, y: number) => Math.abs(((x * 73856093) ^ (y * 19349663)) >>> 0);
const segmentDistance = (x: number, y: number, a: number[], b: number[]) => {
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy);
};
export const distanceToRiver = (x: number, y: number) =>
  Math.min(...river.slice(1).map((b, i) => segmentDistance(x, y, river[i], b)));
const promenade = (x: number, y: number) => segmentDistance(x, y, [7, 21], [27, 25]) < 1.65;
const reserved = (x: number, y: number) =>
  promenade(x, y) ||
  ASTANA_LANDMARKS.some((l) => Math.abs(x - l.x) < 2.25 && Math.abs(y - l.y) < 2.25);
export const makeBuilding = (type: BuildingType, level = 1): Building => ({
  type,
  level,
  population: type.startsWith('apartment') ? 120 : type.startsWith('house') ? 12 : 0,
  jobs: type.includes('office') ? 90 : type.includes('shop') ? 20 : 0,
  powered: true,
  watered: true,
  onFire: false,
  fireProgress: 0,
  age: 80,
  constructionProgress: 100,
  abandoned: false,
});
export interface AstanaMap {
  grid: Tile[][];
  surfaces: ('grass' | 'water' | 'plaza' | 'court')[][];
  changes: { x: number; y: number; id: string; district: DistrictId }[];
  footprint: Map<string, { x: number; y: number }>;
  busLanes: { x: number; y: number }[];
  lightRail: { x: number; y: number }[];
  crossings: { x: number; y: number }[];
  lights: { x: number; y: number }[];
  signals: { x: number; y: number }[];
  programs: { x: number; y: number; id: string }[];
}
function footprintFor(grid: Tile[][]) {
  const map = new Map<string, { x: number; y: number }>();
  for (const row of grid)
    for (const tile of row) {
      if (['empty', 'grass', 'water', 'road', 'bridge', 'tree'].includes(tile.building.type))
        continue;
      const size = getBuildingSize(tile.building.type);
      for (let dy = 0; dy < size.height; dy++)
        for (let dx = 0; dx < size.width; dx++)
          map.set(`${tile.x + dx},${tile.y + dy}`, { x: tile.x, y: tile.y });
    }
  return map;
}
export function createAstanaMap(decisions: readonly Decision[] = []): AstanaMap {
  const grid: Tile[][] = Array.from({ length: ASTANA_SIZE }, (_, y) =>
    Array.from({ length: ASTANA_SIZE }, (_, x) => ({
      x,
      y,
      zone: 'none',
      building: makeBuilding(distanceToRiver(x, y) < 1.55 ? 'water' : 'grass'),
      landValue: 60,
      pollution: 0,
      crime: 0,
      traffic: 0,
      hasSubway: false,
    })),
  );
  const surfaces: AstanaMap['surfaces'] = grid.map((row) =>
    row.map((tile) =>
      tile.building.type === 'water' ? 'water' : reserved(tile.x, tile.y) ? 'plaza' : 'grass',
    ),
  );
  const roadXs = [4, 10, 16, 23, 31, 38, 44],
    roadYs = [5, 11, 17, 31, 38, 44];
  for (const row of grid)
    for (const tile of row) {
      const { x, y } = tile;
      const isRoad = roadXs.includes(x) || roadYs.includes(y) || (y === 24 && x > 33);
      if (!isRoad || reserved(x, y)) continue;
      const isWater = tile.building.type === 'water';
      const bridgeRoute = x === 16 || y === 17 || y === 31;
      if (isWater && !bridgeRoute) continue;
      if (!isWater && distanceToRiver(x, y) < 2.2 && !bridgeRoute) continue;
      tile.building = makeBuilding(isWater ? 'bridge' : 'road');
      if (isWater) {
        tile.building.bridgeTrackType = 'road';
        tile.building.bridgeOrientation = x === 16 ? 'ns' : 'ew';
      }
    }
  const occupied = new Set<string>();
  const nearRoad = (x: number, y: number) =>
    roadXs.some((r) => Math.abs(r - x) < 3) || roadYs.some((r) => Math.abs(r - y) < 3);
  const place = (x: number, y: number, type: BuildingType, level = 1) => {
    const { width, height } = getBuildingSize(type);
    for (let dy = 0; dy < height; dy++)
      for (let dx = 0; dx < width; dx++) {
        const xx = x + dx,
          yy = y + dy,
          tile = grid[yy]?.[xx];
        if (
          !tile ||
          xx >= ASTANA_SIZE - 1 ||
          yy >= ASTANA_SIZE - 1 ||
          tile.building.type !== 'grass' ||
          reserved(xx, yy) ||
          distanceToRiver(xx, yy) < 2.75 ||
          occupied.has(`${xx},${yy}`)
        )
          return false;
      }
    grid[y][x].building = makeBuilding(type, level);
    for (let dy = 0; dy < height; dy++)
      for (let dx = 0; dx < width; dx++) occupied.add(`${x + dx},${y + dy}`);
    return true;
  };
  // Mixed blocks: older right-bank neighbourhoods, a newer left-bank civic centre, and local services.
  for (let y = 1; y < ASTANA_SIZE - 2; y++)
    for (let x = 1; x < ASTANA_SIZE - 2; x++) {
      const n = hash(x, y);
      if (!nearRoad(x, y) || n % 7 === 0) continue;
      let type: BuildingType;
      if (y > 18 && x > 11 && x < 29)
        type = ['apartment_high', 'office_high', 'apartment_low', 'shop_medium'][
          n % 4
        ] as BuildingType;
      else if (x < 14 && y > 28)
        type = ['house_small', 'house_medium', 'apartment_low', 'shop_small'][
          n % 4
        ] as BuildingType;
      else
        type = ['apartment_low', 'apartment_high', 'house_medium', 'office_low', 'shop_small'][
          n % 5
        ] as BuildingType;
      if (n % 29 === 0) type = 'school';
      else if (n % 31 === 0) type = 'hospital';
      else if (n % 13 === 0) type = 'park';
      else if (n % 17 === 0) type = 'tennis';
      place(x, y, type, 1 + (n % 3));
    }
  // Tree-lined embankments and a generous pedestrian civic axis.
  for (const row of grid)
    for (const tile of row) {
      const { x, y } = tile,
        n = hash(x, y);
      if (tile.building.type !== 'grass' || occupied.has(`${x},${y}`)) continue;
      if (
        (distanceToRiver(x, y) > 1.7 && distanceToRiver(x, y) < 3.2 && n % 2 === 0) ||
        (!reserved(x, y) && n % 11 === 0)
      )
        tile.building = makeBuilding('tree');
      if (
        promenade(x, y) &&
        !ASTANA_LANDMARKS.some((l) => Math.hypot(x - l.x, y - l.y) < 1.7) &&
        n % 3 === 0
      )
        tile.building = makeBuilding('tree');
    }
  const changes: AstanaMap['changes'] = [],
    busLanes: AstanaMap['busLanes'] = [],
    lightRail: AstanaMap['lightRail'] = [],
    crossings: AstanaMap['crossings'] = [],
    lights: AstanaMap['lights'] = [],
    signals: AstanaMap['signals'] = [],
    programs: AstanaMap['programs'] = [];
  const used = new Set<string>();
  const policyTypes: Partial<Record<string, BuildingType>> = {
    M4: 'park_large',
    M6: 'park',
    M7: 'school',
    M8: 'hospital',
    M9: 'basketball_courts',
    M13: 'water_tower',
  };
  for (const decision of decisions) {
    const ids = decision.districtId
      ? [decision.districtId]
      : (Object.keys(ASTANA_DISTRICTS) as DistrictId[]);
    for (const id of ids) {
      const d = ASTANA_DISTRICTS[id];
      if (['M5', 'M12', 'M14'].includes(decision.measureId)) {
        const site = grid
          .flat()
          .filter(
            (t) => !['grass', 'empty', 'road', 'bridge', 'water', 'tree'].includes(t.building.type),
          )
          .sort((a, b) => Math.hypot(a.x - d.x, a.y - d.y) - Math.hypot(b.x - d.x, b.y - d.y))[0];
        if (site) {
          programs.push({ x: site.x, y: site.y, id: decision.measureId });
          changes.push({ x: site.x, y: site.y, id: decision.measureId, district: id });
        }
        continue;
      }
      if (['M1', 'M2', 'M3', 'M10', 'M11'].includes(decision.measureId)) {
        const roads = grid
          .flat()
          .filter((t) => t.building.type === 'road')
          .sort((a, b) => Math.hypot(a.x - d.x, a.y - d.y) - Math.hypot(b.x - d.x, b.y - d.y));
        const sites = roads.slice(0, decision.measureId === 'M10' ? 8 : 5);
        if (decision.measureId === 'M1') busLanes.push(...sites);
        else if (decision.measureId === 'M3') lightRail.push(...sites);
        else if (decision.measureId === 'M10') lights.push(...sites);
        else if (decision.measureId === 'M2') signals.push(...sites);
        else crossings.push(...sites);
        if (sites[0])
          changes.push({ x: sites[0].x, y: sites[0].y, id: decision.measureId, district: id });
        continue;
      }
      const type = policyTypes[decision.measureId] ?? 'park',
        size = getBuildingSize(type);
      const candidates = grid
        .flat()
        .filter(
          (t) =>
            t.x > 0 &&
            t.y > 0 &&
            t.x + size.width < ASTANA_SIZE - 1 &&
            t.y + size.height < ASTANA_SIZE - 1,
        )
        .sort((a, b) => Math.hypot(a.x - d.x, a.y - d.y) - Math.hypot(b.x - d.x, b.y - d.y));
      const site = candidates.find((t) => {
        for (let dy = 0; dy < size.height; dy++)
          for (let dx = 0; dx < size.width; dx++) {
            const x = t.x + dx,
              y = t.y + dy;
            if (
              ['water', 'road', 'bridge'].includes(grid[y][x].building.type) ||
              reserved(x, y) ||
              distanceToRiver(x, y) < 2.6 ||
              used.has(`${x},${y}`)
            )
              return false;
          }
        return true;
      });
      if (!site) continue;
      const footprints = footprintFor(grid);
      const remove = new Set<string>();
      for (let dy = 0; dy < size.height; dy++)
        for (let dx = 0; dx < size.width; dx++) {
          const x = site.x + dx,
            y = site.y + dy,
            origin = footprints.get(`${x},${y}`);
          if (origin) remove.add(`${origin.x},${origin.y}`);
          grid[y][x].building = makeBuilding('grass');
          used.add(`${x},${y}`);
        }
      for (const key of remove) {
        const [x, y] = key.split(',').map(Number);
        grid[y][x].building = makeBuilding('grass');
      }
      site.building = makeBuilding(type, 2);
      changes.push({ x: site.x, y: site.y, id: decision.measureId, district: id });
    }
  }
  return {
    grid,
    surfaces,
    changes,
    footprint: footprintFor(grid),
    busLanes,
    lightRail,
    crossings,
    lights,
    signals,
    programs,
  };
}
