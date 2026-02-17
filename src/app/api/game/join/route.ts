import { NextRequest, NextResponse } from 'next/server';
import { getGameByInviteCode, joinGame } from '@/lib/games';

interface JoinRequest {
  code: string;
  name: string;
  type?: 'human' | 'agent';
  model?: string;  // AI model identifier (e.g., "gpt-4", "claude-3-opus")
}

// POST /api/game/join - Join a game by invite code
export async function POST(request: NextRequest) {
  let body: JoinRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  
  if (!body.code || typeof body.code !== 'string') {
    return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
  }
  
  if (!body.name || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  
  // Find game by invite code
  const game = await getGameByInviteCode(body.code);
  if (!game) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
  }
  
  // Join the game
  const result = await joinGame(game.id, {
    playerName: body.name,
    playerType: body.type || 'human',
    playerModel: body.model,
  });
  
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  
  return NextResponse.json({
    success: true,
    id: result.game!.id,
    yourPlayer: result.assignedPlayer,
    message: `Joined as Player ${result.assignedPlayer} (${result.assignedPlayer === 1 ? 'Black' : 'White'})`,
    board: result.game!.board,
    currentPlayer: result.game!.currentPlayer,
    movesRemaining: result.game!.movesRemaining,
    players: result.game!.players,
    gameReady: result.game!.players[1] !== null && result.game!.players[2] !== null,
  });
}
