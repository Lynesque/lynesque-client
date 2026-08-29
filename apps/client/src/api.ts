import type { AdminLog, AssetRecord, BoardPost, Notification, NotificationPreferences, Post, Profile, Report, Scene, Suspension, User } from './types';

const queryApi = new URLSearchParams(window.location.search).get('api');
export const defaultApiBase = (window.location.protocol === 'http:' || window.location.protocol === 'https:'
  ? window.location.origin
  : queryApi || 'https://lynesque.com').replace(/\/$/, '');

async function parse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `${response.status} ${response.statusText}`);
  return body as T;
}

const authHeaders = (token: string, json = false) => ({
  Authorization: `Bearer ${token}`,
  ...(json ? { 'Content-Type': 'application/json' } : {})
});

export async function register(apiBase: string, username: string, password: string) {
  return parse<{ user: User; token: string }>(await fetch(`${apiBase}/api/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password })
  }));
}

export async function login(apiBase: string, username: string, password: string) {
  return parse<{ user: User; token: string }>(await fetch(`${apiBase}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password })
  }));
}

export async function currentUser(apiBase: string, token: string) {
  return parse<{ user: User }>(await fetch(`${apiBase}/api/auth/me`, { headers: authHeaders(token) }));
}

export async function logout(apiBase: string, token: string) {
  return parse<{ ok: boolean }>(await fetch(`${apiBase}/api/auth/logout`, { method: 'POST', headers: authHeaders(token) }));
}

export async function uploadAsset(apiBase: string, token: string, file: File) {
  return parse<{ asset: AssetRecord; deduplicated: boolean }>(await fetch(`${apiBase}/api/assets`, {
    method: 'POST', headers: { ...authHeaders(token), 'Content-Type': file.type || 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name) }, body: file
  }));
}

export async function getAssets(apiBase: string, token: string) {
  return parse<{ assets: AssetRecord[] }>(await fetch(`${apiBase}/api/assets`, { headers: authHeaders(token) }));
}

export async function getFeed(apiBase: string, token: string, offset: number) {
  return parse<{ posts: Post[]; offset: number; total: number; hasMore: boolean }>(await fetch(`${apiBase}/api/feed?offset=${offset}&limit=1`, { headers: authHeaders(token) }));
}

export async function getPost(apiBase: string, token: string, postId: string) {
  return parse<{ post: Post; offset: number; total: number }>(await fetch(`${apiBase}/api/posts/${encodeURIComponent(postId)}`, { headers: authHeaders(token) }));
}
export async function deletePost(apiBase:string,token:string,postId:string){return parse<{ok:boolean}>(await fetch(`${apiBase}/api/posts/${encodeURIComponent(postId)}`,{method:'DELETE',headers:authHeaders(token)}));}

export async function createPost(apiBase: string, token: string, scene: Scene, title = 'New Video') {
  return parse<{ post: Post }>(await fetch(`${apiBase}/api/posts`, {
    method: 'POST', headers: authHeaders(token, true), body: JSON.stringify({ scene, title })
  }));
}
export async function searchVideos(apiBase: string, token: string, query: string) { return parse<{ posts: Post[] }>(await fetch(`${apiBase}/api/search/videos?q=${encodeURIComponent(query)}`, { headers: authHeaders(token) })); }
export async function getBoardPosts(apiBase: string, token: string) { return parse<{ posts: BoardPost[] }>(await fetch(`${apiBase}/api/postboard`, { headers: authHeaders(token) })); }
export async function createBoardPost(apiBase: string, token: string, text: string, stickerAssetId?: string) { return parse<{ post: BoardPost }>(await fetch(`${apiBase}/api/postboard`, {method:'POST',headers:authHeaders(token,true),body:JSON.stringify({text,stickerAssetId})})); }
export async function toggleBoardReaction(apiBase:string,token:string,id:string,reaction:'like'|'dislike'){return parse<{post:BoardPost}>(await fetch(`${apiBase}/api/postboard/${id}/${reaction}`,{method:'POST',headers:authHeaders(token)}));}
export async function addBoardComment(apiBase:string,token:string,id:string,text:string,stickerAssetId?:string){return parse<{comment:unknown}>(await fetch(`${apiBase}/api/postboard/${id}/comments`,{method:'POST',headers:authHeaders(token,true),body:JSON.stringify({text,stickerAssetId})}));}
export async function toggleBoardCommentReaction(apiBase:string,token:string,id:string,commentId:string,reaction:'like'|'dislike'){return parse<{post:BoardPost}>(await fetch(`${apiBase}/api/postboard/${id}/comments/${commentId}/${reaction}`,{method:'POST',headers:authHeaders(token)}));}
export async function getBoardNotifications(apiBase:string,token:string){return parse<{notifications:Notification[];unreadCount:number}>(await fetch(`${apiBase}/api/postboard/notifications`,{headers:authHeaders(token)}));}
export async function markBoardNotificationsRead(apiBase:string,token:string){return parse<{ok:boolean}>(await fetch(`${apiBase}/api/postboard/notifications/read`,{method:'POST',headers:authHeaders(token)}));}

