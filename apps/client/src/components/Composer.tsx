import { useMemo, useRef, useState } from 'react';
import { createPost, uploadAsset } from '../api';
import { useTimeline } from '../useTimeline';
import type { AssetRecord, Scene, SceneLayer, TransformKeyframe } from '../types';
import { LayerInspector } from './LayerInspector';
import { AssetLibrary } from './AssetLibrary';
import { SceneCanvas } from './SceneCanvas';

interface Props {
  apiBase: string;
  token: string;
  onPosted: () => void;
}

const baseFrame = (time: number): TransformKeyframe => ({
  time,
  x: 0.5,
  y: 0.5,
  width: 0.75,
  height: 0.55,
  rotation: 0,
  opacity: 1
});

export function Composer({ apiBase, token, onPosted }: Props) {
  const [scene, setScene] = useState<Scene>({ version: 1, duration: 7, background: '#000000', layers: [] });
  const [assets, setAssets] = useState<Record<string, AssetRecord>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [endpoint, setEndpoint] = useState<0 | 1>(0);
  const [status, setStatus] = useState('');
  const [libraryVisible, setLibraryVisible] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const timeline = useTimeline(7);

  const hydratedScene = useMemo<Scene>(() => ({
    ...scene,
    layers: scene.layers.map((layer) => layer.kind === 'asset' ? {
      ...layer,
      assetKind: assets[layer.assetId]?.kind || layer.assetKind,
      mime: assets[layer.assetId]?.mime || layer.mime
    } : layer)
  }), [scene, assets]);
  const selected = hydratedScene.layers.find((layer) => layer.id === selectedId) || null;

  const replaceLayer = (next: SceneLayer) => {
    setScene((current) => ({ ...current, layers: current.layers.map((layer) => layer.id === next.id ? next : layer) }));
  };

  const addAssetLayer = (asset: AssetRecord) => {
    setAssets((current) => ({ ...current, [asset.id]: asset }));
    const id = crypto.randomUUID();
    const layer: SceneLayer = {
      id,
      kind: 'asset',
      assetId: asset.id,
      assetKind: asset.kind,
      mime: asset.mime,
      start: 0,
      end: 7,
      muted: asset.kind === 'video' ? false : undefined,
      keyframes: [baseFrame(0), baseFrame(7)]
    };
    if (asset.kind === 'audio') {
      layer.keyframes[0] = { ...layer.keyframes[0], width: 0.01, height: 0.01 };
      layer.keyframes[1] = { ...layer.keyframes[1], width: 0.01, height: 0.01 };
    }
    setScene((current) => ({ ...current, layers: [...current.layers, layer] }));
    setSelectedId(id);
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const file of [...files]) {
      setStatus(`Uploading ${file.name}...`);
      try {
        const { asset, deduplicated } = await uploadAsset(apiBase, token, file);
        addAssetLayer(asset);
        setStatus(deduplicated ? `${file.name} already existed; reused the stored copy.` : `${file.name} uploaded.`);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Upload failed.');
      }
    }
    if (fileInput.current) fileInput.current.value = '';
  };

  const addText = () => {
    const id = crypto.randomUUID();
    const layer: SceneLayer = {
      id,
      kind: 'text',
      text: 'Sample text',
      start: 0,
      end: 7,
      fontSize: 42,
      fontWeight: 800,
      align: 'center',
      keyframes: [
        { ...baseFrame(0), width: 0.85, height: 0.25 },
        { ...baseFrame(7), width: 0.85, height: 0.25 }
      ]
    };
    setScene((current) => ({ ...current, layers: [...current.layers, layer] }));
    setSelectedId(id);
  };

  const moveEndpoint = (id: string, which: 0 | 1, x: number, y: number) => {
    const target = scene.layers.find((layer) => layer.id === id);
    if (!target) return;
    const frames = [...target.keyframes] as [TransformKeyframe, TransformKeyframe];
    frames[which] = { ...frames[which], x, y };
    replaceLayer({ ...target, keyframes: frames } as SceneLayer);
  };

  const publish = async () => {
    if (!scene.layers.length) return setStatus('Put something in the video first.');
    setStatus('Posting...');
    try {
      await createPost(apiBase, token, scene);
      setStatus('Video published.');
      setScene({ version: 1, duration: 7, background: '#000000', layers: [] });
      setSelectedId(null);
      timeline.seek(0);
      timeline.setPlaying(false);
      onPosted();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Post failed.');
    }
  };

  return (
    <div className="composer-layout">
      <section className="composer-left panel">
        <div className="composer-toolbar">
          <input ref={fileInput} hidden multiple type="file" accept="image/*,video/*,audio/*" onChange={(e) => onFiles(e.target.files)} />
          <button onClick={() => fileInput.current?.click()}>Add media</button>
          <button className={libraryVisible ? 'active' : ''} onClick={() => setLibraryVisible((visible) => !visible)}>Library</button>
          <button onClick={addText}>Add text</button>
          <label className="background">BG <input type="color" value={scene.background || '#000000'} onChange={(e) => setScene((current) => ({ ...current, background: e.target.value }))} /></label>
          <button className="primary" onClick={publish}>Publish video</button>
        </div>

        <div className="preview-wrap">
          <SceneCanvas
            scene={hydratedScene}
            time={timeline.time}
            playing={timeline.playing}
            apiBase={apiBase}
            selectedLayerId={selectedId}
            editingEndpoint={endpoint}
            onSelect={setSelectedId}
            onMoveEndpoint={moveEndpoint}
          />
        </div>

        <div className="timeline-controls">
          <button onClick={() => timeline.setPlaying(!timeline.playing)}>{timeline.playing ? 'Pause' : 'Play'}</button>
          <input type="range" min="0" max="7" step="0.01" value={timeline.time} onChange={(e) => timeline.seek(Number(e.target.value))} />
          <span>{timeline.time.toFixed(2)} / 7.00s</span>
        </div>
        <div className="timeline-strip">
          {hydratedScene.layers.map((layer) => (
            <button
              key={layer.id}
              className={`timeline-layer ${layer.id === selectedId ? 'active' : ''}`}
              style={{ marginLeft: `${(layer.start / 7) * 100}%`, width: `${Math.max(2, ((layer.end - layer.start) / 7) * 100)}%` }}
              onClick={() => setSelectedId(layer.id)}
              title={`${layer.start.toFixed(1)}s–${layer.end.toFixed(1)}s`}
            >{layer.kind === 'text' ? `T: ${layer.text.slice(0, 18)}` : assets[layer.assetId]?.originalName || layer.assetKind || 'media'}</button>
          ))}
        </div>
        {status && <div className="status">{status}</div>}
      </section>

      <aside className="panel composer-right">
        {libraryVisible && <AssetLibrary apiBase={apiBase} token={token} sections={['image', 'gif', 'video', 'audio']} title="Saved assets" onSelect={(asset) => { addAssetLayer(asset); setStatus(`${asset.originalName} added from the library.`); }} />}
        <h3>Layers</h3>
        <div className="layer-list">
          {[...hydratedScene.layers].reverse().map((layer) => (
            <button key={layer.id} className={layer.id === selectedId ? 'active' : ''} onClick={() => setSelectedId(layer.id)}>
              {layer.kind === 'text' ? `Text: ${layer.text.slice(0, 24)}` : assets[layer.assetId]?.originalName || layer.assetKind || 'media'}
            </button>
          ))}
        </div>
        <LayerInspector
          layer={selected}
          endpoint={endpoint}
          onEndpoint={(next) => {
            setEndpoint(next);
            if (selected) timeline.seek(next === 0 ? selected.start : selected.end);
          }}
          onChange={replaceLayer}
          onDelete={() => {
            if (!selected) return;
            setScene((current) => ({ ...current, layers: current.layers.filter((layer) => layer.id !== selected.id) }));
            setSelectedId(null);
          }}
        />
      </aside>
    </div>
  );
}
