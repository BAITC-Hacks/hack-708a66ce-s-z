import { useEffect, useRef, useState } from 'react';
import {
  Bus,
  Flame,
  HeartPulse,
  Leaf,
  ShieldCheck,
  Waves,
  TrainFront,
  TrafficCone,
  LampDesk,
  Footprints,
  MessageSquare,
  Wrench,
} from 'lucide-react';
import type { Measure } from '../game/data';
import {
  getActiveSpritePack,
  getSpriteRenderInfo,
  loadSpriteImage,
  selectSpriteSource,
  type Building,
  type BuildingType,
} from '../vendor/isocity';

// Building projects use exactly the same filtered sprites as the city renderer.
// Heating policy changes fuel, not the number of power plants: it keeps a flame symbol.
const PROJECT_BUILDINGS: Partial<Record<Measure['id'], BuildingType>> = {
  M4: 'park',
  M7: 'school',
  M8: 'hospital',
  M9: 'basketball_courts',
  M13: 'water_tower',
};
const CATEGORY_ICONS = {
  transport: Bus,
  ecology: Leaf,
  social: HeartPulse,
  safety: ShieldCheck,
  services: Waves,
};

export function IsoCityPolicyArt({ measure }: { measure: Measure }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const buildingType = PROJECT_BUILDINGS[measure.id];
  const specificIcons = {
    M2: TrafficCone,
    M3: TrainFront,
    M5: Flame,
    M10: LampDesk,
    M11: Footprints,
    M12: MessageSquare,
    M14: Wrench,
  };
  const Icon =
    specificIcons[measure.id as keyof typeof specificIcons] ?? CATEGORY_ICONS[measure.category];

  useEffect(() => {
    setReady(false);
    if (!buildingType) return;
    let cancelled = false;
    const building: Building = {
      type: buildingType,
      level: 1,
      population: 0,
      jobs: 0,
      powered: true,
      watered: true,
      onFire: false,
      fireProgress: 0,
      age: 1,
      constructionProgress: 100,
      abandoned: false,
    };
    const pack = getActiveSpritePack();
    const source = selectSpriteSource(buildingType, building, 0, 0, pack);
    void loadSpriteImage(source.source)
      .then((image) => {
        if (cancelled) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        const info = getSpriteRenderInfo(
          buildingType,
          building,
          0,
          0,
          0,
          0,
          image.naturalWidth,
          image.naturalHeight,
          {},
          pack,
        );
        if (!info?.coords) return;
        const { sx, sy, sw, sh } = info.coords;
        const { destWidth, destHeight } = info.positioning;
        const scale = Math.min(286 / destWidth, 188 / destHeight);
        const width = destWidth * scale;
        const height = destHeight * scale;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, sx, sy, sw, sh, (300 - width) / 2, (200 - height) / 2, width, height);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, [buildingType]);

  return (
    <span
      className={`term-policy-art isocity-policy-art ${ready ? '' : 'symbol-art'}`}
      aria-hidden="true"
      style={{ position: 'relative', width: 150, height: 100 }}
    >
      <canvas
        ref={canvasRef}
        width={300}
        height={200}
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: ready ? 1 : 0,
        }}
      />
      {!ready && <Icon strokeWidth={1.3} aria-hidden="true" />}
    </span>
  );
}
