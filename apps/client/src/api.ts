import type { AdminLog, AssetRecord, BoardPost, Notification, NotificationPreferences, Post, Profile, Report, Scene, Suspension, User } from './types';

const queryApi = new URLSearchParams(window.location.search).get('api');
export const publicApiBases = ['https://lyneque.com', 'https://lynesque.com'] as const;
export const defaultApiBase = (window.location.protocol === 'http:' || window.location.protocol === 'https:'
  ? window.location.origin
  : queryApi || publicApiBases[0]).replace(/\/$/, '');

export async function resolveApiBase() {
  if (window.location.protocol === 'http:' || window.location.protocol === 'https:' || queryApi) return defaultApiBase;
  for (const candidate of publicApiBases) {
    try {
      const response = await fetch(`${candidate}/api/health`, { signal: AbortSignal.timeout(2500) });
      if (response.ok) return candidate;
    } catch (_) {}
  }
  return publicApiBases[0];
}

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

export async function uploadAsset(apiBase: string, token: string, file: File, displayName = file.name) {
  return parse<{ asset: AssetRecord; deduplicated: boolean;pending?:boolean;message?:string }>(await fetch(`${apiBase}/api/assets`, {
    method: 'POST', headers: { ...authHeaders(token), 'Content-Type': file.type || 'application/octet-stream', 'X-File-Name': encodeURIComponent(displayName) }, body: file
  }));
}

export async function getAssets(apiBase: string, token: string, offset=0,limit=36,query='',section='') {
  return parse<{ assets: AssetRecord[];total:number;hasMore:boolean }>(await fetch(`${apiBase}/api/assets?offset=${offset}&limit=${limit}&q=${encodeURIComponent(query)}&section=${encodeURIComponent(section)}`, { headers: authHeaders(token) }));
}

export async function getFeed(apiBase: string, token: string, exclude:string[] = []) {
  return parse<{ posts: Post[]; offset: number; total: number; hasMore: boolean }>(await fetch(`${apiBase}/api/feed?limit=1&exclude=${encodeURIComponent(exclude.join(','))}`, { headers: authHeaders(token) }));
}

export async function getPost(apiBase: string, token: string, postId: string) {
  return parse<{ post: Post; offset: number; total: number }>(await fetch(`${apiBase}/api/posts/${encodeURIComponent(postId)}`, { headers: authHeaders(token) }));
}
export async function deletePost(apiBase:string,token:string,postId:string){return parse<{ok:boolean}>(await fetch(`${apiBase}/api/posts/${encodeURIComponent(postId)}`,{method:'DELETE',headers:authHeaders(token)}));}

export async function createPost(apiBase: string, token: string, scene: Scene, title = 'New Video') {
  return parse<{ post: Post;pending?:boolean;message?:string }>(await fetch(`${apiBase}/api/posts`, {
    method: 'POST', headers: authHeaders(token, true), body: JSON.stringify({ scene, title })
  }));
}
export async function searchVideos(apiBase: string, token: string, query: string,offset=0,limit=1) { return parse<{ posts: Post[];offset:number;total:number;hasMore:boolean }>(await fetch(`${apiBase}/api/search/videos?q=${encodeURIComponent(query)}&offset=${offset}&limit=${limit}`, { headers: authHeaders(token) })); }
export async function getBoardPosts(apiBase: string, token: string,offset=0,limit=20) { return parse<{ posts: BoardPost[];offset:number;total:number;hasMore:boolean }>(await fetch(`${apiBase}/api/postboard?offset=${offset}&limit=${limit}`, { headers: authHeaders(token) })); }
export async function createBoardPost(apiBase: string, token: string, text: string, stickerAssetId?: string) { return parse<{ post: BoardPost }>(await fetch(`${apiBase}/api/postboard`, {method:'POST',headers:authHeaders(token,true),body:JSON.stringify({text,stickerAssetId})})); }
export async function toggleBoardReaction(apiBase:string,token:string,id:string,reaction:'like'|'dislike'){return parse<{post:BoardPost}>(await fetch(`${apiBase}/api/postboard/${id}/${reaction}`,{method:'POST',headers:authHeaders(token)}));}
export async function addBoardComment(apiBase:string,token:string,id:string,text:string,stickerAssetId?:string){return parse<{comment:unknown}>(await fetch(`${apiBase}/api/postboard/${id}/comments`,{method:'POST',headers:authHeaders(token,true),body:JSON.stringify({text,stickerAssetId})}));}
export async function toggleBoardCommentReaction(apiBase:string,token:string,id:string,commentId:string,reaction:'like'|'dislike'){return parse<{post:BoardPost}>(await fetch(`${apiBase}/api/postboard/${id}/comments/${commentId}/${reaction}`,{method:'POST',headers:authHeaders(token)}));}
export async function getBoardNotifications(apiBase:string,token:string,offset=0,limit=30){return parse<{notifications:Notification[];unreadCount:number;total:number;hasMore:boolean}>(await fetch(`${apiBase}/api/postboard/notifications?offset=${offset}&limit=${limit}`,{headers:authHeaders(token)}));}
export async function getBoardComments(apiBase:string,token:string,id:string,offset=0,limit=16){return parse<{comments:import('./types').Comment[];total:number;hasMore:boolean}>(await fetch(`${apiBase}/api/postboard/${id}/comments?offset=${offset}&limit=${limit}`,{headers:authHeaders(token)}));}
export async function deleteBoardPost(apiBase:string,token:string,id:string){return parse<{ok:boolean}>(await fetch(`${apiBase}/api/postboard/${id}`,{method:'DELETE',headers:authHeaders(token)}));}
export async function deleteBoardComment(apiBase:string,token:string,id:string,commentId:string){return parse<{ok:boolean}>(await fetch(`${apiBase}/api/postboard/${id}/comments/${commentId}`,{method:'DELETE',headers:authHeaders(token)}));}
export async function markBoardNotificationsRead(apiBase:string,token:string){return parse<{ok:boolean}>(await fetch(`${apiBase}/api/postboard/notifications/read`,{method:'POST',headers:authHeaders(token)}));}
export async function clearBoardNotifications(apiBase:string,token:string){return parse<{ok:boolean;cleared:number}>(await fetch(`${apiBase}/api/postboard/notifications`,{method:'DELETE',headers:authHeaders(token)}));}

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

