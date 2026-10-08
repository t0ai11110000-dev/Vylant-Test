import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Maximize2, Minimize2, Play, RotateCcw, Trophy } from 'lucide-react';

import { MinigameTextureConfig } from './MinigameTexturesModal';

interface Pipe {
 x: number;
 topHeight: number;
 passed: boolean;
}

interface FlappyBirdProps {
 isDarkMode: boolean;
 customTexture?: MinigameTextureConfig;
}

const FlappyBird: React.FC<FlappyBirdProps> = ({ isDarkMode, customTexture }) => {
 const canvasRef = useRef<HTMLCanvasElement>(null);
 const containerRef = useRef<HTMLDivElement>(null);
 const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'GAME_OVER'>('IDLE');
 const gameStateRef = useRef(gameState);
 useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

 const [score, setScore] = useState(0);
 const scoreRef = useRef(score);
 useEffect(() => { scoreRef.current = score; }, [score]);
 const [highScore, setHighScore] = useState(() => {
  const saved = localStorage.getItem('vylant_flappy_highscore');
  return saved ? parseInt(saved, 10) : 0;
 });
 const [isFullScreen, setIsFullScreen] = useState(false);
 const birdImageRef = useRef<HTMLImageElement | null>(null);

 useEffect(() => {
  const imgSrc = customTexture?.birdTexture || 'https://i.imgur.com/H3OS5zA.png';
  const img = new Image();
  img.src = imgSrc;
  img.referrerPolicy = 'no-referrer';
  img.onload = () => {
   birdImageRef.current = img;
  };
 }, [customTexture?.birdTexture]);

 // Game Constants
 const BIRD_X = 50;
 const BIRD_WIDTH = 34;
 const BIRD_HEIGHT = 24;
 const GRAVITY = 0.22; 
 const JUMP_FORCE = -4.8;
 const PIPE_WIDTH = 52;
 const PIPE_GAP = 160;
 const PIPE_SPEED = 1.6;
 const PIPE_SPAWN_TIME = 1800; // ms
 const GROUND_HEIGHT = 80;

 // Mutable Game State
 const gameRef = useRef({
  birdY: 200,
  birdVelocity: 0,
  pipes: [] as Pipe[],
  frameCount: 0,
  lastTime: 0,
  spawnTimer: 0,
  backgroundX: 0,
  animationId: 0,
 });

 const resetGame = useCallback((startImmediately = false) => {
  gameRef.current = {
   birdY: 200,
   birdVelocity: 0,
   pipes: [],
   frameCount: 0,
   lastTime: performance.now(),
   spawnTimer: 0,
   backgroundX: 0,
   animationId: gameRef.current.animationId, // Persist ID to avoid loop breakage
  };
  setScore(0);
  scoreRef.current = 0;
  setGameState(startImmediately ? 'PLAYING' : 'IDLE');
  gameStateRef.current = startImmediately ? 'PLAYING' : 'IDLE';
 }, []);

 const jump = useCallback(() => {
  if (gameState === 'PLAYING') {
   gameRef.current.birdVelocity = JUMP_FORCE;
  } else if (gameState === 'IDLE') {
   setGameState('PLAYING');
   gameStateRef.current = 'PLAYING';
   gameRef.current.birdVelocity = JUMP_FORCE;
  } else if (gameState === 'GAME_OVER') {
   resetGame(true); // Start immediately on click when game over
  }
 }, [gameState, resetGame]);

 useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
   const target = e.target as HTMLElement;
   if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
    return;
   }
   if (e.code === 'Space') {
    e.preventDefault();
    jump();
   }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
 }, [jump]);

 const update = (timestamp: number) => {
  if (gameStateRef.current !== 'PLAYING') {
   gameRef.current.lastTime = timestamp;
   return;
  }

  const game = gameRef.current;
  const canvas = canvasRef.current;
  if (!canvas) return;

  const dt = timestamp - game.lastTime;
  game.lastTime = timestamp;
  
  // Normalize physics to 60fps
  const timeScale = Math.min(dt / (1000 / 60), 2.0); 

  // Bird Physics
  game.birdVelocity += GRAVITY * timeScale;
  game.birdY += game.birdVelocity * timeScale;

  // Collision: Floor & Ceiling
  if (game.birdY + BIRD_HEIGHT > canvas.height - GROUND_HEIGHT || game.birdY < 0) {
   setGameState('GAME_OVER');
   gameStateRef.current = 'GAME_OVER';
   return;
  }

  // Pipe Spawning
  game.spawnTimer += dt;
  if (game.spawnTimer >= PIPE_SPAWN_TIME) {
   game.spawnTimer = 0;
   const minTopHeight = 50;
   const maxTopHeight = canvas.height - GROUND_HEIGHT - PIPE_GAP - 50;
   const topHeight = Math.floor(Math.random() * (maxTopHeight - minTopHeight + 1)) + minTopHeight;
   game.pipes.push({ x: canvas.width, topHeight, passed: false });
  }

  // Pipe Movement & Collision
  game.pipes.forEach((pipe, index) => {
   pipe.x -= PIPE_SPEED * timeScale;

   // Score Tracking
   if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
    pipe.passed = true;
    setScore(s => s + 1);
   }

   // Deletion
   if (pipe.x + PIPE_WIDTH < 0) {
    game.pipes.splice(index, 1);
   }

   // Collision Detection
   const birdBox = { x: BIRD_X, y: game.birdY, r: BIRD_X + BIRD_WIDTH, b: game.birdY + BIRD_HEIGHT };
   const pipeTopBox = { x: pipe.x, y: 0, r: pipe.x + PIPE_WIDTH, b: pipe.topHeight };
   const pipeBottomBox = { x: pipe.x, y: pipe.topHeight + PIPE_GAP, r: pipe.x + PIPE_WIDTH, b: canvas.height };

   const collides = (a: any, b: any) => a.x < b.r && a.r > b.x && a.y < b.b && a.b > b.y;

   if (collides(birdBox, pipeTopBox) || collides(birdBox, pipeBottomBox)) {
    setGameState('GAME_OVER');
    gameStateRef.current = 'GAME_OVER';
   }
  });

  // Background Scroll
  game.backgroundX = (game.backgroundX - (1 * timeScale)) % canvas.width;
 };

 const draw = () => {
  const canvas = canvasRef.current;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;

  const game = gameRef.current;

  // Clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw Background
  ctx.fillStyle = customTexture?.birdBgColor || (isDarkMode ? '#0f172a' : '#70c5ce');
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dynamic Colors
  const birdColor = '#fbbf24';
  const pipeColor = customTexture?.pipeColor || (isDarkMode ? '#1e293b' : '#22c55e');
  const groundColor = isDarkMode ? '#020617' : '#ded895';

  // Draw Pipes
  game.pipes.forEach(pipe => {
   ctx.fillStyle = pipeColor;
   ctx.strokeStyle = isDarkMode ? '#334155' : '#15803d';
   ctx.lineWidth = 2;

   // Top
   ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
   ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);

   // Bottom
   ctx.fillRect(pipe.x, pipe.topHeight + PIPE_GAP, PIPE_WIDTH, canvas.height - pipe.topHeight - PIPE_GAP - GROUND_HEIGHT);
   ctx.strokeRect(pipe.x, pipe.topHeight + PIPE_GAP, PIPE_WIDTH, canvas.height - pipe.topHeight - PIPE_GAP - GROUND_HEIGHT);
  });

  // Draw Ground
  ctx.fillStyle = groundColor;
  ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);
  ctx.strokeStyle = isDarkMode ? '#1e293b' : '#8b4513';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, canvas.height - GROUND_HEIGHT);
  ctx.lineTo(canvas.width, canvas.height - GROUND_HEIGHT);
  ctx.stroke();

  // Draw Bird
  ctx.save();
  ctx.translate(BIRD_X + BIRD_WIDTH / 2, game.birdY + BIRD_HEIGHT / 2);
  // Rotate based on velocity
  ctx.rotate(Math.min(Math.PI / 4, Math.max(-Math.PI / 4, game.birdVelocity * 0.1)));
  
  if (birdImageRef.current) {
   // Draw the logo bird
   ctx.drawImage(
    birdImageRef.current, 
    -BIRD_WIDTH / 2 - 5, // Slight offset/padding for the image
    -BIRD_HEIGHT / 2 - 5, 
    BIRD_WIDTH + 10, 
    BIRD_HEIGHT + 10
   );
  } else {
   // Fallback to original drawing if image hasn't loaded
   ctx.fillStyle = birdColor;
   ctx.beginPath();
   ctx.roundRect(-BIRD_WIDTH / 2, -BIRD_HEIGHT / 2, BIRD_WIDTH, BIRD_HEIGHT, 8);
   ctx.fill();
   
   // Eye
   ctx.fillStyle = 'white';
   ctx.beginPath();
   ctx.arc(8, -4, 4, 0, Math.PI * 2);
   ctx.fill();
   ctx.fillStyle = 'black';
   ctx.beginPath();
   ctx.arc(10, -4, 2, 0, Math.PI * 2);
   ctx.fill();

   // Wing
   ctx.fillStyle = '#f59e0b';
   ctx.beginPath();
   ctx.roundRect(-12, 0, 16, 10, 5);
   ctx.fill();
  }

  ctx.restore();

  // UI - Score in Game
  if (gameStateRef.current === 'PLAYING') {
   ctx.fillStyle = 'white';
   ctx.font = 'bold 32px Inter, sans-serif';
   ctx.textAlign = 'center';
   ctx.shadowBlur = 4;
   ctx.shadowColor = 'rgba(0,0,0,0.5)';
   ctx.fillText(scoreRef.current.toString(), canvas.width / 2, 50);
   ctx.shadowBlur = 0;
  }
 };

 const gameLoop = useCallback((timestamp: number) => {
  update(timestamp);
  draw();
  gameRef.current.animationId = requestAnimationFrame(gameLoop);
 }, [isDarkMode]); // Only re-run if isDarkMode changes (since it affects draw colors)

 useEffect(() => {
  const startLoop = (timestamp: number) => {
   gameRef.current.lastTime = timestamp;
   gameRef.current.animationId = requestAnimationFrame(gameLoop);
  };
  const id = requestAnimationFrame(startLoop);
  return () => cancelAnimationFrame(id);
 }, [gameLoop]);

 useEffect(() => {
  if (score > highScore) {
   setHighScore(score);
   localStorage.setItem('vylant_flappy_highscore', score.toString());
  }
 }, [score, highScore]);

 const toggleFullScreen = () => {
  if (!containerRef.current) return;
  
  if (!document.fullscreenElement) {
   containerRef.current.requestFullscreen().catch(err => {
    console.error(`Error attempting to enable full-screen mode: ${err.message}`);
   });
   setIsFullScreen(true);
  } else {
   document.exitFullscreen();
   setIsFullScreen(false);
  }
 };

 useEffect(() => {
  const handleFsChange = () => setIsFullScreen(!!document.fullscreenElement);
  document.addEventListener('fullscreenchange', handleFsChange);
  return () => document.removeEventListener('fullscreenchange', handleFsChange);
 }, []);

 return (
  <div 
   ref={containerRef}
   className={`relative w-full overflow-hidden rounded-2xl group ${
    isFullScreen ? 'h-screen w-screen rounded-none bg-navy-950' : 'aspect-[4/5] max-w-[400px] mx-auto bg-black/5'
   }`}
   onClick={jump}
  >
   <canvas 
    ref={canvasRef}
    width={400}
    height={500}
    className="w-full h-full object-contain pointer-events-none"
   />

   {/* Overlays */}
   <AnimatePresence>
    {gameState === 'IDLE' && (
     <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] text-white ${
       isFullScreen ? 'p-6' : 'p-2'
      }`}
     >
      <motion.div 
       animate={{ y: [0, -10, 0] }}
       transition={{ repeat: Infinity, duration: 2 }}
       className={isFullScreen ? 'mb-4' : 'mb-2'}
      >
        {birdImageRef.current ? (
         <img 
          src="https://i.imgur.com/H3OS5zA.png" 
          className={isFullScreen ? 'w-24 h-24 object-contain translate-x-2' : 'w-16 h-16 object-contain translate-x-1'} 
          referrerPolicy="no-referrer"
         />
        ) : (
         <Play size={isFullScreen ? 48 : 32} fill="currentColor" />
        )}
      </motion.div>
      <h4 className={`${isFullScreen ? 'text-xl' : 'text-sm'} font-black uppercase tracking-widest mb-1 shadow-lg`}>Vylant Bird</h4>
      <p className={`${isFullScreen ? 'text-sm mb-6' : 'text-[10px] mb-3'} opacity-80`}>Press Space or Tap to Fly</p>
      <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/10">
       <Trophy size={14} className="text-amber-400" />
       <span className="text-[10px] font-bold">Best: {highScore}</span>
      </div>
     </motion.div>
    )}

    {gameState === 'GAME_OVER' && (
     <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm text-white ${
       isFullScreen ? 'p-6' : 'p-2'
      }`}
     >
      <h4 className={`${isFullScreen ? 'text-4xl mb-2' : 'text-xl mb-1'} font-black text-red-500 uppercase tracking-tighter`}>Game Over</h4>
      <div className={`bg-white/10 w-full max-w-[200px] rounded-2xl border border-white/10 text-center ${
       isFullScreen ? 'p-4 mb-6' : 'p-2 mb-3'
      }`}>
       <p className="text-[10px] uppercase opacity-60 font-bold mb-0.5">Score</p>
       <p className={`${isFullScreen ? 'text-3xl mb-4' : 'text-xl mb-2'} font-black`}>{score}</p>
       <div className="flex items-center justify-center gap-2 pt-2 border-t border-white/5 font-bold">
        <Trophy size={12} className="text-amber-400" />
        <span className="text-[10px]">Best: {highScore}</span>
       </div>
      </div>
      
      <button 
       onClick={(e) => {
        e.stopPropagation();
        resetGame(true);
       }}
       className={`flex items-center gap-2 bg-vylant-blue rounded-xl font-bold hover:scale-105 active:scale-95 transition-all shadow-xl shadow-vylant-blue/20 ${
        isFullScreen ? 'px-8 py-3 text-base' : 'px-4 py-2 text-xs'
       }`}
      >
       <RotateCcw size={isFullScreen ? 18 : 14} />
       Try Again
      </button>
     </motion.div>
    )}
   </AnimatePresence>

   {/* Controls */}
   <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
    <button 
     onClick={(e) => {
      e.stopPropagation();
      toggleFullScreen();
     }}
     className="p-2 rounded-xl bg-black/20 hover:bg-black/40 border border-white/10 backdrop-blur-md text-white transition-all hover:scale-110 active:scale-95"
     title={isFullScreen ? "Minimize" : "Fullscreen"}
    >
     {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
    </button>
   </div>

   {/* In-game Score Indicator */}
   {gameState === 'PLAYING' && !isFullScreen && (
    <div className="absolute top-4 left-4 pointer-events-none">
     <div className="bg-black/20 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-white text-xs font-bold">
      Score: {score}
     </div>
    </div>
   )}
  </div>
 );
};

export default FlappyBird;
