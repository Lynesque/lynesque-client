import { useEffect, useRef, useState } from 'react';
import { clearNotifications, getNotifications, markNotificationsRead } from '../api';
import type { Notification } from '../types';
import { UserAvatar, UserName } from './UserIdentity';

const messages: Record<Notification['kind'], string> = {
  post_like: 'liked your video',
  post_dislike: 'disliked your video',
  follow: 'followed you',
  unfollow: 'unfollowed you',
  comment_mention: 'mentioned you in a comment',
  video_mention: 'mentioned you in video text',
  comment: 'commented on your video',
  comment_like: 'liked your comment',
  comment_dislike: 'disliked your comment',
  board_like: 'liked your Postboard post',
  board_dislike: 'disliked your Postboard post',
  board_comment: 'commented on your Postboard post',
  board_mention: 'mentioned you in a Postboard post',
  board_comment_mention: 'mentioned you in a Postboard comment',
  board_comment_like: 'liked your Postboard comment',
  board_comment_dislike: 'disliked your Postboard comment',
  follow_video: 'posted a new video',
  follow_board: 'made a new Postboard post',
  following_video_comment: 'commented on a video',
  following_board_comment: 'commented on Postboard',
  asset_removed: 'had one of your assets taken down',
  content_removed: 'had some of your content taken down',
  admin_changed: 'changed your admin status',
  report_resolved: 'resolved your report',
  review_resolved: 'resolved one of your reviewed uploads',
  admin_rate_limited: 'was automatically blocked from admin actions',
  automatic_suspension: 'was automatically suspended by asset safety'
};

export function Notifications({ apiBase, token, onUnreadCount, onOpenPost, onProfile, onHide }: {
  apiBase: string; token: string; onUnreadCount: (count: number) => void; onOpenPost: (postId: string) => void; onProfile: (userId: string) => void; onHide: () => void;
}) {
  const [items, setItems] = useState<Notification[]>([]);
  const [hasMore,setHasMore]=useState(false);
  const highlighted = useRef(new Set<string>());

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const result = await getNotifications(apiBase, token);
        if (!active) return;
        for (const item of result.notifications) if (!item.readAt) highlighted.current.add(item.id);
        setItems((items)=>{const merged=[...result.notifications,...items.filter((item)=>!result.notifications.some((fresh)=>fresh.id===item.id))];setHasMore(merged.length<result.total);return merged;});
        if (result.unreadCount > 0) {
          await markNotificationsRead(apiBase, token);
          if (active) onUnreadCount(0);
        }
      } catch (_) {}
    };
    load();
    const timer = window.setInterval(load, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [apiBase, token]);

  const clear = async () => {
    if (!items.length || !window.confirm('Clear all feed notifications? This cannot be undone.')) return;
    await clearNotifications(apiBase, token); highlighted.current.clear(); setItems([]); onUnreadCount(0);
  };
  const loadOlder=async()=>{if(!hasMore)return;const result=await getNotifications(apiBase,token,items.length,30);setItems((current)=>[...current,...result.notifications]);setHasMore(result.hasMore);};

  return <aside className="notifications panel">
    <div className="notifications-head"><h2>Notifications</h2><div><button onClick={clear} disabled={!items.length}>Clear</button><button onClick={onHide}>Hide</button></div></div>
    {items.length === 0 && <p className="empty-notifications">Nothing here yet.</p>}
    <div className="notification-list" onScroll={(event)=>{const node=event.currentTarget;if(node.scrollTop+node.clientHeight>=node.scrollHeight-30)void loadOlder();}}>
      {items.map((item) => <div className={`notification ${highlighted.current.has(item.id) ? 'notification-new' : ''}`} key={item.id}>
        <button className="notification-avatar" onClick={() => onProfile(item.actor?.id || item.actorId)}><UserAvatar apiBase={apiBase} user={item.actor} small /></button>
        <button className="notification-body" onClick={() => item.postId ? onOpenPost(item.postId) : onProfile(item.actor?.id || item.actorId)}>
          <span>{item.message || <><strong><UserName apiBase={apiBase} compact user={item.actor} fallbackId={item.actorId}/></strong> {messages[item.kind]}</>}</span>
          <time>{new Date(item.createdAt).toLocaleString()}</time>
        </button>
      </div>)}
    </div>
    {hasMore&&<button className="load-more" onClick={loadOlder}>Load older</button>}
  </aside>;
}
