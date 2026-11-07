import { describe, expect, it } from 'vitest';
import { createGame, moveToken, rollDice, SAFE_SQUARES, globalTrackPosition } from './ludoEngine.js';

const players = [
  { uid: 'a', name: 'A', color: 'red' },
  { uid: 'b', name: 'B', color: 'green' },
];

describe('Ludo rules engine', () => {
  it('requires a six to leave home', () => {
    const state = createGame(players);
    expect(rollDice(state, () => 0).validMoves).toEqual([]);
    expect(rollDice(state, () => 5 / 6).validMoves).toEqual([0, 1, 2, 3]);
  });

  it('moves tokens and grants another turn after a six', () => {
    const state = createGame(players);
    const six = rollDice(state, () => 5 / 6);
    const moved = moveToken(six, 2);
    expect(moved.players[0].tokens[2]).toBe(0);
    expect(moved.currentPlayerIndex).toBe(0);
  });

  it('passes to the next player when no token can move', () => {
    const state = createGame(players);
    state.players[0].tokens = [56, 57, 57, 57];
    const passed = rollDice(state, () => 1 / 3);
    expect(passed.diceValue).toBeNull();
    expect(passed.validMoves).toEqual([]);
    expect(passed.currentPlayerIndex).toBe(1);
  });

  it('keeps the turn after a six even when no token can move', () => {
    const state = createGame(players);
    state.players[0].tokens = [56, 57, 57, 57];
    const passed = rollDice(state, () => 5 / 6);
    expect(passed.diceValue).toBeNull();
    expect(passed.currentPlayerIndex).toBe(0);
  });

  it('captures on an unsafe square and returns captured tokens home', () => {
    const state = createGame(players);
    state.players[0].tokens[0] = 4;
    state.players[1].tokens[0] = 44;
    const moved = moveToken({ ...state, diceValue: 1, validMoves: [0] }, 0);
    expect(moved.players[1].tokens[0]).toBe(-1);
  });

  it('does not capture on safe squares', () => {
    const state = createGame(players);
    state.players[0].tokens[0] = 4;
    state.players[0].tokens[0] = 7;
    state.players[1].tokens[0] = 47;
    const target = globalTrackPosition('red', 8);
    expect(SAFE_SQUARES.has(target)).toBe(true);
    const moved = moveToken({ ...state, diceValue: 1, validMoves: [0] }, 0);
    expect(moved.players[1].tokens[0]).toBe(47);
  });

  it('requires exact movement to finish', () => {
    const state = createGame(players);
    state.players[0].tokens[0] = 56;
    expect(rollDice(state, () => 1 / 3).validMoves).toEqual([]);
    const exact = moveToken({ ...state, diceValue: 1, validMoves: [0] }, 0);
    expect(exact.players[0].tokens[0]).toBe(57);
  });

  it('detects a winner after all four tokens reach home', () => {
    const state = createGame(players);
    state.players[0].tokens = [57, 57, 57, 56];
    const won = moveToken({ ...state, diceValue: 1, validMoves: [3] }, 3);
    expect(won.status).toBe('finished');
    expect(won.winnerUid).toBe('a');
  });
});
