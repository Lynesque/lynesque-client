import { useMemo, useRef, useState } from 'react';
import { createPost, uploadAsset } from '../api';
import { useTimeline } from '../useTimeline';
import type { AssetRecord, Scene, SceneLayer, TransformKeyframe,User } from '../types';
import { LayerInspector } from './LayerInspector';
import { AssetLibrary } from './AssetLibrary';
import { SceneCanvas } from './SceneCanvas';

interface Props {
  apiBase: string;
  token: string;
  user:User;
  onPosted: (pending:boolean) => void;
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
const MAX_ASSET_LAYERS = 20;

export function Composer({ apiBase, token, user, onPosted }: Props) {
  const [scene, setScene] = useState<Scene>({ version: 1, duration: 7, background: '#000000', layers: [] });
  const [assets, setAssets] = useState<Record<string, AssetRecord>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [endpoint, setEndpoint] = useState<0 | 1>(0);
  const [status, setStatus] = useState('');
  const [libraryVisible, setLibraryVisible] = useState(false);
  const [title, setTitle] = useState('');
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
    if (scene.layers.filter((layer) => layer.kind === 'asset').length >= MAX_ASSET_LAYERS) {
      setStatus(`A video can contain at most ${MAX_ASSET_LAYERS} asset layers.`);
      return false;
    }
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
    return true;
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    let assetCount = scene.layers.filter((layer) => layer.kind === 'asset').length;
    for (const file of [...files]) {
      if (assetCount >= MAX_ASSET_LAYERS) { setStatus(`Only the first ${MAX_ASSET_LAYERS} asset layers were added.`); break; }
      const displayName = window.prompt('Name this asset so people can find it in the library:', file.name.replace(/\.[^.]+$/, '') || file.name);
      if (displayName === null) continue;
      if (!displayName.trim()) { setStatus(`${file.name} was skipped because its name was empty.`); continue; }
      setStatus(`Uploading ${displayName.trim()}...`);
      try {
        const { asset, deduplicated,pending,message } = await uploadAsset(apiBase, token, file, displayName.trim());
        if (!addAssetLayer(asset)) break;
        assetCount += 1;
        setStatus(message||(deduplicated ? `${displayName.trim()} already existed; reused the stored copy.` : pending?`${displayName.trim()} is awaiting admin review.`:`${displayName.trim()} uploaded.`));
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Upload failed.');
      }
    }
    if (fileInput.current) fileInput.current.value = '';
  };

  const moveLayer = (id: string, direction: -1 | 1) => setScene((current) => {
    const layers = [...current.layers];
    const index = layers.findIndex((layer) => layer.id === id);
    const destination = index + direction;
    if (index < 0 || destination < 0 || destination >= layers.length) return current;
    [layers[index], layers[destination]] = [layers[destination], layers[index]];
    return { ...current, layers };
  });

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
      const result=await createPost(apiBase, token, scene, title || 'New Video');
      setStatus(result.message||(result.pending?'Video sent for admin review.':'Video published.'));
      setScene({ version: 1, duration: 7, background: '#000000', layers: [] });
      setTitle('');
      setSelectedId(null);
      timeline.seek(0);
      timeline.setPlaying(false);
      onPosted(Boolean(result.pending));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Post failed.');
    }
  };

  return (
    <div className="composer-layout">
      <section className="composer-left panel">
        {user.accountStatus==='unverified'&&<div className="review-notice">Your account is unverified. Assets and videos you upload are private and sent to admins for review. Approval verifies your account; denial deletes the reviewed item.</div>}
        <div className="composer-toolbar">
          <input ref={fileInput} hidden multiple type="file" accept="image/*,video/*,audio/*" onChange={(e) => onFiles(e.target.files)} />
          <button onClick={() => fileInput.current?.click()}>Add media</button>
          <button className={libraryVisible ? 'active' : ''} onClick={() => setLibraryVisible((visible) => !visible)}>Library</button>
          <button onClick={addText}>Add text</button>
          <span className="asset-count">Assets {scene.layers.filter((layer)=>layer.kind==='asset').length}/{MAX_ASSET_LAYERS}</span>
          <label className="background">BG <input type="color" value={scene.background || '#000000'} onChange={(e) => setScene((current) => ({ ...current, background: e.target.value }))} /></label>
          <input className="video-title" value={title} maxLength={180} onChange={(event) => setTitle(event.target.value)} placeholder="Video title — #hashtags and @people work" />
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
        {libraryVisible && <AssetLibrary apiBase={apiBase} token={token} isAdmin={user.isAdmin} viewer={user} allowPending sections={['image', 'gif', 'video', 'audio']} title="Saved assets" onSelect={(asset) => { if(addAssetLayer(asset))setStatus(`${asset.originalName} added from the library.`); }} />}
        <h3>Layers</h3>
        <div className="layer-list">
          {[...hydratedScene.layers].reverse().map((layer) => {
            const index = hydratedScene.layers.findIndex((item) => item.id === layer.id);
            return <div className="layer-row" key={layer.id}>
              <button className={layer.id === selectedId ? 'active layer-name' : 'layer-name'} onClick={() => setSelectedId(layer.id)}>{layer.kind === 'text' ? `Text: ${layer.text.slice(0, 24)}` : assets[layer.assetId]?.originalName || layer.assetKind || 'media'}</button>
              <button disabled={index === hydratedScene.layers.length - 1} title="Bring layer forward" aria-label="Bring layer forward" onClick={() => moveLayer(layer.id, 1)}>↑</button>
              <button disabled={index === 0} title="Send layer backward" aria-label="Send layer backward" onClick={() => moveLayer(layer.id, -1)}>↓</button>
            </div>;
          })}
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
