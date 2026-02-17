import { NextResponse } from 'next/server';
import { createGame, listGames } from '@/lib/games';

// POST /api/game - Create a new game
export async function POST() {
  const game = createGame();
  
  return NextResponse.json({
    id: game.id,
    message: 'Game created. Player 1 (Black) moves first.',
    board: game.board,
    currentPlayer: game.currentPlayer,
    movesRemaining: game.movesRemaining,
  });
}

// GET /api/game - List active games
export async function GET() {
  const games = listGames();
  
  return NextResponse.json({
    games: games.map(g => ({
      id: g.id,
      currentPlayer: g.currentPlayer,
      moveCount: g.moveHistory.length,
      gameOver: g.gameOver,
      winner: g.winner,
      createdAt: g.createdAt,
    })),
  });
}
