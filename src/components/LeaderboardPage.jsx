import { ArrowLeft, Crown, LoaderCircle, Trophy } from 'lucide-react';

export default function LeaderboardPage({ players, loading, error, onBack }) {
  return (
    <main className="leaderboard-page">
      <button className="back-link" type="button" onClick={onBack}><ArrowLeft size={16} /> Back to arena</button>
      <section className="leaderboard-hero"><div className="leaderboard-icon"><Crown size={23} /></div><span className="eyebrow">THE REGULARS</span><h1>Leaderboard</h1><p>Every win is a story worth telling.</p></section>
      <section className="leaderboard-full">
        {loading ? <div className="screen-loading"><LoaderCircle className="spin" /> Loading standings…</div> : error ? <p className="form-error" role="alert">{error}</p> : players.length ? players.map((player, index) => (
          <article className={`leader-full-row${index === 0 ? ' first-place' : ''}`} key={player.uid}>
            <span className="leader-rank">{index === 0 ? <Crown size={18} /> : String(index + 1).padStart(2, '0')}</span>
            {player.photoURL ? <img src={player.photoURL} alt="" /> : <span className={`leader-avatar avatar-${index % 3}`}>{(player.username || 'P').slice(0, 1).toUpperCase()}</span>}
            <div><strong>{player.username || 'Arena player'}</strong><small>{player.matches || 0} matches played</small></div>
            <span className="leader-win-count"><Trophy size={16} /> {player.wins || 0} wins</span>
          </article>
        )) : <p className="history-empty">The standings are waiting for the first multiplayer winner. Sign in, play a match, and claim your place.</p>}
        {!loading && !error && !players.length && <div className="leaderboard-lock"><Trophy size={18} /> Multiplayer stats appear here after verified online matches.</div>}
      </section>
    </main>
  );
}
