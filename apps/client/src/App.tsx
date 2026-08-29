import { useEffect, useState } from 'react';
import { currentUser, getBoardNotifications, getNotifications, login, logout, register, resolveApiBase } from './api';
import { Composer } from './components/Composer';
import { Feed } from './components/Feed';
import { ProfileView } from './components/ProfileView';
import { Postboard } from './components/Postboard';
import { Settings } from './components/Settings';
import { Admin } from './components/Admin';
import type { User } from './types';
import { VolumeContext } from './volume';
import { UserAvatar, UserName } from './components/UserIdentity';

type Tab = 'feed' | 'create' | 'profile' | 'postboard' | 'settings' | 'admin';

export default function App() {
  const [tab, setTab] = useState<Tab>('feed');
  const [token, setToken] = useState(() => localStorage.getItem('lynesque-token') || '');
  const [user, setUser] = useState<User | null>(null);
  const [profileId, setProfileId] = useState('');
  const [status, setStatus] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [volume, setVolume] = useState(() => Math.max(0, Math.min(1, Number(localStorage.getItem('lynesque-volume') ?? 0.8))));
  const [unreadCount, setUnreadCount] = useState(0);
  const [boardUnreadCount, setBoardUnreadCount] = useState(0);
  const [suspensionAcknowledged, setSuspensionAcknowledged] = useState(false);
  const [feedPostId, setFeedPostId] = useState<string | undefined>(() => new URLSearchParams(window.location.search).get('video') || undefined);
  const [apiBase, setApiBase] = useState('');

  const acceptSession = (nextUser: User, nextToken: string) => {
    setUser(nextUser);
    setToken(nextToken);
    setProfileId(nextUser.id);
    localStorage.setItem('lynesque-token', nextToken);
    setSuspensionAcknowledged(false);
  };

  useEffect(() => {
    document.documentElement.style.setProperty('--ui-scale', localStorage.getItem('lynesque-ui-scale') || '1');
    localStorage.removeItem('lynesque-api');
    resolveApiBase().then(setApiBase);
  }, []);

  useEffect(() => {
    if (!apiBase || !token) return;
    currentUser(apiBase, token).then(({ user: restored }) => acceptSession(restored, token)).catch(() => {
      setToken('');
      localStorage.removeItem('lynesque-token');
    });
  }, [apiBase]);

  useEffect(() => {
    if (!token || !user) return;
    const poll = () => Promise.all([getNotifications(apiBase, token),getBoardNotifications(apiBase,token)]).then(([feed,board])=>{setUnreadCount(feed.unreadCount);setBoardUnreadCount(board.unreadCount);}).catch(() => {});
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

  if (!apiBase) return <div className="auth-page"><div className="auth-panel panel">Connecting to Lynesque…</div></div>;
  if (!user || !token) {
    return <AuthScreen apiBase={apiBase} status={status} setStatus={setStatus} onSession={acceptSession} />;
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
          <button className={tab === 'postboard' ? 'active nav-feed' : 'nav-feed'} onClick={() => setTab('postboard')}>Postboard{boardUnreadCount>0&&<span className="unread-dot"/>}</button>
          <button className={tab === 'profile' && profileId === user.id ? 'active' : ''} onClick={() => openProfile(user.id)}>Profile</button>
          <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>Settings</button>
          {user.isAdmin&&<button className={tab==='admin'?'active':''} onClick={()=>setTab('admin')}>Admin</button>}
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
          <button className="user-link topbar-user" onClick={() => openProfile(user.id)}><UserAvatar apiBase={apiBase} user={user} small/><UserName user={user}/></button>
          <button onClick={signOut}>Log out</button>
        </div>
      </header>

      <main>
        {status && <div className="connection-status">{status}</div>}
        {tab === 'feed' && <Feed apiBase={apiBase} token={token} user={user} refreshToken={refreshToken} initialPostId={feedPostId} onUnreadCount={setUnreadCount} onProfile={openProfile} />}
        {tab === 'create' && <Composer apiBase={apiBase} token={token} isAdmin={user.isAdmin} onPosted={() => { setRefreshToken((n) => n + 1); setTab('feed'); }} />}
        {tab === 'postboard' && <Postboard apiBase={apiBase} token={token} user={user} onUnreadCount={setBoardUnreadCount} onProfile={openProfile} onSearch={(tag) => { setFeedPostId(undefined); setTab('feed'); localStorage.setItem('lynesque-search', tag); }} />}
        {tab === 'profile' && <ProfileView apiBase={apiBase} token={token} viewer={user} userId={profileId || user.id} onUserChanged={(next) => setUser(next)} onProfile={openProfile} onOpenPost={openFeedPost} />}
        {tab==='settings'&&<Settings apiBase={apiBase} token={token} user={user}/>} 
        {tab==='admin'&&user.isAdmin&&<Admin apiBase={apiBase} token={token} user={user} onProfile={openProfile}/>} 
      </main>
      {user.suspension&&!suspensionAcknowledged&&<div className="modal-backdrop"><section className="suspension-modal panel"><h2>Account suspended</h2><p>You can browse, but interactive features are disabled until <strong>{new Date(user.suspension.until).toLocaleString()}</strong>.</p><p><strong>Reason:</strong> {user.suspension.reason}</p><button onClick={()=>setSuspensionAcknowledged(true)}>I understand</button></section></div>}
    </div>
    </VolumeContext.Provider>
  );
}

function AuthScreen({ apiBase, status, setStatus, onSession }: {
  apiBase:string; status: string; setStatus: (value: string) => void;
  onSession: (user: User, token: string) => void;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(mode === 'login' ? 'Signing in...' : 'Creating account...');
    try {
      const result = mode === 'login' ? await login(apiBase, username, password) : await register(apiBase, username, password);
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
