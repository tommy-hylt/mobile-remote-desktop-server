import { Router } from 'express';
import { keyboard, Key } from '@nut-tree/nut-js';

const router = Router();

const keyMap: { [key: string]: Key } = {
  enter: Key.Enter,
  escape: Key.Escape,
  tab: Key.Tab,
  backspace: Key.Backspace,
  delete: Key.Delete,
  space: Key.Space,
  up: Key.Up,
  down: Key.Down,
  left: Key.Left,
  right: Key.Right,
  home: Key.Home,
  end: Key.End,
  pageup: Key.PageUp,
  pagedown: Key.PageDown,
  f1: Key.F1,
  f2: Key.F2,
  f3: Key.F3,
  f4: Key.F4,
  f5: Key.F5,
  f6: Key.F6,
  f7: Key.F7,
  f8: Key.F8,
  f9: Key.F9,
  f10: Key.F10,
  f11: Key.F11,
  f12: Key.F12,
  ctrl: Key.LeftControl,
  alt: Key.LeftAlt,
  shift: Key.LeftShift,
  meta: Key.LeftSuper,
  win: Key.LeftSuper,
};

router.post('/key/:key', async (req, res) => {
  try {
    const { key } = req.params;

    if (!key || key.length === 0) {
      return res.status(400).json({ error: 'Key parameter is required' });
    }

    const lowerKey = key.toLowerCase();

    if (keyMap[lowerKey]) {
      await keyboard.pressKey(keyMap[lowerKey]);
      await keyboard.releaseKey(keyMap[lowerKey]);
    } else if (key.length === 1) {
      await keyboard.type(key);
    } else {
      return res.status(400).json({ error: `Unknown key: ${key}` });
    }

    res.json({ success: true, key });
  } catch (error) {
    console.error('Error pressing key:', error);
    res.status(500).json({ error: 'Failed to press key' });
  }
});

export default router;
