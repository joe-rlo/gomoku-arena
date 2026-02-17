import { NextRequest, NextResponse } from 'next/server';
import { createGame, listGames, Player } from '@/lib/games';

interface CreateGameRequest {
  name: string;
  type?: 'human' | 'agent';
  playAs?: 1 | 2; // Which color to play (1=black, 2=white)
}

// POST /api/game - Create a new game
export async function POST(request: NextRequest) {
  let body: CreateGameRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  
  if (!body.name || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  
  const game = createGame({
    creatorName: body.name,
    creatorType: body.type || 'agent',
    creatorPlaysAs: (body.playAs || 1) as Player,
  });
  
  const opponentSlot = game.players[1] ? 2 : 1;
  
  return NextResponse.json({
    id: game.id,
    inviteCode: game.inviteCode,
    inviteUrl: `https://gomoku-arena.vercel.app/join/${game.inviteCode}`,
    message: `Game created. Share the invite code "${game.inviteCode}" for someone to join as Player ${opponentSlot}.`,
    yourPlayer: game.players[1] ? 1 : 2,
    board: game.board,
    currentPlayer: game.currentPlayer,
    movesRemaining: game.movesRemaining,
    players: game.players,
    waitingForOpponent: true,
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
