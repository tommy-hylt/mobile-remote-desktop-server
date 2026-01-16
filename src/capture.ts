import { Router } from 'express';
import screenshot from 'screenshot-desktop';
import sharp from 'sharp';
import crypto from 'crypto';
import { loadCaptureArea, saveCapture, saveCaptureHash } from './state';

const router = Router();

router.get('/capture', async (req, res) => {
  try {
    const area = loadCaptureArea();
    const imgBuffer = await screenshot({ format: 'png' });

    const croppedBuffer = await sharp(imgBuffer)
      .extract({ left: area.x, top: area.y, width: area.w, height: area.h })
      .png()
      .toBuffer();

    const hash = crypto.createHash('md5').update(croppedBuffer).digest('hex');
    saveCapture(croppedBuffer);
    saveCaptureHash(hash);

    res.set('Content-Type', 'image/png');
    res.send(croppedBuffer);
  } catch (error) {
    console.error('Error capturing screen:', error);
    res.status(500).json({ error: 'Failed to capture screen' });
  }
});

export default router;
