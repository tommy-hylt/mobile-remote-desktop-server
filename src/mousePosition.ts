import { Router } from 'express';
import { mouse } from '@nut-tree/nut-js';

const router = Router();

router.get('/mouse/position', async (req, res) => {
  try {
    const position = await mouse.getPosition();
    res.json({ x: position.x, y: position.y });
  } catch (error) {
    console.error('Error getting mouse position:', error);
    res.status(500).json({ error: 'Failed to get mouse position' });
  }
});

export default router;
