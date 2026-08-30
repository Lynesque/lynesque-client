import { useEffect, useRef, useState } from 'react';
import { adminDeleteAsset, adminDeletePost, adminSetBoardPostMature, adminSetPostMature, ApiError, createReport, deletePost, getProfile, mediaUrl, restoreAdminActions, searchUsers, setAccountStatus, setAdminRole, toggleFollow, updateAvatar, uploadAsset } from '../api';
import { useTimeline } from '../useTimeline';
import type { AssetRecord, Post, Profile, User } from '../types';
import { SceneCanvas } from './SceneCanvas';
import { UserAvatar, UserName } from './UserIdentity';
import { isAdminUser } from '../permissions';
import { AdminMenu } from './AdminMenu';
import { RichText } from './CustomEmoji';

type ProfileSection='videos'|'assets'|'postboard';

export function ProfileView({ apiBase, token, viewer, userId, onUserChanged, onProfile, onOpenPost,onSettings }: {
  apiBase: string; token: string; viewer:User; userId: string; onUserChanged: (user: User) => void; onProfile: (id: string) => void; onOpenPost: (postId: string) => void;onSettings:()=>void;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [section,setSection]=useState<ProfileSection>('videos');
  const [selected, setSelected] = useState<Post | null>(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loadingMore,setLoadingMore]=useState(false);
  const [settingsSuggested,setSettingsSuggested]=useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const timeline = useTimeline(7);

  const itemCount=(value:Profile|null,target=section)=>!value?0:target==='videos'?value.posts.length:target==='assets'?value.assets.length:value.boardPosts.length;
  const load = async (append=false,target=section) => {
    if(append)setLoadingMore(true);
    try {
      const result = await getProfile(apiBase, token, userId,append?itemCount(profile,target):0,20,target);
      const combined=append&&profile&&profile.section===target?{
        ...result,
        posts:target==='videos'?[...profile.posts,...result.posts.filter((post)=>!profile.posts.some((item)=>item.id===post.id))]:result.posts,
        assets:target==='assets'?[...profile.assets,...result.assets.filter((asset)=>!profile.assets.some((item)=>item.id===asset.id))]:result.assets,
        boardPosts:target==='postboard'?[...profile.boardPosts,...result.boardPosts.filter((post)=>!profile.boardPosts.some((item)=>item.id===post.id))]:result.boardPosts
      }:result;
      setProfile(combined);
      if(target==='videos')setSelected((current) => combined.posts.find((post) => post.id === current?.id) || combined.posts[0] || null);else setSelected(null);
      setStatus('');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Profile failed to load.'); }
    finally{setLoadingMore(false);}
  };

  useEffect(() => { setSection('videos');void load(false,'videos'); }, [apiBase, token, userId]);
  const chooseSection=(next:ProfileSection)=>{setSection(next);setProfile(null);void load(false,next);};

  const changeAvatar = async (file?: File) => {
    if (!file) return;
    if(viewer.accountStatus==='unverified'){setStatus('Profile pictures are disabled while your account is unverified. Upload an asset or video for review first.');return;}
    const displayName = window.prompt('Name this asset so it can be found in the library:', file.name.replace(/\.[^.]+$/, '') || 'Profile picture');
    if (displayName === null || !displayName.trim()) return;
    setStatus('Uploading profile picture...');setSettingsSuggested(false);
    try {
      const { asset } = await uploadAsset(apiBase, token, file, displayName.trim());
      if (asset.kind !== 'image') return setStatus('Profile pictures must be images.');
      const result = await updateAvatar(apiBase, token, asset.id);onUserChanged(result.user);await load();
    } catch (error) {setSettingsSuggested(error instanceof ApiError&&error.settingsLink===true);setStatus(error instanceof Error ? error.message : 'Profile picture upload failed.');}
    if (fileInput.current) fileInput.current.value = '';
  };

  const changeStatus=async(next:User['accountStatus'])=>{
    try{await setAccountStatus(apiBase,token,userId,next);await load();}
    catch(error){if(error instanceof ApiError&&error.code==='EMAIL_OVERRIDE_REQUIRED'&&window.confirm(`${error.message}\n\nOverride the email requirement for this specific situation?`)){await setAccountStatus(apiBase,token,userId,next,true);await load();}else setStatus(error instanceof Error?error.message:'Status change failed.');}
  };

  if (!profile) return <div className="profile-page panel">{status || 'Loading profile...'}</div>;
  const more=()=>{if(profile.hasMore&&!loadingMore)void load(true);};

  return <div className="profile-page">
    <form className="profile-search panel" onSubmit={async(event)=>{event.preventDefault();try{setSearchResults((await searchUsers(apiBase,token,search)).users);}catch(error){setStatus(error instanceof Error?error.message:'User search failed.');}}}><input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Search for a user by @username"/><button>Search users</button>{searchResults.length>0&&<div className="profile-search-results">{searchResults.map((result)=><button type="button" key={result.id} onClick={()=>{setSearchResults([]);onProfile(result.id);}}><UserAvatar apiBase={apiBase} user={result} small/><UserName apiBase={apiBase} user={result}/></button>)}</div>}</form>
    <section className="profile-header panel">
      <UserAvatar apiBase={apiBase} user={profile.user}/><div><h1><UserName apiBase={apiBase} user={profile.user}/></h1><p>{profile.user.followerCount} followers · {profile.user.followingCount} following · {profile.totalLikes} total video likes</p><p>{profile.counts.videos} videos · {profile.counts.assets} uploaded assets · {profile.counts.postboard} Postboard posts</p>{isAdminUser(viewer)&&profile.user.emailRequired&&<small className={profile.user.emailVerified?'email-ok':'email-missing'}>New-account email: {profile.user.emailVerified?'verified':profile.user.hasEmail?'added but not verified':'missing'}</small>}</div>
      {!profile.isOwnProfile&&<button className={profile.user.followedByViewer?'following profile-follow':'follow profile-follow'} onClick={async()=>setProfile({...profile,user:(await toggleFollow(apiBase,token,profile.user.id)).user})}>{profile.user.followedByViewer?'Following':'Follow'}</button>}
      {profile.isOwnProfile&&<div className="profile-edit"><input ref={fileInput} hidden type="file" accept="image/*" onChange={(event)=>changeAvatar(event.target.files?.[0])}/><button disabled={viewer.accountStatus==='unverified'} onClick={()=>fileInput.current?.click()}>Change profile picture</button></div>}
      {isAdminUser(viewer)&&<div className="profile-admin-controls"><label>Administrator-selected status<select value={profile.user.manualAccountStatus||profile.user.accountStatus} onChange={(event)=>void changeStatus(event.target.value as User['accountStatus'])}><option value="verified">Verified</option><option value="default">Default</option><option value="unverified">Unverified</option></select></label>{profile.user.accountStatus==='verified'&&profile.user.manualAccountStatus==='default'&&<small>Currently verified through Patreon</small>}{viewer.isMegaAdmin&&profile.user.id!==viewer.id&&<><button onClick={async()=>{await setAdminRole(apiBase,token,profile.user.id,!profile.user.isAdmin);await load();}}>{profile.user.isAdmin?'Remove admin':'Make admin'}</button>{profile.user.adminBlockedUntil&&<button onClick={async()=>{await restoreAdminActions(apiBase,token,profile.user.id);await load();}}>Restore admin actions</button>}</>}</div>}
    </section>
    {status&&<div className="status">{status}{settingsSuggested&&<button onClick={onSettings}>Open Settings</button>}</div>}
    <div className="profile-tabs panel"><button className={section==='videos'?'active':''} onClick={()=>chooseSection('videos')}>Videos</button><button className={section==='assets'?'active':''} onClick={()=>chooseSection('assets')}>Assets</button><button className={section==='postboard'?'active':''} onClick={()=>chooseSection('postboard')}>Postboard</button></div>
    {section==='videos'&&<div className="profile-content"><aside className="profile-videos panel profile-section-scroll" onScroll={(event)=>{const node=event.currentTarget;if(node.scrollTop+node.clientHeight>=node.scrollHeight-50)more();}}><h2>Videos</h2>{!profile.posts.length&&<p>No videos yet.</p>}{profile.posts.map((post)=><button className={selected?.id===post.id?'active':''} key={post.id} onClick={()=>{setSelected(post);timeline.seek(0);timeline.setPlaying(false);}}><RichText apiBase={apiBase} text={post.title}/> · LYN-{post.id.slice(0,8).toUpperCase()} · {post.likeCount} likes · {new Date(post.createdAt).toLocaleDateString()}{post.mature?' · MATURE':''}{post.moderationStatus==='pending'?' · AWAITING REVIEW':''}</button>)}{loadingMore&&<p>Loading more…</p>}</aside>{selected&&<section className="profile-player panel">{selected.mature&&<span className="mature-label">Mature</span>}<div className="feed-scene" onClick={()=>timeline.setPlaying(!timeline.playing)}><SceneCanvas scene={selected.scene} time={timeline.time} playing={timeline.playing} apiBase={apiBase}/>{!timeline.playing&&<div className="play-overlay">▶</div>}</div><div className="post-actions"><span>{selected.likeCount} likes</span><span>{selected.commentCount} comments</span><button onClick={()=>timeline.setPlaying(!timeline.playing)}>{timeline.playing?'Pause':'Play'}</button><button className="primary" onClick={()=>onOpenPost(selected.id)}>Open in feed</button>{isAdminUser(viewer)&&<button onClick={async()=>{const next=(await adminSetPostMature(apiBase,token,selected.id,!selected.mature)).post;setSelected(next);await load();}}>{selected.mature?'Remove Mature tag':'Mark Mature'}</button>}{profile.isOwnProfile&&<button className="danger" onClick={async()=>{if(!window.confirm(`Delete “${selected.title}”? The uploaded assets will stay in the library.`))return;await deletePost(apiBase,token,selected.id);await load();}}>Delete video</button>}{isAdminUser(viewer)&&!profile.isOwnProfile&&<button className="danger" onClick={async()=>{if(!window.confirm(`Delete “${selected.title}” as an admin?`))return;const reason=window.prompt('Reason shown to the creator and saved in the admin log:','Removed directly by an admin.');if(reason===null)return;await adminDeletePost(apiBase,token,selected.id,reason);await load();}}>Admin delete</button>}</div></section>}</div>}
    {section==='assets'&&<section className="profile-assets panel"><div className="profile-quota"><strong>{profile.assetQuota.remainingPercent}% storage allocation remaining</strong><span><i style={{width:`${profile.assetQuota.remainingPercent}%`}}/></span><small>{profile.assetQuota.usedUnits}/{profile.assetQuota.unitLimit} weighted units · {Math.round(profile.assetQuota.usedBytes/1024/1024)} MB of {Math.round(profile.assetQuota.byteLimit/1024/1024)} MB</small></div><div className="profile-asset-grid profile-section-scroll" onScroll={(event)=>{const node=event.currentTarget;if(node.scrollTop+node.clientHeight>=node.scrollHeight-50)more();}}>{profile.assets.map((asset:AssetRecord)=><div className="library-card" key={asset.id}>{asset.kind==='image'?<img src={mediaUrl(apiBase,asset.id)} alt="" loading="lazy"/>:asset.kind==='video'?<video src={mediaUrl(apiBase,asset.id)} muted controls preload="metadata"/>:<span className="audio-asset">♪</span>}<small>{asset.originalName}</small>{asset.visibility==='private'&&<small className="private-label">Private — profile only</small>}{asset.moderationStatus==='pending'&&<small className="pending-label">Awaiting review</small>}<AdminMenu label={`Options for ${asset.originalName}`} onReport={!isAdminUser(viewer)&&viewer.id!==asset.uploaderId?async()=>{const reason=window.prompt(`Why are you reporting “${asset.originalName}”?`);if(reason?.trim())await createReport(apiBase,token,{targetType:'asset',assetId:asset.id,reason});}:undefined} onDelete={isAdminUser(viewer)?async()=>{if(!window.confirm(`Delete “${asset.originalName}”?`))return;const reason=window.prompt('Reason shown to affected users:','Removed directly by an admin.');if(reason===null)return;await adminDeleteAsset(apiBase,token,asset.id,reason);await load();}:undefined}/></div>)}{loadingMore&&<p>Loading more…</p>}</div></section>}
    {section==='postboard'&&<section className="profile-board panel profile-section-scroll" onScroll={(event)=>{const node=event.currentTarget;if(node.scrollTop+node.clientHeight>=node.scrollHeight-50)more();}}>{!profile.boardPosts.length&&<p>No Postboard posts yet.</p>}{profile.boardPosts.map((post)=><article className="board-post" key={post.id}><div className="post-head-actions">{post.mature&&<span className="mature-label">Mature</span>}<AdminMenu mature={post.mature} onMature={isAdminUser(viewer)?async()=>{await adminSetBoardPostMature(apiBase,token,post.id,!post.mature);await load();}:undefined}/></div><RichText apiBase={apiBase} text={post.text}/>{post.sticker&&<img className="board-sticker" src={mediaUrl(apiBase,post.sticker.id)} alt="Sticker" loading="lazy"/>}<small>{new Date(post.createdAt).toLocaleString()} · {post.likeCount} score · {post.commentsTotal} replies</small></article>)}{loadingMore&&<p>Loading more…</p>}</section>}
  </div>;
}
