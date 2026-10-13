/**
 * The mini-game library: every playable score game built on the shared kit (land/mgScene.ts) is loaded here by its adventure id.
 * (The Boat Race, Forest Challenge and Hairball Vacuum have their own scenes and are wired directly in ui/screens/land.ts.)
 * Each module exports `run(stage, setup, hooks)`; the scene loads lazily when the mission starts.
 */
import type { MiniSetup, MiniHooks } from '../mgScene';

export type GameRun = (stage: HTMLElement, setup: MiniSetup, hooks: MiniHooks) => void;
export const GAME_LOADERS: Record<string, () => Promise<{ run: GameRun }>> = {
  fruit: () => import('./fruitView'),
  maze: () => import('./mazeView'),
  balloon: () => import('./balloonView'),
  treasure: () => import('./treasureView'),
  fishing: () => import('./fishingView'),
  obstacle: () => import('./obstacleView'),
  harvest: () => import('./harvestView'),
};
