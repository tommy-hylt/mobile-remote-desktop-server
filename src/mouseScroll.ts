import { Router } from 'express';
import { mouse } from '@nut-tree/nut-js';

const router = Router();

router.post('/mouse/scroll', async (req, res) => {
  try {
    const { x, y } = req.body;

    if (typeof x !== 'number' || typeof y !== 'number') {
      return res.status(400).json({ error: 'Invalid parameters. Required: x, y (numbers)' });
    }

    if (x !== 0) {
      await mouse.scrollRight(x > 0 ? x : 0);
      await mouse.scrollLeft(x < 0 ? -x : 0);
    }

    if (y !== 0) {
      await mouse.scrollDown(y > 0 ? y : 0);
      await mouse.scrollUp(y < 0 ? -y : 0);
    }

    res.json({ success: true, x, y });
  } catch (error) {
    console.error('Error scrolling:', error);
    res.status(500).json({ error: 'Failed to scroll' });
  }
});

export default router;
