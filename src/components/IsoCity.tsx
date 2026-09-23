import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LocateFixed, Minus, Plus } from 'lucide-react';
import {
  drawRoad,
  getSpriteRenderInfo,
  selectSpriteSource,
  getActiveSpritePack,
  loadSpriteImage,
  gridToScreen,
  useVehicleSystems,
  TILE_WIDTH,
  TILE_HEIGHT,
  WATER_ASSET_PATH,
  type VehicleSystemRefs,
  type WorldRenderState,
} from '../vendor/isocity';
import { analyzeMergedRoad } from '../vendor/isocity/trafficSystem';
import {
  ASTANA_DISTRICTS,
  ASTANA_LANDMARKS,
  ASTANA_SIZE,
  ASTANA_VIEW_CENTER,
  createAstanaMap,
} from '../game/astanaMap';
import { DISTRICTS, MEASURES, type DistrictId, type Lang } from '../game/data';
import type { Decision, Result } from '../game/engine';
import landmarkAtlas from '../assets/landmark-atlas.png';
import fallbackArt from '../assets/astana-key-art.png';
import '../isocity.css';

type Camera = { offset: { x: number; y: number }; zoom: number };
type Props = {
  selected: DistrictId;
  onSelect: (id: DistrictId) => void;
  result: Result;
  decisions: Decision[];
  lang: Lang;
  night: boolean;
  paused: boolean;
  focusRequest?: number;
  preview?: boolean;
};
const tx = (lang: Lang, en: string, ru: string, kk: string) => ({ en, ru, kk })[lang];
const center = (x: number, y: number) => {
  const p = gridToScreen(x, y, 0, 0);
  return { x: p.screenX + TILE_WIDTH / 2, y: p.screenY + TILE_HEIGHT / 2 };
};
const makeMotionRefs = (): VehicleSystemRefs => ({
  carsRef: { current: [] },
  carIdRef: { current: 0 },
  carSpawnTimerRef: { current: 0 },
  busesRef: { current: [] },
  busIdRef: { current: 0 },
  busSpawnTimerRef: { current: 0 },
  emergencyVehiclesRef: { current: [] },
  emergencyVehicleIdRef: { current: 0 },
  emergencyDispatchTimerRef: { current: 0 },
  activeFiresRef: { current: new Set() },
  activeCrimesRef: { current: new Set() },
  activeCrimeIncidentsRef: { current: new Map() },
  crimeSpawnTimerRef: { current: 0 },
  pedestriansRef: { current: [] },
  pedestrianIdRef: { current: 0 },
  pedestrianSpawnTimerRef: { current: 0 },
  trafficLightTimerRef: { current: 0 },
  trainsRef: { current: [] },
});
function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + TILE_WIDTH / 2, y);
  ctx.lineTo(x + TILE_WIDTH, y + TILE_HEIGHT / 2);
  ctx.lineTo(x + TILE_WIDTH / 2, y + TILE_HEIGHT);
  ctx.lineTo(x, y + TILE_HEIGHT / 2);
  ctx.closePath();
  ctx.fill();
}
export function IsoCity({
  selected,
  onSelect,
  result,
  decisions,
  lang,
  night,
  paused,
  focusRequest = 0,
  preview = false,
}: Props) {
  const host = useRef<HTMLDivElement>(null),
    terrainView = useRef<HTMLCanvasElement>(null),
    lifeView = useRef<HTMLCanvasElement>(null),
    buildingsView = useRef<HTMLCanvasElement>(null);
  const markers = useRef<Partial<Record<DistrictId, HTMLButtonElement | null>>>({});
  const [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false),
    [mobile, setMobile] = useState(false);
  const [reduced, setReduced] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const decisionKey = JSON.stringify(decisions);
  const map = useMemo(() => createAstanaMap(decisions), [decisionKey]);
  const latestId = decisions.at(-1)?.measureId;
  const latestChange =
    map.changes.find((change) => change.id === latestId && change.district === selected) ??
    map.changes.find((change) => change.id === latestId);
  const latestMeasure = MEASURES.find((measure) => measure.id === latestId);
  const callout = useRef<HTMLDivElement>(null),
    latestSite = useRef(latestChange);
  latestSite.current = latestChange;
  const camera = useRef<Camera>({ offset: { x: 0, y: 0 }, zoom: 0.6 });
  const dimensions = useRef({ width: 1440, height: 900, dpr: 1 });
  const dirty = useRef(true),
    images = useRef(new Map<string, HTMLImageElement>());
  const layers = useRef<{
    ground: HTMLCanvasElement;
    buildings: HTMLCanvasElement;
    originX: number;
    originY: number;
    pixelScale: number;
  } | null>(null);
  const state = useRef({ selected, onSelect, night, paused, reduced, lang });
  state.current = { selected, onSelect, night, paused, reduced, lang };
  const motionRefs = useMemo(makeMotionRefs, []),
    gridVersionRef = useRef(0),
    cachedRoadTileCountRef = useRef({ count: 0, gridVersion: -1 }),
    cachedIntersectionMapRef = useRef({ map: new Map<number, boolean>(), gridVersion: -1 });
  const worldStateRef = useRef<WorldRenderState>({
    grid: map.grid,
    gridSize: ASTANA_SIZE,
    ...camera.current,
    speed: 1,
    canvasSize: dimensions.current,
  });
  const motionState = useMemo(
    () => ({
      services: { police: Array.from({ length: ASTANA_SIZE }, () => Array(ASTANA_SIZE).fill(100)) },
      stats: { population: 12000 },
    }),
    [],
  );
  const motion = useVehicleSystems(motionRefs, {
    worldStateRef,
    gridVersionRef,
    cachedRoadTileCountRef,
    cachedIntersectionMapRef,
    state: motionState,
    isMobile: mobile,
  });
  const motionApi = useRef(motion);
  motionApi.current = motion;
  const pointers = useRef(new Map<number, { x: number; y: number }>()),
    gesture = useRef({ x: 0, y: 0, moved: false, distance: 0 });
  const selectionBlockedUntil = useRef(0);
  const markerPress = useRef({ x: 0, y: 0 });
  const positionMarkers = useCallback(() => {
    const { offset, zoom } = camera.current;
    for (const [id, d] of Object.entries(ASTANA_DISTRICTS)) {
      const marker = markers.current[id as DistrictId];
      if (!marker) continue;
      const p = center(d.x, d.y);
      const anchorX = p.x * zoom + offset.x,
        anchorY = p.y * zoom + offset.y;
      let moveX = 0,
        moveY = 0;
      const site = latestSite.current;
      if (site && id === state.current.selected && id === site.district) {
        const sitePoint = center(site.x + 0.6, site.y + 0.6);
        const siteX = sitePoint.x * zoom + offset.x,
          siteY = sitePoint.y * zoom + offset.y;
        if (Math.abs(anchorX - siteX) < 135 && Math.abs(anchorY - siteY) < 95) {
          const markerWidth = marker.offsetWidth || 100;
          moveX = anchorX + 145 + markerWidth / 2 < dimensions.current.width - 14 ? 145 : -145;
          moveY = 12;
          const gap = Math.abs(moveX) - markerWidth / 2;
          marker.style.setProperty('--isocity-leader-length', `${Math.hypot(gap, moveY)}px`);
          marker.style.setProperty(
            '--isocity-leader-angle',
            `${((Math.atan2(moveY, gap) * 180) / Math.PI) * (moveX > 0 ? 1 : -1)}deg`,
          );
          marker.style.setProperty('--isocity-leader-left', moveX > 0 ? 'auto' : '100%');
          marker.style.setProperty('--isocity-leader-right', moveX > 0 ? '100%' : 'auto');
          marker.style.setProperty(
            '--isocity-leader-origin',
            moveX > 0 ? 'right center' : 'left center',
          );
        }
      }
      marker.toggleAttribute('data-displaced', moveX !== 0);
      marker.style.transform = `translate(-50%, -50%) translate(${anchorX + moveX}px, ${anchorY + moveY}px)`;
      // The policy label already names the district. Avoid stacking both labels
      // over the same lot when the camera or a narrow viewport brings them together.
      const label = callout.current;
      let overlapsLabel = false;
      if (label && site && id === site.district) {
        const point = center(site.x + 0.6, site.y + 0.6);
        const { width, height } = dimensions.current;
        const left = Math.max(
          width > 760 ? 322 : 12,
          Math.min(width - 224, point.x * zoom + offset.x - 96),
        );
        const top = Math.max(112, Math.min(height - 345, point.y * zoom + offset.y - 110));
        const halfWidth = marker.offsetWidth / 2,
          halfHeight = marker.offsetHeight / 2;
        overlapsLabel =
          anchorX + moveX + halfWidth > left - 8 &&
          anchorX + moveX - halfWidth < left + label.offsetWidth + 8 &&
          anchorY + moveY + halfHeight > top - 8 &&
          anchorY + moveY - halfHeight < top + label.offsetHeight + 8;
      }
      marker.style.visibility = overlapsLabel ? 'hidden' : 'visible';
    }
    if (callout.current && latestSite.current) {
      const site = latestSite.current,
        p = center(site.x + 0.6, site.y + 0.6);
      const x = p.x * zoom + offset.x,
        y = p.y * zoom + offset.y;
      const { width, height } = dimensions.current;
      callout.current.style.left = `${Math.max(width > 760 ? 322 : 12, Math.min(width - 224, x - 96))}px`;
      callout.current.style.top = `${Math.max(112, Math.min(height - 345, y - 110))}px`;
      callout.current.style.visibility =
        x < -50 || x > width + 50 || y < 0 || y > height ? 'hidden' : 'visible';
    }
  }, []);
  const fit = useCallback(() => {
    const { width, height } = dimensions.current,
      desktop = width > 760;
    const left = desktop ? (width > 1150 ? 330 : 275) : 8,
      right = width - (desktop ? 82 : 8),
      top = desktop ? 110 : 120,
      bottom = height - (desktop ? 292 : 275);
    const zoom = Math.max(
      0.18,
      Math.min(
        (right - left) / (ASTANA_SIZE * TILE_WIDTH + 100),
        Math.max(200, bottom - top) / (ASTANA_SIZE * TILE_HEIGHT + 140),
      ),
    );
    const p = center((ASTANA_SIZE - 1) / 2, (ASTANA_SIZE - 1) / 2);
    camera.current = {
      zoom,
      offset: { x: (left + right) / 2 - p.x * zoom, y: (top + bottom) / 2 - p.y * zoom },
    };
    dirty.current = true;
    positionMarkers();
  }, [positionMarkers]);
  const focus = useCallback(
    (id: DistrictId) => {
      const { width, height } = dimensions.current,
        p = center(ASTANA_DISTRICTS[id].x, ASTANA_DISTRICTS[id].y);
      const zoom = Math.max(camera.current.zoom, width > 760 ? 0.7 : 0.57);
      camera.current = {
        zoom,
        offset: {
          x: width * (width > 760 ? 0.49 : 0.52) - p.x * zoom,
          y: (height - 270) * 0.52 - p.y * zoom,
        },
      };
      dirty.current = true;
      positionMarkers();
    },
    [positionMarkers],
  );
  const zoomAt = useCallback(
    (amount: number, x?: number, y?: number) => {
      const { width, height } = dimensions.current,
        old = camera.current;
      const point = { x: x ?? width * 0.57, y: y ?? (height - 220) * 0.5 };
      const zoom = Math.max(0.18, Math.min(1.8, old.zoom + amount));
      camera.current = {
        zoom,
        offset: {
          x: point.x - ((point.x - old.offset.x) * zoom) / old.zoom,
          y: point.y - ((point.y - old.offset.y) * zoom) / old.zoom,
        },
      };
      dirty.current = true;
      positionMarkers();
    },
    [positionMarkers],
  );
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    let alive = true;
    const pack = getActiveSpritePack();
    const urls = [
      ...new Set(
        Object.entries(pack)
          .filter(
            ([key, value]) => (key === 'src' || key.endsWith('Src')) && typeof value === 'string',
          )
          .map(([, value]) => value as string),
      ),
    ];
    Promise.all([
      ...urls.map(async (src) => [src, await loadSpriteImage(src)] as const),
      loadSpriteImage(WATER_ASSET_PATH, false).then((image) => [WATER_ASSET_PATH, image] as const),
      loadSpriteImage(landmarkAtlas, false).then((image) => [landmarkAtlas, image] as const),
    ])
      .then((loaded) => {
        if (alive) {
          images.current = new Map(loaded);
          setReady(true);
        }
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const resize = () => {
      const { width, height } = element.getBoundingClientRect();
      dimensions.current = { width, height, dpr: window.devicePixelRatio || 1 };
      setMobile(width <= 760);
      for (const canvas of [terrainView.current, lifeView.current, buildingsView.current])
        if (canvas) {
          canvas.width = Math.round(width * dimensions.current.dpr);
          canvas.height = Math.round(height * dimensions.current.dpr);
        }
      // Begin close enough to discover street life; the overview control fits all five districts.
      const p = center(ASTANA_VIEW_CENTER.x, ASTANA_VIEW_CENTER.y),
        zoom = Math.max(0.48, Math.min(0.78, width / 2000));
      camera.current = {
        zoom,
        offset: {
          x: width * (width > 760 ? 0.61 : 0.53) + (width > 760 ? 55 : 0) - p.x * zoom,
          y: height * (width > 760 ? 0.4 : 0.42) - p.y * zoom,
        },
      };
      dirty.current = true;
      positionMarkers();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      selectionBlockedUntil.current = performance.now() + 350;
      gesture.current.moved = true;
      if (document.querySelector('dialog[open]')) return;
      const rect = element.getBoundingClientRect();
      const pixels =
        event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1);
      const amount = Math.max(-0.12, Math.min(0.12, -pixels * (event.ctrlKey ? 0.006 : 0.0013)));
      zoomAt(amount, event.clientX - rect.left, event.clientY - rect.top);
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => {
      observer.disconnect();
      element.removeEventListener('wheel', wheel);
    };
  }, [positionMarkers, zoomAt]);
  const previousSelected = useRef(selected);
  useEffect(() => {
    if (ready && previousSelected.current !== selected) focus(selected);
    previousSelected.current = selected;
  }, [selected, ready, focus]);
  useEffect(() => {
    if (ready && focusRequest) focus(selected);
  }, [focusRequest, ready]);
  useEffect(() => {
    dirty.current = true;
  }, [night, lang, paused, reduced]);
  useEffect(() => {
    if (!ready) return;
    const originX = (ASTANA_SIZE * TILE_WIDTH) / 2 + 100,
      originY = 190;
    const ground = document.createElement('canvas'),
      buildings = document.createElement('canvas');
    // A larger city should not multiply backing-store memory. Cache at at most 3200px wide.
    const pixelScale = Math.min(1, 3200 / (ASTANA_SIZE * TILE_WIDTH + 200));
    for (const canvas of [ground, buildings]) {
      canvas.width = Math.ceil((ASTANA_SIZE * TILE_WIDTH + 200) * pixelScale);
      canvas.height = Math.ceil((ASTANA_SIZE * TILE_HEIGHT + 300) * pixelScale);
    }
    const g = ground.getContext('2d')!,
      b = buildings.getContext('2d')!;
    g.scale(pixelScale, pixelScale);
    b.scale(pixelScale, pixelScale);
    const mergeCache = new Map<string, ReturnType<typeof analyzeMergedRoad>>();
    const hasRoad = (x: number, y: number) =>
      ['road', 'bridge'].includes(map.grid[y]?.[x]?.building.type ?? '');
    const getMergeInfo = (x: number, y: number) => {
      const key = `${x},${y}`;
      if (!mergeCache.has(key)) mergeCache.set(key, analyzeMergedRoad(map.grid, ASTANA_SIZE, x, y));
      return mergeCache.get(key)!;
    };
    const water = images.current.get(WATER_ASSET_PATH),
      pack = getActiveSpritePack();
    const sprites: { depth: number; draw: () => void }[] = [];
    for (let sum = 0; sum < ASTANA_SIZE * 2; sum++)
      for (let x = 0; x < ASTANA_SIZE; x++) {
        const y = sum - x;
        if (y < 0 || y >= ASTANA_SIZE) continue;
        const tile = map.grid[y][x],
          type = tile.building.type,
          p = gridToScreen(x, y, originX, originY),
          surface = map.surfaces[y][x];
        const occupied = map.footprint.has(`${x},${y}`);
        if (surface === 'water') {
          diamond(g, p.screenX, p.screenY, '#79b9ba');
          if (water) {
            g.save();
            g.beginPath();
            g.moveTo(p.screenX + 32, p.screenY);
            g.lineTo(p.screenX + 64, p.screenY + TILE_HEIGHT / 2);
            g.lineTo(p.screenX + 32, p.screenY + TILE_HEIGHT);
            g.lineTo(p.screenX, p.screenY + TILE_HEIGHT / 2);
            g.closePath();
            g.clip();
            g.globalAlpha = 0.16;
            g.drawImage(water, p.screenX, p.screenY, 64, TILE_HEIGHT);
            g.restore();
          }
        } else if (surface === 'plaza') diamond(g, p.screenX, p.screenY, '#e5dcc4');
        else if (surface === 'quay') diamond(g, p.screenX, p.screenY, '#d5d4b6');
        else if (surface === 'garden') diamond(g, p.screenX, p.screenY, '#a9bd89');
        else if (occupied) diamond(g, p.screenX, p.screenY, '#d8d4c3');
        else diamond(g, p.screenX, p.screenY, '#b4c89c');
        if (hasRoad(x, y)) {
          drawRoad(g, p.screenX, p.screenY, x, y, 1, {
            hasRoad,
            getMergeInfo,
            isMobile: false,
            isPanning: false,
            isPinchZooming: false,
            trafficLightTimer: 0,
          });
          if (type === 'bridge') {
            g.strokeStyle = '#dedbc7';
            g.lineWidth = 2;
            g.beginPath();
            g.moveTo(p.screenX + 7, p.screenY + TILE_HEIGHT / 2 - 4);
            g.lineTo(p.screenX + 36, p.screenY + TILE_HEIGHT - 4);
            g.stroke();
          }
        }
        if (['grass', 'empty', 'water', 'road', 'bridge'].includes(type)) continue;
        const source = selectSpriteSource(type, tile.building, x, y, pack),
          sheet = images.current.get(source.source);
        if (!sheet) continue;
        const info = getSpriteRenderInfo(
          type,
          tile.building,
          x,
          y,
          p.screenX,
          p.screenY,
          sheet.width,
          sheet.height,
          {},
          pack,
        );
        if (!info?.coords) continue;
        sprites.push({
          depth: x + y + (type.startsWith('apartment') || type.startsWith('office') ? 2 : 0),
          draw: () => {
            const { sx, sy, sw, sh } = info.coords!,
              { drawX, drawY, destWidth, destHeight } = info.positioning;
            b.save();
            if (info.shouldFlip) {
              b.translate(drawX + destWidth / 2, 0);
              b.scale(-1, 1);
              b.translate(-(drawX + destWidth / 2), 0);
            }
            b.drawImage(sheet, sx, sy, sw, sh, drawX, drawY, destWidth, destHeight);
            b.restore();
          },
        });
      }
    // Small fountain courts articulate the long pedestrian axis without introducing extra UI.
    for (const [x, y] of [
      [20, 30],
      [30.5, 32.5],
    ]) {
      const p = center(x, y);
      g.fillStyle = '#f3e7c7';
      g.strokeStyle = '#d0c4a7';
      g.lineWidth = 2;
      g.beginPath();
      g.ellipse(p.x + originX, p.y + originY, 35, 18, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillStyle = '#82c8ca';
      g.beginPath();
      g.ellipse(p.x + originX, p.y + originY, 22, 10, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#e5f1e7';
      g.lineWidth = 2;
      g.beginPath();
      g.ellipse(p.x + originX, p.y + originY, 12, 5, 0, 0, Math.PI * 2);
      g.stroke();
    }
    const landmarkSheet = images.current.get(landmarkAtlas);
    if (landmarkSheet)
      for (const landmark of ASTANA_LANDMARKS) {
        const p = center(landmark.x, landmark.y),
          w = landmark.width;
        sprites.push({
          depth: landmark.x + landmark.y + 1,
          draw: () =>
            b.drawImage(
              landmarkSheet,
              ((landmark.frame % 3) * landmarkSheet.width) / 3,
              (Math.floor(landmark.frame / 3) * landmarkSheet.height) / 2,
              landmarkSheet.width / 3,
              landmarkSheet.height / 2,
              p.x + originX - w / 2,
              p.y + originY - w * 0.91,
              w,
              w,
            ),
        });
      }
    sprites.sort((a, b) => a.depth - b.depth).forEach((sprite) => sprite.draw());
    for (const site of [...map.busLanes, ...map.lightRail]) {
      const p = center(site.x, site.y),
        down = hasRoad(site.x - 1, site.y) || hasRoad(site.x + 1, site.y);
      const vx = 26,
        vy = down ? TILE_HEIGHT * 0.4 : -TILE_HEIGHT * 0.4;
      const rail = map.lightRail.includes(site);
      g.strokeStyle = rail ? '#e6ddbd' : '#70d1bc';
      g.lineWidth = rail ? 2 : 5;
      for (const offset of rail ? [-3, 3] : [0]) {
        g.beginPath();
        g.moveTo(p.x + originX - vx, p.y + originY - vy + offset);
        g.lineTo(p.x + originX + vx, p.y + originY + vy + offset);
        g.stroke();
      }
      if (rail) {
        g.lineWidth = 1;
        for (let step = -0.8; step < 1; step += 0.3) {
          g.beginPath();
          g.moveTo(p.x + originX + vx * step, p.y + originY + vy * step - 4);
          g.lineTo(p.x + originX + vx * step, p.y + originY + vy * step + 4);
          g.stroke();
        }
      }
    }
    for (const site of map.crossings) {
      const p = center(site.x, site.y);
      g.strokeStyle = '#fff1c8';
      g.lineWidth = 2;
      for (let i = -3; i < 4; i++) {
        g.beginPath();
        g.moveTo(p.x + originX - 12 + i * 3, p.y + originY - 4 + i * 1.8);
        g.lineTo(p.x + originX - 3 + i * 3, p.y + originY - 10 + i * 1.8);
        g.stroke();
      }
    }
    for (const site of [...map.signals, ...map.lights]) {
      const p = center(site.x, site.y);
      b.fillStyle = '#2a4552';
      b.fillRect(p.x + originX + 16, p.y + originY - 22, 3, 25);
      b.fillStyle = map.signals.includes(site) ? '#81d6a4' : '#ffe1a0';
      b.beginPath();
      b.arc(p.x + originX + 17, p.y + originY - 22, 5, 0, Math.PI * 2);
      b.fill();
    }
    for (const site of map.programs) {
      const p = center(site.x, site.y);
      b.fillStyle = '#8ae0c6';
      b.strokeStyle = '#1b4455';
      b.lineWidth = 2;
      b.beginPath();
      b.arc(p.x + originX + 26, p.y + originY - 35, 10, 0, Math.PI * 2);
      b.fill();
      b.stroke();
      b.fillStyle = '#163845';
      b.font = 'bold 10px sans-serif';
      b.textAlign = 'center';
      b.fillText(
        site.id === 'M5' ? '≈' : site.id === 'M12' ? '✓' : '↗',
        p.x + originX + 26,
        p.y + originY - 32,
      );
    }
    // Consequences are visible on their actual lots, including previews that have not been funded.
    for (const change of map.changes) {
      const p = center(change.x + 0.6, change.y + 0.6),
        latest = change.id === decisions.at(-1)?.measureId && change.district === selected;
      g.save();
      g.translate(p.x + originX, p.y + originY);
      g.fillStyle = latest ? 'rgba(255,220,128,.28)' : 'rgba(122,214,184,.15)';
      g.strokeStyle = latest ? '#ffe197' : '#95d9bc';
      g.lineWidth = latest ? 3.5 : 1.8;
      g.beginPath();
      g.ellipse(0, 0, latest ? 78 : 62, latest ? 40 : 31, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.restore();
    }
    layers.current = { ground, buildings, originX, originY, pixelScale };
    gridVersionRef.current++;
    dirty.current = true;
    motionRefs.carsRef.current = [];
    motionRefs.pedestriansRef.current = [];
    motionRefs.busesRef.current = [];
    worldStateRef.current = {
      grid: map.grid,
      gridSize: ASTANA_SIZE,
      ...camera.current,
      speed: 1,
      canvasSize: dimensions.current,
    };
    for (let i = 0; i < (mobile ? 12 : 28); i++) motionApi.current.spawnRandomCar();
    for (let i = 0; i < (mobile ? 16 : 42); i++) motionApi.current.spawnPedestrian();
    return () => {
      ground.width = 0;
      buildings.width = 0;
      if (layers.current?.ground === ground) layers.current = null;
    };
  }, [map, ready, selected]);
  useEffect(() => {
    if (!ready) return;
    let frame = 0,
      lastTime = 0;
    const render = (time: number) => {
      frame = requestAnimationFrame(render);
      if (time - lastTime < 33) return;
      const delta = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      const layer = layers.current;
      if (!layer) return;
      const { offset, zoom } = camera.current,
        { width, height, dpr } = dimensions.current;
      worldStateRef.current = {
        grid: map.grid,
        gridSize: ASTANA_SIZE,
        offset,
        zoom,
        speed: state.current.paused || state.current.reduced ? 0 : 1,
        canvasSize: { width, height },
      };
      const repaint = dirty.current;
      if (dirty.current) {
        for (const [canvas, cache] of [
          [terrainView.current, layer.ground],
          [buildingsView.current, layer.buildings],
        ] as const) {
          const ctx = canvas?.getContext('2d');
          if (!ctx) continue;
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, canvas!.width, canvas!.height);
          ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, offset.x * dpr, offset.y * dpr);
          ctx.drawImage(
            cache,
            -layer.originX,
            -layer.originY,
            cache.width / layer.pixelScale,
            cache.height / layer.pixelScale,
          );
        }
        dirty.current = false;
        positionMarkers();
      }
      if ((state.current.paused || state.current.reduced) && !repaint) return;
      if (!state.current.paused && !state.current.reduced) {
        motionRefs.trafficLightTimerRef.current += delta;
        motionApi.current.updateCars(delta);
        motionApi.current.updateBuses(delta);
        motionApi.current.updatePedestrians(delta);
      }
      const ctx = lifeView.current?.getContext('2d');
      if (!ctx) return;
      // IsoCity owns the traffic canvas clear and its DPR/camera transform.
      motionApi.current.drawCars(ctx);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      motionApi.current.drawBuses(ctx);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      motionApi.current.drawPedestrians(ctx);
    };
    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [ready, map, positionMarkers, motionRefs]);
  return (
    <div
      ref={host}
      className={`isocity-world ${night ? 'isocity-night' : ''}`}
      data-testid="city-world"
      onPointerDown={(event) => {
        if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        host.current?.setPointerCapture(event.pointerId);
        gesture.current = {
          x: event.clientX,
          y: event.clientY,
          moved: pointers.current.size > 1,
          distance: 0,
        };
      }}
      onPointerMove={(event) => {
        const previous = pointers.current.get(event.pointerId);
        if (!previous) return;
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.current.size === 2) {
          const [a, b] = [...pointers.current.values()],
            distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (gesture.current.distance) {
            const rect = host.current!.getBoundingClientRect();
            zoomAt(
              (distance - gesture.current.distance) * 0.004,
              (a.x + b.x) / 2 - rect.left,
              (a.y + b.y) / 2 - rect.top,
            );
          }
          gesture.current.distance = distance;
          gesture.current.moved = true;
          selectionBlockedUntil.current = performance.now() + 350;
          return;
        }
        const dx = event.clientX - previous.x,
          dy = event.clientY - previous.y;
        if (Math.hypot(event.clientX - gesture.current.x, event.clientY - gesture.current.y) > 6)
          gesture.current.moved = true;
        if (gesture.current.moved) {
          selectionBlockedUntil.current = performance.now() + 350;
          camera.current.offset.x += dx;
          camera.current.offset.y += dy;
          dirty.current = true;
          positionMarkers();
        }
      }}
      onPointerUp={(event) => {
        if (!pointers.current.has(event.pointerId)) return;
        pointers.current.delete(event.pointerId);
        if (gesture.current.moved) selectionBlockedUntil.current = performance.now() + 350;
        if (host.current?.hasPointerCapture(event.pointerId))
          host.current.releasePointerCapture(event.pointerId);
        gesture.current.distance = 0;
        // Exploring the canvas never changes the policy target. Selection is explicit on named markers.
      }}
      onPointerCancel={(event) => {
        pointers.current.delete(event.pointerId);
        selectionBlockedUntil.current = performance.now() + 350;
      }}
      onLostPointerCapture={(event) => pointers.current.delete(event.pointerId)}
    >
      <canvas
        ref={terrainView}
        className="isocity-terrain"
        data-testid="city-canvas"
        role="img"
        aria-label={tx(
          lang,
          'Illustrative Astana city map. Choose a district with the named buttons.',
          'Схематичная карта Астаны. Выберите район кнопкой с названием.',
          'Астананың сызбалық картасы. Аудан атауы бар түймені таңдаңыз.',
        )}
      />
      <canvas ref={lifeView} className="isocity-life" aria-hidden="true" />
      <canvas ref={buildingsView} className="isocity-buildings" aria-hidden="true" />
      <div className="isocity-atmosphere" />
      {failed && (
        <img
          className="isocity-fallback"
          src={fallbackArt}
          alt={tx(lang, 'Illustrative Astana', 'Схематичная Астана', 'Сызбалық Астана')}
        />
      )}
      <div className="isocity-districts">
        {DISTRICTS.map((district) => (
          <button
            key={district.id}
            ref={(element) => {
              markers.current[district.id] = element;
            }}
            className={`isocity-marker ${selected === district.id ? 'is-selected' : ''}`}
            onPointerDown={(event) => {
              markerPress.current = { x: event.clientX, y: event.clientY };
            }}
            onPointerMove={(event) => {
              if (
                event.buttons &&
                Math.hypot(
                  event.clientX - markerPress.current.x,
                  event.clientY - markerPress.current.y,
                ) > 6
              )
                selectionBlockedUntil.current = performance.now() + 350;
            }}
            onClick={(event) => {
              event.stopPropagation();
              if (event.detail > 0 && performance.now() < selectionBlockedUntil.current) {
                event.preventDefault();
                return;
              }
              onSelect(district.id);
            }}
            aria-pressed={selected === district.id}
            aria-label={`${district.name[lang]} · ${result.districtScores[district.id].toFixed(1)}`}
          >
            <span className="isocity-marker-pin" />
            <span>
              {district.name[lang]}
              <small>{result.districtScores[district.id].toFixed(1)}</small>
            </span>
          </button>
        ))}
      </div>
      {ready && latestChange && latestMeasure && (
        <div
          ref={callout}
          className={`isocity-policy-callout ${preview ? 'is-preview' : 'is-funded'}`}
          data-testid="city-policy-callout"
          role="status"
        >
          <span>
            {preview
              ? tx(
                  lang,
                  'Preview · not funded yet',
                  'Прогноз · ещё не принято',
                  'Болжам · әлі қабылданбаған',
                )
              : tx(lang, 'Funded in your plan', 'Принято в вашем плане', 'Жоспарға қабылданды')}
          </span>
          <strong>{latestMeasure.name[lang]}</strong>
          <small>
            {latestMeasure.scope === 'city'
              ? tx(lang, 'All five districts', 'Все пять районов', 'Барлық бес аудан')
              : DISTRICTS.find((district) => district.id === latestChange.district)?.name[lang]}
          </small>
        </div>
      )}
      <div
        className="isocity-controls"
        aria-label={tx(lang, 'Map controls', 'Управление картой', 'Картаны басқару')}
      >
        <button
          aria-label={tx(lang, 'Zoom in', 'Приблизить', 'Үлкейту')}
          onClick={() => zoomAt(0.12)}
        >
          <Plus size={18} />
        </button>
        <button
          aria-label={tx(lang, 'Zoom out', 'Отдалить', 'Кішірейту')}
          onClick={() => zoomAt(-0.12)}
        >
          <Minus size={18} />
        </button>
        <button
          aria-label={tx(lang, 'Reset map', 'Вернуть карту', 'Картаны қалпына келтіру')}
          onClick={fit}
        >
          <LocateFixed size={18} />
        </button>
      </div>
      <span className="isocity-credit">
        {tx(
          lang,
          'Illustrative Astana · 5 dataset districts · IsoCity / MIT',
          'Схематичная Астана · 5 районов датасета · IsoCity / MIT',
          'Сызбалық Астана · деректердегі 5 аудан · IsoCity / MIT',
        )}
      </span>
      {!ready && !failed && (
        <div className="isocity-loading" data-testid="city-loading" role="status">
          <b>QALA</b>
          <span>{tx(lang, 'Opening the city…', 'Открываем город…', 'Қала ашылып жатыр…')}</span>
          <i />
        </div>
      )}
    </div>
  );
}
