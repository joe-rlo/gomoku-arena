// Simple in-memory store for now (swap for SQLite/Postgres later)

export interface PlayerRecord {
  id: string;
  name: string;
  type: 'human' | 'agent';
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  createdAt: number;
}

export interface GameRecord {
  id: string;
  player1Id: string;
  player2Id: string;
  winnerId: string | null; // null = draw
  moves: string; // JSON array of [row, col]
  startedAt: number;
  endedAt: number;
}

// In-memory store (persists in dev via module cache)
const players = new Map<string, PlayerRecord>();
const games: GameRecord[] = [];

// K-factor for Elo calculations
const K = 32;

export function getOrCreatePlayer(id: string, name: string, type: 'human' | 'agent'): PlayerRecord {
  if (!players.has(id)) {
    players.set(id, {
      id,
      name,
      type,
      elo: 1200,
      wins: 0,
      losses: 0,
      draws: 0,
      createdAt: Date.now(),
    });
  }
  return players.get(id)!;
}

export function getPlayer(id: string): PlayerRecord | undefined {
  return players.get(id);
}

export function getAllPlayers(): PlayerRecord[] {
  return Array.from(players.values()).sort((a, b) => b.elo - a.elo);
}

export function getLeaderboard(type?: 'human' | 'agent'): PlayerRecord[] {
  let list = Array.from(players.values());
  if (type) {
    list = list.filter(p => p.type === type);
  }
  return list.sort((a, b) => b.elo - a.elo).slice(0, 50);
}

export function recordGame(
  player1Id: string,
  player2Id: string,
  winnerId: string | null,
  moves: [number, number][]
): GameRecord {
  const game: GameRecord = {
    id: `game_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    player1Id,
    player2Id,
    winnerId,
    moves: JSON.stringify(moves),
    startedAt: Date.now() - moves.length * 5000, // estimate
    endedAt: Date.now(),
  };
  
  games.push(game);
  
  // Update Elo and stats
  const p1 = players.get(player1Id);
  const p2 = players.get(player2Id);
  
  if (p1 && p2) {
    updateElo(p1, p2, winnerId);
  }
  
  return game;
}

function updateElo(p1: PlayerRecord, p2: PlayerRecord, winnerId: string | null) {
  const expected1 = 1 / (1 + Math.pow(10, (p2.elo - p1.elo) / 400));
  const expected2 = 1 - expected1;
  
  let score1: number;
  let score2: number;
  
  if (winnerId === null) {
    score1 = 0.5;
    score2 = 0.5;
    p1.draws++;
    p2.draws++;
  } else if (winnerId === p1.id) {
    score1 = 1;
    score2 = 0;
    p1.wins++;
    p2.losses++;
  } else {
    score1 = 0;
    score2 = 1;
    p1.losses++;
    p2.wins++;
  }
  
  p1.elo = Math.round(p1.elo + K * (score1 - expected1));
  p2.elo = Math.round(p2.elo + K * (score2 - expected2));
}

export function getStats(): {
  totalGames: number;
  humanWins: number;
  agentWins: number;
  draws: number;
} {
  let humanWins = 0;
  let agentWins = 0;
  let draws = 0;
  
  for (const game of games) {
    if (game.winnerId === null) {
      draws++;
    } else {
      const winner = players.get(game.winnerId);
      if (winner?.type === 'human') {
        humanWins++;
      } else {
        agentWins++;
      }
    }
  }
  
  return {
    totalGames: games.length,
    humanWins,
    agentWins,
    draws,
  };
}

export function getRecentGames(limit = 10): GameRecord[] {
  return games.slice(-limit).reverse();
}

// Initialize with a demo bot
getOrCreatePlayer('bot_random', '🎲 Random Bot', 'agent');
getOrCreatePlayer('bot_basic', '🤖 Basic AI', 'agent');
