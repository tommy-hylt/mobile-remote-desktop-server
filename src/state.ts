import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(__dirname, '..', 'data');

export interface CaptureArea {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MouseButtonState {
  timer: NodeJS.Timeout | null;
  isDown: boolean;
}

export interface AppState {
  mouseButtons: {
    left: MouseButtonState;
    right: MouseButtonState;
    middle: MouseButtonState;
  };
}

export const state: AppState = {
  mouseButtons: {
    left: { timer: null, isDown: false },
    right: { timer: null, isDown: false },
    middle: { timer: null, isDown: false },
  },
};

export function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getDataPath(filename: string): string {
  return path.join(DATA_DIR, filename);
}

export function loadCaptureArea(): CaptureArea {
  const areaPath = getDataPath('area.json');
  if (fs.existsSync(areaPath)) {
    const data = fs.readFileSync(areaPath, 'utf-8');
    return JSON.parse(data);
  }
  return { x: 0, y: 0, w: 1920, h: 1080 };
}

export function saveCaptureArea(area: CaptureArea): void {
  ensureDataDir();
  fs.writeFileSync(getDataPath('area.json'), JSON.stringify(area, null, 2));
}

export function loadCaptureHash(): string | null {
  const hashPath = getDataPath('capture-hash.txt');
  if (fs.existsSync(hashPath)) {
    return fs.readFileSync(hashPath, 'utf-8').trim();
  }
  return null;
}

export function saveCaptureHash(hash: string): void {
  ensureDataDir();
  fs.writeFileSync(getDataPath('capture-hash.txt'), hash);
}

export function saveCapture(buffer: Buffer): void {
  ensureDataDir();
  fs.writeFileSync(getDataPath('capture.png'), buffer);
}

export function saveFullCapture(buffer: Buffer): void {
  ensureDataDir();
  fs.writeFileSync(getDataPath('screen.png'), buffer);
}
