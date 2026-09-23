import Phaser from 'phaser';
import { DISTRICTS, MEASURES, type DistrictId } from './data';
import { type Decision } from './engine';

export const CITY_DISTRICTS: Record<DistrictId, { x: number; y: number; color: number }> = {
  saryarka: { x: 7, y: 9, color: 0x84ac79 },
  baikonur: { x: 21, y: 7, color: 0x87abb8 },
  almaty: { x: 29, y: 13, color: 0xcab080 },
  nura: { x: 7, y: 27, color: 0xd4a96b },
  esil: { x: 27, y: 27, color: 0x7badab },
};
const CIVIC_SITES: Record<DistrictId, { x: number; y: number }[]> = {
  saryarka: [
    { x: 8.1, y: 8.1 },
    { x: 13.25, y: 8.1 },
    { x: 1.8, y: 8.1 },
    { x: 8.1, y: 1.8 },
    { x: 13.25, y: 1.8 },
  ],
  baikonur: [
    { x: 25.8, y: 1.8 },
    { x: 32.1, y: 1.8 },
    { x: 35.4, y: 1.8 },
    { x: 25.8, y: 8.1 },
    { x: 35.4, y: 8.1 },
  ],
  almaty: [
    { x: 32.1, y: 13.8 },
    { x: 35.4, y: 13.8 },
    { x: 32.1, y: 21 },
    { x: 35.4, y: 21 },
    { x: 25.8, y: 21 },
  ],
  nura: [
    { x: 8.1, y: 25.9 },
    { x: 13.25, y: 25.9 },
    { x: 8.1, y: 32.1 },
    { x: 13.25, y: 32.1 },
    { x: 8.1, y: 35.4 },
  ],
  esil: [
    { x: 25.8, y: 25.9 },
    { x: 25.8, y: 32.1 },
    { x: 25.8, y: 35.4 },
    { x: 32.1, y: 35.4 },
    { x: 35.4, y: 35.4 },
  ],
};
const W = 64,
  H = 32,
  OX = 1300,
  OY = 120;
export const project = (x: number, y: number, z = 0) => ({
  x: OX + ((x - y) * W) / 2,
  y: OY + ((x + y) * H) / 2 - z,
});
type Actor = {
  sprite: Phaser.GameObjects.Image;
  path: { x: number; y: number }[];
  progress: number;
  speed: number;
  person: boolean;
  bus: boolean;
  variant: number;
  lengths: number[];
  distance: number;
};
export interface SceneBridge {
  select: (id: DistrictId) => void;
  locate: (positions: { id: DistrictId; x: number; y: number }[]) => void;
  ready: () => void;
}

