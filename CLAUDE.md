# Mobile Remote Desktop Server

A lightweight RDP-like server for mobile web clients. Built with TypeScript/Node.js/Express.

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Screen Capture**: screenshot-desktop
- **Input Control**: robotjs or @nut-tree/nut-js
- **Image Processing**: sharp (for PNG comparison/diff)

## Project Structure

```
/src
  index.ts           # Express app entry point, route registration
  screenSize.ts      # GET /screen-size
  captureArea.ts     # GET/POST /capture/area
  capture.ts         # GET /capture
  captureNewOnly.ts  # GET /capture/new-only
  captureFull.ts     # GET /capture/full
  mousePosition.ts   # GET /mouse/position
  mouseMove.ts       # POST /mouse/move
  mouseButton.ts     # POST /mouse/left/down
  mouseScroll.ts     # POST /mouse/scroll/up
  keyPress.ts        # POST /key/a
  shutdown.ts        # POST /shutdown
  state.ts           # Shared state (capture area, last capture hash, mouse down timer)
```

## API Endpoints

### Screen Info
- `GET /screen-size` - Returns `{ width: number, height: number }`

### Capture Area
- `GET /capture/area` - Returns saved value `{ x: number, y: number, w: number, h: number }`
- `POST /capture/area` - Body: `{ x, y, w, h }` - Sets capture region
- Save into file "/data/area.json"

### Screen Capture
- `GET /capture` - Returns PNG image of current capture area
- `GET /capture/new-only` - Returns PNG only if screen changed, else 204 No Content
- Read file "/data/area.json"
- Save last image into "/data/capture.png"
- Save last image's hash into "/data/capture-hash.txt"

### Full Screen Capture
- `GET /capture/full` - Returns PNG image of current screen
- Save last image into "/data/screen.png"

### Mouse Control
- `GET /mouse/position` - Returns `{ x: number, y: number }`
- `POST /mouse/move` - Body: `{ x, y }` - Moves cursor to position

### Mouse Button
- `POST /mouse/<button>/<up/down>` - Presses mouse button
  - eg. `POST /mouse/left/down`
  - eg. `POST /mouse/right/up`
- For down, auto-releases after 10s safety timeout if relative up is not called

### Mouse Scroll
- `POST /mouse/scroll` - Body: `{ x, y }`

### Keyboard
- `POST /key/<key>` - Presses single key (e.g., `a`, `enter`, `escape`)

### Shutdown
- `POST /shutdown` - Gracefully shutdown server
- Release mouse buttons

## Route Handler Pattern

Each route file exports an Express router:

```typescript
// Example: screenSize.ts
import { Router } from 'express';
import { screen } from '@nut-tree/nut-js'; // or robotjs

const router = Router();

router.get('/screen-size', async (req, res) => {
  const width = await screen.width();
  const height = await screen.height();
  res.json({ width, height });
});

export default router;
```

## index.ts Structure

```typescript
import express from 'express';
import cors from 'cors';
import screenSize from './screenSize';
import captureArea from './captureArea';
import capture from './capture';
import captureNewOnly from './captureNewOnly';
import mousePosition from './mousePosition';
import mouseMove from './mouseMove';
import mouseDown from './mouseDown';
import mouseUp from './mouseUp';
import keyPress from './keyPress';

const app = express();
app.use(cors());
app.use(express.json());

app.use(screenSize);
app.use(captureArea);
app.use(capture);
app.use(captureNewOnly);
app.use(mousePosition);
app.use(mouseMove);
app.use(mouseDown);
app.use(mouseUp);
app.use(keyPress);

const PORT = process.env.PORT || 6485;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

## Key Implementation Notes

### Screen Capture
- Use `screenshot-desktop` for full screen capture
- Use `sharp` to crop to capture area and convert to PNG
- For `new-only`, compute hash of image buffer and compare with `lastCaptureHash`

### Mouse Down Safety
- On `/mouse/down`, start 10-second timer stored in `state.mouseDownTimer`
- If timer fires, auto-call mouse up
- On `/mouse/up`, clear the timer if exists

### Image Comparison
```typescript
import crypto from 'crypto';

function getImageHash(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex');
}
```

## Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "@nut-tree/nut-js": "^4.0.0",
    "screenshot-desktop": "^1.15.0",
    "sharp": "^0.33.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "ts-node": "^10.9.2"
  }
}
```

## Scripts

```json
{
  "scripts": {
    "dev": "ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

## tsconfig.json Essentials

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

## CORS

Enable CORS for mobile web client access. Allowed all origins.

## Error Handling

All routes should wrap async operations in try-catch and return appropriate HTTP status codes:
- 200: Success
- 204: No Content (for new-only when unchanged)
- 400: Bad Request (invalid parameters)
- 500: Server Error