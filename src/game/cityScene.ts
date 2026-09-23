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
  private actors: Actor[] = [];
  private buildings: Phaser.GameObjects.Image[] = [];
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
  constructor(bridge: SceneBridge, atlasUrl: string, landmarkUrl: string) {
    super('qala-city');
    this.bridge = bridge;
    this.atlasUrl = atlasUrl;
    this.landmarkUrl = landmarkUrl;
  }
  preload() {
    this.load.image('architecture', this.atlasUrl);
    this.load.image('landmarks', this.landmarkUrl);
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
    this.cameras.main.setBackgroundColor('#bac9ad');
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
  private drawTerrain() {
    const g = this.add.graphics().setDepth(-100);
    this.ground = g;
    const roads = [5, 11, 23, 29];
    for (let x = -10; x < 47; x++)
      for (let y = -10; y < 47; y++) {
        const p = project(x, y),
          v = (((x * 17 + y * 31) % 7) + 7) % 7;
        const river = x >= 16 + Math.sin(y * 0.14) * 0.75 && x < 19 + Math.sin(y * 0.14) * 0.75;
        const road = roads.includes(x) || roads.includes(y);
        this.diamond(
          g,
          p.x,
          p.y,
          W + 1,
          H + 1,
          river
            ? 0x76b9bd
            : road
              ? 0xc1c0ac
              : [0xa9bc91, 0xabbf95, 0xa6b88b, 0xb3c399, 0xa7bd8e, 0xb4c69c, 0xaebf91][v],
        );
        if (road) {
          this.diamond(g, p.x, p.y, W, H, 0xc9c7b7);
          const roadW = roads.includes(x) ? 1 : 0;
          const line = (
            ax: number,
            ay: number,
            bx: number,
            by: number,
            width: number,
            color: number,
          ) => {
            const a = project(ax, ay),
              b = project(bx, by);
            g.lineStyle(width, color, 1).lineBetween(a.x, a.y, b.x, b.y);
          };
          if (roads.includes(x)) {
            line(x, y - 0.5, x, y + 0.5, 22, 0x687974);
            if (!roads.includes(y)) line(x, y - 0.28, x, y + 0.28, 1.3, 0xe7dfb9);
          }
          if (roads.includes(y)) {
            line(x - 0.5, y, x + 0.5, y, 22, 0x687974);
            if (!roads.includes(x)) line(x - 0.28, y, x + 0.28, y, 1.3, 0xe7dfb9);
          }
          if (roads.includes(x) && roads.includes(y)) {
            for (let i = -2; i <= 2; i++) {
              line(x - 0.55 + i * 0.08, y - 0.45, x - 0.55 + i * 0.08, y + 0.05, 2.2, 0xe8e6ce);
              line(x + 0.55 + i * 0.08, y - 0.05, x + 0.55 + i * 0.08, y + 0.45, 2.2, 0xe8e6ce);
            }
          }
          if (river) {
            line(x - 0.55, y - 0.43, x + 0.55, y - 0.43, 2, 0xf2e9d1);
            line(x - 0.55, y + 0.43, x + 0.55, y + 0.43, 2, 0xf2e9d1);
          }
          void roadW;
        } else if (river) {
          g.lineStyle(0.7, 0xc1e1d9, 0.36).lineBetween(p.x - 11, p.y - 2, p.x + 7, p.y - 2);
        }
      }
    // Civic promenade along the east bank.
    for (let y = 12; y <= 21; y++)
      for (let x = 20; x <= 25; x++) {
        const p = project(x, y);
        this.diamond(g, p.x, p.y, W, H, 0xd8d2b6);
        if ((x + y) % 3 === 0) {
          g.lineStyle(0.5, 0xc3b99c, 0.7).lineBetween(p.x - W / 2, p.y, p.x + W / 2, p.y);
        }
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
    const roads = [5, 11, 23, 29];
    for (let x = 1; x < 35; x += 2)
      for (let y = 1; y < 35; y += 2) {
        if (
          [
            { x: 27, y: 19 },
            { x: 25, y: 32 },
            { x: 29, y: 6 },
            { x: 23, y: 9 },
            { x: 32, y: 26 },
          ].some((l) => Math.hypot(x - l.x, y - l.y) < 2.7)
        )
          continue;
        if (
          roads.some((r) => Math.abs(x - r) < 1 || Math.abs(y - r) < 1) ||
          (x > 14 && x < 21) ||
          (x >= 20 && x <= 25 && y >= 12 && y <= 21)
        )
          continue;
        const p = project(x, y);
        const n = (x * 29 + y * 17) % 11;
        if (n < 2) {
          this.tree(x, y, 1.5, n === 1);
          this.tree(x + 0.6, y + 0.8, 1.1);
          continue;
        }
        const type = x < 14 ? (y > 20 ? 4 : 0) : y > 18 ? 1 : n % 3 === 0 ? 2 : 0;
        const s = this.add
          .image(p.x, p.y, 'architecture', String(type))
          .setOrigin(0.5, 0.85)
          .setDisplaySize(type === 1 ? 138 : 128, type === 1 ? 138 : 128)
          .setDepth((x + y) * 20);
        this.buildings.push(s);
      }
    for (const r of roads)
      for (let v = 0; v < 36; v += 1.8) {
        if (v > 15 && v < 20) continue;
        this.tree(r + 0.75, v, 0.65);
      }
    // Riverbank parks, flowers and paths.
    for (let y = 2; y < 35; y += 1.5) {
      this.tree(14.8, y, 0.85, y % 3 < 1);
      this.tree(20, y, 0.85);
    }
  }
  private makeLandmarks() {
    const landmarks = [
      { x: 23, y: 17, frame: 0, size: 200 },
      { x: 27, y: 19, frame: 1, size: 210 },
      { x: 25, y: 32, frame: 2, size: 205 },
      { x: 29, y: 6, frame: 3, size: 200 },
      { x: 23, y: 9, frame: 4, size: 168 },
      { x: 32, y: 26, frame: 5, size: 175 },
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
    for (let i = 0; i < 72; i++) {
      const person = i >= 28;
      const zone = i % 4;
      const x0 = zone % 2 === 0 ? 5 : 23,
        y0 = zone < 2 ? 5 : 23;
      const offset = person ? 0.63 : i % 2 ? 0.18 : -0.18;
      const path = [
        { x: x0 + offset, y: y0 + offset },
        { x: x0 + 6 + offset, y: y0 + offset },
        { x: x0 + 6 + offset, y: y0 + 6 + offset },
        { x: x0 + offset, y: y0 + 6 + offset },
      ];
      if (i % 2) path.reverse();
      const sprite = this.add
        .image(0, 0, `${person ? 'person' : 'car'}-0-${i % (person ? 4 : 5)}`)
        .setOrigin(0.5, 0.82);
      this.actors.push({
        sprite,
        path,
        progress: (i * 0.147) % 4,
        speed: person ? 0.1 : 0.27 + (i % 4) * 0.025,
        person,
      });
    }
  }
  update(_time: number, delta: number) {
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

    this.actors.forEach((a, i) => {
      if (!this.stopped && !this.reduced)
        a.progress = (a.progress + (Math.min(delta, 50) / 1000) * a.speed) % 4;
      const segment = Math.floor(a.progress),
        u = a.progress - segment,
        from = a.path[segment],
        to = a.path[(segment + 1) % 4];
      const x = from.x + (to.x - from.x) * u,
        y = from.y + (to.y - from.y) * u,
        p = project(x, y);
      a.sprite.setPosition(p.x, p.y).setDepth((x + y) * 20 + 5);
      const direction = to.x > from.x ? 0 : to.y > from.y ? 1 : to.x < from.x ? 2 : 3;
      a.sprite.setTexture(`${a.person ? 'person' : 'car'}-${direction}-${i % (a.person ? 4 : 5)}`);
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
    this.ground.setAlpha(night ? 0.7 : 1);
    this.cameras.main.setBackgroundColor(night ? '#263d49' : '#bac9ad');
    this.lamps.setVisible(night);
  }
  setPaused(paused: boolean) {
    this.stopped = paused;
  }
  zoomBy(amount: number) {
    const c = this.cameras.main;
    c.setZoom(Phaser.Math.Clamp(c.zoom + amount, 0.35, 1.65));
  }
  resetCamera() {
    const c = this.cameras.main;
    const base = project(18, 18);
    const zoom = Phaser.Math.Clamp(this.scale.width / 1900, 0.42, 0.92);
    c.setZoom(zoom);
    c.centerOn(
      base.x - (this.scale.width > 760 ? 70 : 0),
      base.y + (this.scale.width > 760 ? 245 : 185),
    );
  }
  focus(id: DistrictId) {
    if (!this.initialized) return;
    const d = CITY_DISTRICTS[id],
      p = project(d.x, d.y);
    this.cameras.main.pan(p.x - 110, p.y + 180, this.reduced ? 0 : 650, 'Sine.easeInOut');
    this.highlight(id);
  }
  applyPolicies(decisions: readonly Decision[]) {
    if (!this.initialized) return;
    const key = JSON.stringify(decisions);
    if (key === this.policyKey) return;
    this.policyKey = key;
    this.policyObjects.forEach((o) => o.destroy());
    this.policyObjects = [];
    decisions.forEach((choice, index) => {
      const m = MEASURES.find((m) => m.id === choice.measureId)!;
      const ids = choice.districtId ? [choice.districtId] : DISTRICTS.map((d) => d.id);
      ids.forEach((id) => {
        const d = CITY_DISTRICTS[id],
          x = d.x - 2 + index * 0.75,
          y = d.y + 1,
          p = project(x, y);
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
