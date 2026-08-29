import { useEffect, useRef, useState } from 'react';
import { deletePost, getProfile, mediaUrl, restoreAdminActions, setAdminRole, toggleFollow, updateAvatar, uploadAsset } from '../api';
import { useTimeline } from '../useTimeline';
import type { Post, Profile, User } from '../types';
import { SceneCanvas } from './SceneCanvas';

export function ProfileView({ apiBase, token, viewer, userId, onUserChanged, onProfile: _onProfile, onOpenPost }: {
  apiBase: string; token: string; viewer:User; userId: string; onUserChanged: (user: User) => void; onProfile: (id: string) => void; onOpenPost: (postId: string) => void;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selected, setSelected] = useState<Post | null>(null);
  const [status, setStatus] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const timeline = useTimeline(7);

  const load = async () => {
    try {
      const result = await getProfile(apiBase, token, userId);
      setProfile(result);
      setSelected((current) => result.posts.find((post) => post.id === current?.id) || result.posts[0] || null);
      setStatus('');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Profile failed to load.');
    }
  };

  useEffect(() => { load(); }, [apiBase, token, userId]);

  const changeAvatar = async (file?: File) => {
    if (!file) return;
    setStatus('Uploading profile picture...');
    try {
      const { asset } = await uploadAsset(apiBase, token, file);
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
      <section className="profile-header panel">
        <div className="avatar">
          {profile.user.avatarAssetId ? <img src={mediaUrl(apiBase, profile.user.avatarAssetId)} alt="Profile" /> : <span>{profile.user.displayName.slice(0, 1).toUpperCase()}</span>}
        </div>
        <div>
          <h1>@{profile.user.displayName} {profile.user.isMegaAdmin?<span className="mega-admin-badge">SUPER AWESOME MEGA ADMIN</span>:profile.user.isAdmin?<span className="admin-badge">ADMIN</span>:null}</h1>
          <p>{profile.user.followerCount} followers · {profile.user.followingCount} following · {profile.totalLikes} total likes · {profile.posts.length} videos</p>
        </div>
        {!profile.isOwnProfile && <button className={profile.user.followedByViewer ? 'following profile-follow' : 'follow profile-follow'} onClick={async () => {
          const { user } = await toggleFollow(apiBase, token, profile.user.id);
          setProfile({ ...profile, user });
        }}>{profile.user.followedByViewer ? 'Following' : 'Follow'}</button>}
        {profile.isOwnProfile && <div className="profile-edit">
          <input ref={fileInput} hidden type="file" accept="image/*" onChange={(event) => changeAvatar(event.target.files?.[0])} />
          <button onClick={() => fileInput.current?.click()}>Change profile picture</button>
        </div>}
        {viewer.isMegaAdmin&&profile.user.id!==viewer.id&&<div className="profile-admin-controls"><button onClick={async()=>{await setAdminRole(apiBase,token,profile.user.id,!profile.user.isAdmin);await load();}}>{profile.user.isAdmin?'Remove admin':'Make admin'}</button>{profile.user.adminBlockedUntil&&<button onClick={async()=>{await restoreAdminActions(apiBase,token,profile.user.id);await load();}}>Restore admin actions</button>}</div>}
      </section>
      {status && <div className="status">{status}</div>}
      <div className="profile-content">
        <aside className="profile-videos panel">
          <h2>Videos</h2>
          {profile.posts.length === 0 && <p>No videos yet.</p>}
          {profile.posts.map((post, index) => (
            <button className={selected?.id === post.id ? 'active' : ''} key={post.id} onClick={() => { setSelected(post); timeline.seek(0); timeline.setPlaying(false); }}>
              Video {profile.posts.length - index} · {post.likeCount} likes · {new Date(post.createdAt).toLocaleDateString()}
            </button>
          ))}
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
          </div>
        </section>}
      </div>
    </div>
  );
}
