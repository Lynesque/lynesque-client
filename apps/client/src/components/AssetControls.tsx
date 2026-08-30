import { useState } from 'react';
import { updateAssetControls } from '../api';
import type { AssetRecord,User } from '../types';
import { isAdminUser } from '../permissions';

export function AssetControls({asset,viewer,apiBase,token,onChanged}:{asset:AssetRecord;viewer:User;apiBase:string;token:string;onChanged:(asset:AssetRecord)=>void|Promise<void>}){
 const [busy,setBusy]=useState(false),[status,setStatus]=useState('');
 const owner=asset.uploaderId===viewer.id;
 if(!owner&&!isAdminUser(viewer))return null;
 const change=async(patch:{mature?:boolean;visibility?:'public'|'private'})=>{
  if(patch.visibility==='private'&&!window.confirm('Make this asset private? It will be removed from other creators’ video layers and all stickers/avatars. Affected creators will be notified. Copies people already downloaded cannot be recalled.'))return;
  if(patch.mature===true&&!window.confirm('Mark this asset Mature? Existing videos and posts that contain it will also become Mature, and their creators will be notified.'))return;
  setBusy(true);setStatus('');
  try{const result=await updateAssetControls(apiBase,token,asset.id,patch);await onChanged(result.asset);setStatus('Asset updated.');}catch(error){setStatus(error instanceof Error?error.message:'Update failed.');}finally{setBusy(false);}
 };
 return <div className="asset-controls" onClick={event=>event.stopPropagation()}>
  {owner&&<button disabled={busy} type="button" onClick={()=>void change({visibility:asset.visibility==='private'?'public':'private'})}>{asset.visibility==='private'?'Make public':'Make private'}</button>}
  <button disabled={busy} type="button" onClick={()=>void change({mature:!(asset.mature||asset.safetyMature)})}>{asset.mature||asset.safetyMature?'Remove Mature tag':'Mark Mature'}</button>
  {status&&<small role="status">{status}</small>}
 </div>;
}
