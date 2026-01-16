import { Router } from 'express';
import { loadCaptureArea, saveCaptureArea, CaptureArea } from './state';

const router = Router();

router.get('/capture/area', (req, res) => {
  try {
    const area = loadCaptureArea();
    res.json(area);
  } catch (error) {
    console.error('Error getting capture area:', error);
    res.status(500).json({ error: 'Failed to get capture area' });
  }
});

router.post('/capture/area', (req, res) => {
  try {
    const { x, y, w, h } = req.body;

    if (typeof x !== 'number' || typeof y !== 'number' ||
        typeof w !== 'number' || typeof h !== 'number') {
      return res.status(400).json({ error: 'Invalid parameters. Required: x, y, w, h (numbers)' });
    }

    if (w <= 0 || h <= 0) {
      return res.status(400).json({ error: 'Width and height must be positive' });
    }

    const area: CaptureArea = { x, y, w, h };
    saveCaptureArea(area);
    res.json({ success: true, area });
  } catch (error) {
    console.error('Error setting capture area:', error);
    res.status(500).json({ error: 'Failed to set capture area' });
  }
});

export default router;
