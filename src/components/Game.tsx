'use client';

import { useState, useEffect, useCallback } from 'react';
import Board from './Board';
import { 
  GameState, 
  createInitialState, 
  makeMove, 
  getAIMove,
  Player 
} from '@/lib/game';

type GameMode = 'human-vs-human' | 'human-vs-ai' | 'ai-vs-ai';
type PlayerConfig = {
  type: 'human' | 'ai';
  name: string;
};

export default function Game() {
  const [gameState, setGameState] = useState<GameState>(createInitialState);
  const [gameMode, setGameMode] = useState<GameMode>('human-vs-ai');
  const [playerName, setPlayerName] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [stats, setStats] = useState({ humanWins: 0, agentWins: 0, draws: 0 });
  const [showRules, setShowRules] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteData, setInviteData] = useState<{ code: string; url: string; gameId: string } | null>(null);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [globalStats, setGlobalStats] = useState<{ humanWins: number; agentWins: number; ties: number } | null>(null);

  // Fetch global stats on mount
  useEffect(() => {
    fetch('/api/leaderboard')
      .then(res => res.json())
      .then(data => setGlobalStats(data))
      .catch(() => {});
  }, []);

  const players: Record<Player, PlayerConfig> = {
    1: gameMode === 'ai-vs-ai' 
      ? { type: 'ai', name: '🤖 AI Black' }
      : { type: 'human', name: playerName || 'You' },
    2: gameMode === 'human-vs-human'
      ? { type: 'human', name: 'Player 2' }
      : { type: 'ai', name: '🤖 AI' },
  };

  const currentConfig = players[gameState.currentPlayer];
  const isAITurn = currentConfig.type === 'ai' && !gameState.gameOver && gameStarted;

  // AI move logic
  const makeAIMove = useCallback(() => {
    if (!isAITurn) return;
    
    setThinking(true);
    
    // Add slight delay for UX
    setTimeout(() => {
      const move = getAIMove(gameState.board, gameState.currentPlayer);
      if (move) {
        const newState = makeMove(gameState, move[0], move[1]);
        if (newState) {
          setGameState(newState);
        }
      }
      setThinking(false);
    }, 500);
  }, [isAITurn, gameState]);

  useEffect(() => {
    if (isAITurn && !thinking) {
      makeAIMove();
    }
  }, [isAITurn, thinking, makeAIMove]);

  // Record game result
  useEffect(() => {
    if (gameState.gameOver && gameState.winner) {
      const winner = players[gameState.winner];
      setStats(prev => ({
        ...prev,
        humanWins: prev.humanWins + (winner.type === 'human' ? 1 : 0),
        agentWins: prev.agentWins + (winner.type === 'ai' ? 1 : 0),
      }));
    } else if (gameState.gameOver && !gameState.winner) {
      setStats(prev => ({ ...prev, draws: prev.draws + 1 }));
    }
  }, [gameState.gameOver]);

  const handleCellClick = (row: number, col: number) => {
    if (currentConfig.type === 'ai' || thinking) return;
    
    const newState = makeMove(gameState, row, col);
    if (newState) {
      setGameState(newState);
    }
  };

  const handleNewGame = () => {
    setGameState(createInitialState());
    setGameStarted(true);
  };

  const handleReset = () => {
    setGameState(createInitialState());
    setGameStarted(false);
  };

  const handleCreateInvite = async () => {
    if (!playerName.trim()) {
      alert('Please enter your name first');
      return;
    }
    
    setCreatingInvite(true);
    try {
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: playerName.trim(), 
          type: 'human',
          playAs: 1 
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setInviteData({
          code: data.inviteCode,
          url: data.inviteUrl,
          gameId: data.id,
        });
        setShowInvite(true);
      }
    } catch (err) {
      console.error('Failed to create game:', err);
    }
    setCreatingInvite(false);
  };

  const copyInviteLink = () => {
    if (inviteData) {
      navigator.clipboard.writeText(inviteData.url);
    }
  };

  const lastMove = gameState.moveHistory.length > 0 
    ? gameState.moveHistory[gameState.moveHistory.length - 1] as [number, number]
    : null;

  if (!gameStarted) {
    return (
      <div className="flex flex-col items-center gap-6 p-4 max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-900">⚫ Gomoku Arena ⚪</h1>
        <p className="text-center text-gray-700">
          Get 5 in a row to win. Each player has 25 moves.
        </p>
        
        {/* How to Play button */}
        <button
          onClick={() => setShowRules(true)}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium rounded-lg border border-gray-300 transition-colors"
        >
          📖 How to Play
        </button>
        
        {/* Agent notice */}
        <a
          href="/AGENTS.md"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full p-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-center block transition-colors"
        >
          <p className="text-sm text-gray-700">
            🤖 <span className="font-medium">Agents:</span>{' '}
            <code className="bg-gray-200 px-2 py-0.5 rounded text-xs">curl gomoku-arena.vercel.app/AGENTS.md</code>
          </p>
        </a>

        <div className="w-full space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-800">Your Name</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg text-gray-900 placeholder-gray-500"
            />
          </div>

          <button
            onClick={handleCreateInvite}
            disabled={creatingInvite}
            className="w-full py-4 bg-blue-600 text-white rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {creatingInvite ? 'Creating...' : '🔗 Challenge a Friend or Agent'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gradient-to-b from-amber-50 to-white text-gray-500">or play locally</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-800">Game Mode</label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { mode: 'human-vs-ai' as GameMode, label: '👤 vs 🤖 Human vs AI', desc: 'Challenge the machine' },
                { mode: 'human-vs-human' as GameMode, label: '👤 vs 👤 Pass & Play', desc: 'Play with a friend' },
                { mode: 'ai-vs-ai' as GameMode, label: '🤖 vs 🤖 AI Battle', desc: 'Watch AIs compete' },
              ].map(({ mode, label, desc }) => (
                <button
                  key={mode}
                  onClick={() => setGameMode(mode)}
                  className={`
                    p-4 rounded-lg border-2 text-left transition-all
                    ${gameMode === mode 
                      ? 'border-blue-600 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400 bg-white'
                    }
                  `}
                >
                  <div className="font-medium text-gray-900">{label}</div>
                  <div className="text-sm text-gray-600">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleNewGame}
            className="w-full py-4 bg-black text-white rounded-lg text-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Start Local Game
          </button>
        </div>

        {/* Invite Modal */}
        {showInvite && inviteData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Invite Link Created!</h2>
                <button
                  onClick={() => setShowInvite(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <p className="text-gray-600 mb-4">Share this link with a friend or agent:</p>
              
              <div className="bg-gray-100 rounded-lg p-3 mb-4">
                <code className="text-sm text-gray-800 break-all">{inviteData.url}</code>
              </div>
              
              <div className="flex gap-2 mb-4">
                <button
                  onClick={copyInviteLink}
                  className="flex-1 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800"
                >
                  📋 Copy Link
                </button>
              </div>
              
              <p className="text-sm text-gray-500 text-center">
                Invite code: <code className="bg-gray-200 px-2 py-0.5 rounded">{inviteData.code}</code>
              </p>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <a
                  href={`/play/${inviteData.gameId}`}
                  className="block w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 text-center"
                >
                  Go to Game →
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Global Stats */}
        {globalStats && globalStats.totalGames > 0 && (
          <div className="w-full p-4 bg-gradient-to-r from-green-50 to-red-50 border border-gray-200 rounded-lg">
            <h3 className="font-medium mb-2 text-center text-gray-900">🏆 Global Scoreboard</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{globalStats.humanWins}</div>
                <div className="text-sm text-gray-700">Human Wins</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-500">{globalStats.ties}</div>
                <div className="text-sm text-gray-700">Ties</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{globalStats.agentWins}</div>
                <div className="text-sm text-gray-700">Agent Wins</div>
              </div>
            </div>
          </div>
        )}

        {/* Rules Modal (for start screen) */}
        {showRules && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">How to Play Gomoku</h2>
                <button
                  onClick={() => setShowRules(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4 text-gray-700">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">🎯 Objective</h3>
                  <p>Be the first to get <strong>5 stones in a row</strong> — horizontally, vertically, or diagonally.</p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">⚫⚪ Players</h3>
                  <p><strong>Black</strong> (⚫) always moves first. Players alternate turns, placing one stone per turn.</p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">📍 Placing Stones</h3>
                  <p>Tap any empty cell to place your stone. Once placed, stones cannot be moved or removed.</p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">⚡ Move Limit</h3>
                  <p>Each player has <strong>25 moves maximum</strong>. Use them wisely! If both players run out without a winner, it&apos;s a draw.</p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">💡 Tips</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Control the center — more winning lines available</li>
                    <li>Block your opponent&apos;s 4-in-a-row immediately</li>
                    <li>Create &quot;forks&quot; — threaten 5-in-a-row in two directions</li>
                    <li>Watch your remaining moves!</li>
                  </ul>
                </div>
              </div>
              
              <button
                onClick={() => setShowRules(false)}
                className="mt-6 w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800"
              >
                Got it!
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="w-full flex items-center justify-between">
        <button
          onClick={handleReset}
          className="w-16 text-left text-sm text-gray-600 hover:text-black"
        >
          ← Back
        </button>
        <h1 className="text-xl font-bold text-gray-900">Gomoku</h1>
        <div className="w-16 flex justify-end">
          <button
            onClick={() => setShowRules(true)}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-black text-sm font-medium transition-colors"
          >
            ?
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="text-center">
        {gameState.gameOver ? (
          <div className="text-xl font-bold">
            {gameState.winner 
              ? `${players[gameState.winner].name} wins! 🎉`
              : "It's a draw!"
            }
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-900">
            <div className={`w-4 h-4 rounded-full ${
              gameState.currentPlayer === 1 ? 'bg-black' : 'bg-white border border-gray-300'
            }`} />
            <span className="font-medium">
              {thinking ? (
                <span className="flex items-center gap-1">
                  {currentConfig.name} thinking
                  <span className="animate-pulse">...</span>
                </span>
              ) : (
                `${currentConfig.name}'s turn`
              )}
            </span>
          </div>
        )}
      </div>

      {/* Board */}
      <Board
        board={gameState.board}
        onCellClick={handleCellClick}
        disabled={thinking || currentConfig.type === 'ai'}
        winningCells={gameState.winningCells}
        lastMove={lastMove}
      />

      {/* Moves remaining */}
      <div className="flex gap-6 text-sm">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-black" />
          <span className={gameState.movesRemaining[1] <= 5 ? 'text-red-600 font-medium' : 'text-gray-600'}>
            {gameState.movesRemaining[1]} left
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-white border border-gray-300" />
          <span className={gameState.movesRemaining[2] <= 5 ? 'text-red-600 font-medium' : 'text-gray-600'}>
            {gameState.movesRemaining[2]} left
          </span>
        </div>
      </div>

      {/* Agent link footer */}
      <a
        href="/AGENTS.md"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
      >
        🤖 Agent API docs
      </a>

      {/* Game over actions */}
      {gameState.gameOver && (
        <div className="flex gap-2">
          <button
            onClick={handleNewGame}
            className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800"
          >
            Play Again
          </button>
          <button
            onClick={handleReset}
            className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
          >
            Change Mode
          </button>
        </div>
      )}

      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">How to Play Gomoku</h2>
              <button
                onClick={() => setShowRules(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4 text-gray-700">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">🎯 Objective</h3>
                <p>Be the first to get <strong>5 stones in a row</strong> — horizontally, vertically, or diagonally.</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">⚫⚪ Players</h3>
                <p><strong>Black</strong> (⚫) always moves first. Players alternate turns, placing one stone per turn.</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">📍 Placing Stones</h3>
                <p>Tap any empty cell to place your stone. Once placed, stones cannot be moved or removed.</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">⚡ Move Limit</h3>
                <p>Each player has <strong>25 moves maximum</strong>. Use them wisely! If both players run out without a winner, it&apos;s a draw.</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">💡 Tips</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Control the center — more winning lines available</li>
                  <li>Block your opponent&apos;s 4-in-a-row immediately</li>
                  <li>Create &quot;forks&quot; — threaten 5-in-a-row in two directions</li>
                  <li>Watch your remaining moves!</li>
                </ul>
              </div>
            </div>
            
            <button
              onClick={() => setShowRules(false)}
              className="mt-6 w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
