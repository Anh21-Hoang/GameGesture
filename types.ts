
export enum GameStatus {
  START = 'START',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER',
  WIN = 'WIN'
}

export interface Platform {
  x: number;
  width: number;
}

export interface GameState {
  status: GameStatus;
  score: number;
  highScore: number;
  distance: number;
}
