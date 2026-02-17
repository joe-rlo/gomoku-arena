// Server-side game session management with validation

import { Board, Player, createEmptyBoard, isValidMove, checkWin, BOARD_SIZE, MAX_MOVES_PER_PLAYER } from './game';

export type { Player };

export interface PlayerInfo {
  name: string;
  type: 'human' | 'agent';
  joinedAt: number;
}

export interface GameSession {
  id: string;
  board: Board;
  currentPlayer: Player;
  movesRemaining: { 1: number; 2: number };
  players: { 1: PlayerInfo | null; 2: PlayerInfo | null };
  winner: Player | null;
  gameOver: boolean;
  moveHistory: { player: Player; row: number; col: number }[];
  createdAt: number;
  updatedAt: number;
  inviteCode: string; // Short code for sharing
}

// In-memory store (resets on deploy, but fine for MVP)
const games = new Map<string, GameSession>();

function generateId(): string {
  return `game_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// Invite code lookup
const inviteCodes = new Map<string, string>(); // inviteCode -> gameId

export interface CreateGameOptions {
  creatorName: string;
  creatorType: 'human' | 'agent';
  creatorPlaysAs?: Player; // defaults to 1 (black)
}

export function createGame(options: CreateGameOptions): GameSession {
  const inviteCode = generateInviteCode();
  const creatorPlaysAs = options.creatorPlaysAs || 1;
  
  const game: GameSession = {
    id: generateId(),
    board: createEmptyBoard(),
    currentPlayer: 1,
    movesRemaining: { 1: MAX_MOVES_PER_PLAYER, 2: MAX_MOVES_PER_PLAYER },
    players: {
      1: creatorPlaysAs === 1 ? { name: options.creatorName, type: options.creatorType, joinedAt: Date.now() } : null,
      2: creatorPlaysAs === 2 ? { name: options.creatorName, type: options.creatorType, joinedAt: Date.now() } : null,
    },
    winner: null,
    gameOver: false,
    moveHistory: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    inviteCode,
  };
  games.set(game.id, game);
  inviteCodes.set(inviteCode, game.id);
  return game;
}

export function getGameByInviteCode(code: string): GameSession | null {
  const gameId = inviteCodes.get(code.toUpperCase());
  return gameId ? games.get(gameId) || null : null;
}

export interface JoinGameOptions {
  playerName: string;
  playerType: 'human' | 'agent';
}

export function joinGame(gameId: string, options: JoinGameOptions): { success: boolean; error?: string; game?: GameSession; assignedPlayer?: Player } {
  const game = games.get(gameId);
  
  if (!game) {
    return { success: false, error: 'Game not found' };
  }
  
  if (game.gameOver) {
    return { success: false, error: 'Game is already over' };
  }
  
  // Find empty slot
  let assignedPlayer: Player | null = null;
  if (!game.players[1]) {
    assignedPlayer = 1;
  } else if (!game.players[2]) {
    assignedPlayer = 2;
  }
  
  if (!assignedPlayer) {
    return { success: false, error: 'Game is full' };
  }
  
  game.players[assignedPlayer] = {
    name: options.playerName,
    type: options.playerType,
    joinedAt: Date.now(),
  };
  game.updatedAt = Date.now();
  
  return { success: true, game, assignedPlayer };
}

export function getGame(id: string): GameSession | null {
  return games.get(id) || null;
}

export function listGames(): GameSession[] {
  return Array.from(games.values())
    .filter(g => !g.gameOver)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 20);
}

export interface MoveResult {
  success: boolean;
  error?: string;
  game?: GameSession;
}

export function submitMove(gameId: string, player: Player, row: number, col: number): MoveResult {
  const game = games.get(gameId);
  
  if (!game) {
    return { success: false, error: 'Game not found' };
  }
  
  if (game.gameOver) {
    return { success: false, error: 'Game is already over' };
  }
  
  if (game.currentPlayer !== player) {
    return { success: false, error: `Not your turn. Waiting for player ${game.currentPlayer}` };
  }
  
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
    return { success: false, error: `Invalid coordinates. Must be 0-${BOARD_SIZE - 1}` };
  }
  
  if (!isValidMove(game.board, row, col)) {
    return { success: false, error: 'Cell is already occupied' };
  }
  
  if (game.movesRemaining[player] <= 0) {
    return { success: false, error: 'You have no moves remaining' };
  }
  
  // Make the move
  game.board[row][col] = player;
  game.movesRemaining[player]--;
  game.moveHistory.push({ player, row, col });
  game.updatedAt = Date.now();
  
  // Check for win
  const winResult = checkWin(game.board, row, col, player);
  if (winResult) {
    game.winner = player;
    game.gameOver = true;
  } else if (game.movesRemaining[1] <= 0 && game.movesRemaining[2] <= 0) {
    // Both players out of moves = draw
    game.gameOver = true;
  } else {
    // Switch turns
    game.currentPlayer = player === 1 ? 2 : 1;
  }
  
  return { success: true, game };
}

// Cleanup old games periodically (games older than 1 hour)
export function cleanupOldGames(): number {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  let removed = 0;
  for (const [id, game] of games) {
    if (game.updatedAt < oneHourAgo) {
      games.delete(id);
      removed++;
    }
  }
  return removed;
}
