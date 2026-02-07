
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameStatus, GameState } from './types';
import { audioService } from './services/audioService';
import GameCanvas from './components/GameCanvas';

// Global MediaPipe types (they come from the CDN)
declare const Hands: any;
declare const Camera: any;

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    status: GameStatus.START,
    score: 0,
    highScore: 0,
    distance: 0,
  });
  
  const [isHandFist, setIsHandFist] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Hand tracking logic
  useEffect(() => {
    if (!videoRef.current) return;

    const hands = new Hands({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    hands.onResults((results: any) => {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        
        // Detect fist: if fingertips (8, 12, 16, 20) are close to the palm base (0)
        // or below their respective MCP joints.
        // A simple check for fist: compare distance of fingertips to palm vs open hand
        const tips = [8, 12, 16, 20];
        const mcps = [5, 9, 13, 17];
        
        let closedCount = 0;
        tips.forEach((tipIndex, i) => {
          const tip = landmarks[tipIndex];
          const mcp = landmarks[mcps[i]];
          // In MediaPipe y increases downwards. If tip y is greater than mcp y, finger is folded
          if (tip.y > mcp.y) {
            closedCount++;
          }
        });

        const isFist = closedCount >= 3;
        setIsHandFist(isFist);
      } else {
        setIsHandFist(false);
      }
    });

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        if (videoRef.current) {
          await hands.send({ image: videoRef.current });
        }
      },
      width: 320,
      height: 240,
    });

    camera.start().then(() => {
      setIsCameraReady(true);
    });

    return () => {
      camera.stop();
      hands.close();
    };
  }, []);

  const startGame = () => {
    audioService.playStart();
    setGameState(prev => ({
      ...prev,
      status: GameStatus.PLAYING,
      score: 0,
      distance: 0,
    }));
  };

  const handleGameOver = (finalScore: number) => {
    audioService.playFall();
    setGameState(prev => ({
      ...prev,
      status: GameStatus.GAMEOVER,
      score: finalScore,
      highScore: Math.max(prev.highScore, finalScore),
    }));
  };

  return (
    <div className="relative w-full h-screen flex flex-col items-center justify-center font-sans overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-400 to-sky-200 -z-10"></div>
      
      {/* Camera Preview (Mini) */}
      <div className="absolute top-4 right-4 w-48 h-36 bg-black rounded-xl border-4 border-white overflow-hidden shadow-lg z-20">
        <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" />
        {!isCameraReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white text-xs">
            Đang mở camera...
          </div>
        )}
        <div className={`absolute bottom-2 left-2 px-2 py-1 rounded text-[10px] font-bold ${isHandFist ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          {isHandFist ? 'ĐÃ NẮM TAY (NHẢY!)' : 'HÃY NẮM TAY'}
        </div>
      </div>

      {/* Game Canvas */}
      <div className="relative w-full max-w-4xl aspect-[16/9] bg-white rounded-2xl shadow-2xl overflow-hidden border-8 border-yellow-400">
        <GameCanvas 
          status={gameState.status} 
          isJumping={isHandFist} 
          onGameOver={handleGameOver} 
          onPoint={() => {
            audioService.playPoint();
            setGameState(prev => ({ ...prev, score: prev.score + 1 }));
          }}
        />

        {/* HUD */}
        {gameState.status === GameStatus.PLAYING && (
          <div className="absolute top-4 left-4 flex flex-col gap-2 drop-shadow-md">
            <div className="bg-white/80 px-4 py-2 rounded-full border-2 border-yellow-500 font-bold text-yellow-700">
              Điểm: {gameState.score}
            </div>
            <div className="bg-white/80 px-4 py-2 rounded-full border-2 border-blue-500 font-bold text-blue-700">
              Kỷ lục: {gameState.highScore}
            </div>
          </div>
        )}

        {/* Start Overlay */}
        {gameState.status === GameStatus.START && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-30">
            <div className="bg-white p-8 rounded-3xl text-center shadow-2xl transform transition-all animate-bounce">
              <h1 className="text-4xl font-black text-blue-600 mb-2 italic uppercase">Siêu Nhân Nhảy Vực</h1>
              <p className="text-gray-600 mb-6 font-medium">Học sinh 6-9 tuổi • Vui nhộn • Vận động</p>
              
              <div className="flex flex-col items-center gap-4 mb-8">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-3xl mb-1 border-2 border-blue-400">✊</div>
                    <span className="text-xs font-bold text-gray-500">NẮM TAY</span>
                  </div>
                  <div className="flex items-center text-gray-400">➔</div>
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl mb-1 border-2 border-green-400">🦘</div>
                    <span className="text-xs font-bold text-gray-500">NHẢY</span>
                  </div>
                </div>
                <p className="text-sm text-blue-500 max-w-xs font-semibold">
                  Hãy nắm chặt bàn tay trước camera để giúp siêu nhân nhảy qua vực sâu!
                </p>
              </div>

              <button 
                onClick={startGame}
                disabled={!isCameraReady}
                className={`px-10 py-4 rounded-full text-2xl font-black text-white shadow-xl transform active:scale-95 transition-all ${
                  isCameraReady ? 'bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 cursor-pointer' : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                {isCameraReady ? 'CHƠI NGAY!' : 'ĐỢI CAMERA...'}
              </button>
            </div>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState.status === GameStatus.GAMEOVER && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md z-30">
            <div className="bg-white p-10 rounded-3xl text-center shadow-2xl border-4 border-red-400">
              <h2 className="text-5xl font-black text-red-500 mb-2 italic">ỐI! RƠI MẤT RỒI</h2>
              <p className="text-2xl font-bold text-gray-600 mb-6">Bạn đã được {gameState.score} điểm!</p>
              
              <div className="bg-yellow-50 p-4 rounded-xl mb-8 border-2 border-yellow-200">
                <p className="text-yellow-700 font-bold">Kỷ lục của bạn: {gameState.highScore}</p>
              </div>

              <div className="flex gap-4 justify-center">
                <button 
                  onClick={startGame}
                  className="px-8 py-4 bg-green-500 hover:bg-green-600 rounded-full text-xl font-black text-white shadow-lg transform active:scale-95 transition-all"
                >
                  CHƠI LẠI
                </button>
                <button 
                  onClick={() => setGameState(prev => ({ ...prev, status: GameStatus.START }))}
                  className="px-8 py-4 bg-gray-500 hover:bg-gray-600 rounded-full text-xl font-black text-white shadow-lg transform active:scale-95 transition-all"
                >
                  MENU
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Instructions footer */}
      <div className="mt-8 flex gap-8">
        <div className="flex items-center gap-3 bg-white/50 px-6 py-3 rounded-2xl border-2 border-blue-300">
          <span className="text-3xl">🐢</span>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">Tốc độ</p>
            <p className="font-bold text-blue-700">Chậm & Dễ</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white/50 px-6 py-3 rounded-2xl border-2 border-orange-300">
          <span className="text-3xl">🖐️</span>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">Cử chỉ</p>
            <p className="font-bold text-orange-700">Nhận diện tay</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
