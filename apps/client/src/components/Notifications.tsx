import { useEffect, useRef, useState } from 'react';
import { getNotifications, markNotificationsRead, mediaUrl } from '../api';
import type { Notification } from '../types';

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
  admin_rate_limited: 'was automatically blocked from admin actions'
};

export function Notifications({ apiBase, token, onUnreadCount, onOpenPost, onProfile, onHide }: {
  apiBase: string; token: string; onUnreadCount: (count: number) => void; onOpenPost: (postId: string) => void; onProfile: (userId: string) => void; onHide: () => void;
}) {
  const [items, setItems] = useState<Notification[]>([]);
  const highlighted = useRef(new Set<string>());

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const result = await getNotifications(apiBase, token);
        if (!active) return;
        for (const item of result.notifications) if (!item.readAt) highlighted.current.add(item.id);
        setItems(result.notifications);
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

  return <aside className="notifications panel">
    <div className="notifications-head"><h2>Notifications</h2><button onClick={onHide}>Hide</button></div>
    {items.length === 0 && <p className="empty-notifications">Nothing here yet.</p>}
    <div className="notification-list">
      {items.map((item) => <div className={`notification ${highlighted.current.has(item.id) ? 'notification-new' : ''}`} key={item.id}>
        <button className="notification-avatar" onClick={() => onProfile(item.actor?.id || item.actorId)}>
          {item.actor?.avatarAssetId ? <img src={mediaUrl(apiBase, item.actor.avatarAssetId)} alt="" /> : (item.actor?.displayName || item.actorId).slice(0, 1).toUpperCase()}
        </button>
        <button className="notification-body" onClick={() => item.postId ? onOpenPost(item.postId) : onProfile(item.actor?.id || item.actorId)}>
          <span>{item.message || <><strong>@{item.actor?.displayName || item.actorId}</strong> {messages[item.kind]}</>}</span>
          <time>{new Date(item.createdAt).toLocaleString()}</time>
        </button>
      </div>)}
    </div>
  </aside>;
}
