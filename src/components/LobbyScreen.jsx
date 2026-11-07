import { useState } from 'react';
import { ArrowLeft, Check, Copy, Crown, Link2, LoaderCircle, Play, ShieldCheck, Users } from 'lucide-react';

const COLOR_LABELS = { red: 'Ruby red', green: 'Forest green', yellow: 'Golden yellow', blue: 'Ocean blue' };

export default function LobbyScreen({ room, user, busy, onReady, onStart, onLeave, onError }) {
  const [copied, setCopied] = useState(false);
  const code = room?.code || '------';
  const me = room?.players?.find((player) => player.uid === user?.uid);
  const allReady = room?.players?.length >= 2 && room.players.every((player) => player.ready);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      onError('Could not copy the room code. Select and copy it manually.');
    }
  }

  if (!room) return <div className="screen-loading"><LoaderCircle className="spin" /> Connecting to your room…</div>;
  return (
    <main className="room-page">
      <button className="back-link" type="button" onClick={onLeave}><ArrowLeft size={16} /> Leave lobby</button>
      <section className="lobby-card">
        <div className="lobby-head">
          <span className="eyebrow">PRIVATE ROOM · WAITING FOR PLAYERS</span>
          <h1>Gather around.</h1>
          <p>Share your room code with the people you want at the table.</p>
        </div>
        <div className="room-code-card">
          <div><span>YOUR ROOM CODE</span><strong aria-label={`Room code ${code}`}>{code.split('').map((letter, index) => <i key={`${letter}-${index}`}>{letter}</i>)}</strong></div>
          <button className="button button-outline copy-button" type="button" onClick={copyCode}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Copied' : 'Copy code'}</button>
        </div>
        <div className="lobby-players-heading"><span><Users size={17} /> Players <b>{room.players.length}/4</b></span><span className="live-indicator"><i /> Live room</span></div>
        <div className="lobby-player-list">
          {room.players.map((player, index) => (
            <article key={player.uid} className="lobby-player">
              <div className={`player-color-mark color-${player.color}`}><span>{(player.name || 'P').slice(0, 1).toUpperCase()}</span></div>
              <div className="lobby-player-copy"><strong>{player.name}{player.uid === user?.uid ? ' (you)' : ''}</strong><small>{COLOR_LABELS[player.color]} · {player.connected ? 'Connected' : 'Reconnecting…'}</small></div>
              {player.uid === room.ownerUid && <span className="host-pill"><Crown size={12} /> Host</span>}
              <span className={`ready-pill${player.ready ? ' ready' : ''}`}><i />{player.ready ? 'Ready' : 'Not ready'}</span>
            </article>
          ))}
          {Array.from({ length: 4 - room.players.length }, (_, index) => (
            <article key={`empty-${index}`} className="lobby-player lobby-empty"><div className="empty-seat"><Users size={17} /></div><div><strong>Waiting for a player</strong><small>Share the code to invite a friend</small></div><Link2 size={16} /></article>
          ))}
        </div>
        <div className="lobby-actions">
          {room.ownerUid === user?.uid ? (
            <>
              <button className={`button button-large${me?.ready ? ' button-ready' : ' button-outline'}`} type="button" onClick={() => onReady(!me?.ready)} disabled={busy || !me}>
                {busy ? <LoaderCircle className="spin" size={18} /> : me?.ready ? <Check size={17} /> : <ShieldCheck size={17} />}
                {me?.ready ? 'You’re ready — tap to undo' : 'Mark yourself ready'}
              </button>
              <button className="button button-primary button-large" type="button" onClick={onStart} disabled={busy || !allReady}>
                {busy ? <LoaderCircle className="spin" size={18} /> : <Play size={17} fill="currentColor" />}
                {busy ? 'Starting…' : allReady ? 'Start game' : 'Waiting for everyone'}
              </button>
            </>
          ) : (
            <button className={`button button-large${me?.ready ? ' button-ready' : ' button-primary'}`} type="button" onClick={() => onReady(!me?.ready)} disabled={busy || !me}>
              {busy ? <LoaderCircle className="spin" size={18} /> : me?.ready ? <Check size={17} /> : <ShieldCheck size={17} />}
              {me?.ready ? 'You’re ready — tap to undo' : 'I’m ready'}
            </button>
          )}
          {room.ownerUid === user?.uid && !allReady && <small className="lobby-hint">The host can start once two or more players have joined and everyone is ready.</small>}
        </div>
      </section>
    </main>
  );
}
