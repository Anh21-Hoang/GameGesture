
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameStatus, Platform } from '../types';
import { audioService } from '../services/audioService';

interface GameCanvasProps {
  status: GameStatus;
  isJumping: boolean;
  onGameOver: (score: number) => void;
  onPoint: () => void;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 450;
const PLAYER_SIZE = 50;
const GRAVITY = 0.45; // Reduced gravity for more "floaty" jump
const JUMP_FORCE = -13; // Increased jump force
const SCROLL_SPEED = 2.5; // Keeping it slow for kids
const INITIAL_PLATFORM_WIDTH = 300;

// Calculated Max Jump Distance:
// Time to peak = abs(JUMP_FORCE) / GRAVITY = 13 / 0.45 ≈ 28.8 frames
// Total air time ≈ 57.7 frames
// Max distance ≈ SCROLL_SPEED * airTime ≈ 2.5 * 57.7 ≈ 144 units
// We will set max gap to 110 to be safe and forgiving for kids.

const GameCanvas: React.FC<GameCanvasProps> = ({ status, isJumping, onGameOver, onPoint }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Player state
  const playerY = useRef(CANVAS_HEIGHT - 100 - PLAYER_SIZE);
  const playerVY = useRef(0);
  const isOnGround = useRef(true);
  const scoreRef = useRef(0);
  
  // World state
  const platforms = useRef<Platform[]>([]);
  const scrollOffset = useRef(0);
  const nextPlatformX = useRef(0);

  // Character assets
  const drawPlayer = (ctx: CanvasRenderingContext2D, y: number) => {
    const x = 100;
    
    // Draw Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(x + PLAYER_SIZE/2, y + PLAYER_SIZE + 5, 20, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw Character (Simplified "Super Hero")
    ctx.fillStyle = '#FF4D4D'; // Cape/Suit
    ctx.beginPath();
    ctx.roundRect(x + 5, y + 10, PLAYER_SIZE - 10, PLAYER_SIZE - 10, 10);
    ctx.fill();

    // Head
    ctx.fillStyle = '#FFE0B2';
    ctx.beginPath();
    ctx.arc(x + PLAYER_SIZE/2, y + 15, 12, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x + PLAYER_SIZE/2 - 4, y + 13, 2, 0, Math.PI * 2);
    ctx.arc(x + PLAYER_SIZE/2 + 4, y + 13, 2, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x + PLAYER_SIZE/2, y + 18, 5, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  };

  const drawBackground = (ctx: CanvasRenderingContext2D) => {
    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    grad.addColorStop(0, '#87CEEB');
    grad.addColorStop(1, '#E0F7FA');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Clouds
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    const time = Date.now() / 2000;
    for (let i = 0; i < 3; i++) {
      const cx = (100 + i * 300 + Math.sin(time + i) * 20) % (CANVAS_WIDTH + 100) - 50;
      const cy = 50 + i * 30;
      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      ctx.arc(cx + 15, cy - 5, 15, 0, Math.PI * 2);
      ctx.arc(cx + 30, cy, 15, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const initGame = useCallback(() => {
    playerY.current = CANVAS_HEIGHT - 100 - PLAYER_SIZE;
    playerVY.current = 0;
    isOnGround.current = true;
    scoreRef.current = 0;
    scrollOffset.current = 0;
    
    // First platform is long and safe
    platforms.current = [
      { x: 0, width: INITIAL_PLATFORM_WIDTH + 300 }
    ];
    nextPlatformX.current = INITIAL_PLATFORM_WIDTH + 300;
  }, []);

  const spawnPlatform = () => {
    // Reduced gap range: 40 to 110 (Max jumpable is ~144)
    const gap = 40 + Math.random() * 70; 
    const width = 180 + Math.random() * 250; // Wider platforms for easier landing
    const x = nextPlatformX.current + gap;
    
    platforms.current.push({ x, width });
    nextPlatformX.current = x + width;
  };

  useEffect(() => {
    if (status === GameStatus.PLAYING) {
      initGame();
    }
  }, [status, initGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const loop = () => {
      if (status !== GameStatus.PLAYING) return;

      // 1. UPDATE
      scrollOffset.current += SCROLL_SPEED;
      
      // Jump mechanic
      if (isJumping && isOnGround.current) {
        playerVY.current = JUMP_FORCE;
        isOnGround.current = false;
        audioService.playJump();
      }

      // Physics
      playerVY.current += GRAVITY;
      playerY.current += playerVY.current;

      // Platform collision
      const screenPlayerX = 100;
      const worldPlayerX = screenPlayerX + scrollOffset.current;
      let onSomething = false;

      // Cleanup & Spawn platforms
      if (platforms.current.length > 0 && platforms.current[0].x + platforms.current[0].width < scrollOffset.current) {
        platforms.current.shift();
        onPoint(); 
        scoreRef.current++;
      }
      
      if (platforms.current.length < 5) {
        spawnPlatform();
      }

      // Check collision with the current platform
      platforms.current.forEach(plat => {
        const pLeft = worldPlayerX + 5;
        const pRight = worldPlayerX + PLAYER_SIZE - 5;
        
        if (pRight > plat.x && pLeft < plat.x + plat.width) {
          const platTop = CANVAS_HEIGHT - 100;
          // Forgiving landing window
          if (playerY.current + PLAYER_SIZE >= platTop && playerY.current + PLAYER_SIZE <= platTop + 25 && playerVY.current >= 0) {
            playerY.current = platTop - PLAYER_SIZE;
            playerVY.current = 0;
            isOnGround.current = true;
            onSomething = true;
          }
        }
      });

      if (!onSomething) {
        isOnGround.current = false;
      }

      // Game Over check
      if (playerY.current > CANVAS_HEIGHT) {
        onGameOver(scoreRef.current);
        return;
      }

      // 2. RENDER
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      drawBackground(ctx);

      // Draw Platforms
      platforms.current.forEach(plat => {
        const x = plat.x - scrollOffset.current;
        const y = CANVAS_HEIGHT - 100;
        
        // Dirt part
        ctx.fillStyle = '#795548';
        ctx.fillRect(x, y + 10, plat.width, 100);
        
        // Grass part
        ctx.fillStyle = '#4CAF50';
        ctx.beginPath();
        ctx.roundRect(x, y, plat.width, 25, 5);
        ctx.fill();

        // Details
        ctx.fillStyle = '#FFEB3B';
        ctx.beginPath();
        ctx.arc(x + 20, y + 12, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FF4081';
        ctx.beginPath();
        ctx.arc(x + plat.width - 25, y + 10, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      drawPlayer(ctx, playerY.current);

      animationId = requestAnimationFrame(loop);
    };

    if (status === GameStatus.PLAYING) {
      animationId = requestAnimationFrame(loop);
    }

    return () => cancelAnimationFrame(animationId);
  }, [status, isJumping, onGameOver, onPoint]);

  return (
    <canvas 
      ref={canvasRef} 
      width={CANVAS_WIDTH} 
      height={CANVAS_HEIGHT} 
      className="w-full h-full block bg-sky-200"
    />
  );
};

export default GameCanvas;
