'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function JoinGamePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);
  const [gameInfo, setGameInfo] = useState<{
    players: { 1: { name: string } | null; 2: { name: string } | null };
  } | null>(null);

  // Check if game exists
  useEffect(() => {
    async function checkGame() {
      try {
        const res = await fetch(`/api/game/check?code=${code}`);
        if (res.ok) {
          const data = await res.json();
          setGameInfo(data);
        } else {
          setError('Invalid invite code');
        }
      } catch {
        setError('Failed to check game');
      }
      setChecking(false);
    }
    checkGame();
  }, [code]);

  const handleJoin = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/game/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, name: name.trim(), type: 'human' }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Failed to join');
        setLoading(false);
        return;
      }
      
      // Store player info and redirect to game
      sessionStorage.setItem(`game_${data.id}_player`, String(data.yourPlayer));
      sessionStorage.setItem(`game_${data.id}_name`, name.trim());
      router.push(`/play/${data.id}`);
    } catch {
      setError('Failed to join game');
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center p-4">
        <div className="text-gray-600">Checking invite code...</div>
      </main>
    );
  }

  if (error && !gameInfo) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invite</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <a href="/" className="text-blue-600 hover:underline">Go to home</a>
        </div>
      </main>
    );
  }

  const opponent = gameInfo?.players[1] || gameInfo?.players[2];

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Join Gomoku Game
        </h1>
        
        {opponent && (
          <p className="text-center text-gray-600 mb-6">
            <span className="font-medium">{opponent.name}</span> invited you to play!
          </p>
        )}
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-800">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg text-gray-900 placeholder-gray-500"
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
          </div>
          
          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}
          
          <button
            onClick={handleJoin}
            disabled={loading}
            className="w-full py-4 bg-black text-white rounded-lg text-lg font-medium hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
          >
            {loading ? 'Joining...' : 'Join Game'}
          </button>
        </div>
        
        <p className="text-center text-gray-500 text-sm mt-4">
          Invite code: <code className="bg-gray-100 px-2 py-0.5 rounded">{code}</code>
        </p>
      </div>
    </main>
  );
}
