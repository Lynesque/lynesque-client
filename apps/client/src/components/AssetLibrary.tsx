import { useEffect, useMemo, useState } from 'react';
import { adminDeleteAsset, getAssets, mediaUrl } from '../api';
import type { AssetRecord } from '../types';
import { AdminMenu } from './AdminMenu';

export type AssetSection = 'image' | 'gif' | 'video' | 'audio';

export const assetSection = (asset: AssetRecord): AssetSection => {
  if (asset.mime === 'image/gif') return 'gif';
  return asset.kind;
};

export function AssetLibrary({ apiBase, token, sections, onSelect, selectedId, title = 'Library', isAdmin = false }: {
  apiBase: string;
  token: string;
  sections: AssetSection[];
  onSelect: (asset: AssetRecord) => void;
  selectedId?: string;
  title?: string;
  isAdmin?: boolean;
}) {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [section, setSection] = useState<AssetSection>(sections[0]);
  const [status, setStatus] = useState('Loading saved assets...');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    getAssets(apiBase, token).then((result) => {
      if (!active) return;
      setAssets(result.assets);
      setStatus('');
    }).catch((error) => active && setStatus(error instanceof Error ? error.message : 'Library failed to load.'));
    return () => { active = false; };
  }, [apiBase, token]);

  const visible = useMemo(() => assets.filter((asset) => assetSection(asset) === section && (!query.trim() || asset.originalName.toLowerCase().includes(query.trim().toLowerCase()) || asset.id.toLowerCase().includes(query.trim().toLowerCase()))), [assets, section, query]);

  return <section className="asset-library">
    <h3>{title}</h3>
    <input className="library-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search saved assets" />
    <div className="library-tabs">
      {sections.map((name) => <button type="button" className={section === name ? 'active' : ''} key={name} onClick={() => setSection(name)}>{name === 'gif' ? 'GIFs' : `${name[0].toUpperCase()}${name.slice(1)}`}</button>)}
    </div>
    {status && <p className="library-status">{status}</p>}
    {!status && visible.length === 0 && <p className="library-status">No saved {section === 'gif' ? 'GIFs' : `${section}s`} yet.</p>}
    <div className="library-grid">
      {visible.map((asset) => <div className="library-card" key={asset.id}>
        <button type="button" className={selectedId === asset.id ? 'library-item active' : 'library-item'} title={asset.originalName} onClick={() => onSelect(asset)}>
          {asset.kind === 'image' ? <img src={mediaUrl(apiBase, asset.id)} alt="" loading="lazy" /> : asset.kind === 'video' ? <video src={mediaUrl(apiBase, asset.id)} muted playsInline preload="metadata" /> : <span className="audio-asset">♪</span>}
          <small>{asset.originalName}</small>
        </button>
        {isAdmin && <AdminMenu label={`Moderate ${asset.originalName}`} onDelete={async () => {
          if (!window.confirm(`Delete “${asset.originalName}”? Videos, posts, comments, and avatars using it will also be taken down.`)) return;
          const reason = window.prompt('Reason shown to affected users and saved in the admin log:', 'Removed directly by an admin.');
          if (reason === null) return;
          try { await adminDeleteAsset(apiBase, token, asset.id, reason); setAssets((items) => items.filter((item) => item.id !== asset.id)); setStatus('Asset deleted.'); }
          catch (error) { setStatus(error instanceof Error ? error.message : 'Asset deletion failed.'); }
        }} />}
      </div>)}
    </div>
  </section>;
}
