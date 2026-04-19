import { getAppMode } from './appMode';

export const DEMO_MODE = getAppMode() === 'demo';
