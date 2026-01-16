import { Router } from 'express';
import { screen } from '@nut-tree/nut-js';

const router = Router();

router.get('/screen-size', async (req, res) => {
  try {
    const width = await screen.width();
    const height = await screen.height();
    res.json({ width, height });
  } catch (error) {
    console.error('Error getting screen size:', error);
    res.status(500).json({ error: 'Failed to get screen size' });
  }
});

export default router;
