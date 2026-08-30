import { useEffect, useState } from 'react';
import { addComment, adminDeleteComment, adminDeletePost, adminSetPostMature, createReport, deleteComment, deletePost, getComments, getFeed, getPost, mediaUrl, runShitTok, searchVideos, toggleCommentReaction, toggleDislike, toggleFollow, toggleLike } from '../api';
import { useTimeline } from '../useTimeline';
import type { AssetRecord, Post, User } from '../types';
import { SceneCanvas } from './SceneCanvas';
import { Notifications } from './Notifications';
import { AssetLibrary } from './AssetLibrary';
import { AdminMenu } from './AdminMenu';
import { UserAvatar, UserName } from './UserIdentity';
import { isAdminUser } from '../permissions';
import { EmojiButton, RichText } from './CustomEmoji';

function FeedPost({ apiBase, token, viewer, post, commentsVisible, setCommentsVisible, onPost, onDeleted, onProfile, onHash }: {
  apiBase: string; token: string; viewer: User; post: Post; commentsVisible: boolean; setCommentsVisible: React.Dispatch<React.SetStateAction<boolean>>; onPost: (post: Post) => void; onDeleted: () => void; onProfile: (id: string) => void; onHash: (tag: string) => void;
}) {
  const timeline = useTimeline(7);
  const [comment, setComment] = useState('');
  const [stickersVisible, setStickersVisible] = useState(false);
  const [sticker, setSticker] = useState<AssetRecord | null>(null);
  const [copied, setCopied] = useState(false);
  const canModerate=isAdminUser(viewer);
  const refreshPost = async () => onPost((await getPost(apiBase, token, post.id)).post);
  const reference = `LYN-${post.id.slice(0, 8).toUpperCase()}`;
  const publicOrigin = /^(lyneque|lynesque)\.com$/i.test(window.location.hostname) ? window.location.origin : 'https://lyneque.com';
  const shareUrl = `${publicOrigin}/?video=${encodeURIComponent(post.id)}`;
  const report=async(input:Parameters<typeof createReport>[2])=>{const reason=window.prompt('Why are you reporting this?');if(reason?.trim())await createReport(apiBase,token,{...input,reason});};
  const deleteVideo=async()=>{if(!window.confirm(`Delete “${post.title}”?`))return;if(canModerate){const reason=window.prompt('Reason shown to the creator and saved in the admin log:','Removed directly by an admin.');if(reason===null)return;await adminDeletePost(apiBase,token,post.id,reason);}else await deletePost(apiBase,token,post.id);onDeleted();};
  return (
    <div className={`post-with-comments ${commentsVisible ? 'comments-open' : ''}`}>
    <article className="feed-post panel">
      <div className="post-head">
        <div className="creator-line">
          <button className="creator-link" onClick={() => onProfile(post.author.id)}><UserAvatar apiBase={apiBase} user={post.author} /><span><UserName apiBase={apiBase} user={post.author}/><small>{post.author.followerCount} followers</small></span></button>
          {post.author.id !== viewer.id && <button className={post.author.followedByViewer ? 'following' : 'follow'} onClick={async () => {
            const { user } = await toggleFollow(apiBase, token, post.author.id);
            onPost({ ...post, author: user });
          }}>{post.author.followedByViewer ? 'Following' : 'Follow'}</button>}
        </div>
        <div className="post-head-actions"><span>{new Date(post.createdAt).toLocaleString()}</span><AdminMenu label="Video options" mature={post.mature} onMature={canModerate?async()=>onPost((await adminSetPostMature(apiBase,token,post.id,!post.mature)).post):undefined} onDelete={canModerate||post.authorId===viewer.id?deleteVideo:undefined} onReport={!canModerate&&post.authorId!==viewer.id?()=>report({targetType:'post',postId:post.id,reason:''}):undefined}/></div>
      </div>
      <div className="video-title-row"><h2 className="video-post-title"><RichText apiBase={apiBase} text={post.title} onHash={onHash}/></h2>{post.mature&&<span className="mature-label">Mature</span>}<code title="Search this reference to find the video">{reference}</code><button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(shareUrl);setCopied(true);window.setTimeout(()=>setCopied(false),1600);}catch{window.prompt('Copy this video link:',shareUrl);}}}>{copied?'Copied':'Copy link'}</button></div>
      <div className="feed-scene" onClick={() => timeline.setPlaying(!timeline.playing)}>
        <SceneCanvas scene={post.scene} time={timeline.time} playing={timeline.playing} apiBase={apiBase} />
        {!timeline.playing && <div className="play-overlay">▶</div>}
      </div>
      <div className="post-actions">
        <div className="vote-control"><button className={post.likedByViewer ? 'liked' : ''} onClick={async () => onPost((await toggleLike(apiBase, token, post.id)).post)}>▲</button><strong className="net-likes">{post.likeCount}</strong><button className={post.dislikedByViewer ? 'disliked' : ''} onClick={async () => onPost((await toggleDislike(apiBase, token, post.id)).post)}>▼</button></div>
        <div className="post-secondary"><button onClick={() => timeline.setPlaying(!timeline.playing)}>{timeline.playing ? 'Pause' : 'Play'}</button><button className={commentsVisible ? 'active' : ''} onClick={() => setCommentsVisible((visible) => !visible)}>{post.commentCount} comments</button><span>{post.viewCount} views</span></div>
      </div>
    </article>
    {commentsVisible && <aside className="comments-panel panel">
      <div className="comments-head"><h2>Comments</h2><button onClick={() => setCommentsVisible(false)}>Close</button></div>
      <div className="comments">
        {post.comments.length === 0 && <p className="empty-comments">No comments yet.</p>}
        {post.comments.map((entry) => (
          <div className="comment" key={entry.id}>
            <UserAvatar apiBase={apiBase} user={entry.user} small />
            <div className="comment-content">
              <span><button className="inline-user" onClick={() => onProfile(entry.user?.id || entry.userId)}><UserName apiBase={apiBase} compact user={entry.user} fallbackId={entry.userId}/></button> <RichText apiBase={apiBase} text={entry.text}/></span>
              {entry.stickerAssetId && <img className="comment-sticker" src={mediaUrl(apiBase, entry.stickerAssetId)} alt="Sticker" loading="lazy" />}
              <div className="comment-meta">
                <time>{new Date(entry.createdAt).toLocaleString()}</time>
                <button className={entry.likedByViewer ? 'liked' : ''} onClick={async () => onPost((await toggleCommentReaction(apiBase, token, post.id, entry.id, 'like')).post)}>▲</button>
                <strong>{entry.likeCount}</strong>
                <button className={entry.dislikedByViewer ? 'disliked' : ''} onClick={async () => onPost((await toggleCommentReaction(apiBase, token, post.id, entry.id, 'dislike')).post)}>▼</button>
                <AdminMenu label="Comment options" onDelete={canModerate||entry.userId===viewer.id?async()=>{if(!window.confirm('Delete this comment?'))return;if(canModerate){const reason=window.prompt('Reason shown to the commenter and saved in the admin log:','Removed directly by an admin.');if(reason===null)return;await adminDeleteComment(apiBase,token,post.id,entry.id,reason);}else await deleteComment(apiBase,token,post.id,entry.id);await refreshPost();}:undefined} onReport={!canModerate&&entry.userId!==viewer.id?()=>report({targetType:'comment',postId:post.id,commentId:entry.id,reason:''}):undefined}/>
              </div>
            </div>
          </div>
        ))}
        {post.commentsHasMore&&<button className="load-more" onClick={async()=>{const result=await getComments(apiBase,token,post.id,post.comments.length,24);onPost({...post,comments:[...post.comments,...result.comments],commentsHasMore:result.hasMore,commentsTotal:result.total});}}>Load more comments</button>}
      </div>
      <form className="comment-box" onSubmit={async (event) => {
        event.preventDefault();
        if (!comment.trim() && !sticker) return;
        try {
          await addComment(apiBase, token, post.id, comment, sticker?.id);
          setComment('');
          setSticker(null);
          setStickersVisible(false);
          await refreshPost();
        } catch (error) {
          window.alert(error instanceof Error ? error.message : 'Comment failed.');
        }
      }}>
        {sticker && <div className="selected-sticker"><img src={mediaUrl(apiBase, sticker.id)} alt="Selected sticker" /><button type="button" onClick={() => setSticker(null)}>Remove</button></div>}
        <div className="comment-compose"><input value={comment} maxLength={500} placeholder="Add a comment" onChange={(event) => setComment(event.target.value)} /><EmojiButton apiBase={apiBase} placement="up" onInsert={(code)=>setComment((value)=>(value+code).slice(0,500))}/><button type="button" className={stickersVisible ? 'active' : ''} onClick={() => setStickersVisible((visible) => !visible)}>Sticker</button><button>Comment</button></div>
      </form>
      {stickersVisible && <AssetLibrary apiBase={apiBase} token={token} viewer={viewer} isAdmin={canModerate} sections={['image', 'gif']} title="Stickers" selectedId={sticker?.id} onSelect={(asset) => setSticker(asset)} />}
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
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [search, setSearch] = useState(() => localStorage.getItem('lynesque-search') || '');
  const [catalogueQuery,setCatalogueQuery]=useState<string|null>(null);const [history,setHistory]=useState<Post[]>([]);const [historyIndex,setHistoryIndex]=useState(0);
  const arrowSide = localStorage.getItem('lynesque-arrow-side') === 'right' ? 'right' : 'left';

  const loadRecommended=async(reset=false)=>{try{if(reset){const result=await getFeed(apiBase,token,[]);const first=result.posts[0]||null;setHistory(first?[first]:[]);setHistoryIndex(0);setPost(first);setOffset(0);setTotal(result.total);setVideoNumber('1');setCatalogueQuery(null);setStatus(first?'':'No videos yet.');return;}if(historyIndex+1<history.length){const next=historyIndex+1;setHistoryIndex(next);setPost(history[next]);setOffset(next);setVideoNumber(String(next+1));return;}const result=await getFeed(apiBase,token,history.map((item)=>item.id));const nextPost=result.posts[0];if(nextPost){const next=[...history,nextPost];setHistory(next);setHistoryIndex(next.length-1);setPost(nextPost);setOffset(next.length-1);setVideoNumber(String(next.length));setTotal(result.total);}}catch(error){setStatus(error instanceof Error?error.message:'Feed failed.');}};
  const loadCatalogue=async(nextOffset:number,query=catalogueQuery??'')=>{try{const result=await searchVideos(apiBase,token,query,nextOffset,1);setCatalogueQuery(query);setPost(result.posts[0]||null);setOffset(result.posts.length?result.offset:Math.max(0,Math.min(nextOffset,result.total-1)));setTotal(result.total);setVideoNumber(String(result.posts.length?result.offset+1:1));setStatus(result.posts.length?(query?`Search: ${query}`:''):'No videos matched that search.');}catch(error){setStatus(error instanceof Error?error.message:'Search failed.');}};

  const openPost = async (postId: string) => {
    try {
      const result = await getPost(apiBase, token, postId);
      setPost(result.post);
      setCatalogueQuery('');
      setOffset(result.offset);
      setTotal(result.total);
      setVideoNumber(String(result.offset + 1));
      setStatus('');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Video failed to load.');
    }
  };

  useEffect(() => { const pending = localStorage.getItem('lynesque-search'); if (pending) { setSearch(pending); void runSearch(pending); } else if (initialPostId) void openPost(initialPostId); else void loadRecommended(true); }, [apiBase, token, refreshToken, initialPostId]);

  const jumpToVideo = () => {
    const number = Math.max(1, Math.min(total, Math.floor(Number(videoNumber) || 1)));
    setVideoNumber(String(number));
    void loadCatalogue(number - 1,'');
  };
  const runSearch = async (value = search) => {localStorage.removeItem('lynesque-search');await loadCatalogue(0,value);};
  const hashtag = (tag: string) => { setSearch(tag);void runSearch(tag); };
  const previous=()=>{if(catalogueQuery!==null)void loadCatalogue(Math.max(0,offset-1));else if(historyIndex>0){const next=historyIndex-1;setHistoryIndex(next);setOffset(next);setVideoNumber(String(next+1));setPost(history[next]);}};
  const next=()=>{if(catalogueQuery!==null)void loadCatalogue(offset+1);else void loadRecommended(false);};

  return (
    <div className={`feed-page ${notificationsVisible ? 'with-notifications' : ''}`}>
      {notificationsVisible ? <Notifications apiBase={apiBase} token={token} onUnreadCount={onUnreadCount} onOpenPost={openPost} onProfile={onProfile} onHide={() => setNotificationsVisible(false)} /> : <button className="show-notifications" onClick={() => setNotificationsVisible(true)}>Show notifications</button>}
      <div className="feed-main">
      <div className="feed-tools panel">
        <form className="video-search" onSubmit={(event)=>{event.preventDefault();runSearch();}}><input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Search titles or #hashtags"/><button>Search</button></form>
        {total ? <form className="video-jump" onSubmit={(event) => { event.preventDefault(); jumpToVideo(); }}>
          <span>Video</span><input aria-label="Video number" type="number" min="1" max={total} value={videoNumber} onChange={(event) => setVideoNumber(event.target.value)} /><span>of {total}</span><button type="submit">Go</button>
        </form> : <span>No videos yet.</span>}
        <button onClick={() => catalogueQuery!==null?loadCatalogue(offset):loadRecommended(true)}>Refresh</button>
        {user.id === 'lynesque' && <button onClick={async () => { const result = await runShitTok(apiBase, token); setStatus(`shit-tok: ${JSON.stringify(result)}`); await loadRecommended(true); }}>Run shit-tok</button>}
      </div>
      {status && <div className="status">{status}</div>}
      {post && <div className={`feed-viewer arrows-${arrowSide}`}><div className="video-arrows"><button aria-label="Previous video" title="Previous video" disabled={catalogueQuery!==null?offset<=0:historyIndex<=0} onClick={previous}>▲</button><button aria-label="Next video" title="Next video" disabled={catalogueQuery!==null?offset+1>=total:history.length>=total&&historyIndex+1>=history.length} onClick={next}>▼</button></div><FeedPost key={post.id} apiBase={apiBase} token={token} viewer={user} post={post} commentsVisible={commentsVisible} setCommentsVisible={setCommentsVisible} onPost={setPost} onDeleted={()=>catalogueQuery!==null?loadCatalogue(Math.max(0,Math.min(offset,total-2))):loadRecommended(true)} onProfile={onProfile} onHash={hashtag} /></div>}
      </div>
    </div>
  );
}
