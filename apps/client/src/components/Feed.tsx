import { useEffect, useState } from 'react';
import { addComment, getFeed, getPost, mediaUrl, runShitTok, searchVideos, toggleCommentReaction, toggleDislike, toggleFollow, toggleLike } from '../api';
import { useTimeline } from '../useTimeline';
import type { AssetRecord, Post, User } from '../types';
import { SceneCanvas } from './SceneCanvas';
import { Notifications } from './Notifications';
import { AssetLibrary } from './AssetLibrary';

function Avatar({ apiBase, user, small = false }: { apiBase: string; user?: User; small?: boolean }) {
  return <span className={`mini-avatar ${small ? 'small' : ''}`}>
    {user?.avatarAssetId ? <img src={mediaUrl(apiBase, user.avatarAssetId)} alt="" /> : <span>{user?.displayName.slice(0, 1).toUpperCase() || '?'}</span>}
  </span>;
}

function FeedPost({ apiBase, token, viewerId, post, onPost, onProfile, onHash }: {
  apiBase: string; token: string; viewerId: string; post: Post; onPost: (post: Post) => void; onProfile: (id: string) => void; onHash: (tag: string) => void;
}) {
  const timeline = useTimeline(7);
  const [comment, setComment] = useState('');
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [stickersVisible, setStickersVisible] = useState(false);
  const [sticker, setSticker] = useState<AssetRecord | null>(null);
  const refreshPost = async () => onPost((await getPost(apiBase, token, post.id)).post);
  return (
    <div className={`post-with-comments ${commentsVisible ? 'comments-open' : ''}`}>
    <article className="feed-post panel">
      <div className="post-head">
        <div className="creator-line">
          <button className="creator-link" onClick={() => onProfile(post.author.id)}><Avatar apiBase={apiBase} user={post.author} /><span>@{post.author.displayName}<small>{post.author.followerCount} followers</small></span></button>
          {post.author.id !== viewerId && <button className={post.author.followedByViewer ? 'following' : 'follow'} onClick={async () => {
            const { user } = await toggleFollow(apiBase, token, post.author.id);
            onPost({ ...post, author: user });
          }}>{post.author.followedByViewer ? 'Following' : 'Follow'}</button>}
        </div>
        <span>{new Date(post.createdAt).toLocaleString()}</span>
      </div>
      <h2 className="video-post-title">{post.title.split(/(#[a-zA-Z0-9_-]+)/g).map((part,index)=>part.startsWith('#')?<button className="text-link" key={index} onClick={()=>onHash(part)}>{part}</button>:part)}</h2>
      <div className="feed-scene" onClick={() => timeline.setPlaying(!timeline.playing)}>
        <SceneCanvas scene={post.scene} time={timeline.time} playing={timeline.playing} apiBase={apiBase} />
        {!timeline.playing && <div className="play-overlay">▶</div>}
      </div>
      <div className="post-actions">
        <button className={post.likedByViewer ? 'liked' : ''} onClick={async () => onPost((await toggleLike(apiBase, token, post.id)).post)}>▲</button>
        <strong className="net-likes">{post.likeCount}</strong>
        <button className={post.dislikedByViewer ? 'disliked' : ''} onClick={async () => onPost((await toggleDislike(apiBase, token, post.id)).post)}>▼</button>
        <button onClick={() => timeline.setPlaying(!timeline.playing)}>{timeline.playing ? 'Pause' : 'Play'}</button>
        <button className={commentsVisible ? 'active' : ''} onClick={() => setCommentsVisible((visible) => !visible)}>{post.commentCount} comments</button>
        <span>{post.viewCount} views</span>
      </div>
    </article>
    {commentsVisible && <aside className="comments-panel panel">
      <div className="comments-head"><h2>Comments</h2><button onClick={() => setCommentsVisible(false)}>Close</button></div>
      <div className="comments">
        {post.comments.length === 0 && <p className="empty-comments">No comments yet.</p>}
        {post.comments.map((entry) => (
          <div className="comment" key={entry.id}>
            <Avatar apiBase={apiBase} user={entry.user} small />
            <div className="comment-content">
              <span><button className="inline-user" onClick={() => onProfile(entry.user?.id || entry.userId)}>@{entry.user?.displayName || entry.userId}</button> {entry.text}</span>
              {entry.stickerAssetId && <img className="comment-sticker" src={mediaUrl(apiBase, entry.stickerAssetId)} alt="Sticker" loading="lazy" />}
              <div className="comment-meta">
                <time>{new Date(entry.createdAt).toLocaleString()}</time>
                <button className={entry.likedByViewer ? 'liked' : ''} onClick={async () => onPost((await toggleCommentReaction(apiBase, token, post.id, entry.id, 'like')).post)}>▲</button>
                <strong>{entry.likeCount}</strong>
                <button className={entry.dislikedByViewer ? 'disliked' : ''} onClick={async () => onPost((await toggleCommentReaction(apiBase, token, post.id, entry.id, 'dislike')).post)}>▼</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <form className="comment-box" onSubmit={async (event) => {
        event.preventDefault();
        if (!comment.trim() && !sticker) return;
        await addComment(apiBase, token, post.id, comment, sticker?.id);
        setComment('');
        setSticker(null);
        setStickersVisible(false);
        await refreshPost();
      }}>
        {sticker && <div className="selected-sticker"><img src={mediaUrl(apiBase, sticker.id)} alt="Selected sticker" /><button type="button" onClick={() => setSticker(null)}>Remove</button></div>}
        <div className="comment-compose"><input value={comment} maxLength={500} placeholder="Add a comment" onChange={(event) => setComment(event.target.value)} /><button type="button" className={stickersVisible ? 'active' : ''} onClick={() => setStickersVisible((visible) => !visible)}>Sticker</button><button>Comment</button></div>
      </form>
      {stickersVisible && <AssetLibrary apiBase={apiBase} token={token} sections={['image', 'gif']} title="Stickers" selectedId={sticker?.id} onSelect={(asset) => setSticker(asset)} />}
    </aside>}
    </div>
  );
}

export function Feed({ apiBase, token, user, refreshToken, initialPostId, onUnreadCount, onProfile }: {
  apiBase: string; token: string; user: User; refreshToken: number; initialPostId?: string; onUnreadCount: (count: number) => void; onProfile: (id: string) => void;
}) {
  const [post, setPost] = useState<Post | null>(null);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [videoNumber, setVideoNumber] = useState('1');
  const [notificationsVisible, setNotificationsVisible] = useState(true);
  const [search, setSearch] = useState(() => localStorage.getItem('lynesque-search') || '');

  const load = async (nextOffset: number) => {
    try {
      const result = await getFeed(apiBase, token, nextOffset);
      setPost(result.posts[0] || null);
      setOffset(result.posts.length ? result.offset : Math.max(0, Math.min(nextOffset, result.total - 1)));
      setTotal(result.total);
      setVideoNumber(String(result.posts.length ? result.offset + 1 : 1));
      setStatus('');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Feed failed.');
    }
  };

  const openPost = async (postId: string) => {
    try {
      const result = await getPost(apiBase, token, postId);
      setPost(result.post);
      setOffset(result.offset);
      setTotal(result.total);
      setVideoNumber(String(result.offset + 1));
      setStatus('');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Video failed to load.');
    }
  };

  useEffect(() => { const pending = localStorage.getItem('lynesque-search'); if (pending) { setSearch(pending); runSearch(pending); } else if (initialPostId) openPost(initialPostId); else load(0); }, [apiBase, token, refreshToken, initialPostId]);

  const jumpToVideo = () => {
    const number = Math.max(1, Math.min(total, Math.floor(Number(videoNumber) || 1)));
    setVideoNumber(String(number));
    load(number - 1);
  };
  const runSearch = async (value = search) => { const result = await searchVideos(apiBase, token, value); setPost(result.posts[0] || null); setTotal(result.posts.length); setOffset(0); setVideoNumber('1'); localStorage.removeItem('lynesque-search'); setStatus(result.posts.length ? `Search: ${value}` : 'No videos matched that search.'); };
  const hashtag = (tag: string) => { setSearch(tag); runSearch(tag); };

  return (
    <div className={`feed-page ${notificationsVisible ? 'with-notifications' : ''}`}>
      {notificationsVisible ? <Notifications apiBase={apiBase} token={token} onUnreadCount={onUnreadCount} onOpenPost={openPost} onProfile={onProfile} onHide={() => setNotificationsVisible(false)} /> : <button className="show-notifications" onClick={() => setNotificationsVisible(true)}>Show notifications</button>}
      <div className="feed-main">
      <div className="feed-tools panel">
        <form className="video-search" onSubmit={(event)=>{event.preventDefault();runSearch();}}><input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Search titles or #hashtags"/><button>Search</button></form>
        {total ? <form className="video-jump" onSubmit={(event) => { event.preventDefault(); jumpToVideo(); }}>
          <span>Video</span><input aria-label="Video number" type="number" min="1" max={total} value={videoNumber} onChange={(event) => setVideoNumber(event.target.value)} /><span>of {total}</span><button type="submit">Go</button>
        </form> : <span>No videos yet.</span>}
        <button disabled={offset <= 0} onClick={() => load(offset - 1)}>Previous</button>
        <button disabled={offset + 1 >= total} onClick={() => load(offset + 1)}>Next</button>
        <button onClick={() => load(offset)}>Refresh</button>
        {user.id === 'lynesque' && <button onClick={async () => { const result = await runShitTok(apiBase, token); setStatus(`shit-tok: ${JSON.stringify(result)}`); await load(0); }}>Run shit-tok</button>}
      </div>
      {status && <div className="status">{status}</div>}
      {post && <FeedPost key={post.id} apiBase={apiBase} token={token} viewerId={user.id} post={post} onPost={setPost} onProfile={onProfile} onHash={hashtag} />}
      </div>
    </div>
  );
}
