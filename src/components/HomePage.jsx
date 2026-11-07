import { ArrowDown, ArrowRight, Award, Check, ChevronRight, Crown, Dice5, DoorOpen, Gamepad2, ShieldCheck, Sparkles, Users, Zap } from 'lucide-react';

const STEPS = [
  { number: '01', title: 'Find your people', copy: 'Create a private room and invite friends with a six-letter code.' },
  { number: '02', title: 'Roll your way out', copy: 'A six gets a token onto the board. Roll again and plan your route.' },
  { number: '03', title: 'Race to the center', copy: 'Capture rivals, protect your pieces, and bring all four tokens home.' },
];

export default function HomePage({ user, onPlay, onCreate, onJoin, leaderboard, onLeaderboard, statsLoading, firebaseConfigured }) {
  return (
    <main>
      <section className="hero-section">
        <div className="hero-copy">
          <span className="hero-kicker"><span className="kicker-dot" /> THE CLASSIC, TOGETHER</span>
          <h1>Good friends.<br /><span>Great rolls.</span></h1>
          <p>Bring your favourite people to the table. The timeless race home, reimagined for game night.</p>
          <div className="hero-actions">
            <button className="button button-primary button-large" type="button" onClick={onPlay}>Play now <ArrowRight size={18} /></button>
            <button className="button button-outline button-large" type="button" onClick={onCreate}>Create a room <span className="button-plus">+</span></button>
          </div>
          <button className="join-inline" type="button" onClick={onJoin}><DoorOpen size={16} /> Have a room code? <strong>Join a game</strong></button>
          {!firebaseConfigured && <p className="firebase-setup-note"><ShieldCheck size={14} /> Online rooms need Firebase configuration. Local practice is ready now.</p>}
          <div className="hero-trust"><span className="avatar-stack"><i>J</i><i>A</i><i>M</i><i>+</i></span><span>Game night, wherever you are</span></div>
        </div>
        <div className="hero-art" aria-label="Illustration of the Ludo Arena board">
          <div className="hero-board-shadow" />
          <div className="hero-board">
            <div className="hero-house hero-house-red"><b /><b /><b /><b /></div>
            <div className="hero-house hero-house-green"><b /><b /><b /><b /></div>
            <div className="hero-house hero-house-blue"><b /><b /><b /><b /></div>
            <div className="hero-house hero-house-yellow"><b /><b /><b /><b /></div>
            <div className="hero-route route-one" /><div className="hero-route route-two" />
            <div className="hero-diamond"><span>✦</span></div>
            <span className="hero-piece piece-red" /><span className="hero-piece piece-blue" />
            <span className="hero-piece piece-green" /><span className="hero-piece piece-yellow" />
          </div>
          <div className="roll-card"><div className="dice-face"><i /><i /><i /><i /><i /></div><div><strong>YOUR MOVE</strong><small>Every roll tells a story.</small></div></div>
          <div className="hero-caption"><Sparkles size={14} /> THE TABLE IS YOURS</div>
        </div>
        <a href="#how-to-play" className="scroll-cue" aria-label="Scroll to how to play"><ArrowDown size={16} /></a>
      </section>

      <section className="quick-stats" aria-label="Ludo Arena highlights">
        <div><Users size={20} /><strong>2–4</strong><span>Players per game</span></div>
        <div><Dice5 size={20} /><strong>4 × 4</strong><span>Tokens on the board</span></div>
        <div><ShieldCheck size={20} /><strong>Fair play</strong><span>Server-checked moves</span></div>
        <div><Zap size={20} /><strong>Private rooms</strong><span>Invite with a room code</span></div>
      </section>

      <section className="how-section content-section" id="how-to-play">
        <div className="section-heading">
          <div><span className="eyebrow">A LITTLE STRATEGY. A LOT OF LUCK.</span><h2>Easy to learn.<br />Impossible to play just once.</h2></div>
          <button className="text-button" type="button" onClick={onPlay}>Try a local game <ArrowRight size={16} /></button>
        </div>
        <div className="step-grid">
          {STEPS.map((step, index) => (
            <article key={step.number} className="step-card">
              <span className="step-number">{step.number}</span>
              <div className={`step-icon step-icon-${index}`}><span>{index === 0 ? <Users /> : index === 1 ? <Dice5 /> : <Award />}</span></div>
              <h3>{step.title}</h3><p>{step.copy}</p>
              <span className="step-rule">{index === 0 ? 'MAKE A ROOM' : index === 1 ? 'ROLL A SIX' : 'MAKE IT HOME'}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="bottom-cta">
        <div className="cta-mark"><Gamepad2 size={26} /></div>
        <div><span className="eyebrow">YOUR NEXT GAME NIGHT STARTS HERE</span><h2>{user ? 'Ready for one more?' : 'The board is waiting.'}</h2><p>Invite your crew, pick your colour, and let the dice decide.</p></div>
        <button className="button button-primary" type="button" onClick={onCreate}>Create a room <ArrowRight size={17} /></button>
      </section>

      <section className="leaderboard-section content-section" id="leaderboard">
        <div className="leaderboard-title">
          <div className="leaderboard-icon"><Crown size={21} /></div>
          <div><span className="eyebrow">THE REGULARS</span><h2>Arena leaderboard</h2></div>
          <button className="text-button" type="button" onClick={onLeaderboard}>View leaderboard <ChevronRight size={16} /></button>
        </div>
        <div className="leaderboard-preview">
          {statsLoading ? <p className="muted leaderboard-empty">Loading leaderboard…</p> : leaderboard.length ? leaderboard.slice(0, 3).map((player, index) => (
            <div className="leader-row" key={player.uid || player.username}>
              <span className={`leader-rank${index === 0 ? ' rank-first' : ''}`}>{String(index + 1).padStart(2, '0')}</span>
              {player.photoURL ? <img src={player.photoURL} alt="" /> : <span className={`leader-avatar avatar-${index}`}>{(player.username || 'P').slice(0, 1).toUpperCase()}</span>}
              <strong>{player.username || 'Arena player'}</strong>
              <span className="leader-wins">{player.wins || 0} wins</span>
            </div>
          )) : <p className="muted leaderboard-empty">Sign in and finish a multiplayer match to appear here.</p>}
        </div>
      </section>
      <footer className="site-footer">
        <span className="brand-mini">LUDO <em>ARENA</em></span>
        <span>Made for the joy of one more game.</span>
        <span><Check size={14} /> Fair play, always</span>
      </footer>
    </main>
  );
}
