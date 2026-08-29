export type AssetKind = 'image' | 'video' | 'audio';

export interface AssetRecord {
  id: string;
  sha256: string;
  originalName: string;
  mime: string;
  kind: AssetKind;
  bytes: number;
  createdAt: string;
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

export type NotificationKind = 'post_like' | 'post_dislike' | 'follow' | 'comment_mention' | 'video_mention' | 'comment' | 'comment_like' | 'comment_dislike';

export interface Notification {
  id: string;
  actorId: string;
  actor?: User;
  kind: NotificationKind;
  postId?: string;
  commentId?: string;
  createdAt: string;
  readAt?: string;
}

export interface Post {
  id: string;
  authorId: string;
  author: User;
  scene: Scene;
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

export interface Profile {
  user: User;
  totalLikes: number;
  posts: Post[];
  isOwnProfile: boolean;
}
