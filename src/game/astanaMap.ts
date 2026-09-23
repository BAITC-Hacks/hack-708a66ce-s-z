import {
  getBuildingSize,
  type Building,
  type BuildingType,
  type Tile,
} from '../vendor/isocity/model';
import type { DistrictId } from './data';
import type { Decision } from './engine';

export const ASTANA_SIZE = 64;
export const ASTANA_VIEW_CENTER = { x: 31, y: 32 };
export const ASTANA_DISTRICTS: Record<DistrictId, { x: number; y: number }> = {
  saryarka: { x: 16, y: 14 },
  baikonur: { x: 34, y: 14 },
  almaty: { x: 49, y: 25 },
  nura: { x: 17, y: 41 },
  esil: { x: 32, y: 47 },
};
export const ASTANA_LANDMARKS = [
  { x: 15, y: 29, frame: 2, name: 'Khan Shatyr · Хан Шатыр', width: 205 },
  { x: 27, y: 32, frame: 0, name: 'Baiterek · Бәйтерек', width: 196 },
  { x: 34.3, y: 33, frame: 1, name: 'Aq Orda · Ақорда', width: 190 },
  { x: 43, y: 34, frame: 4, name: 'Palace of Peace · Бейбітшілік сарайы', width: 170 },
  { x: 48, y: 32, frame: 3, name: 'Hazret Sultan · Әзірет Сұлтан', width: 190 },
  { x: 21, y: 51, frame: 5, name: 'Nur Alem · Нұр Әлем', width: 180 },
];
const river = [
  [-3, 17],
  [6, 18],
  [16, 19],
  [24, 19],
  [30, 22],
  [36, 25],
  [40, 28],
  [39, 31],
  [38, 35],
  [38, 39],
  [43, 44],
  [50, 49],
  [58, 53],
  [68, 57],
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
const axisDistance = (x: number, y: number) => segmentDistance(x, y, [15, 29], [35, 33]);
const promenade = (x: number, y: number) => axisDistance(x, y) < 1.85;
const landmarkPlaza = (x: number, y: number) =>
  ASTANA_LANDMARKS.some((l) => Math.abs(x - l.x) < 2.35 && Math.abs(y - l.y) < 2.35);
const reserved = (x: number, y: number) => promenade(x, y) || landmarkPlaza(x, y);
const civicPark = (x: number, y: number) =>
  ((x - 28) / 5) ** 2 + ((y - 40) / 3.3) ** 2 < 1 ||
  ((x - 9) / 3) ** 2 + ((y - 25) / 4) ** 2 < 1 ||
  ((x - 47) / 4) ** 2 + ((y - 39) / 3) ** 2 < 1;
export type AstanaNeighbourhood =
  | 'greenbelt'
  | 'old-town'
  | 'civic'
  | 'right-bank'
  | 'garden'
  | 'expo'
  | 'industrial'
  | 'residential';
/** Illustrative urban character, deliberately separate from the five scoring districts. */
export function neighbourhoodAt(x: number, y: number): AstanaNeighbourhood {
  if (x < 4 || y < 4 || x > 59 || y > 59) return 'greenbelt';
  if (x > 51 && y < 18) return 'industrial';
  if (y < 23) return 'old-town';
  if (x >= 14 && x <= 34 && y >= 46 && y <= 57) return 'expo';
  if (x >= 14 && x <= 37 && y >= 26 && y <= 39) return 'civic';
  if (x < 23 && y > 36) return 'garden';
  if (x > 41 && y < 44) return 'right-bank';
  return 'residential';
}
const buildingPalette: Record<AstanaNeighbourhood, BuildingType[]> = {
  greenbelt: [],
  'old-town': [
    'apartment_low',
    'apartment_low',
    'house_medium',
    'house_medium',
    'shop_small',
    'shop_medium',
    'office_low',
  ],
  civic: [
    'office_high',
    'apartment_high',
    'office_low',
    'office_high',
    'apartment_high',
    'shop_medium',
    'mall',
  ],
  'right-bank': [
    'apartment_low',
    'apartment_low',
    'office_low',
    'house_medium',
    'shop_small',
    'apartment_high',
  ],
  garden: [
    'house_small',
    'house_medium',
    'house_small',
    'house_medium',
    'shop_small',
    'apartment_low',
  ],
  expo: ['office_low', 'apartment_high', 'office_high', 'shop_medium', 'apartment_low', 'museum'],
  industrial: ['warehouse', 'warehouse', 'factory_small', 'factory_medium', 'office_low'],
  residential: [
    'apartment_low',
    'apartment_high',
    'apartment_low',
    'house_medium',
    'shop_small',
    'shop_medium',
  ],
};
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
  surfaces: ('grass' | 'water' | 'plaza' | 'court' | 'garden' | 'quay')[][];
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
      building: makeBuilding(distanceToRiver(x, y) < 1.9 ? 'water' : 'grass'),
      landValue: 60,
      pollution: 0,
      crime: 0,
      traffic: 0,
      hasSubway: false,
    })),
  );
  const surfaces: AstanaMap['surfaces'] = grid.map((row) =>
    row.map((tile) => {
      const { x, y } = tile;
      if (tile.building.type === 'water') return 'water';
      if (landmarkPlaza(x, y) || axisDistance(x, y) < 0.58) return 'plaza';
      if (promenade(x, y) || civicPark(x, y)) return 'garden';
      if (distanceToRiver(x, y) < 2.9) return 'quay';
      return 'grass';
    }),
  );
  // Narrow old-town streets meet broader planned avenues. The civic axis itself stays car-free.
  const northXs = [5, 12, 18, 24, 30, 36, 43, 50, 57, 60];
  const southXs = [5, 12, 18, 24, 40, 47, 54, 60];
  const roadYs = [5, 12, 18, 25, 39, 46, 53, 59];
  for (const row of grid)
    for (const tile of row) {
      const { x, y } = tile;
      const isRoad =
        (y < 25 ? northXs : southXs).includes(x) || roadYs.includes(y) || (y === 32 && x > 43);
      if (!isRoad || reserved(x, y) || x < 3 || y < 3 || x > 61 || y > 61) continue;
      const isWater = tile.building.type === 'water';
      const bridgeRoute = x === 24 || y === 25 || y === 39 || x === 54;
      if (distanceToRiver(x, y) < 3 && !bridgeRoute) continue;
      tile.building = makeBuilding(isWater ? 'bridge' : 'road');
      if (isWater) {
        tile.building.bridgeTrackType = 'road';
        tile.building.bridgeOrientation = x === 24 || x === 54 ? 'ns' : 'ew';
      }
    }
  // Remove isolated road fragments created by river bends and protected civic plazas.
  // Every driveable tile belongs to the same network, so actors can reach both banks.
  const visited = new Set<string>();
  const components: Tile[][] = [];
  for (const row of grid)
    for (const tile of row) {
      if (!['road', 'bridge'].includes(tile.building.type) || visited.has(`${tile.x},${tile.y}`))
        continue;
      const component = [tile];
      visited.add(`${tile.x},${tile.y}`);
      for (let i = 0; i < component.length; i++) {
        const current = component[i];
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const next = grid[current.y + dy]?.[current.x + dx];
          if (
            !next ||
            !['road', 'bridge'].includes(next.building.type) ||
            visited.has(`${next.x},${next.y}`)
          )
            continue;
          visited.add(`${next.x},${next.y}`);
          component.push(next);
        }
      }
      components.push(component);
    }
  components.sort((a, b) => b.length - a.length);
  for (const component of components.slice(1))
    for (const tile of component)
      tile.building = makeBuilding(surfaces[tile.y][tile.x] === 'water' ? 'water' : 'grass');
  const occupied = new Set<string>();
  const nearRoad = (x: number, y: number) => {
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++)
        if (Math.abs(dx) + Math.abs(dy) <= 2 && grid[y + dy]?.[x + dx]?.building.type === 'road')
          return true;
    return false;
  };
  const place = (x: number, y: number, type: BuildingType, level = 1) => {
    const { width, height } = getBuildingSize(type);
    for (let dy = 0; dy < height; dy++)
      for (let dx = 0; dx < width; dx++) {
        const xx = x + dx,
          yy = y + dy,
          tile = grid[yy]?.[xx];
        if (
          !tile ||
          xx >= ASTANA_SIZE - 2 ||
          yy >= ASTANA_SIZE - 2 ||
          tile.building.type !== 'grass' ||
          reserved(xx, yy) ||
          civicPark(xx, yy) ||
          distanceToRiver(xx, yy) < 3.45 ||
          occupied.has(`${xx},${yy}`)
        )
          return false;
      }
    grid[y][x].building = makeBuilding(type, level);
    for (let dy = 0; dy < height; dy++)
      for (let dx = 0; dx < width; dx++) occupied.add(`${x + dx},${y + dy}`);
    return true;
  };
  const placeNear = (x: number, y: number, type: BuildingType) => {
    const neighbourhood = neighbourhoodAt(x, y);
    const sites = grid
      .flat()
      .filter(
        (tile) =>
          Math.hypot(tile.x - x, tile.y - y) <= 4 &&
          neighbourhoodAt(tile.x, tile.y) === neighbourhood,
      )
      .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
    return sites.some((site) => place(site.x, site.y, type, type.includes('high') ? 4 : 2));
  };
  // Addressed civic campuses make the skyline intentional instead of a random mix of towers.
  for (const [x, y, type] of [
    [21, 26, 'office_high'],
    [28, 27, 'office_high'],
    [31, 36, 'city_hall'],
    [21, 35, 'office_high'],
    [25, 48, 'university'],
    [26, 53, 'museum'],
    [44, 29, 'museum'],
    [51, 35, 'community_center'],
    [14, 9, 'school'],
    [32, 8, 'hospital'],
    [55, 9, 'warehouse'],
  ] as [number, number, BuildingType][])
    placeNear(x, y, type);
  for (let y = 4; y < ASTANA_SIZE - 3; y++)
    for (let x = 4; x < ASTANA_SIZE - 3; x++) {
      const n = hash(x, y),
        neighbourhood = neighbourhoodAt(x, y),
        palette = buildingPalette[neighbourhood];
      if (!palette.length || !nearRoad(x, y) || n % (neighbourhood === 'garden' ? 4 : 9) === 0)
        continue;
      let type = palette[n % palette.length];
      if (n % 43 === 0) type = 'school';
      else if (n % 59 === 0) type = 'hospital';
      else if (n % 23 === 0) type = 'park';
      else if (n % 37 === 0) type = 'tennis';
      const modern = neighbourhood === 'civic' || neighbourhood === 'expo';
      place(x, y, type, modern ? 2 + (n % 3) : 1 + (n % 2));
    }
  // Consistent double rows on Nurzhol, planted embankments, and a generous outer green belt.
  for (const row of grid)
    for (const tile of row) {
      const { x, y } = tile,
        n = hash(x, y),
        distance = distanceToRiver(x, y);
      if (tile.building.type !== 'grass' || occupied.has(`${x},${y}`) || landmarkPlaza(x, y))
        continue;
      const onAxis = promenade(x, y) && axisDistance(x, y) > 0.7 && x % 2 === 0;
      const bank = distance > 2.9 && distance < 4.4 && n % 3 !== 0;
      const inPark = civicPark(x, y) && n % 3 === 0;
      const outerTrees = neighbourhoodAt(x, y) === 'greenbelt' && n % 4 === 0;
      if (onAxis || bank || inPark || outerTrees || (!reserved(x, y) && n % 19 === 0))
        tile.building = makeBuilding('tree', 1 + (n % 3));
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
              distanceToRiver(x, y) < 3.2 ||
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
