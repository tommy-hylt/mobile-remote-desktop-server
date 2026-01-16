import { Router } from 'express';
import { releaseButton } from './mouseButton';

const router = Router();

router.post('/shutdown', async (req, res) => {
  try {
    console.log('Shutdown requested, releasing mouse buttons...');

    await releaseButton('left');
    await releaseButton('right');
    await releaseButton('middle');

    res.json({ success: true, message: 'Server shutting down' });

    setTimeout(() => {
      console.log('Server shutting down gracefully');
      process.exit(0);
    }, 100);
  } catch (error) {
    console.error('Error during shutdown:', error);
    res.status(500).json({ error: 'Failed to shutdown gracefully' });
  }
});

export default router;
