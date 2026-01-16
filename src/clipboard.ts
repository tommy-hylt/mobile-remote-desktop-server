import { Router } from 'express';
import { clipboard } from '@nut-tree/nut-js';

const router = Router();

router.get('/clipboard', async (req, res) => {
  try {
    const text = await clipboard.getContent();
    res.json({ text });
  } catch (error) {
    console.error('Error getting clipboard:', error);
    res.status(500).json({ error: 'Failed to get clipboard content' });
  }
});

router.post('/clipboard', async (req, res) => {
  try {
    const { text } = req.body;

    if (typeof text !== 'string') {
      return res.status(400).json({ error: 'Invalid parameter. Required: text (string)' });
    }

    await clipboard.setContent(text);
    res.json({ success: true });
  } catch (error) {
    console.error('Error setting clipboard:', error);
    res.status(500).json({ error: 'Failed to set clipboard content' });
  }
});

export default router;
