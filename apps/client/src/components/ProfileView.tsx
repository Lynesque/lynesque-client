import { useEffect, useRef, useState } from 'react';
import { adminDeletePost, deletePost, getProfile, restoreAdminActions, searchUsers, setAccountStatus, setAdminRole, toggleFollow, updateAvatar, uploadAsset } from '../api';
import { useTimeline } from '../useTimeline';
import type { Post, Profile, User } from '../types';
import { SceneCanvas } from './SceneCanvas';
import { UserAvatar, UserName } from './UserIdentity';
import { isAdminUser } from '../permissions';

export function ProfileView({ apiBase, token, viewer, userId, onUserChanged, onProfile, onOpenPost }: {
  apiBase: string; token: string; viewer:User; userId: string; onUserChanged: (user: User) => void; onProfile: (id: string) => void; onOpenPost: (postId: string) => void;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selected, setSelected] = useState<Post | null>(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const timeline = useTimeline(7);

  const load = async (append=false) => {
    try {
      const result = await getProfile(apiBase, token, userId,append?(profile?.posts.length||0):0,20);
      const combined=append&&profile?{...result,posts:[...profile.posts,...result.posts.filter((post)=>!profile.posts.some((item)=>item.id===post.id))]}:result;
      setProfile(combined);
      setSelected((current) => combined.posts.find((post) => post.id === current?.id) || combined.posts[0] || null);
      setStatus('');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Profile failed to load.');
    }
  };

  useEffect(() => { load(); }, [apiBase, token, userId]);

  const changeAvatar = async (file?: File) => {
    if (!file) return;
    if(viewer.accountStatus==='unverified'){setStatus('Profile pictures are disabled while your account is unverified. Upload an asset or video for review first.');return;}
    const displayName = window.prompt('Name this asset so it can be found in the library:', file.name.replace(/\.[^.]+$/, '') || 'Profile picture');
    if (displayName === null || !displayName.trim()) return;
    setStatus('Uploading profile picture...');
    try {
      const { asset } = await uploadAsset(apiBase, token, file, displayName.trim());
      if (asset.kind !== 'image') return setStatus('Profile pictures must be images.');
      const result = await updateAvatar(apiBase, token, asset.id);
      onUserChanged(result.user);
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Profile picture upload failed.');
    }
    if (fileInput.current) fileInput.current.value = '';
  };

  if (!profile) return <div className="profile-page panel">{status || 'Loading profile...'}</div>;

  return (
    <div className="profile-page">
      <form className="profile-search panel" onSubmit={async(event)=>{event.preventDefault();try{setSearchResults((await searchUsers(apiBase,token,search)).users);}catch(error){setStatus(error instanceof Error?error.message:'User search failed.');}}}><input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Search for a user by @username"/><button>Search users</button>{searchResults.length>0&&<div className="profile-search-results">{searchResults.map((result)=><button type="button" key={result.id} onClick={()=>{setSearchResults([]);onProfile(result.id);}}><UserAvatar apiBase={apiBase} user={result} small/><UserName user={result}/></button>)}</div>}</form>
      <section className="profile-header panel">
        <UserAvatar apiBase={apiBase} user={profile.user}/>
        <div>
          <h1><UserName user={profile.user}/></h1>
          <p>{profile.user.followerCount} followers · {profile.user.followingCount} following · {profile.totalLikes} total likes · {profile.posts.length} videos</p>
        </div>
        {!profile.isOwnProfile && <button className={profile.user.followedByViewer ? 'following profile-follow' : 'follow profile-follow'} onClick={async () => {
          const { user } = await toggleFollow(apiBase, token, profile.user.id);
          setProfile({ ...profile, user });
        }}>{profile.user.followedByViewer ? 'Following' : 'Follow'}</button>}
        {profile.isOwnProfile && <div className="profile-edit">
          <input ref={fileInput} hidden type="file" accept="image/*" onChange={(event) => changeAvatar(event.target.files?.[0])} />
          <button disabled={viewer.accountStatus==='unverified'} onClick={() => fileInput.current?.click()}>Change profile picture</button>
        </div>}
        {isAdminUser(viewer)&&<div className="profile-admin-controls"><label>Administrator-selected status<select value={profile.user.manualAccountStatus||profile.user.accountStatus} onChange={async(event)=>{await setAccountStatus(apiBase,token,profile.user.id,event.target.value as User['accountStatus']);await load();}}><option value="verified">Verified</option><option value="default">Default</option><option value="unverified">Unverified</option></select></label>{profile.user.accountStatus==='verified'&&profile.user.manualAccountStatus==='default'&&<small>Currently verified through Patreon</small>}{viewer.isMegaAdmin&&profile.user.id!==viewer.id&&<><button onClick={async()=>{await setAdminRole(apiBase,token,profile.user.id,!profile.user.isAdmin);await load();}}>{profile.user.isAdmin?'Remove admin':'Make admin'}</button>{profile.user.adminBlockedUntil&&<button onClick={async()=>{await restoreAdminActions(apiBase,token,profile.user.id);await load();}}>Restore admin actions</button>}</>}</div>}
      </section>
      {status && <div className="status">{status}</div>}
      <div className="profile-content">
        <aside className="profile-videos panel">
          <h2>Videos</h2>
          {profile.posts.length === 0 && <p>No videos yet.</p>}
          {profile.posts.map((post, index) => (
            <button className={selected?.id === post.id ? 'active' : ''} key={post.id} onClick={() => { setSelected(post); timeline.seek(0); timeline.setPlaying(false); }}>
              {post.title} · LYN-{post.id.slice(0,8).toUpperCase()} · {post.likeCount} likes · {new Date(post.createdAt).toLocaleDateString()}{post.moderationStatus==='pending'?' · AWAITING REVIEW':''}
            </button>
          ))}
          {profile.hasMore&&<button onClick={()=>load(true)}>Load more videos</button>}
        </aside>
        {selected && <section className="profile-player panel">
          <div className="feed-scene" onClick={() => timeline.setPlaying(!timeline.playing)}>
            <SceneCanvas scene={selected.scene} time={timeline.time} playing={timeline.playing} apiBase={apiBase} />
            {!timeline.playing && <div className="play-overlay">▶</div>}
          </div>
          <div className="post-actions">
            <span>{selected.likeCount} likes</span><span>{selected.commentCount} comments</span>
            <button onClick={() => timeline.setPlaying(!timeline.playing)}>{timeline.playing ? 'Pause' : 'Play'}</button>
            <button className="primary" onClick={() => onOpenPost(selected.id)}>Open in feed</button>
            {profile.isOwnProfile&&<button className="danger" onClick={async()=>{if(!window.confirm(`Delete “${selected.title}”? The uploaded assets will stay in the library.`))return;await deletePost(apiBase,token,selected.id);await load();}}>Delete video</button>}
            {isAdminUser(viewer)&&!profile.isOwnProfile&&<button className="danger" onClick={async()=>{if(!window.confirm(`Delete “${selected.title}” as an admin?`))return;const reason=window.prompt('Reason shown to the creator and saved in the admin log:','Removed directly by an admin.');if(reason===null)return;await adminDeletePost(apiBase,token,selected.id,reason);await load();}}>Admin delete</button>}
          </div>
        </section>}
      </div>
    </div>
  );
}
