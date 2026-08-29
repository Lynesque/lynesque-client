export type AssetKind = 'image' | 'video' | 'audio';

export interface AssetRecord {
  id: string;
  sha256: string;
  originalName: string;
  mime: string;
  kind: AssetKind;
  bytes: number;
  createdAt: string;
  uploaderId?: string;
}

export interface TransformKeyframe {
  time: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity?: number;
}

export interface AssetLayer {
  id: string;
  kind: 'asset';
  assetId: string;
  assetKind?: AssetKind;
  mime?: string;
  start: number;
  end: number;
  muted?: boolean;
  keyframes: [TransformKeyframe, TransformKeyframe];
}

export interface TextLayer {
  id: string;
  kind: 'text';
  text: string;
  start: number;
  end: number;
  fontSize: number;
  fontFamily?: string;
  fontWeight?: number;
  align?: 'left' | 'center' | 'right';
  keyframes: [TransformKeyframe, TransformKeyframe];
}

export type SceneLayer = AssetLayer | TextLayer;

export interface Scene {
  version: 1;
  duration: 7;
  background?: string;
  layers: SceneLayer[];
}

export interface User {
  id: string;
  displayName: string;
  isBot: boolean;
  avatarAssetId?: string;
  followerCount: number;
  followingCount: number;
  followedByViewer: boolean;
  createdAt?: string;
  isAdmin: boolean;
  isMegaAdmin: boolean;
  isVerified: boolean;
  adminBlockedUntil?: string;
  suspension?: { reason: string; until: string };
}

export interface Comment {
  id: string;
  userId: string;
  text: string;
  stickerAssetId?: string;
  sticker?: AssetRecord;
  createdAt: string;
  likeCount: number;
  upvoteCount: number;
  dislikeCount: number;
  likedByViewer: boolean;
  dislikedByViewer: boolean;
  user?: User;
}

export type NotificationKind = 'post_like'|'post_dislike'|'follow'|'unfollow'|'comment_mention'|'video_mention'|'comment'|'comment_like'|'comment_dislike'|'board_like'|'board_dislike'|'board_comment'|'board_mention'|'board_comment_mention'|'board_comment_like'|'board_comment_dislike'|'follow_video'|'follow_board'|'following_video_comment'|'following_board_comment'|'asset_removed'|'content_removed'|'admin_changed'|'report_resolved'|'admin_rate_limited'|'automatic_suspension';
export type NotificationPreferences = Record<NotificationKind, boolean>;

export interface Notification {
  id: string;
  actorId: string;
  actor?: User;
  kind: NotificationKind;
  postId?: string;
  boardPostId?: string;
  commentId?: string;
  reportId?: string;
  message?: string;
  createdAt: string;
  readAt?: string;
}

export interface Suspension { userId:string;reason:string;until:string;adminId:string;createdAt:string;updatedAt:string;user?:User; }
export interface Report { id:string;reporterId:string;targetType:'user'|'asset';targetUserId?:string;assetId?:string;reason:string;status:'pending'|'accepted'|'denied';createdAt:string;resolvedAt?:string;resolutionReason?:string;reporter?:User;targetUser?:User;asset?:AssetRecord; }
export interface AdminLog { id:string;adminId:string;action:string;targetUserId?:string;reason?:string;createdAt:string;admin?:User;targetUser?:User; }

export interface Post {
  id: string;
  authorId: string;
  author: User;
  scene: Scene;
  title: string;
  viewCount: number;
  likes: string[];
  likeCount: number;
  upvoteCount: number;
  dislikeCount: number;
  commentCount: number;
  likedByViewer: boolean;
  dislikedByViewer: boolean;
  comments: Comment[];
  createdAt: string;
}

export interface BoardPost {
  id: string; authorId: string; author: User; text: string; stickerAssetId?: string; sticker?: AssetRecord;
  likes: string[]; dislikes: string[]; likeCount: number; likedByViewer: boolean; dislikedByViewer: boolean;
  comments: Comment[]; createdAt: string;
}

export interface Profile {
  user: User;
  totalLikes: number;
  posts: Post[];
  isOwnProfile: boolean;
}