export class CityScene extends Phaser.Scene {
  private bridge: SceneBridge;
  private atlasUrl: string;
  private landmarkUrl: string;
  private actorUrl?: string;
  private actors: Actor[] = [];
  private buildings: Phaser.GameObjects.Image[] = [];
  private lots: { x: number; y: number; image: Phaser.GameObjects.Image }[] = [];
  private policyObjects: Phaser.GameObjects.GameObject[] = [];
  private night = false;
  private stopped = false;
  private ground!: Phaser.GameObjects.Graphics;
  private selection!: Phaser.GameObjects.Graphics;
  private lamps!: Phaser.GameObjects.Graphics;
  private pointerStart = { x: 0, y: 0 };
  private dragged = false;
  private initialized = false;
  private chosen: DistrictId = 'nura';
  private policyKey = '';
  private reduced = false;
  constructor(bridge: SceneBridge, atlasUrl: string, landmarkUrl: string, actorUrl?: string) {
    super('qala-city');
    this.bridge = bridge;
    this.atlasUrl = atlasUrl;
    this.landmarkUrl = landmarkUrl;
    this.actorUrl = actorUrl;
  }
  preload() {
    this.load.image('architecture', this.atlasUrl);
    this.load.image('landmarks', this.landmarkUrl);
    if (this.actorUrl) this.load.image('city-life', this.actorUrl);
  }
  create() {
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (const key of ['architecture', 'landmarks']) {
      const texture = this.textures.get(key);
      const source = texture.getSourceImage() as HTMLImageElement;
      for (let i = 0; i < 6; i++)
        texture.add(
          String(i),
          0,
          Math.floor(((i % 3) * source.width) / 3),
          Math.floor((Math.floor(i / 3) * source.height) / 2),
          Math.floor(source.width / 3),
          Math.floor(source.height / 2),
        );
    }
    if (this.textures.exists('city-life')) {
      const texture = this.textures.get('city-life');
      const source = texture.getSourceImage() as HTMLImageElement;
      for (let row = 0; row < 3; row++)
        for (let direction = 0; direction < 4; direction++)
          texture.add(
            `${row}-${direction}`,
            0,
            Math.floor((direction * source.width) / 4),
            Math.floor((row * source.height) / 3),
            Math.floor(source.width / 4),
            Math.floor(source.height / 3),
          );
    }
    this.makeActorTextures();
    this.drawTerrain();
    this.populate();
    this.makeLandmarks();
    this.makeActors();
    this.selection = this.add.graphics().setDepth(-90);
    this.lamps = this.add.graphics().setDepth(3000);
    for (let a = 3; a < 35; a += 4)
      for (const b of [5, 11, 23, 29]) {
        const p = project(a, b + 0.8);
        this.lamps
          .fillStyle(0xffd88b, 0.08)
          .fillCircle(p.x, p.y, 24)
          .fillStyle(0xffe8ac, 0.2)
          .fillCircle(p.x, p.y, 9);
      }
    this.lamps.setVisible(false);
    this.cameras.main.setBackgroundColor('#20394d');
    this.resetCamera();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.pointerStart = { x: p.x, y: p.y };
      this.dragged = false;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown) return;
      if (Math.hypot(p.x - this.pointerStart.x, p.y - this.pointerStart.y) > 4) this.dragged = true;
      if (this.dragged) {
        this.cameras.main.scrollX -= (p.x - p.prevPosition.x) / this.cameras.main.zoom;
        this.cameras.main.scrollY -= (p.y - p.prevPosition.y) / this.cameras.main.zoom;
      }
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.dragged) return;
      const wp = this.cameras.main.getWorldPoint(p.x, p.y);
      const a = (wp.x - OX) / (W / 2),
        b = (wp.y - OY) / (H / 2);
      const x = (a + b) / 2,
        y = (b - a) / 2;
      let closest: DistrictId = 'nura';
      let distance = Infinity;
      for (const [id, d] of Object.entries(CITY_DISTRICTS)) {
        const dist = Math.hypot(x - d.x, y - d.y);
        if (dist < distance) {
          distance = dist;
          closest = id as DistrictId;
        }
      }
      if (distance < 11) this.bridge.select(closest);
    });
    this.input.on('wheel', (_p: unknown, _g: unknown, _x: number, dy: number) =>
      this.zoomBy(dy > 0 ? -0.07 : 0.07),
    );
    this.scale.on('resize', () => this.resetCamera());
    this.initialized = true;
    this.highlight('nura');
    this.bridge.ready();
  }
  private diamond(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    color: number,
    alpha = 1,
  ) {
    g.fillStyle(color, alpha);
    g.fillPoints(
      [
        { x, y: y - h / 2 },
        { x: x + w / 2, y },
        { x, y: y + h / 2 },
        { x: x - w / 2, y },
      ],
      true,
    );
  }
  private groundRect(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
    alpha = 1,
  ) {
    g.fillStyle(color, alpha).fillPoints(
      [
        project(x, y),
        project(x + width, y),
        project(x + width, y + height),
        project(x, y + height),
      ],
      true,
    );
  }
  private groundLine(
    g: Phaser.GameObjects.Graphics,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    width: number,
    color: number,
    alpha = 1,
  ) {
    const a = project(x1, y1),
      b = project(x2, y2);
    g.lineStyle(width, color, alpha).lineBetween(a.x, a.y, b.x, b.y);
  }
  private riverX(y: number) {
    return 17.8 + Math.sin(y * 0.16 - 0.9) * 0.7;
  }
  private drawTerrain() {
    const g = this.add.graphics().setDepth(-100);
    this.ground = g;
    const edge = [project(-3, -3), project(40, -3), project(40, 40), project(-3, 40)];
    g.fillStyle(0x0d2638, 0.4).fillPoints(
      edge.map((p) => ({ x: p.x + 20, y: p.y + 38 })),
      true,
    );
    g.fillStyle(0x60746c).fillPoints(
      edge.map((p) => ({ x: p.x, y: p.y + 12 })),
      true,
    );
    // Broad surfaces, real blocks and connected streets replace the visible checkerboard.
    this.groundRect(g, -3, -3, 43, 43, 0x9caf87);
    this.groundRect(g, -1, -1, 16, 38, 0xb8bd9c);
    this.groundRect(g, 21, -1, 16, 38, 0xbfc4aa);
    const blockBands = [
      [-0.8, 4.35],
      [5.7, 10.3],
      [11.7, 15.0],
      [20.8, 22.3],
      [23.7, 28.3],
      [29.7, 36.8],
    ];
    const streets = [
      [-0.8, 4.3],
      [5.7, 10.25],
      [11.8, 22.15],
      [23.7, 28.3],
      [29.7, 36.8],
    ];
    for (const [x0, x1] of blockBands)
      for (const [y0, y1] of streets) {
        this.groundRect(g, x0, y0, x1 - x0, y1 - y0, 0xd4d0ba);
        this.groundRect(
          g,
          x0 + 0.24,
          y0 + 0.24,
          x1 - x0 - 0.48,
          y1 - y0 - 0.48,
          x0 < 15 && y0 > 23 ? 0x9daf86 : 0xafbc94,
        );
      }
    // Public gardens and school courtyards are part of the neighbourhood, not empty tiles.
    for (const garden of [
      { x: 7, y: 14, w: 3, h: 6 },
      { x: 30.5, y: 24.2, w: 5, h: 3.3 },
      { x: 1, y: 31, w: 3, h: 5 },
    ]) {
      this.groundRect(g, garden.x, garden.y, garden.w, garden.h, 0x83a37b);
      this.groundLine(
        g,
        garden.x,
        garden.y + garden.h / 2,
        garden.x + garden.w,
        garden.y + garden.h / 2,
        5,
        0xdcd3b6,
      );
      this.groundLine(
        g,
        garden.x + garden.w / 2,
        garden.y,
        garden.x + garden.w / 2,
        garden.y + garden.h,
        5,
        0xdcd3b6,
      );
    }
    // Continuous Ishim-inspired river and embankments. Geography is explicitly illustrative.
    for (const [halfWidth, color] of [
      [2.4, 0x72977c],
      [1.95, 0xd9d4bd],
      [1.7, 0x6bb7c4],
      [1.42, 0x5daab9],
    ] as const) {
      const left = [],
        right = [];
      for (let y = -3; y <= 40; y += 0.5) {
        left.push(project(this.riverX(y) - halfWidth, y));
        right.unshift(project(this.riverX(y) + halfWidth, y));
      }
      g.fillStyle(color).fillPoints([...left, ...right], true);
    }
    for (let y = 0; y < 38; y += 2.1) {
      const x = this.riverX(y);
      this.groundLine(g, x - 0.55, y, x + 0.35, y, 1, 0xc4e1db, 0.35);
    }
    // Nurzhol-inspired civic axis: Aq Orda, Baiterek and Khan Shatyr share a promenade.
    this.groundRect(g, 20.4, 14.5, 15.4, 5.1, 0xdad5c0);
    this.groundRect(g, 21, 15.2, 14, 3.7, 0x8ea985);
    this.groundRect(g, 20.5, 16.1, 15.2, 1.8, 0xe6dfc9);
    // Aq Orda needs a complete land footprint, clear of the river and both roads.
    this.groundRect(g, 24.15, 12, 3.3, 3.35, 0xe4dcc5);
    this.groundRect(g, 25.45, 15.2, 0.7, 1.7, 0xe4dcc5);
    for (const x of [22.4, 28.9, 31]) {
      this.groundRect(g, x, 15.6, 0.6, 2.8, 0xd9ccad);
    }
    const roads = [5, 11, 23, 29];
    for (const road of roads) {
      const major = road === 11 || road === 23;
      const width = major ? 29 : 23;
      for (const axis of ['x', 'y']) {
        const a = axis === 'x' ? [road, -1.5, road, 37.5] : [-1.5, road, 37.5, road];
        this.groundLine(g, a[0], a[1], a[2], a[3], width + 9, 0xd7d3c4);
        this.groundLine(g, a[0], a[1], a[2], a[3], width, 0x667376);
        for (let v = -1; v < 37; v += 0.95) {
          if (roads.some((r) => Math.abs(v - r) < 0.8)) continue;
          if (axis === 'x') this.groundLine(g, road, v, road, v + 0.43, 1, 0xded9be, 0.8);
          else this.groundLine(g, v, road, v + 0.43, road, 1, 0xded9be, 0.8);
        }
      }
    }
    // Zebra crossings and small corner refuges make the street network legible at any zoom.
    for (const x of roads)
      for (const y of roads) {
        this.groundRect(g, x - 0.42, y - 0.42, 0.84, 0.84, 0x667376);
        for (let stripe = -3; stripe <= 3; stripe++) {
          this.groundLine(g, x - 0.65, y + stripe * 0.1, x - 0.37, y + stripe * 0.1, 2, 0xe8e3d0);
          this.groundLine(g, x + stripe * 0.1, y + 0.39, x + stripe * 0.1, y + 0.69, 2, 0xe8e3d0);
        }
      }
    for (const y of roads) {
      const x = this.riverX(y);
      this.groundLine(g, x - 2, y - 0.5, x + 2, y - 0.5, 2.4, 0xede6d3);
      this.groundLine(g, x - 2, y + 0.5, x + 2, y + 0.5, 2.4, 0xede6d3);
    }
    // A pair of modest courts gives the residential parks a human scale.
    for (const [x, y] of [
      [7.2, 17.4],
      [31.1, 25.1],
    ]) {
      this.groundRect(g, x, y, 2.1, 1.15, 0x739b89);
      this.groundRect(g, x + 0.12, y + 0.1, 1.86, 0.95, 0xb89677);
      this.groundLine(g, x + 1.05, y + 0.1, x + 1.05, y + 1.05, 0.9, 0xf1e8d0);
    }
  }
  private tree(x: number, y: number, scale = 1, autumn = false) {
    const p = project(x, y);
    const g = this.add
      .graphics()
      .setPosition(p.x, p.y)
      .setDepth((x + y) * 20 + 1);
    g.fillStyle(0x466c58, 0.14).fillEllipse(9, 2, 26 * scale, 12 * scale);
    g.fillStyle(0x6a6650).fillRect(-2, -17 * scale, 4, 19 * scale);
    g.fillStyle(autumn ? 0xb49051 : 0x507b5a).fillCircle(0, -22 * scale, 11 * scale);
    g.fillStyle(autumn ? 0xd6b86a : 0x75955f).fillCircle(-5 * scale, -28 * scale, 9 * scale);
    g.fillStyle(autumn ? 0xe0c477 : 0x91ad70).fillCircle(-7 * scale, -30 * scale, 5 * scale);
    return g;
  }
  private populate() {
    const reserved = [
      { x: 25.8, y: 17.0, radius: 2.3 },
      { x: 25.8, y: 13.6, radius: 2.5 },
      { x: 33.5, y: 17, radius: 2.4 },
      { x: 29, y: 6, radius: 2.4 },
      { x: 23, y: 9, radius: 2.1 },
      { x: 32, y: 32, radius: 2.5 },
    ];
    const lots = [1.8, 8.1, 13.25, 25.8, 32.1, 35.4];
    const rows = [1.8, 8.1, 13.8, 18.0, 21.0, 25.9, 32.1, 35.4];
    for (const x of lots)
      for (const y of rows) {
        if (reserved.some((l) => Math.hypot(x - l.x, y - l.y) < l.radius)) continue;
        if (x > 20 && y > 14 && y < 20) continue;
        if (
          (x < 4 && y > 30) ||
          (x > 6 && x < 10 && y > 12 && y < 21) ||
          (x > 30 && y > 24 && y < 28)
        )
          continue;
        const hash = Math.round(x * 31 + y * 17) % 13;
        const residential = x < 15;
        const frame = residential ? (y > 23 ? 4 : hash === 4 ? 2 : 0) : hash % 4 === 0 ? 0 : 1;
        const size =
          frame === 1 ? 138 + (hash % 3) * 12 : frame === 4 ? 105 : 128 + (hash % 2) * 10;
        const p = project(x, y);
        const image = this.add
          .image(p.x, p.y, 'architecture', String(frame))
          .setOrigin(0.5, 0.86)
          .setDisplaySize(size, size)
          .setDepth((x + y) * 20);
        this.buildings.push(image);
        this.lots.push({ x, y, image });
        // Smaller secondary dwellings create courtyards and varied street walls.
        if (residential && x < 12 && hash % 3 !== 0 && y < 30) {
          const q = project(x + 1.65, y + 1.25);
          const secondary = this.add
            .image(q.x, q.y, 'architecture', String(y > 23 ? 4 : 0))
            .setOrigin(0.5, 0.86)
            .setDisplaySize(y > 23 ? 94 : 106, y > 23 ? 94 : 106)
            .setDepth((x + y + 2.9) * 20);
          this.buildings.push(secondary);
          this.lots.push({ x: x + 1.65, y: y + 1.25, image: secondary });
        }
        this.tree(x - 0.95, y + 0.85, 0.55 + (hash % 3) * 0.12);
      }
    // Civic services are recognisable buildings without overpopulating every block.
    for (const lot of [
      { x: 13.3, y: 33, frame: 2 },
      { x: 25.9, y: 2, frame: 3 },
      { x: 2, y: 19, frame: 3 },
    ]) {
      const p = project(lot.x, lot.y);
      const building = this.add
        .image(p.x, p.y, 'architecture', String(lot.frame))
        .setOrigin(0.5, 0.86)
        .setDisplaySize(143, 143)
        .setDepth((lot.x + lot.y) * 20 + 1);
      this.buildings.push(building);
      this.lots.push({ x: lot.x, y: lot.y, image: building });
    }
    for (const road of [5, 11, 23, 29])
      for (let v = 0.1; v < 37; v += 2.6) {
        if ((v > 15 && v < 21) || [5, 11, 23, 29].some((r) => Math.abs(v - r) < 1)) continue;
        this.tree(road + 0.8, v, 0.68);
        if (road === 11 || road === 23) this.tree(v, road - 0.82, 0.66);
      }
    for (let y = -0.5; y < 37; y += 1.65) {
      if ([5, 11, 23, 29].some((r) => Math.abs(y - r) < 1)) continue;
      this.tree(this.riverX(y) - 2.65, y, 0.72);
      this.tree(this.riverX(y) + 2.65, y, 0.72);
    }
    for (let x = 21.7; x < 35; x += 1.65) {
      this.tree(x, 14.9, 0.65);
      this.tree(x, 19.0, 0.65);
    }
    for (const [x, y] of [
      [7.4, 14.2],
      [9.1, 14.5],
      [7.4, 20.2],
      [9.4, 20],
      [1.5, 31.3],
      [3.1, 33.5],
      [1.4, 35.7],
      [30.8, 24.4],
      [34.9, 26.5],
    ]) {
      this.tree(x, y, 1.1);
      this.tree(x + 0.5, y + 0.65, 0.8);
    }
  }
  private makeLandmarks() {
    const landmarks = [
      { x: 25.8, y: 17, frame: 0, size: 196 },
      { x: 25.8, y: 13.6, frame: 1, size: 185 },
      { x: 33.5, y: 17, frame: 2, size: 192 },
      { x: 29, y: 6, frame: 3, size: 200 },
      { x: 23, y: 9, frame: 4, size: 168 },
      { x: 32, y: 32, frame: 5, size: 185 },
    ];
    const names = [
      'Baiterek · Бәйтерек',
      'Aq Orda · Ақорда',
      'Khan Shatyr · Хан Шатыр',
      'Hazret Sultan · Әзірет Сұлтан',
      'Palace of Peace · Бейбітшілік сарайы',
      'Nur Alem · Нұр Әлем',
    ];
    for (const l of landmarks) {
      const p = project(l.x, l.y);
      const sprite = this.add
        .image(p.x, p.y, 'landmarks', String(l.frame))
        .setOrigin(0.5, 0.95)
        .setDisplaySize(l.size, l.size)
        .setDepth((l.x + l.y) * 20 + 2);
      this.buildings.push(sprite);
      const label = this.add
        .text(p.x, p.y + 10, names[l.frame], {
          fontFamily: 'Manrope Variable',
          fontSize: '12px',
          color: '#fff0cf',
          backgroundColor: '#1c3a40',
          padding: { x: 8, y: 5 },
        })
        .setOrigin(0.5, 0)
        .setDepth(3001)
        .setVisible(false);
      sprite
        .setInteractive({ useHandCursor: true, pixelPerfect: true, alphaTolerance: 50 })
        .on('pointerover', () => label.setVisible(true))
        .on('pointerout', () => label.setVisible(false));
    }
  }
  private makeActorTextures() {
    for (const person of [false, true])
      for (let direction = 0; direction < 4; direction++)
        for (let color = 0; color < (person ? 4 : 5); color++) {
          const key = `${person ? 'person' : 'car'}-${direction}-${color}`,
            g = this.make.graphics({ x: 0, y: 0 });
          if (person) {
            g.fillStyle(0x263d37, 0.2).fillEllipse(8, 17, 8, 4);
            g.lineStyle(2, 0x3c4546).lineBetween(7, 12, 6, 17).lineBetween(9, 12, 11, 17);
            g.fillStyle([0xb86750, 0x467681, 0xddbf80, 0x6b7954][color]).fillRoundedRect(
              5,
              5,
              6,
              9,
              2,
            );
            g.fillStyle(0xd7aa7a).fillCircle(8, 4, 3);
            g.fillStyle(0x494837).fillEllipse(8, 2, 6, 3);
            g.generateTexture(key, 16, 20);
          } else {
            const flip = direction % 2 === 1;
            const colors = [0xe2d8b7, 0xb56046, 0x548990, 0x657d95, 0xd6b653];
            g.fillStyle(0x314b42, 0.2).fillEllipse(17, 17, 29, 11);
            g.fillStyle(0x273e39).fillEllipse(8, 16, 5, 6).fillEllipse(24, 16, 5, 6);
            g.fillStyle(colors[color]).fillPoints(
              flip
                ? [
                    { x: 3, y: 9 },
                    { x: 16, y: 3 },
                    { x: 30, y: 11 },
                    { x: 17, y: 18 },
                  ]
                : [
                    { x: 3, y: 11 },
                    { x: 17, y: 3 },
                    { x: 30, y: 9 },
                    { x: 16, y: 18 },
                  ],
              true,
            );
            g.fillStyle(0xe9e7d3).fillPoints(
              [
                { x: 8, y: 8 },
                { x: 16, y: 4 },
                { x: 25, y: 9 },
                { x: 16, y: 13 },
              ],
              true,
            );
            g.fillStyle(0x557a7e).fillPoints(
              [
                { x: 11, y: 7 },
                { x: 16, y: 5 },
                { x: 22, y: 8 },
                { x: 17, y: 11 },
              ],
              true,
            );
            g.fillStyle(0xf7e5a5).fillRect(direction < 2 ? 25 : 4, 12, 3, 2);
            g.generateTexture(key, 34, 23);
          }
          g.destroy();
        }
  }
  private makeActors() {
    const routes = [
      [5, 5, 11, 11],
      [5, 11, 11, 23],
      [5, 23, 11, 29],
      [23, 5, 29, 11],
      [23, 11, 29, 23],
      [23, 23, 29, 29],
      [11, 11, 23, 23],
      [5, 5, 29, 29],
    ];
    for (let i = 0; i < 82; i++) {
      const person = i >= 34;
      const bus = !person && i % 9 === 0;
      const [x0, y0, x1, y1] = routes[bus ? 7 : i % 7];
      const clockwise = i % 2 === 0;
      const offset = person ? 0.73 : clockwise ? 0.19 : -0.19;
      const path = [
        { x: x0 + offset, y: y0 + offset },
        { x: x1 - offset, y: y0 + offset },
        { x: x1 - offset, y: y1 - offset },
        { x: x0 + offset, y: y1 - offset },
      ];
      if (!clockwise) path.reverse();
      if (person && i % 5 === 0) {
        // Walk along both embankments, and cross on actual bridges.
        path[0] = { x: 15.35, y: 11.7 };
        path[1] = { x: 20.4, y: 11.7 };
        path[2] = { x: 20.4, y: 22.3 };
        path[3] = { x: 15.35, y: 22.3 };
      }
      const lengths = path.map((p, n) =>
        Math.hypot(path[(n + 1) % path.length].x - p.x, path[(n + 1) % path.length].y - p.y),
      );
      const distance = lengths.reduce((a, b) => a + b, 0);
      const sprite = this.add
        .image(0, 0, `${person ? 'person' : 'car'}-0-${i % (person ? 4 : 5)}`)
        .setOrigin(0.5, 0.85);
      if (this.textures.exists('city-life'))
        sprite
          .setTexture('city-life', `${person ? 2 : bus ? 1 : 0}-0`)
          .setDisplaySize(person ? 20 : bus ? 65 : 47, person ? 18 : bus ? 58 : 42);
      this.actors.push({
        sprite,
        path,
        progress: ((i * 0.618033) % 1) * distance,
        speed: person ? 0.3 + (i % 3) * 0.04 : bus ? 1.35 : 1.55 + (i % 4) * 0.12,
        person,
        bus,
        variant: i % (person ? 4 : 5),
        lengths,
        distance,
      });
    }
  }
  update(time: number, delta: number) {
    if (!this.initialized) return;
    const cam = this.cameras.main;
    this.bridge.locate(
      Object.entries(CITY_DISTRICTS).map(([id, d]) => {
        const p = project(d.x, d.y + 2.2);
        return {
          id: id as DistrictId,
          x: (p.x - cam.scrollX - cam.width / 2) * cam.zoom + cam.width / 2,
          y: (p.y - cam.scrollY - cam.height / 2) * cam.zoom + cam.height / 2,
        };
      }),
    );
    const poses = this.actors.map((a) => {
      let segment = 0,
        along = a.progress;
      while (segment < a.lengths.length - 1 && along >= a.lengths[segment]) {
        along -= a.lengths[segment];
        segment++;
      }
      const u = along / a.lengths[segment],
        from = a.path[segment],
        to = a.path[(segment + 1) % a.path.length];
      const x = from.x + (to.x - from.x) * u,
        y = from.y + (to.y - from.y) * u,
        direction = to.x > from.x ? 0 : to.y > from.y ? 1 : to.x < from.x ? 2 : 3;
      return { x, y, direction, remaining: a.lengths[segment] - along, segment };
    });
    this.actors.forEach((a, index) => {
      const { x, y, direction, remaining, segment } = poses[index];
      const redLight =
        !a.person &&
        remaining < 0.7 &&
        remaining > 0.35 &&
        Math.floor(time / 2400 + segment) % 3 === 0;
      const queued =
        !a.person &&
        poses.some((other, otherIndex) => {
          if (
            otherIndex === index ||
            this.actors[otherIndex].person ||
            other.direction !== direction
          )
            return false;
          const horizontal = direction === 0 || direction === 2;
          const lateral = Math.abs(horizontal ? other.y - y : other.x - x);
          const ahead = (horizontal ? other.x - x : other.y - y) * (direction < 2 ? 1 : -1);
          return (
            lateral < 0.15 &&
            ahead > 0 &&
            ahead < (a.bus || this.actors[otherIndex].bus ? 1.7 : 1.15)
          );
        });
      if (!this.stopped && !this.reduced && !redLight && !queued)
        a.progress = (a.progress + (Math.min(delta, 50) / 1000) * a.speed) % a.distance;
      const p = project(x, y);
      const walk =
        a.person && !this.stopped && !this.reduced ? Math.sin(time * 0.007 + index) * 0.45 : 0;
      a.sprite.setPosition(p.x, p.y + walk).setDepth((x + y) * 20 + 5);
      if (this.textures.exists('city-life')) {
        a.sprite.setFrame(`${a.person ? 2 : a.bus ? 1 : 0}-${a.person ? a.variant : direction}`);
        // Keep each pedestrian's clothing and identity consistent when a route turns.
        a.sprite.setFlipX(
          a.person && (direction === 0 || direction === 3) !== (a.variant === 0 || a.variant === 3),
        );
      } else a.sprite.setTexture(`${a.person ? 'person' : 'car'}-${direction}-${a.variant}`);
    });
  }
  highlight(id: DistrictId) {
    this.chosen = id;
    if (!this.selection) return;
    this.selection.clear();
    const d = CITY_DISTRICTS[id];
    const points = [
      project(d.x - 4, d.y - 4),
      project(d.x + 4, d.y - 4),
      project(d.x + 4, d.y + 4),
      project(d.x - 4, d.y + 4),
    ];
    this.selection.fillStyle(0xffdfa0, 0.16).fillPoints(points, true);
    this.selection.lineStyle(2.5, 0xffe4aa, 0.8).strokePoints(points, true);
  }
  setNight(night: boolean) {
    this.night = night;
    if (!this.initialized) return;
    this.buildings.forEach((b) => (night ? b.setTint(0x8391ab) : b.clearTint()));
    this.actors.forEach(({ sprite }) => (night ? sprite.setTint(0xb5c3d8) : sprite.clearTint()));
    this.ground.setAlpha(night ? 0.7 : 1);
    this.cameras.main.setBackgroundColor(night ? '#263d49' : '#20394d');
    this.lamps.setVisible(night);
  }
  setPaused(paused: boolean) {
    this.stopped = paused;
  }
  zoomBy(amount: number) {
    const c = this.cameras.main;
    c.setZoom(Phaser.Math.Clamp(c.zoom + amount, 0.18, 1.65));
  }
  resetCamera() {
    const c = this.cameras.main;
    const width = this.scale.width,
      height = this.scale.height;
    const desktop = width > 760;
    // Fit the whole city into the visible play area, not the full canvas behind the HUD.
    const left = desktop ? (width > 1150 ? 330 : 285) : 12;
    const right = width - (desktop ? 82 : 12);
    const top = desktop ? 114 : 128;
    const bottom = height - (desktop ? (height < 820 ? 282 : 318) : 285);
    const availableWidth = Math.max(240, right - left);
    const availableHeight = Math.max(220, bottom - top);
    const zoom = Phaser.Math.Clamp(
      Math.min(availableWidth / 2752, availableHeight / 1390),
      0.18,
      0.85,
    );
    const base = project(18.5, 18.5);
    c.stopFollow();
    c.panEffect.reset();
    c.setZoom(zoom);
    c.centerOn(
      base.x - ((left + right) / 2 - width / 2) / zoom,
      base.y - ((top + bottom) / 2 - height / 2) / zoom,
    );
  }
  focus(id: DistrictId) {
    if (!this.initialized) return;
    const d = CITY_DISTRICTS[id],
      p = project(d.x, d.y);
    this.cameras.main.pan(
      p.x + (this.scale.width > 760 ? 220 : 0),
      p.y + 90,
      this.reduced ? 0 : 650,
      'Sine.easeInOut',
    );
    this.highlight(id);
  }
  applyPolicies(decisions: readonly Decision[]) {
    if (!this.initialized) return;
    const key = JSON.stringify(decisions);
    if (key === this.policyKey) return;
    this.policyKey = key;
    this.policyObjects.forEach((o) => o.destroy());
    this.policyObjects = [];
    this.lots.forEach(({ image }) => image.setVisible(true));
    const usedSites: Partial<Record<DistrictId, number>> = {};
    decisions.forEach((choice) => {
      const m = MEASURES.find((m) => m.id === choice.measureId)!;
      const ids = choice.districtId ? [choice.districtId] : DISTRICTS.map((d) => d.id);
      ids.forEach((id) => {
        const d = CITY_DISTRICTS[id];
        const slot = usedSites[id] ?? 0;
        usedSites[id] = slot + 1;
        const { x, y } = CIVIC_SITES[id][slot % CIVIC_SITES[id].length];
        const p = project(x, y);
        // Replace a neighbourhood lot, never put a school or clinic in a traffic lane.
        if (['M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M13'].includes(m.id)) {
          this.lots.forEach((lot) => {
            if (Math.hypot(lot.x - x, lot.y - y) < 2.1) lot.image.setVisible(false);
          });
          const site = this.add.graphics().setDepth(-82);
          this.groundRect(
            site,
            x - 0.8,
            y - 0.8,
            1.6,
            1.6,
            m.id === 'M4' || m.id === 'M6' ? 0x89a878 : 0xdcd5bb,
          );
          this.policyObjects.push(site);
        }
        let object: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics;
        if (m.id === 'M4' || m.id === 'M6') {
          object = this.tree(x, y, 1.9, true);
          this.policyObjects.push(
            this.tree(x + 0.7, y - 0.7, 1.35),
            this.tree(x - 0.5, y + 0.5, 1.2),
          );
        } else if (m.id === 'M7' || m.id === 'M8' || m.id === 'M13' || m.id === 'M5') {
          const type = m.id === 'M8' ? 3 : m.id === 'M13' || m.id === 'M5' ? 5 : 2;
          object = this.add
            .image(p.x, p.y, 'architecture', String(type))
            .setOrigin(0.5, 0.85)
            .setDisplaySize(132, 132)
            .setDepth((x + y) * 20 + 10);
        } else if (m.id === 'M1' || m.id === 'M3') {
          const road = [5, 11, 23, 29].reduce(
            (best, r) => (Math.abs(r - d.x) < Math.abs(best - d.x) ? r : best),
            5,
          );
          object = this.add.graphics().setDepth(-80);
          const a = project(road, d.y - 3),
            b = project(road, d.y + 3);
          object
            .lineStyle(m.id === 'M1' ? 7 : 3, m.id === 'M1' ? 0x49a7aa : 0xd5c8a0, 0.9)
            .lineBetween(a.x, a.y, b.x, b.y);
          if (m.id === 'M3') object.lineBetween(a.x + 7, a.y, b.x + 7, b.y);
          const stop = project(road + 0.6, d.y);
          object
            .fillStyle(0xf1d999)
            .fillRect(stop.x - 9, stop.y - 16, 18, 4)
            .fillStyle(0x487276)
            .fillRect(stop.x - 7, stop.y - 12, 14, 12);
        } else if (m.id === 'M9') {
          object = this.add
            .graphics()
            .setPosition(p.x, p.y)
            .setDepth((x + y) * 20 + 1);
          this.diamond(object, 0, 0, 80, 40, 0xb48369);
          object
            .lineStyle(1, 0xf3e7ca)
            .strokePoints(
              [
                { x: 0, y: -17 },
                { x: 35, y: 0 },
                { x: 0, y: 17 },
                { x: -35, y: 0 },
              ],
              true,
            )
            .strokeEllipse(0, 0, 16, 8)
            .lineBetween(-17, -8, 17, 8);
          object.lineStyle(2, 0x7b8477).lineBetween(-30, -2, -30, -17).lineBetween(30, 2, 30, -13);
        } else if (m.id === 'M10') {
          object = this.add
            .graphics()
            .setPosition(p.x, p.y)
            .setDepth((x + y) * 20 + 10);
          for (const dx of [-17, 17]) {
            object.fillStyle(0xffd57d, 0.13).fillEllipse(dx, 0, 45, 23);
            object
              .lineStyle(2.5, 0x526f6a)
              .lineBetween(dx, 1, dx, -33)
              .lineBetween(dx, -33, dx + 8, -36);
            object.fillStyle(0xffdda1).fillEllipse(dx + 8, -35, 8, 4);
          }
        } else if (m.id === 'M11') {
          const road = [5, 11, 23, 29].reduce(
            (best, r) => (Math.abs(r - d.x) < Math.abs(best - d.x) ? r : best),
            5,
          );
          object = this.add.graphics().setDepth(-70);
          for (let stripe = 0; stripe < 7; stripe++) {
            const a = project(road - 0.37, d.y - 1 + stripe * 0.12),
              b = project(road + 0.37, d.y - 1 + stripe * 0.12);
            object.lineStyle(2.5, 0xfff0c7).lineBetween(a.x, a.y, b.x, b.y);
          }
        } else {
          object = this.add
            .graphics()
            .setPosition(p.x, p.y)
            .setDepth((x + y) * 20 + 10);
          object.fillStyle(0xf3d598).fillRoundedRect(-9, -36, 18, 26, 3);
          object.lineStyle(3, 0x5a7472).lineBetween(0, -13, 0, 2);
          object.fillStyle(m.id === 'M2' ? 0x355859 : 0x6cafba).fillCircle(0, -25, 6);
          if (m.id === 'M2') {
            object
              .fillStyle(0xe6865e)
              .fillCircle(0, -29, 2)
              .fillStyle(0x92bd76)
              .fillCircle(0, -22, 2);
          }
        }
        this.policyObjects.push(object);
        if (!this.reduced) {
          object.setAlpha(0);
          this.tweens.add({ targets: object, alpha: 1, duration: 650 });
        }
      });
    });
  }
}
