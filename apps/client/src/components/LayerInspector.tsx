import type { SceneLayer } from '../types';
import { EmojiButton } from './CustomEmoji';

interface Props {
  layer: SceneLayer | null;
  endpoint: 0 | 1;
  onEndpoint: (endpoint: 0 | 1) => void;
  onChange: (layer: SceneLayer) => void;
  onDelete: () => void;
  apiBase: string;
}

const num = (value: string) => Number.isFinite(Number(value)) ? Number(value) : 0;

export function LayerInspector({ layer, endpoint, onEndpoint, onChange, onDelete,apiBase }: Props) {
  if (!layer) return <div className="inspector empty">Select a layer.</div>;
  const frame = layer.keyframes[endpoint];

  const patchFrame = (patch: Partial<typeof frame>) => {
    const frames = [...layer.keyframes] as [typeof frame, typeof frame];
    frames[endpoint] = { ...frame, ...patch };
    onChange({ ...layer, keyframes: frames } as SceneLayer);
  };
  const syncFrame=(key:keyof typeof frame)=>{const frames=[...layer.keyframes] as [typeof frame,typeof frame];frames[endpoint===0?1:0]={...frames[endpoint===0?1:0],[key]:frames[endpoint][key]};onChange({...layer,keyframes:frames} as SceneLayer);};
  const field=(label:string,key:'x'|'y'|'width'|'height'|'rotation'|'opacity',options:{min?:number;max?:number;step:number})=><label className="sync-field"><span>{label}<button type="button" title={`Copy ${label} to the ${endpoint===0?'end':'start'} transform`} onClick={()=>syncFrame(key)}>Sync</button></span><input type="number" min={options.min} max={options.max} step={options.step} value={key==='rotation'?Math.round(frame[key]||0):(frame[key]??1).toFixed(2)} onChange={(e)=>patchFrame({[key]:num(e.target.value)})}/></label>;

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
          <label>Text<span className="field-with-emoji"><textarea value={layer.text} onChange={(e) => onChange({ ...layer, text: e.target.value })} /><EmojiButton apiBase={apiBase} onInsert={(code)=>onChange({...layer,text:`${layer.text}${code}`})}/></span></label>
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
        {field('X','x',{step:.01})}{field('Y','y',{step:.01})}{field('Width','width',{min:.01,step:.01})}{field('Height','height',{min:.01,step:.01})}{field('Rotation','rotation',{step:1})}{field('Opacity','opacity',{min:0,max:1,step:.05})}
      </div>
      <p className="hint">Drag the layer in the preview to move whichever transform endpoint is selected.</p>
    </div>
  );
}
