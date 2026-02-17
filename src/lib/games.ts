// Server-side game session management with Redis persistence

import { Redis } from '@upstash/redis';
import { Board, Player, createEmptyBoard, isValidMove, checkWin, BOARD_SIZE, MAX_MOVES_PER_PLAYER } from './game';

export type { Player };

// Initialize Redis (supports both Vercel KV and direct Upstash env vars)
const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = redisUrl && redisToken
  ? new Redis({ url: redisUrl, token: redisToken })
  : null;

const GAME_TTL = 60 * 60; // 1 hour TTL for games

export interface PlayerInfo {
  name: string;
  type: 'human' | 'agent';
  model?: string;  // AI model identifier (e.g., "gpt-4", "claude-3-opus")
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
  inviteCode: string;
}

function generateId(): string {
  return `game_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// Redis keys
const gameKey = (id: string) => `gomoku:game:${id}`;
const inviteKey = (code: string) => `gomoku:invite:${code.toUpperCase()}`;

async function saveGame(game: GameSession): Promise<void> {
  if (!redis) return;
  await Promise.all([
    redis.set(gameKey(game.id), JSON.stringify(game), { ex: GAME_TTL }),
    redis.set(inviteKey(game.inviteCode), game.id, { ex: GAME_TTL }),
  ]);
}

export interface CreateGameOptions {
  creatorName: string;
  creatorType: 'human' | 'agent';
  creatorModel?: string;  // AI model identifier for agents
  creatorPlaysAs?: Player;
}

export async function createGame(options: CreateGameOptions): Promise<GameSession> {
  const inviteCode = generateInviteCode();
  const creatorPlaysAs = options.creatorPlaysAs || 1;
  
  const playerInfo: PlayerInfo = {
    name: options.creatorName,
    type: options.creatorType,
    joinedAt: Date.now(),
    ...(options.creatorModel && { model: options.creatorModel }),
  };
  
  const game: GameSession = {
    id: generateId(),
    board: createEmptyBoard(),
    currentPlayer: 1,
    movesRemaining: { 1: MAX_MOVES_PER_PLAYER, 2: MAX_MOVES_PER_PLAYER },
    players: {
      1: creatorPlaysAs === 1 ? playerInfo : null,
      2: creatorPlaysAs === 2 ? playerInfo : null,
    },
    winner: null,
    gameOver: false,
    moveHistory: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    inviteCode,
  };
  
  await saveGame(game);
  return game;
}

export async function getGame(id: string): Promise<GameSession | null> {
  if (!redis) return null;
  const data = await redis.get<string>(gameKey(id));
  if (!data) return null;
  return typeof data === 'string' ? JSON.parse(data) : data;
}

export async function getGameByInviteCode(code: string): Promise<GameSession | null> {
  if (!redis) return null;
  const gameId = await redis.get<string>(inviteKey(code.toUpperCase()));
  if (!gameId) return null;
  return getGame(gameId);
}

export async function listGames(): Promise<GameSession[]> {
  // Not implementing full list for now - would need Redis SCAN
  return [];
}

export interface JoinGameOptions {
  playerName: string;
  playerType: 'human' | 'agent';
  playerModel?: string;  // AI model identifier for agents
}

export async function joinGame(gameId: string, options: JoinGameOptions): Promise<{ success: boolean; error?: string; game?: GameSession; assignedPlayer?: Player }> {
  const game = await getGame(gameId);
  
  if (!game) {
    return { success: false, error: 'Game not found' };
  }
  
  if (game.gameOver) {
    return { success: false, error: 'Game is already over' };
  }
  
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
    ...(options.playerModel && { model: options.playerModel }),
  };
  game.updatedAt = Date.now();
  
  await saveGame(game);
  
  return { success: true, game, assignedPlayer };
}

export interface MoveResult {
  success: boolean;
  error?: string;
  game?: GameSession;
}

export async function submitMove(gameId: string, player: Player, row: number, col: number): Promise<MoveResult> {
  const game = await getGame(gameId);
  
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
    game.gameOver = true;
  } else {
    game.currentPlayer = player === 1 ? 2 : 1;
  }
  
  await saveGame(game);
  
  // Update global stats if game just ended
  if (game.gameOver) {
    await updateGlobalStats(game);
  }
  
  return { success: true, game };
}

// Global stats tracking
const STATS_KEY = 'gomoku:stats';

export interface ModelStats {
  wins: number;
  losses: number;
  ties: number;
}

export interface GlobalStats {
  humanWins: number;
  agentWins: number;
  ties: number;
  totalGames: number;
  modelStats?: Record<string, ModelStats>;  // Per-model win/loss tracking
}

async function updateGlobalStats(game: GameSession): Promise<void> {
  if (!redis) return;
  
  const stats = await getGlobalStats();
  stats.totalGames++;
  stats.modelStats = stats.modelStats || {};
  
  const player1 = game.players[1];
  const player2 = game.players[2];
  
  // Helper to update model stats
  const updateModel = (model: string | undefined, result: 'win' | 'loss' | 'tie') => {
    if (!model) return;
    if (!stats.modelStats![model]) {
      stats.modelStats![model] = { wins: 0, losses: 0, ties: 0 };
    }
    if (result === 'win') stats.modelStats![model].wins++;
    else if (result === 'loss') stats.modelStats![model].losses++;
    else stats.modelStats![model].ties++;
  };
  
  if (!game.winner) {
    stats.ties++;
    // Both players tie
    updateModel(player1?.model, 'tie');
    updateModel(player2?.model, 'tie');
  } else {
    const winner = game.players[game.winner];
    const loser = game.players[game.winner === 1 ? 2 : 1];
    
    if (winner?.type === 'agent') {
      stats.agentWins++;
    } else {
      stats.humanWins++;
    }
    
    // Track model-specific stats
    updateModel(winner?.model, 'win');
    updateModel(loser?.model, 'loss');
  }
  
  await redis.set(STATS_KEY, JSON.stringify(stats));
}

export async function getGlobalStats(): Promise<GlobalStats> {
  if (!redis) {
    return { humanWins: 0, agentWins: 0, ties: 0, totalGames: 0 };
  }
  
  const data = await redis.get<string>(STATS_KEY);
  if (!data) {
    return { humanWins: 0, agentWins: 0, ties: 0, totalGames: 0 };
  }
  
  return typeof data === 'string' ? JSON.parse(data) : data;
}