export async function toggleLike(apiBase: string, token: string, postId: string) {
  return parse<{ post: Post }>(await fetch(`${apiBase}/api/posts/${postId}/like`, { method: 'POST', headers: authHeaders(token) }));
}

export async function toggleDislike(apiBase: string, token: string, postId: string) {
  return parse<{ post: Post }>(await fetch(`${apiBase}/api/posts/${postId}/dislike`, { method: 'POST', headers: authHeaders(token) }));
}

export async function toggleFollow(apiBase: string, token: string, userId: string) {
  return parse<{ user: User }>(await fetch(`${apiBase}/api/users/${encodeURIComponent(userId)}/follow`, { method: 'POST', headers: authHeaders(token) }));
}

export async function addComment(apiBase: string, token: string, postId: string, text: string, stickerAssetId?: string) {
  return parse<{ comment: unknown }>(await fetch(`${apiBase}/api/posts/${postId}/comments`, {
    method: 'POST', headers: authHeaders(token, true), body: JSON.stringify({ text, stickerAssetId })
  }));
}

export async function toggleCommentReaction(apiBase: string, token: string, postId: string, commentId: string, reaction: 'like' | 'dislike') {
  return parse<{ post: Post }>(await fetch(`${apiBase}/api/posts/${postId}/comments/${commentId}/${reaction}`, { method: 'POST', headers: authHeaders(token) }));
}

export async function getNotifications(apiBase: string, token: string) {
  return parse<{ notifications: Notification[]; unreadCount: number }>(await fetch(`${apiBase}/api/notifications`, { headers: authHeaders(token) }));
}

export async function markNotificationsRead(apiBase: string, token: string) {
  return parse<{ ok: boolean }>(await fetch(`${apiBase}/api/notifications/read`, { method: 'POST', headers: authHeaders(token) }));
}
export async function getNotificationSettings(apiBase:string,token:string){return parse<{preferences:NotificationPreferences}>(await fetch(`${apiBase}/api/settings/notifications`,{headers:authHeaders(token)}));}
export async function setNotificationSettings(apiBase:string,token:string,preferences:NotificationPreferences){return parse<{preferences:NotificationPreferences}>(await fetch(`${apiBase}/api/settings/notifications`,{method:'POST',headers:authHeaders(token,true),body:JSON.stringify({preferences})}));}
export async function createReport(apiBase:string,token:string,input:{targetType:'user'|'asset';username?:string;assetId?:string;reason:string}){return parse<{report:Report}>(await fetch(`${apiBase}/api/reports`,{method:'POST',headers:authHeaders(token,true),body:JSON.stringify(input)}));}
export async function getAdminOverview(apiBase:string,token:string){return parse<{reports:Report[];suspensions:Suspension[];logs:AdminLog[]}>(await fetch(`${apiBase}/api/admin/overview`,{headers:authHeaders(token)}));}
export async function setAdminRole(apiBase:string,token:string,userId:string,enabled:boolean){return parse<{user:User}>(await fetch(`${apiBase}/api/admin/users/${encodeURIComponent(userId)}/admin`,{method:'POST',headers:authHeaders(token,true),body:JSON.stringify({enabled})}));}
export async function restoreAdminActions(apiBase:string,token:string,userId:string){return parse<{user:User}>(await fetch(`${apiBase}/api/admin/users/${encodeURIComponent(userId)}/restore`,{method:'POST',headers:authHeaders(token)}));}
export async function suspendUser(apiBase:string,token:string,username:string,reason:string,hours:number){return parse<{suspension:Suspension}>(await fetch(`${apiBase}/api/admin/suspensions`,{method:'POST',headers:authHeaders(token,true),body:JSON.stringify({username,reason,hours})}));}
export async function unsuspendUser(apiBase:string,token:string,userId:string){return parse<{ok:boolean}>(await fetch(`${apiBase}/api/admin/suspensions/${encodeURIComponent(userId)}/clear`,{method:'POST',headers:authHeaders(token)}));}
export async function resolveReport(apiBase:string,token:string,reportId:string,status:'accepted'|'denied',reason:string,suspensionHours:number){return parse<{report:Report}>(await fetch(`${apiBase}/api/admin/reports/${encodeURIComponent(reportId)}/resolve`,{method:'POST',headers:authHeaders(token,true),body:JSON.stringify({status,reason,suspensionHours})}));}

export async function getProfile(apiBase: string, token: string, userId: string) {
  return parse<Profile>(await fetch(`${apiBase}/api/users/${encodeURIComponent(userId)}/profile`, { headers: authHeaders(token) }));
}

export async function updateAvatar(apiBase: string, token: string, assetId: string) {
  return parse<{ user: User }>(await fetch(`${apiBase}/api/profile/avatar`, {
    method: 'POST', headers: authHeaders(token, true), body: JSON.stringify({ assetId })
  }));
}

export async function runShitTok(apiBase: string, token: string) {
  return parse<Record<string, unknown>>(await fetch(`${apiBase}/api/shittok/run`, { method: 'POST', headers: authHeaders(token) }));
}

export const mediaUrl = (apiBase: string, assetId: string) => `${apiBase}/media/${encodeURIComponent(assetId)}`;
