'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Board from '@/components/Board';

type Player = 1 | 2;
type Cell = 0 | Player;
type BoardState = Cell[][];

interface GameState {
  id: string;
  board: BoardState;
  currentPlayer: Player;
  movesRemaining: { 1: number; 2: number };
  players: { 
    1: { name: string; type: string } | null; 
    2: { name: string; type: string } | null;
  };
  winner: Player | null;
  gameOver: boolean;
  moveHistory: { player: Player; row: number; col: number }[];
}

export default function PlayGamePage() {
  const params = useParams();
  const gameId = params.id as string;
  
  const [game, setGame] = useState<GameState | null>(null);
  const [myPlayer, setMyPlayer] = useState<Player | null>(null);
  const [myName, setMyName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load player info from session storage
  useEffect(() => {
    const storedPlayer = sessionStorage.getItem(`game_${gameId}_player`);
    const storedName = sessionStorage.getItem(`game_${gameId}_name`);
    if (storedPlayer) setMyPlayer(parseInt(storedPlayer) as Player);
    if (storedName) setMyName(storedName);
  }, [gameId]);

  // Fetch game state
  const fetchGame = useCallback(async () => {
    try {
      const res = await fetch(`/api/game/${gameId}`);
      if (!res.ok) {
        setError('Game not found');
        return;
      }
      const data = await res.json();
      setGame(data);
    } catch {
      setError('Failed to load game');
    }
    setLoading(false);
  }, [gameId]);

  // Initial load + polling
  useEffect(() => {
    fetchGame();
    const interval = setInterval(fetchGame, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, [fetchGame]);

  const handleCellClick = async (row: number, col: number) => {
    if (!game || !myPlayer || submitting) return;
    if (game.gameOver) return;
    if (game.currentPlayer !== myPlayer) return;
    if (game.board[row][col] !== 0) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/game/${gameId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player: myPlayer, row, col }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Move failed');
      } else {
        setGame(prev => prev ? {
          ...prev,
          board: data.board,
          currentPlayer: data.currentPlayer,
          movesRemaining: data.movesRemaining,
          winner: data.winner,
          gameOver: data.gameOver,
        } : null);
        setError('');
      }
    } catch {
      setError('Failed to submit move');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center p-4">
        <div className="text-gray-600">Loading game...</div>
      </main>
    );
  }

  if (error && !game) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <a href="/" className="text-blue-600 hover:underline">Go to home</a>
        </div>
      </main>
    );
  }

  if (!game) return null;

  const player1 = game.players[1];
  const player2 = game.players[2];
  const waitingForOpponent = !player1 || !player2;
  const isMyTurn = myPlayer === game.currentPlayer;
  const opponentName = myPlayer === 1 ? player2?.name : player1?.name;

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white p-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Gomoku</h1>
          <p className="text-gray-600 text-sm">
            {myName && `Playing as ${myName}`}
            {myPlayer && ` (${myPlayer === 1 ? '⚫ Black' : '⚪ White'})`}
          </p>
        </div>

        {/* Status */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          {waitingForOpponent ? (
            <p className="text-center text-gray-600">Waiting for opponent to join...</p>
          ) : game.gameOver ? (
            <p className="text-center text-xl font-bold">
              {game.winner 
                ? (game.winner === myPlayer ? '🎉 You win!' : `${opponentName} wins!`)
                : 'Draw!'}
            </p>
          ) : (
            <div className="text-center">
              <p className="text-lg font-medium text-gray-900">
                {isMyTurn ? 'Your turn' : `${opponentName}'s turn`}
              </p>
              <p className="text-sm text-gray-600">
                {game.currentPlayer === 1 ? '⚫' : '⚪'} to play
              </p>
            </div>
          )}
        </div>

        {/* Moves remaining */}
        <div className="flex justify-between text-sm text-gray-600 mb-2 px-2">
          <span>⚫ {player1?.name || '?'}: {game.movesRemaining[1]} moves</span>
          <span>⚪ {player2?.name || '?'}: {game.movesRemaining[2]} moves</span>
        </div>

        {/* Board */}
        <Board
          board={game.board}
          onCellClick={handleCellClick}
          disabled={!isMyTurn || game.gameOver || waitingForOpponent || submitting}
          lastMove={game.moveHistory.length > 0 
            ? [game.moveHistory[game.moveHistory.length - 1].row, game.moveHistory[game.moveHistory.length - 1].col] as [number, number]
            : undefined}
        />

        {error && (
          <p className="text-red-600 text-center mt-4">{error}</p>
        )}

        {/* Play again */}
        {game.gameOver && (
          <div className="mt-4 text-center">
            <a 
              href="/"
              className="inline-block px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              New Game
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
