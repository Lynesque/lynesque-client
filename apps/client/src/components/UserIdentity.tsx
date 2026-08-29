import { avatarUrl } from '../api';
import type { User } from '../types';

export function UserAvatar({ apiBase, user, small = false }: { apiBase: string; user?: User; small?: boolean }) {
  return <span className={`mini-avatar ${small ? 'small' : ''}`}>
    {user?.avatarAssetId ? <img src={avatarUrl(apiBase, user.avatarAssetId)} alt="" loading="lazy" /> : <span>{user?.displayName.slice(0, 1).toUpperCase() || '?'}</span>}
  </span>;
}

export function UserBadges({ user }: { user?: User }) {
  if (!user) return null;
  return <span className="user-badges">
    {user.isVerified && <span className="verified-badge" title="Verified account" aria-label="Verified account">✓</span>}
    {user.isMegaAdmin ? <span className="mega-admin-badge">SUPER AWESOME MEGA ADMIN</span> : user.isAdmin ? <span className="admin-badge">ADMIN</span> : null}
  </span>;
}

export function UserName({ user, fallbackId }: { user?: User; fallbackId?: string }) {
  return <span className="user-name">@{user?.displayName || fallbackId || 'unknown'} <UserBadges user={user} /></span>;
}
