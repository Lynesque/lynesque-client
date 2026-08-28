import { useEffect, useState } from 'react';
import { addComment, getFeed, runShitTok, toggleLike } from '../api';
import { useTimeline } from '../useTimeline';
import type { Post, User } from '../types';
import { SceneCanvas } from './SceneCanvas';

function FeedPost({ apiBase, token, post, offset, onPost, onProfile }: {
  apiBase: string; token: string; post: Post; offset: number; onPost: (post: Post) => void; onProfile: (id: string) => void;
}) {
  const timeline = useTimeline(7);
  const [comment, setComment] = useState('');
  return (
    <article className="feed-post panel">
      <div className="post-head">
        <button className="user-link" onClick={() => onProfile(post.author.id)}>@{post.author.displayName}</button>
        <span>{new Date(post.createdAt).toLocaleString()}</span>
      </div>
      <div className="feed-scene" onClick={() => timeline.setPlaying(!timeline.playing)}>
        <SceneCanvas scene={post.scene} time={timeline.time} playing={timeline.playing} apiBase={apiBase} />
        {!timeline.playing && <div className="play-overlay">▶</div>}
      </div>
      <div className="post-actions">
        <button className={post.likedByViewer ? 'liked' : ''} onClick={async () => onPost((await toggleLike(apiBase, token, post.id)).post)}>♥ {post.likeCount}</button>
        <button onClick={() => timeline.setPlaying(!timeline.playing)}>{timeline.playing ? 'Pause' : 'Play'}</button>
        <span>{post.commentCount} comments</span>
      </div>
      <div className="comments">
        {post.comments.slice(-6).map((entry) => (
          <div key={entry.id}>
            <button className="inline-user" onClick={() => onProfile(entry.user?.id || entry.userId)}>@{entry.user?.displayName || entry.userId}</button> {entry.text}
          </div>
        ))}
      </div>
      <form className="comment-box" onSubmit={async (event) => {
        event.preventDefault();
        if (!comment.trim()) return;
        await addComment(apiBase, token, post.id, comment);
        setComment('');
        const result = await getFeed(apiBase, token, offset);
        const updated = result.posts.find((candidate) => candidate.id === post.id);
        if (updated) onPost(updated);
      }}>
        <input value={comment} maxLength={500} placeholder="Add a comment" onChange={(event) => setComment(event.target.value)} />
        <button>Comment</button>
      </form>
    </article>
  );
}

export function Feed({ apiBase, token, user: _user, isHost, refreshToken, onProfile }: {
  apiBase: string; token: string; user: User; isHost: boolean; refreshToken: number; onProfile: (id: string) => void;
}) {
  const [post, setPost] = useState<Post | null>(null);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');

  const load = async (nextOffset: number) => {
    try {
      const result = await getFeed(apiBase, token, nextOffset);
      setPost(result.posts[0] || null);
      setOffset(result.posts.length ? result.offset : Math.max(0, Math.min(nextOffset, result.total - 1)));
      setTotal(result.total);
      setStatus('');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Feed failed.');
    }
  };

  useEffect(() => { load(0); }, [apiBase, token, refreshToken]);

  return (
    <div className="feed-page">
      <div className="feed-tools panel">
        <span>{total ? `Video ${offset + 1} of ${total}` : 'No videos yet.'}</span>
        <button disabled={offset <= 0} onClick={() => load(offset - 1)}>Previous</button>
        <button disabled={offset + 1 >= total} onClick={() => load(offset + 1)}>Next</button>
        <button onClick={() => load(offset)}>Refresh</button>
        {isHost && <button onClick={async () => { const result = await runShitTok(apiBase, token); setStatus(`shit-tok: ${JSON.stringify(result)}`); await load(0); }}>Run shit-tok</button>}
      </div>
      {status && <div className="status">{status}</div>}
      {post && <FeedPost key={post.id} apiBase={apiBase} token={token} post={post} offset={offset} onPost={setPost} onProfile={onProfile} />}
    </div>
  );
}
