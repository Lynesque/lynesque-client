import { useEffect, useMemo, useState } from 'react';
import { emojiUrl, getEmojis } from '../api';

const emojiCache = new Map<string,string[]>();
const emojiLoads = new Map<string,Promise<string[]>>();

export function useCustomEmojis(apiBase:string) {
  const [emojis,setEmojis]=useState<string[]>(()=>emojiCache.get(apiBase)||[]);
  useEffect(()=>{
    if(!apiBase)return;
    let active=true;
    let pending=emojiLoads.get(apiBase);
    if(!pending){pending=getEmojis(apiBase).then((result)=>{emojiCache.set(apiBase,result.emojis);return result.emojis;}).catch(()=>[]);emojiLoads.set(apiBase,pending);}
    pending.then((items)=>active&&setEmojis(items));
    return()=>{active=false;};
  },[apiBase]);
  return emojis;
}

export function EmojiButton({apiBase,onInsert,disabled=false}:{apiBase:string;onInsert:(code:string)=>void;disabled?:boolean}){
  const emojis=useCustomEmojis(apiBase);const [open,setOpen]=useState(false);
  return <span className="emoji-control"><button type="button" title="Custom emojis" aria-label="Custom emojis" disabled={disabled||emojis.length===0} className={open?'active emoji-toggle':'emoji-toggle'} onClick={()=>setOpen(!open)}>😀</button>{open&&<span className="emoji-picker panel">{emojis.map((name)=><button type="button" key={name} title={`:${name}:`} onClick={()=>{onInsert(`:${name}:`);setOpen(false);}}><img src={emojiUrl(apiBase,name)} alt={`:${name}:`} loading="lazy"/></button>)}</span>}</span>;
}

export function RichText({apiBase,text,onHash}:{apiBase:string;text:string;onHash?:(tag:string)=>void}){
  const emojis=useCustomEmojis(apiBase);const available=useMemo(()=>new Set(emojis),[emojis]);
  return <>{String(text||'').split(/(:[a-zA-Z0-9_-]{1,48}:|#[a-zA-Z0-9_-]+)/g).map((part,index)=>{
    const emoji=/^:([a-zA-Z0-9_-]{1,48}):$/.exec(part);if(emoji&&available.has(emoji[1]))return <img className="inline-custom-emoji" key={index} src={emojiUrl(apiBase,emoji[1])} alt={part} title={part} loading="lazy"/>;
    if(onHash&&part.startsWith('#'))return <button type="button" className="text-link" key={index} onClick={()=>onHash(part)}>{part}</button>;
    return part;
  })}</>;
}
