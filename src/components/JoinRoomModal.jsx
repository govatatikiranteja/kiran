import { useState } from 'react';
import { ArrowRight, KeyRound, X } from 'lucide-react';

export default function JoinRoomModal({ onClose, onJoin, busy }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(normalized)) {
      setError('Room codes are six characters. Check the code and try again.');
      return;
    }
    setError('');
    try {
      await onJoin(normalized);
    } catch (reason) {
      setError(reason.message || 'Could not join this room.');
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="join-modal" role="dialog" aria-modal="true" aria-labelledby="join-title">
        <button className="icon-button modal-close" type="button" onClick={onClose} aria-label="Close join room"><X size={19} /></button>
        <div className="join-modal-icon"><KeyRound size={23} /></div>
        <span className="eyebrow">YOUR FRIENDS ARE WAITING</span>
        <h2 id="join-title">Join a room</h2>
        <p>Enter the six-character code shared by your host.</p>
        <form onSubmit={submit}>
          <label htmlFor="room-code">Room code</label>
          <input id="room-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} maxLength="6" placeholder="E.G. A7K2LM" autoComplete="off" autoFocus />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary button-large" type="submit" disabled={busy || code.length !== 6}>{busy ? 'Joining…' : <>Join room <ArrowRight size={17} /></>}</button>
        </form>
      </section>
    </div>
  );
}
