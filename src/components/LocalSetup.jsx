import { useState } from 'react';
import { ArrowLeft, ArrowRight, Users } from 'lucide-react';

const COLORS = ['red', 'green', 'yellow', 'blue'];

export default function LocalSetup({ onStart, onBack }) {
  const [count, setCount] = useState(2);
  const [names, setNames] = useState(['Player 1', 'Player 2', 'Player 3', 'Player 4']);
  const seats = count === 2 ? [0, 2] : Array.from({ length: count }, (_, index) => index);

  return (
    <main className="setup-page">
      <button className="back-link" type="button" onClick={onBack}><ArrowLeft size={16} /> Back to home</button>
      <section className="setup-card">
        <span className="eyebrow">PASS THE DEVICE. TAKE YOUR TURN.</span>
        <h1>Set the table.</h1>
        <p>Practice locally with friends on one device. For remote games, create a private room.</p>
        <div className="setup-label"><Users size={17} /> How many players?</div>
        <div className="player-count-options">
          {[2, 3, 4].map((number) => <button key={number} type="button" className={count === number ? 'count-option selected' : 'count-option'} onClick={() => setCount(number)}><strong>{number}</strong><span>players</span></button>)}
        </div>
        <div className="setup-name-list">
          {seats.map((seat, index) => <label key={seat}><span className={`player-dot color-${COLORS[seat]}`} /> Player {index + 1}
            <input maxLength="24" value={names[index]} onChange={(event) => setNames((previous) => previous.map((name, current) => current === index ? event.target.value : name))} />
          </label>)}
        </div>
        <button className="button button-primary button-large setup-start" type="button" onClick={() => onStart(seats.map((seat, index) => ({ uid: `local-${seat + 1}`, name: names[index].trim() || `Player ${index + 1}`, color: COLORS[seat] })))}>Start local game <ArrowRight size={18} /></button>
        <div className="setup-disclaimer">Local play is pass-and-play on this device. No online opponent is simulated.</div>
      </section>
    </main>
  );
}
