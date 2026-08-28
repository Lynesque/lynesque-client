import { useEffect, useMemo, useRef } from 'react';
import { mediaUrl } from '../api';
import type { AssetLayer, Scene, SceneLayer, TransformKeyframe } from '../types';

interface Props {
  scene: Scene;
  time: number;
  playing: boolean;
  apiBase: string;
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

function TimedVideo({ layer, src, time, playing }: { layer: AssetLayer; src: string; time: number; playing: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const local = Math.max(0, time - layer.start);
    const duration = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 0;
    const desired = duration ? local % duration : local;
    if (Math.abs((el.currentTime || 0) - desired) > 0.2) {
      try { el.currentTime = desired; } catch (_) {}
    }
    el.muted = Boolean(layer.muted);
    if (playing) el.play().catch(() => {});
    else el.pause();
  }, [time, playing, layer.start, layer.muted]);
  return <video ref={ref} src={src} playsInline preload="metadata" />;
}

function TimedAudio({ layer, src, time, playing }: { layer: AssetLayer; src: string; time: number; playing: boolean }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const active = time >= layer.start && time <= layer.end;
    const local = Math.max(0, time - layer.start);
    const duration = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 0;
    const desired = duration ? local % duration : local;
    if (Math.abs((el.currentTime || 0) - desired) > 0.2) {
      try { el.currentTime = desired; } catch (_) {}
    }
    if (playing && active) el.play().catch(() => {});
    else el.pause();
  }, [time, playing, layer.start, layer.end]);
  return <audio ref={ref} src={src} preload="metadata" />;
}

export function SceneCanvas({ scene, time, playing, apiBase, selectedLayerId, editingEndpoint = 0, onSelect, onMoveEndpoint }: Props) {
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
        <TimedAudio key={layer.id} layer={layer as AssetLayer} src={mediaUrl(apiBase, (layer as AssetLayer).assetId)} time={time} playing={playing} />
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
              >{layer.text}</div>
            ) : layer.assetKind === 'video' ? (
              <TimedVideo layer={layer} src={mediaUrl(apiBase, layer.assetId)} time={time} playing={playing} />
            ) : (
              <img src={mediaUrl(apiBase, layer.assetId)} draggable={false} />
            )}
          </div>
        );
      })}
    </div>
  );
}
