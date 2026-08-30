import { useEffect, useMemo, useState } from 'react';
import { adminDeleteAsset, createReport, getAssets, mediaUrl } from '../api';
import type { AssetRecord,User } from '../types';
import { AdminMenu } from './AdminMenu';

export type AssetSection = 'image' | 'gif' | 'video' | 'audio';

export const assetSection = (asset: AssetRecord): AssetSection => {
  if (asset.mime === 'image/gif') return 'gif';
  return asset.kind;
};

export function AssetLibrary({ apiBase, token, sections, onSelect, selectedId, title = 'Library', isAdmin = false,viewer,allowPending=false,allowPrivate=false }: {
  apiBase: string;
  token: string;
  sections: AssetSection[];
  onSelect: (asset: AssetRecord) => void;
  selectedId?: string;
  title?: string;
  isAdmin?: boolean;
  viewer?:User;
  allowPending?:boolean;
  allowPrivate?:boolean;
}) {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [section, setSection] = useState<AssetSection>(sections[0]);
  const [status, setStatus] = useState('Loading saved assets...');
  const [query, setQuery] = useState('');
  const [hasMore,setHasMore]=useState(false);const [loadingMore,setLoadingMore]=useState(false);

  useEffect(() => {
    let active = true;
    setStatus('Loading saved assets...');
    const timer=window.setTimeout(()=>getAssets(apiBase, token,0,36,query,section).then((result) => {
      if (!active) return;
      setAssets(result.assets);
      setHasMore(result.hasMore);
      setStatus('');
    }).catch((error) => active && setStatus(error instanceof Error ? error.message : 'Library failed to load.')),200);
    return () => { active = false;window.clearTimeout(timer); };
  }, [apiBase, token,query,section]);

  const visible = useMemo(() => assets.filter((asset) => assetSection(asset) === section&&(allowPending||asset.moderationStatus!=='pending')&&(allowPrivate||asset.visibility!=='private')), [assets, section,allowPending,allowPrivate]);
  const more=async()=>{if(!hasMore||loadingMore)return;setLoadingMore(true);try{const result=await getAssets(apiBase,token,assets.length,36,query,section);setAssets((items)=>[...items,...result.assets.filter((asset)=>!items.some((item)=>item.id===asset.id))]);setHasMore(result.hasMore);}finally{setLoadingMore(false);}};

  return <section className="asset-library">
    <h3>{title}</h3>
    <input className="library-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search saved assets" />
    <div className="library-tabs">
      {sections.map((name) => <button type="button" className={section === name ? 'active' : ''} key={name} onClick={() => setSection(name)}>{name === 'gif' ? 'GIFs' : `${name[0].toUpperCase()}${name.slice(1)}`}</button>)}
    </div>
    {status && <p className="library-status">{status}</p>}
    {!status && visible.length === 0 && <p className="library-status">No saved {section === 'gif' ? 'GIFs' : `${section}s`} yet.</p>}
    <div className="library-grid" onScroll={(event)=>{const node=event.currentTarget;if(node.scrollTop+node.clientHeight>=node.scrollHeight-40)void more();}}>
      {visible.map((asset) => <div className="library-card" key={asset.id}>
        <button type="button" className={selectedId === asset.id ? 'library-item active' : 'library-item'} title={asset.originalName} onClick={() => onSelect(asset)}>
          {asset.kind === 'image' ? <img src={mediaUrl(apiBase, asset.id)} alt="" loading="lazy" /> : asset.kind === 'video' ? <video src={mediaUrl(apiBase, asset.id)} muted playsInline preload="metadata" /> : <span className="audio-asset">♪</span>}
          <small>{asset.originalName}</small>
          {asset.moderationStatus==='pending'&&<small className="pending-label">Awaiting review</small>}
          {asset.visibility==='private'&&<small className="private-label">Private</small>}
        </button>
        <AdminMenu label={`Options for ${asset.originalName}`} onReport={!isAdmin&&viewer?.id!==asset.uploaderId?async()=>{const reason=window.prompt(`Why are you reporting “${asset.originalName}”?`);if(reason?.trim()){await createReport(apiBase,token,{targetType:'asset',assetId:asset.id,reason});setStatus('Report sent to the admins.');}}:undefined} onDelete={isAdmin?async () => {
          if (!window.confirm(`Delete “${asset.originalName}”? Videos, posts, comments, and avatars using it will also be taken down.`)) return;
          const reason = window.prompt('Reason shown to affected users and saved in the admin log:', 'Removed directly by an admin.');
          if (reason === null) return;
          try { await adminDeleteAsset(apiBase, token, asset.id, reason); setAssets((items) => items.filter((item) => item.id !== asset.id)); setStatus('Asset deleted.'); }
          catch (error) { setStatus(error instanceof Error ? error.message : 'Asset deletion failed.'); }
        }:undefined} />
      </div>)}
    </div>
    {loadingMore&&<p className="library-status">Loading more…</p>}{hasMore&&!loadingMore&&<button type="button" className="load-more" onClick={more}>Load more</button>}
  </section>;
}
