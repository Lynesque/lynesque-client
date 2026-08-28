import type { SceneLayer } from '../types';

interface Props {
  layer: SceneLayer | null;
  endpoint: 0 | 1;
  onEndpoint: (endpoint: 0 | 1) => void;
  onChange: (layer: SceneLayer) => void;
  onDelete: () => void;
}

const num = (value: string) => Number.isFinite(Number(value)) ? Number(value) : 0;

export function LayerInspector({ layer, endpoint, onEndpoint, onChange, onDelete }: Props) {
  if (!layer) return <div className="inspector empty">Select a layer.</div>;
  const frame = layer.keyframes[endpoint];

  const patchFrame = (patch: Partial<typeof frame>) => {
    const frames = [...layer.keyframes] as [typeof frame, typeof frame];
    frames[endpoint] = { ...frame, ...patch };
    onChange({ ...layer, keyframes: frames } as SceneLayer);
  };

  const patchTiming = (start: number, end: number) => {
    const cleanStart = Math.max(0, Math.min(7, start));
    const cleanEnd = Math.max(cleanStart, Math.min(7, end));
    const frames = [...layer.keyframes] as [typeof frame, typeof frame];
    frames[0] = { ...frames[0], time: cleanStart };
    frames[1] = { ...frames[1], time: cleanEnd };
    onChange({ ...layer, start: cleanStart, end: cleanEnd, keyframes: frames } as SceneLayer);
  };

  return (
    <div className="inspector">
      <div className="inspector-title">
        <strong>{layer.kind === 'text' ? 'Text' : layer.assetKind || 'Asset'}</strong>
        <button className="danger" onClick={onDelete}>Delete</button>
      </div>

      {layer.kind === 'text' && (
        <>
          <label>Text<textarea value={layer.text} onChange={(e) => onChange({ ...layer, text: e.target.value })} /></label>
          <label>Font size<input type="number" min="8" max="240" value={layer.fontSize} onChange={(e) => onChange({ ...layer, fontSize: num(e.target.value) })} /></label>
        </>
      )}

      {layer.kind === 'asset' && layer.assetKind === 'video' && (
        <label className="check"><input type="checkbox" checked={Boolean(layer.muted)} onChange={(e) => onChange({ ...layer, muted: e.target.checked })} /> Mute inserted video</label>
      )}

      <div className="two-col">
        <label>Start<input type="number" min="0" max="7" step="0.1" value={layer.start} onChange={(e) => patchTiming(num(e.target.value), layer.end)} /></label>
        <label>End<input type="number" min="0" max="7" step="0.1" value={layer.end} onChange={(e) => patchTiming(layer.start, num(e.target.value))} /></label>
      </div>

      <div className="endpoint-toggle">
        <button className={endpoint === 0 ? 'active' : ''} onClick={() => onEndpoint(0)}>Start transform</button>
        <button className={endpoint === 1 ? 'active' : ''} onClick={() => onEndpoint(1)}>End transform</button>
      </div>

      <div className="two-col">
        <label>X<input type="number" step="0.01" value={frame.x.toFixed(2)} onChange={(e) => patchFrame({ x: num(e.target.value) })} /></label>
        <label>Y<input type="number" step="0.01" value={frame.y.toFixed(2)} onChange={(e) => patchFrame({ y: num(e.target.value) })} /></label>
        <label>Width<input type="number" min="0.01" step="0.01" value={frame.width.toFixed(2)} onChange={(e) => patchFrame({ width: num(e.target.value) })} /></label>
        <label>Height<input type="number" min="0.01" step="0.01" value={frame.height.toFixed(2)} onChange={(e) => patchFrame({ height: num(e.target.value) })} /></label>
        <label>Rotation<input type="number" step="1" value={Math.round(frame.rotation)} onChange={(e) => patchFrame({ rotation: num(e.target.value) })} /></label>
        <label>Opacity<input type="number" min="0" max="1" step="0.05" value={(frame.opacity ?? 1).toFixed(2)} onChange={(e) => patchFrame({ opacity: num(e.target.value) })} /></label>
      </div>
      <p className="hint">Drag the layer in the preview to move whichever transform endpoint is selected.</p>
    </div>
  );
}
