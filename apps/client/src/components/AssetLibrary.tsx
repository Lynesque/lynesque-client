import { useEffect, useMemo, useState } from 'react';
import { getAssets, mediaUrl } from '../api';
import type { AssetRecord } from '../types';

export type AssetSection = 'image' | 'gif' | 'video' | 'audio';

export const assetSection = (asset: AssetRecord): AssetSection => {
  if (asset.mime === 'image/gif') return 'gif';
  return asset.kind;
};

export function AssetLibrary({ apiBase, token, sections, onSelect, selectedId, title = 'Library' }: {
  apiBase: string;
  token: string;
  sections: AssetSection[];
  onSelect: (asset: AssetRecord) => void;
  selectedId?: string;
  title?: string;
}) {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [section, setSection] = useState<AssetSection>(sections[0]);
  const [status, setStatus] = useState('Loading saved assets...');

  useEffect(() => {
    let active = true;
    getAssets(apiBase, token).then((result) => {
      if (!active) return;
      setAssets(result.assets);
      setStatus('');
    }).catch((error) => active && setStatus(error instanceof Error ? error.message : 'Library failed to load.'));
    return () => { active = false; };
  }, [apiBase, token]);

  const visible = useMemo(() => assets.filter((asset) => assetSection(asset) === section), [assets, section]);

  return <section className="asset-library">
    <h3>{title}</h3>
    <div className="library-tabs">
      {sections.map((name) => <button type="button" className={section === name ? 'active' : ''} key={name} onClick={() => setSection(name)}>{name === 'gif' ? 'GIFs' : `${name[0].toUpperCase()}${name.slice(1)}`}</button>)}
    </div>
    {status && <p className="library-status">{status}</p>}
    {!status && visible.length === 0 && <p className="library-status">No saved {section === 'gif' ? 'GIFs' : `${section}s`} yet.</p>}
    <div className="library-grid">
      {visible.map((asset) => <button type="button" className={selectedId === asset.id ? 'library-item active' : 'library-item'} key={asset.id} title={asset.originalName} onClick={() => onSelect(asset)}>
        {asset.kind === 'image' ? <img src={mediaUrl(apiBase, asset.id)} alt="" loading="lazy" /> : asset.kind === 'video' ? <video src={mediaUrl(apiBase, asset.id)} muted playsInline preload="metadata" /> : <span className="audio-asset">♪</span>}
        <small>{asset.originalName}</small>
      </button>)}
    </div>
  </section>;
}
