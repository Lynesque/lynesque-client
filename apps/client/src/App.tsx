import { useEffect, useState } from 'react';
import { currentUser, defaultApiBase, getNotifications, login, logout, register } from './api';
import { Composer } from './components/Composer';
import { Feed } from './components/Feed';
import { ProfileView } from './components/ProfileView';
import { Postboard } from './components/Postboard';
import type { User } from './types';
import { VolumeContext } from './volume';

type Tab = 'feed' | 'create' | 'profile' | 'postboard';

export default function App() {
  const [tab, setTab] = useState<Tab>('feed');
  const [token, setToken] = useState(() => localStorage.getItem('lynesque-token') || '');
  const [user, setUser] = useState<User | null>(null);
  const [profileId, setProfileId] = useState('');
  const [status, setStatus] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [volume, setVolume] = useState(() => Math.max(0, Math.min(1, Number(localStorage.getItem('lynesque-volume') ?? 0.8))));
  const [unreadCount, setUnreadCount] = useState(0);
  const [feedPostId, setFeedPostId] = useState<string>();

  const apiBase = defaultApiBase.replace(/\/$/, '');

  const acceptSession = (nextUser: User, nextToken: string) => {
    setUser(nextUser);
    setToken(nextToken);
    setProfileId(nextUser.id);
    localStorage.setItem('lynesque-token', nextToken);
  };

  useEffect(() => {
    localStorage.removeItem('lynesque-api');
    if (!token) return;
    currentUser(apiBase, token).then(({ user: restored }) => acceptSession(restored, token)).catch(() => {
      setToken('');
      localStorage.removeItem('lynesque-token');
    });
  }, []);

  useEffect(() => {
    if (!token || !user) return;
    const poll = () => getNotifications(apiBase, token).then((result) => setUnreadCount(result.unreadCount)).catch(() => {});
    poll();
    const timer = window.setInterval(poll, 5000);
    return () => window.clearInterval(timer);
  }, [apiBase, token, user?.id]);

  const openProfile = (userId: string) => {
    setProfileId(userId);
    setTab('profile');
  };

  const openFeedPost = (postId?: string) => {
    setFeedPostId(postId);
    setTab('feed');
  };

  const signOut = async () => {
    try { if (token) await logout(apiBase, token); } catch (_) {}
    localStorage.removeItem('lynesque-token');
    setToken('');
    setUser(null);
    setTab('feed');
  };

  if (!user || !token) {
    return <AuthScreen status={status} setStatus={setStatus} onSession={acceptSession} />;
  }

  return (
    <VolumeContext.Provider value={volume}>
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">lynesque.com <small>totally better than</small></div>
        <nav>
          <button className={tab === 'feed' ? 'active nav-feed' : 'nav-feed'} onClick={() => openFeedPost()}>
            Feed{unreadCount > 0 && <span className="unread-dot" title={`${unreadCount} unread notifications`} />}
          </button>
          <button className={tab === 'create' ? 'active' : ''} onClick={() => setTab('create')}>Create video</button>
          <button className={tab === 'postboard' ? 'active' : ''} onClick={() => setTab('postboard')}>Postboard</button>
          <button className={tab === 'profile' && profileId === user.id ? 'active' : ''} onClick={() => openProfile(user.id)}>Profile</button>
        </nav>
        <div className="identity">
          <label className="volume-control" title={`Volume ${Math.round(volume * 100)}%`}>
            <span>🔊</span>
            <input aria-label="Volume" type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => {
              const next = Number(event.target.value);
              setVolume(next);
              localStorage.setItem('lynesque-volume', String(next));
            }} />
          </label>
          <button className="user-link" onClick={() => openProfile(user.id)}>@{user.displayName}</button>
          <button onClick={signOut}>Log out</button>
        </div>
      </header>

      <main>
        {status && <div className="connection-status">{status}</div>}
        {tab === 'feed' && <Feed apiBase={apiBase} token={token} user={user} refreshToken={refreshToken} initialPostId={feedPostId} onUnreadCount={setUnreadCount} onProfile={openProfile} />}
        {tab === 'create' && <Composer apiBase={apiBase} token={token} onPosted={() => { setRefreshToken((n) => n + 1); setTab('feed'); }} />}
        {tab === 'postboard' && <Postboard apiBase={apiBase} token={token} user={user} onSearch={(tag) => { setFeedPostId(undefined); setTab('feed'); localStorage.setItem('lynesque-search', tag); }} />}
        {tab === 'profile' && <ProfileView apiBase={apiBase} token={token} userId={profileId || user.id} onUserChanged={(next) => setUser(next)} onProfile={openProfile} onOpenPost={openFeedPost} />}
      </main>
    </div>
    </VolumeContext.Provider>
  );
}

function AuthScreen({ status, setStatus, onSession }: {
  status: string; setStatus: (value: string) => void;
  onSession: (user: User, token: string) => void;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(mode === 'login' ? 'Signing in...' : 'Creating account...');
    try {
      const result = mode === 'login' ? await login(defaultApiBase, username, password) : await register(defaultApiBase, username, password);
      setStatus('');
      onSession(result.user, result.token);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not connect.');
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-panel panel" onSubmit={submit}>
        <div className="brand auth-brand">lynesque.com <small>totally better than</small></div>
        <h2>{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
        <label>Username<input autoFocus value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" /></label>
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
        {status && <div className="status">{status}</div>}
        <button className="primary" type="submit">{mode === 'login' ? 'Sign in' : 'Create account'}</button>
        <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setStatus(''); }}>
          {mode === 'login' ? 'Create an account' : 'Use an existing account'}
        </button>
      </form>
    </div>
  );
}
