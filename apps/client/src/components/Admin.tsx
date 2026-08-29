import { useEffect,useMemo,useState } from 'react';
import { getAdminOverview,mediaUrl,resolvePending,resolveReport,suspendUser,unsuspendUser } from '../api';
import type { AdminLog,AssetRecord,Comment,Post,Report,Suspension,User } from '../types';
import { UserAvatar,UserName } from './UserIdentity';
import { SceneCanvas } from './SceneCanvas';

const remaining=(until:string)=>{const ms=Math.max(0,Date.parse(until)-Date.now()),days=Math.floor(ms/86400000),hours=Math.ceil((ms%86400000)/3600000);return days?`${days}d ${hours}h`:`${hours}h`;};

function ProfileLink({apiBase,user,fallbackId,onProfile}:{apiBase:string;user?:User;fallbackId?:string;onProfile:(id:string)=>void}){
 const id=user?.id||fallbackId;
 return <button type="button" className="inline-user report-user-link" disabled={!id} onClick={()=>id&&onProfile(id)}><UserAvatar apiBase={apiBase} user={user} small/><UserName compact user={user} fallbackId={fallbackId}/></button>;
}

function AssetPreview({apiBase,asset}:{apiBase:string;asset:AssetRecord}){
 const src=mediaUrl(apiBase,asset.id);
 if(asset.kind==='image')return <img className="report-media" src={src} alt={asset.originalName} loading="lazy"/>;
 if(asset.kind==='video')return <video className="report-media" src={src} controls playsInline preload="metadata"/>;
 return <audio className="report-audio" src={src} controls preload="metadata"/>;
}

function CommentPreview({apiBase,comment,onProfile}:{apiBase:string;comment:Comment;onProfile:(id:string)=>void}){
 return <div className="report-comment"><ProfileLink apiBase={apiBase} user={comment.user} fallbackId={comment.userId} onProfile={onProfile}/>{comment.text&&<p>{comment.text}</p>}{comment.sticker&&<img className="report-sticker" src={mediaUrl(apiBase,comment.sticker.id)} alt={comment.sticker.originalName} loading="lazy"/>}<small>{new Date(comment.createdAt).toLocaleString()} · score {comment.likeCount}</small></div>;
}

function ReportTarget({apiBase,report,onProfile}:{apiBase:string;report:Report;onProfile:(id:string)=>void}){
 if(report.targetType==='user')return <div className="report-target"><span className="report-label">Reported account</span><ProfileLink apiBase={apiBase} user={report.targetUser} fallbackId={report.targetUserId} onProfile={onProfile}/></div>;
 if(report.targetType==='asset')return <div className="report-target"><span className="report-label">Reported asset</span>{report.asset?<><AssetPreview apiBase={apiBase} asset={report.asset}/><strong>{report.asset.originalName}</strong>{report.targetUserId&&<ProfileLink apiBase={apiBase} user={report.targetUser} fallbackId={report.targetUserId} onProfile={onProfile}/>}</>:<p className="target-missing">The asset is no longer available. It may already have been removed.</p>}</div>;
 if(report.targetType==='post')return <div className="report-target"><span className="report-label">Reported video</span>{report.post?<><div className="report-video"><SceneCanvas scene={report.post.scene} time={0} playing={false} apiBase={apiBase}/></div><strong>{report.post.title}</strong><ProfileLink apiBase={apiBase} user={report.post.author} fallbackId={report.post.authorId} onProfile={onProfile}/></>:<p className="target-missing">The video is no longer available. It may already have been removed.</p>}</div>;
 if(report.targetType==='comment')return <div className="report-target"><span className="report-label">Reported video comment</span>{report.comment?<CommentPreview apiBase={apiBase} comment={report.comment} onProfile={onProfile}/>:<p className="target-missing">The comment is no longer available. It may already have been removed.</p>}</div>;
 if(report.targetType==='board_post')return <div className="report-target"><span className="report-label">Reported Postboard post</span>{report.boardPost?<><ProfileLink apiBase={apiBase} user={report.boardPost.author} fallbackId={report.boardPost.authorId} onProfile={onProfile}/>{report.boardPost.text&&<p>{report.boardPost.text}</p>}{report.boardPost.sticker&&<img className="report-sticker" src={mediaUrl(apiBase,report.boardPost.sticker.id)} alt={report.boardPost.sticker.originalName} loading="lazy"/>}</>:<p className="target-missing">The Postboard post is no longer available. It may already have been removed.</p>}</div>;
 return <div className="report-target"><span className="report-label">Reported Postboard reply</span>{report.boardComment?<CommentPreview apiBase={apiBase} comment={report.boardComment} onProfile={onProfile}/>:<p className="target-missing">The reply is no longer available. It may already have been removed.</p>}</div>;
}

