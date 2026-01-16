import { Router } from 'express';
import screenshot from 'screenshot-desktop';
import { saveFullCapture } from './state';

const router = Router();

router.get('/capture/full', async (req, res) => {
  try {
    const imgBuffer = await screenshot({ format: 'png' });

    saveFullCapture(imgBuffer);

    res.set('Content-Type', 'image/png');
    res.send(imgBuffer);
  } catch (error) {
    console.error('Error capturing full screen:', error);
    res.status(500).json({ error: 'Failed to capture full screen' });
  }
});

export default router;
