# NodeJS Desktop Automation Libraries

## Installation

```bash
npm install node-screenshots @jitsi/robotjs
```

**Note:** `@jitsi/robotjs` may require Windows Build Tools for native compilation:
```bash
npm install --global windows-build-tools
```

---

## node-screenshots (Screen Capture)

Zero-dependency native screenshot library. Apache-2.0 license.

### Get All Monitors

```javascript
const { Monitor } = require('node-screenshots');

const monitors = Monitor.all();
console.log(monitors.length); // Number of displays
```

### Capture Full Screen

```javascript
const { Monitor } = require('node-screenshots');
const fs = require('fs');

const monitors = Monitor.all();
const image = monitors[0].captureImageSync();

// Save as PNG
const pngBuffer = image.toPngSync();
fs.writeFileSync('screen.png', pngBuffer);

// Get raw image data
const width = image.width;
const height = image.height;
const rawBuffer = image.toRawSync(); // RGBA buffer
```

### Capture Region

```javascript
const image = monitors[0].captureImageSync();
const cropped = image.cropSync(x, y, width, height);
const pngBuffer = cropped.toPngSync();
```

---

## @jitsi/robotjs (Mouse & Keyboard)

Desktop automation library. MIT license. Fork of original robotjs with prebuilt binaries.

### Mouse - Get Position

```javascript
const robot = require('@jitsi/robotjs');

const pos = robot.getMousePos();
console.log(pos.x, pos.y);
```

### Mouse - Move

```javascript
robot.moveMouse(100, 200);

// Smooth move (slower, animated)
robot.moveMouseSmooth(100, 200);
```

### Mouse - Click

```javascript
// Left click
robot.mouseClick();

// Right click
robot.mouseClick('right');

// Double click
robot.mouseClick('left', true);
```

### Mouse - Drag

```javascript
robot.moveMouse(100, 100);
robot.mouseToggle('down');
robot.moveMouse(200, 200);
robot.mouseToggle('up');

// Or use dragMouse
robot.dragMouse(200, 200);
```

### Mouse - Scroll

```javascript
robot.scrollMouse(0, 10);  // Scroll down
robot.scrollMouse(0, -10); // Scroll up
```

### Keyboard - Type String

```javascript
robot.typeString('Hello World');
```

**Known Issue:** Some special characters may not work (e.g., `?`). Workaround: type character by character with delays, or use clipboard paste.

### Keyboard - Single Key

```javascript
robot.keyTap('enter');
robot.keyTap('escape');
robot.keyTap('backspace');
robot.keyTap('tab');
robot.keyTap('up');    // Arrow keys: up, down, left, right
robot.keyTap('f1');    // Function keys: f1-f12
```

### Keyboard - Key with Modifiers

```javascript
robot.keyTap('c', ['control']);        // Ctrl+C
robot.keyTap('v', ['control']);        // Ctrl+V
robot.keyTap('s', ['control', 'shift']); // Ctrl+Shift+S
robot.keyTap('1', ['shift']);          // !
```

Modifiers: `'control'`, `'shift'`, `'alt'`, `'command'` (Mac)

### Keyboard - Hold/Release Keys

```javascript
robot.keyToggle('shift', 'down');
robot.keyTap('a'); // Types 'A'
robot.keyToggle('shift', 'up');
```

---

## Workaround: Clipboard for Special Characters

When `typeString` fails with special characters:

```javascript
const { execSync } = require('child_process');

function typeViaClipboard(text) {
  // Copy to clipboard (Windows)
  execSync(`powershell -command "Set-Clipboard -Value '${text.replace(/'/g, "''")}'"`);
  // Paste
  robot.keyTap('v', ['control']);
}

typeViaClipboard('abc!?');
```

---

## Complete Example

```javascript
const { Monitor } = require('node-screenshots');
const robot = require('@jitsi/robotjs');
const fs = require('fs');

async function demo() {
  // Screenshot
  const monitors = Monitor.all();
  const image = monitors[0].captureImageSync();
  fs.writeFileSync('screen.png', image.toPngSync());

  // Mouse
  robot.moveMouse(100, 100);
  robot.mouseClick();

  // Wait
  await new Promise(r => setTimeout(r, 1000));

  // Keyboard
  robot.typeString('Hello');
  robot.keyTap('enter');
}

demo();
```

---

## Performance Notes

- `captureImageSync()` is fast (~10-50ms depending on resolution)
- For streaming/RDP, capture at lower intervals or resize images
- Consider JPEG for smaller payload: use `sharp` library to convert PNG buffer
