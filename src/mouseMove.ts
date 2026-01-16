import { Router } from 'express';
import { mouse, Point } from '@nut-tree/nut-js';

const router = Router();

router.post('/mouse/move', async (req, res) => {
  try {
    const { x, y } = req.body;

    if (typeof x !== 'number' || typeof y !== 'number') {
      return res.status(400).json({ error: 'Invalid parameters. Required: x, y (numbers)' });
    }

    await mouse.setPosition(new Point(x, y));
    res.json({ success: true, x, y });
  } catch (error) {
    console.error('Error moving mouse:', error);
    res.status(500).json({ error: 'Failed to move mouse' });
  }
});

export default router;
