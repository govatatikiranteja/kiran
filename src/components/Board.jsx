import { HOME_LENGTH, SAFE_SQUARES, START_OFFSETS, TRACK_LENGTH, FINISH_PROGRESS, globalTrackPosition } from '../game/ludoEngine.js';

const TRACK = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], [0, 7],
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14], [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], [9, 8], [10, 8], [11, 8], [12, 8], [13, 8],
  [14, 8], [14, 7], [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], [8, 5], [8, 4], [8, 3], [8, 2],
  [8, 1], [8, 0], [7, 0], [6, 0],
];
const HOME_LANES = {
  red: Array.from({ length: HOME_LENGTH }, (_, index) => [7, index + 1]),
  green: Array.from({ length: HOME_LENGTH }, (_, index) => [index + 1, 7]),
  yellow: Array.from({ length: HOME_LENGTH }, (_, index) => [7, 13 - index]),
  blue: Array.from({ length: HOME_LENGTH }, (_, index) => [13 - index, 7]),
};
const HOME_SLOTS = {
  red: [[2, 2], [2, 4], [4, 2], [4, 4]],
  green: [[2, 10], [2, 12], [4, 10], [4, 12]],
  yellow: [[10, 10], [10, 12], [12, 10], [12, 12]],
  blue: [[10, 2], [10, 4], [12, 2], [12, 4]],
};
const COLORS = ['red', 'green', 'yellow', 'blue'];

function getTokenCell(player, progress, tokenIndex) {
  if (progress === -1) return HOME_SLOTS[player.color][tokenIndex];
  if (progress === FINISH_PROGRESS) return [7, 7];
  if (progress >= TRACK_LENGTH) return HOME_LANES[player.color][progress - TRACK_LENGTH];
  return TRACK[globalTrackPosition(player.color, progress)];
}

function cellKey(row, col) {
  return `${row}-${col}`;
}

const trackMap = new Map(TRACK.map(([row, col], index) => [cellKey(row, col), index]));
const homeMap = new Map();
Object.entries(HOME_LANES).forEach(([color, lane]) => lane.forEach(([row, col], index) => {
  homeMap.set(cellKey(row, col), color);
}));

export default function Board({ game, onMove, canPlay }) {
  const players = game.players;
  const tokens = players.flatMap((player, playerIndex) => player.tokens.map((progress, tokenIndex) => {
    const [row, col] = getTokenCell(player, progress, tokenIndex);
    const movable = canPlay && playerIndex === game.currentPlayerIndex && game.validMoves.includes(tokenIndex);
    return { player, playerIndex, tokenIndex, row, col, movable, progress };
  }));
  const cells = [];

  for (let row = 0; row < 15; row += 1) {
    for (let col = 0; col < 15; col += 1) {
      const key = cellKey(row, col);
      const trackIndex = trackMap.get(key);
      const laneColor = homeMap.get(key);
      const safe = trackIndex !== undefined && SAFE_SQUARES.has(trackIndex);
      const color = laneColor || COLORS.find((candidate) => {
        const start = START_OFFSETS[candidate];
        return trackIndex === start;
      });
      cells.push(
        <div
          key={key}
          className={[
            'board-cell',
            trackIndex !== undefined ? 'board-track' : '',
            safe ? 'board-safe' : '',
            color ? `board-cell-${color}` : '',
            laneColor ? `board-lane-${laneColor}` : '',
          ].join(' ')}
          style={{ gridRow: row + 1, gridColumn: col + 1 }}
        >
          {safe && <span className="safe-star" aria-label="Safe square">✦</span>}
        </div>,
      );
    }
  }

  return (
    <div className="board-frame" aria-label="Ludo board">
      <div className="ludo-board">
        {cells}
        {COLORS.map((color) => (
          <div key={color} className={`board-home board-home-${color}`} style={homeGridStyle(color)}>
            <div className="home-inset">
              <span className="home-label">{color}</span>
              <div className="home-slots">
                {[0, 1, 2, 3].map((slot) => <span key={slot} className="home-slot" />)}
              </div>
            </div>
          </div>
        ))}
        <div className="board-center" style={{ gridRow: '7 / span 3', gridColumn: '7 / span 3' }}>
          <span className="center-triangle center-red" />
          <span className="center-triangle center-green" />
          <span className="center-triangle center-yellow" />
          <span className="center-triangle center-blue" />
          <span className="center-star">✦</span>
        </div>
        {tokens.map(({ player, playerIndex, tokenIndex, row, col, movable, progress }) => (
          <button
            key={`${player.uid}-${tokenIndex}`}
            type="button"
            className={`board-token token-${player.color}${movable ? ' token-movable' : ''}${progress === FINISH_PROGRESS ? ' token-finished' : ''}`}
            style={{
              gridRow: row + 1,
              gridColumn: col + 1,
              zIndex: 5 + playerIndex,
              '--token-offset': `${(tokenIndex % 4) * 2}px`,
            }}
            onClick={() => movable && onMove(tokenIndex)}
            disabled={!movable}
            aria-label={`${player.name}, ${player.color} token ${tokenIndex + 1}${movable ? ', can move' : ''}`}
          >
            {tokenIndex + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

function homeGridStyle(color) {
  const positions = {
    red: { gridRow: '1 / span 6', gridColumn: '1 / span 6' },
    green: { gridRow: '1 / span 6', gridColumn: '10 / span 6' },
    yellow: { gridRow: '10 / span 6', gridColumn: '10 / span 6' },
    blue: { gridRow: '10 / span 6', gridColumn: '1 / span 6' },
  };
  return positions[color];
}
