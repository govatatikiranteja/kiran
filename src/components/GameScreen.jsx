import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, CircleHelp, LoaderCircle, Volume2, VolumeX } from 'lucide-react';
import Board from './Board.jsx';
import { allTokensHome } from '../game/ludoEngine.js';
import { playSound } from '../services/soundService.js';

const DICE_DOTS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function Dice({ value, rolling }) {
  return <div className={`dice-cube${rolling ? ' dice-rolling' : ''}`} aria-label={value ? `Dice shows ${value}` : 'Dice ready'}>
    {Array.from({ length: 9 }, (_, index) => <span key={index} className={value && DICE_DOTS[value].includes(index) ? 'dice-dot visible' : 'dice-dot'} />)}
  </div>;
}

export default function GameScreen({ game, user, local, busy, sound, onSound, onRoll, onMove, onExit, onRestart, onError }) {
  const [rolling, setRolling] = useState(false);
  const currentPlayer = game.players[game.currentPlayerIndex];
  const canPlay = local ? currentPlayer?.uid === game.players[game.currentPlayerIndex]?.uid : currentPlayer?.uid === user?.uid;
  const isWinner = game.status === 'finished';
  const hasMoves = Boolean(game.diceValue && game.validMoves.length);

  useEffect(() => {
    if (!rolling) return undefined;
    const timer = window.setTimeout(() => setRolling(false), 420);
    return () => window.clearTimeout(timer);
  }, [rolling]);

  const statusText = useMemo(() => {
    if (isWinner) return `${game.players.find((player) => player.uid === game.winnerUid)?.name || 'A player'} wins the game!`;
    if (!currentPlayer) return 'Waiting for the next turn';
    if (local) return `${currentPlayer.name}’s turn`;
    return currentPlayer.uid === user?.uid ? 'Your turn' : `${currentPlayer.name} is playing`;
  }, [currentPlayer, game, isWinner, local, user]);

  async function roll() {
    if (!canPlay || game.diceValue !== null || busy || isWinner) return;
    setRolling(true);
    playSound('dice', sound);
    try {
      await onRoll();
    } catch (reason) {
      onError(reason.message || 'The dice could not be rolled.');
    }
  }

  async function move(tokenIndex) {
    if (!canPlay || busy) return;
    playSound('move', sound);
    try {
      await onMove(tokenIndex);
    } catch (reason) {
      onError(reason.message || 'That token could not move.');
    }
  }

  return (
    <main className="game-page">
      <div className="game-topbar">
        <button type="button" className="back-link" onClick={onExit}><ArrowLeft size={16} /> Exit game</button>
        <span className="game-top-label"><span className="live-indicator"><i /> {local ? 'LOCAL PRACTICE' : 'LIVE MULTIPLAYER'}</span></span>
        <div className="game-tools">
          <button className="icon-button" type="button" onClick={() => onSound(!sound)} aria-label={sound ? 'Turn sound off' : 'Turn sound on'}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
          <button className="icon-button" type="button" onClick={() => onError('Roll a six to leave your base. Move clockwise, capture on unsafe squares, and reach home with an exact roll.')} aria-label="How to play"><CircleHelp size={18} /></button>
        </div>
      </div>
      <div className="game-layout">
        <section className="game-main">
          <div className="game-heading">
            <div><span className="eyebrow">{local ? 'PRACTICE TABLE' : 'PRIVATE MATCH'}</span><h1>{isWinner ? 'A champion is crowned.' : 'Make your move.'}</h1></div>
            <span className="game-turn-badge"><i className={`turn-dot color-${currentPlayer?.color || 'red'}`} />{statusText}</span>
          </div>
          <Board game={game} onMove={move} canPlay={canPlay} />
          <p className="board-tip">{hasMoves ? 'Choose a highlighted token to move.' : isWinner ? 'Play again or head back to the arena.' : 'Safe squares are marked with a star.'}</p>
        </section>
        <aside className="game-sidebar">
          <div className="turn-card">
            <span className="eyebrow">{isWinner ? 'GAME COMPLETE' : canPlay ? 'YOUR TURN' : 'UP NEXT'}</span>
            <div className="turn-player">
              <div className={`player-color-mark color-${currentPlayer?.color || 'red'}`}><span>{(currentPlayer?.name || 'P').slice(0, 1).toUpperCase()}</span></div>
              <div><strong>{isWinner ? game.players.find((player) => player.uid === game.winnerUid)?.name : currentPlayer?.name}</strong><small>{isWinner ? 'Well played.' : `${allTokensHome(game, game.currentPlayerIndex)} tokens at base`}</small></div>
            </div>
            <div className="dice-area"><Dice value={game.diceValue} rolling={rolling} />
              {isWinner ? (
                <button className="button button-primary dice-button" type="button" onClick={() => Promise.resolve(onRestart()).catch((reason) => onError(reason.message || 'Could not restart the game.'))}><Check size={17} /> Play again</button>
              ) : (
                <button className="button button-primary dice-button" type="button" onClick={roll} disabled={!canPlay || hasMoves || busy}>
                  {busy ? <LoaderCircle className="spin" size={17} /> : null}
                  {busy ? 'Please wait…' : canPlay ? 'Roll the dice' : 'Waiting for turn'}
                </button>
              )}
            </div>
            {hasMoves && <p className="roll-instruction">You rolled a <strong>{game.diceValue}</strong> — pick a token.</p>}
          </div>
          <div className="players-card">
            <div className="players-card-heading"><strong>At the table</strong><span>{game.players.length} players</span></div>
            {game.players.map((player, index) => {
              const isTurn = index === game.currentPlayerIndex && !isWinner;
              const homeCount = player.tokens.filter((progress) => progress === 57).length;
              const otherCount = player.tokens.filter((progress) => progress === -1).length;
              return <div key={player.uid} className={`game-player-row${isTurn ? ' is-turn' : ''}`}>
                <i className={`player-dot color-${player.color}`} />
                <div className="game-player-copy"><strong>{player.name}{player.uid === user?.uid && !local ? ' (you)' : ''}</strong><small>{local ? `${otherCount} at base` : player.connected === false ? 'Reconnecting…' : isTurn ? 'Playing now' : 'In the game'}</small></div>
                <span className="token-count"><b>{homeCount}</b>/4 home</span>
              </div>;
            })}
          </div>
          {local && <div className="local-note"><Check size={15} /> Pass-and-play on this device. No account needed.</div>}
        </aside>
      </div>
    </main>
  );
}