export function Admin({apiBase,token,user,onProfile}:{apiBase:string;token:string;user:User;onProfile:(id:string)=>void}){
 const [reports,setReports]=useState<Report[]>([]),[suspensions,setSuspensions]=useState<Suspension[]>([]),[logs,setLogs]=useState<AdminLog[]>([]),[pendingAssets,setPendingAssets]=useState<AssetRecord[]>([]),[pendingPosts,setPendingPosts]=useState<Post[]>([]);
 const [limit,setLimit]=useState(30),[hasMore,setHasMore]=useState(false),[username,setUsername]=useState(''),[reason,setReason]=useState(''),[hours,setHours]=useState(24),[search,setSearch]=useState(''),[status,setStatus]=useState(''),[resolvingId,setResolvingId]=useState<string>();
 const load=async(nextLimit=limit,clearStatus=true)=>{try{const result=await getAdminOverview(apiBase,token,nextLimit);setReports(result.reports);setSuspensions(result.suspensions);setLogs(result.logs);setPendingAssets(result.pendingAssets);setPendingPosts(result.pendingPosts);setHasMore(Object.values(result.hasMore).some(Boolean));if(clearStatus)setStatus('');}catch(error){setStatus(error instanceof Error?error.message:'Admin page failed.');}};
 useEffect(()=>{void load();},[apiBase,token]);
 const shown=useMemo(()=>suspensions.filter((item)=>!search||item.userId.toLowerCase().includes(search.toLowerCase())),[suspensions,search]);
 const act=async(fn:()=>Promise<unknown>)=>{try{await fn();await load();}catch(error){setStatus(error instanceof Error?error.message:'Admin action failed.');}};
 const decideReport=async(report:Report,decision:'accepted'|'denied')=>{
  let why='';let suspensionHours=0;
  if(decision==='accepted'){
   const answer=window.prompt(report.targetType==='user'?'Reason for accepting this account report:':'Resolution and takedown reason:',report.reason);if(answer===null)return;why=answer.trim()||report.reason;
   const hoursAnswer=window.prompt('Suspension length in hours (0 for no suspension):',report.targetType==='user'?'24':'0');if(hoursAnswer===null)return;suspensionHours=Number(hoursAnswer);
   if(!Number.isFinite(suspensionHours)||suspensionHours<0){setStatus('Suspension length must be 0 or a positive number of hours.');return;}
   if(!window.confirm(`Accept this report${report.targetType==='user'?'':' and remove the reported content'}${suspensionHours>0?`? The account will be suspended for ${suspensionHours} hour(s).`:'?'}`))return;
  }else{const answer=window.prompt('Why is this report being denied?','');if(answer===null)return;why=answer.trim()||'The report was reviewed and denied.';}
  setResolvingId(report.id);setStatus(`${decision==='accepted'?'Accepting':'Denying'} report…`);
  try{
   const result=await resolveReport(apiBase,token,report.id,decision,why,suspensionHours);
   setReports((current)=>current.map((item)=>item.id===report.id?{...item,...result.report,status:decision,resolutionReason:why}:item));
   setStatus(`Report ${decision}. ${decision==='accepted'&&report.targetType!=='user'?'The reported content was removed.':''}`.trim());
   await load(limit,false);
  }catch(error){setStatus(error instanceof Error?`Report action failed: ${error.message}`:'Report action failed.');}
  finally{setResolvingId(undefined);}
 };

 return <div className="admin-page">
  <section className="admin-section panel"><h1>Admin</h1>{user.adminBlockedUntil&&<div className="admin-warning">Your admin actions are paused until {new Date(user.adminBlockedUntil).toLocaleString()}. @lynesque can restore them from your profile.</div>}<h2>Suspend an account</h2><div className="admin-form"><input value={username} onChange={(e)=>setUsername(e.target.value)} placeholder="@username"/><input value={hours} min="0.016" type="number" onChange={(e)=>setHours(Number(e.target.value))} placeholder="Hours"/><input value={reason} onChange={(e)=>setReason(e.target.value)} placeholder="Reason shown to the user"/><button onClick={()=>act(()=>suspendUser(apiBase,token,username,reason,hours))}>Suspend/update</button></div>{status&&<div className="status" role="status" aria-live="polite">{status}</div>}</section>
  <section className="admin-section panel"><h2>Unverified review queue</h2>{!pendingAssets.length&&!pendingPosts.length&&<p>Nothing is awaiting review.</p>}<div className="review-grid">{pendingAssets.map((asset)=><article className="review-card" key={asset.id}>{asset.kind==='image'?<img src={mediaUrl(apiBase,asset.id)} alt=""/>:asset.kind==='video'?<video className="review-media" src={mediaUrl(apiBase,asset.id)} controls playsInline preload="metadata"/>:<audio className="review-audio" src={mediaUrl(apiBase,asset.id)} controls preload="metadata"/>}<strong>{asset.originalName}</strong><ProfileLink apiBase={apiBase} user={asset.uploader} fallbackId={asset.uploaderId} onProfile={onProfile}/><div><button onClick={()=>act(()=>resolvePending(apiBase,token,'asset',asset.id,'accepted'))}>Approve</button><button className="danger" onClick={()=>{const why=window.prompt('Reason sent to the uploader:','Not approved.');if(why!==null)void act(()=>resolvePending(apiBase,token,'asset',asset.id,'denied',why));}}>Deny</button></div></article>)}{pendingPosts.map((post)=><article className="review-card" key={post.id}><div className="review-video"><SceneCanvas scene={post.scene} time={0} playing={false} apiBase={apiBase}/></div><strong>{post.title}</strong><ProfileLink apiBase={apiBase} user={post.author} fallbackId={post.authorId} onProfile={onProfile}/><div><button onClick={()=>act(()=>resolvePending(apiBase,token,'post',post.id,'accepted'))}>Approve</button><button className="danger" onClick={()=>{const why=window.prompt('Reason sent to the uploader:','Not approved.');if(why!==null)void act(()=>resolvePending(apiBase,token,'post',post.id,'denied',why));}}>Deny</button></div></article>)}</div></section>
  <section className="admin-section panel"><div className="settings-head"><h2>Active suspensions</h2><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search @user"/></div>{shown.map((item)=><div className="admin-row" key={item.userId}><ProfileLink apiBase={apiBase} user={item.user} fallbackId={item.userId} onProfile={onProfile}/><span>{remaining(item.until)} remaining</span><span>{item.reason}</span><button onClick={()=>{const newReason=window.prompt('Updated reason',item.reason),newHours=Number(window.prompt('New duration in hours',String(Math.max(1,Math.ceil((Date.parse(item.until)-Date.now())/3600000)))));if(newReason&&newHours>0)void act(()=>suspendUser(apiBase,token,item.userId,newReason,newHours));}}>Update</button><button onClick={()=>window.confirm(`Unsuspend @${item.userId}?`)&&void act(()=>unsuspendUser(apiBase,token,item.userId))}>Unsuspend</button></div>)}</section>
  <section className="admin-section panel"><h2>Reports</h2>{!reports.length&&<p>No reports.</p>}<div className="report-list">{reports.map((report)=><article className={`report-row report-${report.status}`} key={report.id}><ReportTarget apiBase={apiBase} report={report} onProfile={onProfile}/><div className="report-details"><span>Reported by <ProfileLink apiBase={apiBase} user={report.reporter} fallbackId={report.reporterId} onProfile={onProfile}/></span><p><strong>Reason:</strong> {report.reason}</p><small>{new Date(report.createdAt).toLocaleString()} · <span className="report-status">{report.status}</span></small>{report.resolutionReason&&<p className="resolution-reason"><strong>Resolution:</strong> {report.resolutionReason}</p>}{report.status==='pending'&&<div className="report-actions"><button disabled={Boolean(resolvingId)} onClick={()=>void decideReport(report,'accepted')}>{resolvingId===report.id?'Working…':'Accept & act'}</button><button className="danger" disabled={Boolean(resolvingId)} onClick={()=>void decideReport(report,'denied')}>{resolvingId===report.id?'Working…':'Deny'}</button></div>}</div></article>)}</div></section>
  <section className="admin-section panel"><h2>Recent administrative log</h2>{logs.map((log)=><div className="log-row" key={log.id}><time>{new Date(log.createdAt).toLocaleString()}</time> <UserName compact user={log.admin} fallbackId={log.adminId}/>: {log.action}{log.targetUserId&&<> <UserName compact user={log.targetUser} fallbackId={log.targetUserId}/></>}{log.reason?` — ${log.reason}`:''}</div>)}</section>
  {hasMore&&<button className="load-more" onClick={()=>{const next=limit+30;setLimit(next);void load(next);}}>Load more admin items</button>}
 </div>;
}
