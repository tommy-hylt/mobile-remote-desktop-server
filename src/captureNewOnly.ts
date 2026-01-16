import { Router } from 'express';
import screenshot from 'screenshot-desktop';
import sharp from 'sharp';
import crypto from 'crypto';
import { loadCaptureArea, loadCaptureHash, saveCapture, saveCaptureHash } from './state';

const router = Router();

router.get('/capture/new-only', async (req, res) => {
  try {
    const area = loadCaptureArea();
    const imgBuffer = await screenshot({ format: 'png' });

    const croppedBuffer = await sharp(imgBuffer)
      .extract({ left: area.x, top: area.y, width: area.w, height: area.h })
      .png()
      .toBuffer();

    const newHash = crypto.createHash('md5').update(croppedBuffer).digest('hex');
    const lastHash = loadCaptureHash();

    if (lastHash === newHash) {
      return res.status(204).send();
    }

    saveCapture(croppedBuffer);
    saveCaptureHash(newHash);

    res.set('Content-Type', 'image/png');
    res.send(croppedBuffer);
  } catch (error) {
    console.error('Error capturing screen:', error);
    res.status(500).json({ error: 'Failed to capture screen' });
  }
});

export default router;
