import { avatarUrl } from '../api';
import type { User } from '../types';

export function UserAvatar({ apiBase, user, small = false }: { apiBase: string; user?: User; small?: boolean }) {
  return <span className={`mini-avatar ${small ? 'small' : ''}`}>
    {user?.avatarAssetId ? <img src={avatarUrl(apiBase, user.avatarAssetId)} alt="" loading="lazy" /> : <span>{user?.displayName.slice(0, 1).toUpperCase() || '?'}</span>}
  </span>;
}

export function UserBadges({ user, compact = false }: { user?: User;compact?:boolean }) {
  if (!user) return null;
  return <span className="user-badges">
    {user.isVerified && <span className="verified-badge" title="Verified account" aria-label="Verified account">✓</span>}
    {user.isMegaAdmin ? <span className="mega-admin-badge" title="Super Awesome Mega Admin">{compact?'SAMA':'SUPER AWESOME MEGA ADMIN'}</span> : user.isAdmin ? <span className="admin-badge">ADMIN</span> : null}
  </span>;
}

export function UserName({ user, fallbackId, compact = false }: { user?: User; fallbackId?: string;compact?:boolean }) {
  return <span className="user-name">@{user?.displayName || fallbackId || 'unknown'} <UserBadges user={user} compact={compact}/></span>;
}
