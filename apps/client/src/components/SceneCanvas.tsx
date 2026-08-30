import { useEffect, useMemo, useRef } from 'react';
import { mediaUrl } from '../api';
import type { AssetLayer, Scene, SceneLayer, TransformKeyframe } from '../types';
import { limitMedia, resumeLimitedAudio } from '../audioLimiter';
import { useVolume } from '../volume';
import { RichText } from './CustomEmoji';

interface Props {
  scene: Scene;
  time: number;
  playing: boolean;
  apiBase: string;
  forceMuted?: boolean;
  selectedLayerId?: string | null;
  editingEndpoint?: 0 | 1;
  onSelect?: (id: string) => void;
  onMoveEndpoint?: (id: string, endpoint: 0 | 1, x: number, y: number) => void;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function transformAt(layer: SceneLayer, time: number): TransformKeyframe {
  const [a, b] = layer.keyframes;
  const span = Math.max(0.001, layer.end - layer.start);
  const t = Math.max(0, Math.min(1, (time - layer.start) / span));
  return {
    time,
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    width: lerp(a.width, b.width, t),
    height: lerp(a.height, b.height, t),
    rotation: lerp(a.rotation, b.rotation, t),
    opacity: lerp(a.opacity ?? 1, b.opacity ?? 1, t)
  };
}

function TimedVideo({ layer, src, time, playing, volume }: { layer: AssetLayer; src: string; time: number; playing: boolean; volume: number }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    limitMedia(el);
    el.volume = Math.max(0,Math.min(1,volume*(layer.volume??1)));
    const local = Math.max(0, time - layer.start);
    const duration = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 0;
    const sourceStart=Math.min(duration||86_400,Math.max(0,layer.sourceStart??0));
    const sourceEnd=Math.min(duration||86_400,Math.max(sourceStart,layer.sourceEnd??(duration||86_400)));
    const sourceDuration=Math.max(.05,sourceEnd-sourceStart);
    const desired=sourceStart+(local%sourceDuration);
    if (Math.abs((el.currentTime || 0) - desired) > 0.2) {
      try { el.currentTime = desired; } catch (_) {}
    }
    el.muted = Boolean(layer.muted);
    if (playing) { resumeLimitedAudio(); el.play().catch(() => {}); }
    else el.pause();
  }, [time, playing, layer.start, layer.muted, layer.volume,layer.sourceStart,layer.sourceEnd,volume]);
  return <video ref={ref} src={src} crossOrigin="anonymous" playsInline preload="metadata" />;
}

function TimedAudio({ layer, src, time, playing, volume }: { layer: AssetLayer; src: string; time: number; playing: boolean; volume: number }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    limitMedia(el);
    el.volume = Math.max(0,Math.min(1,volume*(layer.volume??1)));
    const active = time >= layer.start && time <= layer.end;
    const local = Math.max(0, time - layer.start);
    const duration = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 0;
    const sourceStart=Math.min(duration||86_400,Math.max(0,layer.sourceStart??0));
    const sourceEnd=Math.min(duration||86_400,Math.max(sourceStart,layer.sourceEnd??(duration||86_400)));
    const sourceDuration=Math.max(.05,sourceEnd-sourceStart);
    const desired=sourceStart+(local%sourceDuration);
    if (Math.abs((el.currentTime || 0) - desired) > 0.2) {
      try { el.currentTime = desired; } catch (_) {}
    }
    if (playing && active) { resumeLimitedAudio(); el.play().catch(() => {}); }
    else el.pause();
  }, [time, playing, layer.start, layer.end,layer.volume,layer.sourceStart,layer.sourceEnd, volume]);
  return <audio ref={ref} src={src} crossOrigin="anonymous" preload="metadata" />;
}

export function SceneCanvas({ scene, time, playing, apiBase, forceMuted=false, selectedLayerId, editingEndpoint = 0, onSelect, onMoveEndpoint }: Props) {
  const masterVolume = useVolume();
  const volume=forceMuted?0:masterVolume;
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLayers = useMemo(() => scene.layers.filter((layer) => time >= layer.start && time <= layer.end), [scene.layers, time]);

  const startDrag = (event: React.PointerEvent, layer: SceneLayer) => {
    if (!onMoveEndpoint || !containerRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    onSelect?.(layer.id);
    const rect = containerRef.current.getBoundingClientRect();
    const pointerId = event.pointerId;
    (event.currentTarget as HTMLElement).setPointerCapture(pointerId);

    const move = (moveEvent: PointerEvent) => {
      onMoveEndpoint(
        layer.id,
        editingEndpoint,
        (moveEvent.clientX - rect.left) / rect.width,
        (moveEvent.clientY - rect.top) / rect.height
      );
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div ref={containerRef} className="scene-canvas" style={{ background: scene.background || '#000' }}>
      {scene.layers.filter((layer) => layer.kind === 'asset' && layer.assetKind === 'audio').map((layer) => (
        <TimedAudio key={layer.id} layer={layer as AssetLayer} src={mediaUrl(apiBase, (layer as AssetLayer).assetId)} time={time} playing={playing} volume={volume} />
      ))}
      {activeLayers.filter((layer) => !(layer.kind === 'asset' && layer.assetKind === 'audio')).map((layer) => {
        const frame = transformAt(layer, time);
        const style: React.CSSProperties = {
          left: `${frame.x * 100}%`,
          top: `${frame.y * 100}%`,
          width: `${frame.width * 100}%`,
          height: `${frame.height * 100}%`,
          opacity: frame.opacity,
          transform: `translate(-50%, -50%) rotate(${frame.rotation}deg)`,
          zIndex: scene.layers.indexOf(layer) + 1
        };
        const selected = layer.id === selectedLayerId;
        return (
          <div
            key={layer.id}
            className={`scene-layer ${selected ? 'selected' : ''}`}
            style={style}
            onPointerDown={(event) => startDrag(event, layer)}
            onClick={() => onSelect?.(layer.id)}
          >
            {layer.kind === 'text' ? (
              <div
                className="text-layer"
                style={{
                  fontSize: `${layer.fontSize}px`,
                  fontFamily: layer.fontFamily || 'Arial',
                  fontWeight: layer.fontWeight || 700,
                  textAlign: layer.align || 'center'
                }}
              ><RichText apiBase={apiBase} text={layer.text}/></div>
            ) : layer.assetKind === 'video' ? (
              <TimedVideo layer={layer} src={mediaUrl(apiBase, layer.assetId)} time={time} playing={playing} volume={volume} />
            ) : (
              <img src={mediaUrl(apiBase, layer.assetId)} draggable={false} />
            )}
          </div>
        );
      })}
    </div>
  );
}
