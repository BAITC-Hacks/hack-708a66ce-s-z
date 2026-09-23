import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { Minus, Plus, LocateFixed } from 'lucide-react';
import { CityScene } from '../game/cityScene';
import { DISTRICTS, type DistrictId, type Lang } from '../game/data';
import type { Decision, Result } from '../game/engine';
import atlas from '../assets/building-atlas.png';
import landmarks from '../assets/landmark-atlas.png';
import fallbackArt from '../assets/astana-key-art.png';

export function PhaserCity({
  selected,
  onSelect,
  result,
  decisions,
  lang,
  night,
  paused,
}: {
  selected: DistrictId;
  onSelect: (id: DistrictId) => void;
  result: Result;
  decisions: Decision[];
  lang: Lang;
  night: boolean;
  paused: boolean;
}) {
  const lastSelected = useRef(selected);
  const host = useRef<HTMLDivElement>(null),
    scene = useRef<CityScene | null>(null),
    markers = useRef<Record<string, HTMLButtonElement | null>>({});
  const [failed, setFailed] = useState(false),
    [ready, setReady] = useState(false);
  const state = useRef({ onSelect, night, paused, decisions });
  state.current = { onSelect, night, paused, decisions };
  useEffect(() => {
    let game: Phaser.Game;
    const city = new CityScene(
      {
        select: (id) => state.current.onSelect(id),
        locate: (positions) => {
          for (const p of positions) {
            const marker = markers.current[p.id];
            if (marker)
              marker.style.transform = `translate(-50%, -50%) translate(${p.x}px, ${p.y}px)`;
          }
        },
        ready: () => {
          setReady(true);
          city.setNight(state.current.night);
          city.setPaused(state.current.paused);
          city.applyPolicies(state.current.decisions);
        },
      },
      atlas,
      landmarks,
    );
    scene.current = city;
    try {
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: host.current!,
        width: host.current!.clientWidth,
        height: host.current!.clientHeight,
        backgroundColor: '#bac9ad',
        antialias: true,
        roundPixels: false,
        scene: city,
        scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
        audio: { noAudio: true },
        render: { powerPreference: 'low-power' },
        fps: { target: 40, forceSetTimeOut: false },
        banner: false,
      });
    } catch {
      setFailed(true);
      return;
    }
    return () => {
      game.destroy(true);
      scene.current = null;
    };
  }, []);
  useEffect(() => {
    if (ready && lastSelected.current !== selected) scene.current?.focus(selected);
    else scene.current?.highlight(selected);
    lastSelected.current = selected;
  }, [selected, ready]);
  useEffect(() => {
    scene.current?.setNight(night);
  }, [night, ready]);
  useEffect(() => {
    scene.current?.setPaused(paused);
  }, [paused, ready]);
  useEffect(() => {
    scene.current?.applyPolicies(decisions);
  }, [decisions, ready]);
  return (
    <div className={`phaser-world city-map ${night ? 'world-night' : ''}`}>
      <div className="phaser-canvas" ref={host} />
      {failed && <img src={fallbackArt} className="fallback-art" alt="Astana isometric city" />}
      <div className="world-vignette" />
      <div className="world-districts">
        {DISTRICTS.map((d, i) => (
          <button
            ref={(el) => {
              markers.current[d.id] = el;
            }}
            key={d.id}
            className={`world-marker ${selected === d.id ? 'selected' : ''} ${result.districtScores[d.id] < 52 ? 'needs-care' : ''}`}
            onClick={() => onSelect(d.id)}
            style={failed ? { left: `${20 + i * 15}%`, top: `${40 + (i % 2) * 20}%` } : undefined}
          >
            <span className="marker-diamond" />
            <span>
              {d.name[lang]}
              <small>
                {result.districtScores[d.id].toFixed(1)}
                <i>
                  {lang === 'ru'
                    ? 'качество жизни'
                    : lang === 'kk'
                      ? 'өмір сапасы'
                      : 'quality of life'}
                </i>
              </small>
            </span>
          </button>
        ))}
      </div>
      <div className="world-tools">
        <button
          aria-label={lang === 'ru' ? 'Приблизить' : lang === 'kk' ? 'Үлкейту' : 'Zoom in'}
          onClick={() => scene.current?.zoomBy(0.12)}
        >
          <Plus size={18} />
        </button>
        <button
          aria-label={lang === 'ru' ? 'Отдалить' : lang === 'kk' ? 'Кішірейту' : 'Zoom out'}
          onClick={() => scene.current?.zoomBy(-0.12)}
        >
          <Minus size={18} />
        </button>
        <button
          aria-label={
            lang === 'ru'
              ? 'Вернуть карту'
              : lang === 'kk'
                ? 'Картаны қалпына келтіру'
                : 'Reset map'
          }
          onClick={() => scene.current?.resetCamera()}
        >
          <LocateFixed size={18} />
        </button>
      </div>
      <span className="world-credit">
        {lang === 'ru'
          ? 'Схематичная Астана. Синтетические данные.'
          : lang === 'kk'
            ? 'Сызбалық Астана. Синтетикалық деректер.'
            : 'Illustrative Astana. Synthetic data.'}
      </span>
      {!ready && !failed && (
        <div className="world-loading">
          <b>QALA</b>
          <span>
            {lang === 'ru'
              ? 'Город просыпается…'
              : lang === 'kk'
                ? 'Қала оянып жатыр…'
                : 'The city is waking up…'}
          </span>
          <i />
        </div>
      )}
    </div>
  );
}
