import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import Header from './components/Header.jsx';
import HomePage from './components/HomePage.jsx';
import AuthModal from './components/AuthModal.jsx';
import JoinRoomModal from './components/JoinRoomModal.jsx';
import LobbyScreen from './components/LobbyScreen.jsx';
import GameScreen from './components/GameScreen.jsx';
import LocalSetup from './components/LocalSetup.jsx';
import ProfilePage from './components/ProfilePage.jsx';
import LeaderboardPage from './components/LeaderboardPage.jsx';
import useCurrentUser from './hooks/useCurrentUser.js';
import useRoom from './hooks/useRoom.js';
import { firebaseConfigured } from './firebase/client.js';
import { createGame, moveToken as moveLocalToken, rollDice as rollLocalDice } from './game/ludoEngine.js';
import { createRoom, joinRoom, leaveRoom, moveRoomToken, restartRoom, rollRoomDice, setPlayerReady, startRoom } from './services/roomService.js';
import { getLeaderboard } from './services/playerService.js';
import { logout } from './services/authService.js';

export default function App() {
  const { user, loading } = useCurrentUser();
  const [screen, setScreen] = useState('home');
  const [authOpen, setAuthOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState('');
  const [roomId, setRoomId] = useState('');
  const [localGame, setLocalGame] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [sound, setSound] = useState(() => localStorage.getItem('ludo-sound') !== 'off');
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState('');
  const { room, error: roomError } = useRoom(roomId, user);

  const notify = useCallback((message) => {
    setToast(message);
    window.clearTimeout(notify.timeout);
    notify.timeout = window.setTimeout(() => setToast(''), 4800);
  }, []);

  useEffect(() => {
    if (roomError) notify(roomError);
  }, [roomError, notify]);

  useEffect(() => {
    if (room?.status === 'playing' || room?.status === 'finished') setScreen('onlineGame');
    else if (room && screen === 'onlineGame' && room.status === 'waiting') setScreen('lobby');
  }, [room, screen]);

  useEffect(() => {
    if (!pendingAction || !user) return;
    const action = pendingAction;
    setPendingAction('');
    if (action === 'join') setJoinOpen(true);
    else if (action === 'create') createOnlineRoom();
    else if (action === 'leaderboard') setScreen('leaderboard');
  }, [pendingAction, user]);

  useEffect(() => {
    if (!user || !firebaseConfigured) {
      setLeaderboard([]);
      setLeaderboardLoading(false);
      return;
    }
    let active = true;
    setLeaderboardLoading(true);
    getLeaderboard().then((players) => {
      if (active) {
        setLeaderboard(players);
        setLeaderboardError('');
      }
    }).catch((error) => {
      if (active) setLeaderboardError(error.message || 'Leaderboard could not be loaded.');
    }).finally(() => { if (active) setLeaderboardLoading(false); });
    return () => { active = false; };
  }, [user, room?.game?.status]);

  const playerIdentity = useCallback(() => ({
    name: user?.displayName || user?.email?.split('@')[0] || 'Player',
    photoURL: user?.photoURL || '',
  }), [user]);

  async function createOnlineRoom() {
    if (!firebaseConfigured) {
      notify('Online play is not configured yet. Add Firebase values to .env and deploy the Cloud Functions.');
      return;
    }
    if (!user) {
      setPendingAction('create');
      setAuthOpen(true);
      return;
    }
    setBusy(true);
    try {
      const created = await createRoom(playerIdentity());
      setRoomId(created.roomId);
      setScreen('lobby');
    } catch (error) {
      notify(error.message || 'Room could not be created.');
    } finally {
      setBusy(false);
    }
  }

  function openJoin() {
    if (!firebaseConfigured) {
      notify('Online play is not configured yet. Add Firebase values to .env and deploy the Cloud Functions.');
      return;
    }
    if (!user) {
      setPendingAction('join');
      setAuthOpen(true);
      return;
    }
    setJoinOpen(true);
  }

  async function submitJoin(code) {
    if (!user) throw new Error('Sign in before joining a room.');
    setBusy(true);
    try {
      const joined = await joinRoom(code, playerIdentity());
      setRoomId(joined.roomId);
      setJoinOpen(false);
      setScreen('lobby');
    } finally {
      setBusy(false);
    }
  }

  function startLocal(players) {
    setLocalGame(createGame(players));
    setScreen('localGame');
  }

  async function setReady(ready) {
    if (!roomId) return;
    setBusy(true);
    try { await setPlayerReady(roomId, ready); }
    catch (error) { notify(error.message || 'Could not update ready status.'); }
    finally { setBusy(false); }
  }

  async function startOnlineGame() {
    if (!roomId) return;
    setBusy(true);
    try { await startRoom(roomId); }
    catch (error) { notify(error.message || 'The game could not start.'); }
    finally { setBusy(false); }
  }

  async function rollGameDice() {
    if (screen === 'localGame') {
      setLocalGame((game) => rollLocalDice(game));
      return;
    }
    if (roomId) {
      setBusy(true);
      try { await rollRoomDice(roomId); }
      finally { setBusy(false); }
    }
  }

  async function moveGameToken(tokenIndex) {
    if (screen === 'localGame') {
      setLocalGame((game) => moveLocalToken(game, tokenIndex));
      return;
    }
    if (roomId) {
      setBusy(true);
      try { await moveRoomToken(roomId, tokenIndex); }
      finally { setBusy(false); }
    }
  }

  async function exitCurrentGame() {
    if (roomId) {
      setBusy(true);
      try { await leaveRoom(roomId); }
      catch (error) { notify(error.message || 'Could not leave the room cleanly.'); }
      finally { setBusy(false); }
    }
    setRoomId('');
    setLocalGame(null);
    setScreen('home');
  }

  async function restartCurrentGame() {
    if (screen === 'localGame') {
      setLocalGame(createGame(localGame.players.map(({ uid, name, photoURL, color }) => ({ uid, name, photoURL, color }))));
      return;
    }
    if (roomId) {
      setBusy(true);
      try { await restartRoom(roomId); }
      finally { setBusy(false); }
    }
  }

  async function signOut() {
    try { await logout(); setScreen('home'); }
    catch (error) { notify(error.message || 'Could not sign out.'); }
  }

  function navigate(target) {
    if (target === 'how') {
      setScreen('home');
      window.setTimeout(() => document.getElementById('how-to-play')?.scrollIntoView({ behavior: 'smooth' }), 0);
    } else if (target === 'leaderboard') {
      if (!user) {
        setPendingAction('leaderboard');
        setAuthOpen(true);
      } else setScreen('leaderboard');
    } else {
      setScreen('home');
    }
  }

  function showSignIn() {
    setAuthOpen(true);
  }

  function toggleSound(enabled) {
    setSound(enabled);
    localStorage.setItem('ludo-sound', enabled ? 'on' : 'off');
  }

  const game = screen === 'localGame' ? localGame : room?.game;
  const onlineScreen = screen === 'lobby' || screen === 'onlineGame';
  const isWinner = game?.status === 'finished';

  if (loading) return <div className="app-loading"><span className="brand-mark"><span /><span /><span /><span /></span><p>Setting up the table…</p></div>;

  return (
    <div className="app-shell">
      {screen !== 'localGame' && screen !== 'onlineGame' && <Header user={user} onLogin={showSignIn} onLogout={signOut} onProfile={() => setScreen('profile')} onNavigate={navigate} />}
      {screen === 'home' && <HomePage user={user} onPlay={() => setScreen('setup')} onCreate={createOnlineRoom} onJoin={openJoin} leaderboard={leaderboard} onLeaderboard={() => navigate('leaderboard')} statsLoading={leaderboardLoading} firebaseConfigured={firebaseConfigured} />}
      {screen === 'setup' && <LocalSetup onStart={startLocal} onBack={() => setScreen('home')} />}
      {screen === 'profile' && user && <ProfilePage user={user} onBack={() => setScreen('home')} />}
      {screen === 'leaderboard' && <LeaderboardPage players={leaderboard} loading={leaderboardLoading} error={leaderboardError || (!user ? 'Sign in to view verified multiplayer standings.' : '')} onBack={() => setScreen('home')} />}
      {screen === 'lobby' && <LobbyScreen room={room} user={user} busy={busy} onReady={setReady} onStart={startOnlineGame} onLeave={exitCurrentGame} onError={notify} />}
      {onlineScreen && roomError && !room && <div className="room-error-panel"><AlertCircle size={20} /><p>{roomError}</p><button className="button button-outline" onClick={exitCurrentGame} type="button">Return to arena</button></div>}
      {(screen === 'localGame' || screen === 'onlineGame') && game && (
        <GameScreen
          game={game}
          user={user}
          local={screen === 'localGame'}
          busy={busy}
          sound={sound}
          onSound={toggleSound}
          onRoll={rollGameDice}
          onMove={moveGameToken}
          onExit={exitCurrentGame}
          onRestart={restartCurrentGame}
          onError={notify}
        />
      )}
      {screen === 'onlineGame' && !game && !roomError && <div className="screen-loading"><span className="brand-mark"><span /><span /><span /><span /></span> Waiting for the game state…</div>}
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
      {joinOpen && <JoinRoomModal onClose={() => setJoinOpen(false)} onJoin={submitJoin} busy={busy} />}
      {toast && <div className="toast-message" role="status"><AlertCircle size={17} /><span>{toast}</span><button type="button" onClick={() => setToast('')} aria-label="Dismiss message"><X size={15} /></button></div>}
      {screen !== 'home' && screen !== 'localGame' && screen !== 'onlineGame' && screen !== 'lobby' && <footer className="site-footer footer-compact"><span className="brand-mini">LUDO <em>ARENA</em></span><span>Made for the joy of one more game.</span></footer>}
      {isWinner && screen === 'onlineGame' && <span className="sr-only">Game complete</span>}
    </div>
  );
}