export async function getNotifications(apiBase: string, token: string,offset=0,limit=30) {
  return parse<{ notifications: Notification[]; unreadCount: number;total:number;hasMore:boolean }>(await fetch(`${apiBase}/api/notifications?offset=${offset}&limit=${limit}`, { headers: authHeaders(token) }));
}
export async function getComments(apiBase:string,token:string,postId:string,offset=0,limit=24){return parse<{comments:import('./types').Comment[];total:number;hasMore:boolean}>(await fetch(`${apiBase}/api/posts/${postId}/comments?offset=${offset}&limit=${limit}`,{headers:authHeaders(token)}));}
export async function deleteComment(apiBase:string,token:string,postId:string,commentId:string){return parse<{ok:boolean}>(await fetch(`${apiBase}/api/posts/${postId}/comments/${commentId}`,{method:'DELETE',headers:authHeaders(token)}));}

export async function markNotificationsRead(apiBase: string, token: string) {
  return parse<{ ok: boolean }>(await fetch(`${apiBase}/api/notifications/read`, { method: 'POST', headers: authHeaders(token) }));
}
export async function clearNotifications(apiBase:string,token:string){return parse<{ok:boolean;cleared:number}>(await fetch(`${apiBase}/api/notifications`,{method:'DELETE',headers:authHeaders(token)}));}
export async function getNotificationSettings(apiBase:string,token:string){return parse<{preferences:NotificationPreferences}>(await fetch(`${apiBase}/api/settings/notifications`,{headers:authHeaders(token)}));}
export async function setNotificationSettings(apiBase:string,token:string,preferences:NotificationPreferences){return parse<{preferences:NotificationPreferences}>(await fetch(`${apiBase}/api/settings/notifications`,{method:'POST',headers:authHeaders(token,true),body:JSON.stringify({preferences})}));}
export async function createReport(apiBase:string,token:string,input:{targetType:import('./types').ReportTargetType;username?:string;assetId?:string;postId?:string;boardPostId?:string;commentId?:string;reason:string}){return parse<{report:Report}>(await fetch(`${apiBase}/api/reports`,{method:'POST',headers:authHeaders(token,true),body:JSON.stringify(input)}));}
export async function getAdminOverview(apiBase:string,token:string,limit=30){return parse<{reports:Report[];suspensions:Suspension[];logs:AdminLog[];pendingAssets:AssetRecord[];pendingPosts:Post[];hasMore:Record<string,boolean>}>(await fetch(`${apiBase}/api/admin/overview?limit=${limit}`,{headers:authHeaders(token)}));}
export async function setAdminRole(apiBase:string,token:string,userId:string,enabled:boolean){return parse<{user:User}>(await fetch(`${apiBase}/api/admin/users/${encodeURIComponent(userId)}/admin`,{method:'POST',headers:authHeaders(token,true),body:JSON.stringify({enabled})}));}
export async function setAccountStatus(apiBase:string,token:string,userId:string,status:import('./types').AccountStatus){return parse<{user:User}>(await fetch(`${apiBase}/api/admin/users/${encodeURIComponent(userId)}/status`,{method:'POST',headers:authHeaders(token,true),body:JSON.stringify({status})}));}
export async function resolvePending(apiBase:string,token:string,type:'asset'|'post',id:string,decision:'accepted'|'denied',reason=''){return parse<Record<string,unknown>>(await fetch(`${apiBase}/api/admin/review/${type}/${encodeURIComponent(id)}`,{method:'POST',headers:authHeaders(token,true),body:JSON.stringify({decision,reason})}));}
export async function restoreAdminActions(apiBase:string,token:string,userId:string){return parse<{user:User}>(await fetch(`${apiBase}/api/admin/users/${encodeURIComponent(userId)}/restore`,{method:'POST',headers:authHeaders(token)}));}
export async function suspendUser(apiBase:string,token:string,username:string,reason:string,hours:number){return parse<{suspension:Suspension}>(await fetch(`${apiBase}/api/admin/suspensions`,{method:'POST',headers:authHeaders(token,true),body:JSON.stringify({username,reason,hours})}));}
export async function unsuspendUser(apiBase:string,token:string,userId:string){return parse<{ok:boolean}>(await fetch(`${apiBase}/api/admin/suspensions/${encodeURIComponent(userId)}/clear`,{method:'POST',headers:authHeaders(token)}));}
export async function resolveReport(apiBase:string,token:string,reportId:string,status:'accepted'|'denied',reason:string,suspensionHours:number){return parse<{report:Report}>(await fetch(`${apiBase}/api/admin/reports/${encodeURIComponent(reportId)}/resolve`,{method:'POST',headers:authHeaders(token,true),body:JSON.stringify({status,reason,suspensionHours})}));}
async function adminDelete(apiBase:string,token:string,path:string,reason:string){return parse<{ok:boolean}>(await fetch(`${apiBase}${path}`,{method:'DELETE',headers:authHeaders(token,true),body:JSON.stringify({reason})}));}
export const adminDeleteAsset=(apiBase:string,token:string,id:string,reason:string)=>adminDelete(apiBase,token,`/api/admin/assets/${encodeURIComponent(id)}`,reason);
export const adminDeletePost=(apiBase:string,token:string,id:string,reason:string)=>adminDelete(apiBase,token,`/api/admin/posts/${encodeURIComponent(id)}`,reason);
export const adminDeleteComment=(apiBase:string,token:string,postId:string,id:string,reason:string)=>adminDelete(apiBase,token,`/api/admin/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(id)}`,reason);
export const adminDeleteBoardPost=(apiBase:string,token:string,id:string,reason:string)=>adminDelete(apiBase,token,`/api/admin/postboard/${encodeURIComponent(id)}`,reason);
export const adminDeleteBoardComment=(apiBase:string,token:string,postId:string,id:string,reason:string)=>adminDelete(apiBase,token,`/api/admin/postboard/${encodeURIComponent(postId)}/comments/${encodeURIComponent(id)}`,reason);

export async function getProfile(apiBase: string, token: string, userId: string,offset=0,limit=20) {
  return parse<Profile>(await fetch(`${apiBase}/api/users/${encodeURIComponent(userId)}/profile?offset=${offset}&limit=${limit}`, { headers: authHeaders(token) }));
}
export async function searchUsers(apiBase:string,token:string,query:string){return parse<{users:User[]}>(await fetch(`${apiBase}/api/search/users?q=${encodeURIComponent(query)}`,{headers:authHeaders(token)}));}

export async function updateAvatar(apiBase: string, token: string, assetId: string) {
  return parse<{ user: User }>(await fetch(`${apiBase}/api/profile/avatar`, {
    method: 'POST', headers: authHeaders(token, true), body: JSON.stringify({ assetId })
  }));
}

export async function runShitTok(apiBase: string, token: string) {
  return parse<Record<string, unknown>>(await fetch(`${apiBase}/api/shittok/run`, { method: 'POST', headers: authHeaders(token) }));
}

export const mediaUrl = (apiBase: string, assetId: string) => `${apiBase}/media/${encodeURIComponent(assetId)}`;
export const avatarUrl = (apiBase: string, assetId: string) => `${apiBase}/avatar/${encodeURIComponent(assetId)}`;
