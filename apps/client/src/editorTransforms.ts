import type { SceneLayer, TransformKeyframe } from './types';
export type SyncState=Record<string,boolean>;
export function patchTransform(layer:SceneLayer,endpoint:0|1,patch:Partial<TransformKeyframe>,synced:SyncState):SceneLayer {
  const frames=layer.keyframes.map(frame=>({...frame})) as [TransformKeyframe,TransformKeyframe];
  frames[endpoint]={...frames[endpoint],...patch};
  for(const [key,value] of Object.entries(patch))if(key!=='time'&&synced[`${layer.id}:${key}`])Object.assign(frames[endpoint===0?1:0],{[key]:value});
  return {...layer,keyframes:frames};
}
