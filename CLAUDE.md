# Mobile Remote Desktop Server

A lightweight RDP-like server for mobile web clients. Built with Python/FastAPI.

## Tech Stack

- **Runtime**: Python 3.10+
- **Framework**: FastAPI with Uvicorn
- **Screen Capture**: mss
- **Input Control**: pyautogui
- **Clipboard**: pyperclip

## Project Structure

```
/
  main.py              # FastAPI app entry point, route registration
  requirements.txt     # Python dependencies
  /routes
    __init__.py
    screen_size.py     # GET /screen-size
    capture.py         # GET /capture
    mouse_position.py  # GET /mouse/position
    mouse_move.py      # POST /mouse/move
    mouse_button.py    # POST /mouse/{button}/{action}
    mouse_scroll.py    # POST /mouse/scroll
    key_press.py       # POST /key/{key}
    clipboard.py       # GET/POST /clipboard
    shutdown.py        # POST /shutdown
    websocket.py       # WebSocket /ws endpoint
  /core
    __init__.py
    state.py           # Shared state (mouse_down_timers)
    config.py          # Constants (PORT)
```

## API Endpoints

### Root
- `GET /` - Returns `{ message: str, status: str }` - Health check

### Screen Info
- `GET /screen-size` - Returns `{ width: int, height: int }`

### Screen Capture
- `GET /capture` - Returns JPEG image of capture area
  - Query param `area` (optional): `x,y,w,h` format (e.g., `?area=0,0,800,600`)
  - Query param `quality` (optional): JPEG quality 1-100 (default: 50)
  - Query param `resize` (optional): `w,h` format (e.g., `?resize=800,600`)
  - If no area specified, captures full screen
  - Header `Last-Hash` (optional): MD5 hash of previous capture
  - If `Last-Hash` matches current capture hash, returns 204 No Content
  - Response header `Next-Hash` contains the MD5 hash of returned image

### Mouse Control
- `GET /mouse/position` - Returns `{ x: int, y: int }`
- `POST /mouse/move` - Body: `{ x, y }` - Moves cursor to position

### Mouse Button
- `POST /mouse/{button}/{action}` - Presses mouse button
  - eg. `POST /mouse/left/down`
  - eg. `POST /mouse/right/up`
- For down, auto-releases after 10s safety timeout if relative up is not called

### Mouse Scroll
- `POST /mouse/scroll` - Body: `{ x, y }`

### Keyboard
- `POST /key/{key}` - Presses single key (e.g., `a`, `enter`, `escape`)
- `POST /key/{key}/down` - Holds key down
- `POST /key/{key}/up` - Releases key
- For down, auto-releases after 30s safety timeout if relative up is not called

### Text
- `POST /text/{text}` - Types text string (ASCII only)

### Clipboard
- `GET /clipboard` - Returns `{ text: str }` with current clipboard content
- `POST /clipboard` - Body: `{ text: str }` - Sets clipboard content

### Shutdown
- `POST /shutdown` - Gracefully shutdown server
- Release mouse buttons

## WebSocket API

Connection: `ws://localhost:6485/ws`

WebSocket wraps HTTP endpoints. Client sends JSON requests, server responds with JSON (and binary for capture).

### Request Format
```json
{
  "id": "uuid-v4",
  "method": "GET /screen-size",
  "params": {}
}
```

### Response Format
```json
{
  "id": "uuid-v4",
  "status": 200,
  "data": { "width": 1920, "height": 1080 }
}
```

### Methods
| Method | Params | Response |
|--------|--------|----------|
| `GET /screen-size` | none | `{ width, height }` |
| `GET /capture` | `{ area?, quality?, resize?, last_hash? }` | Special (see below) |
| `GET /mouse/position` | none | `{ x, y }` |
| `POST /mouse/move` | `{ x, y }` | `{ success, x, y }` |
| `POST /mouse/{button}/{action}` | none | `{ success, button, action }` |
| `POST /mouse/scroll` | `{ x, y }` | `{ success, x, y }` |
| `POST /key/{key}` | none | `{ success, key }` |
| `POST /key/{key}/{action}` | none | `{ success, key, action }` |
| `POST /text/{text}` | none | `{ success, text }` |
| `GET /clipboard` | none | `{ text }` |
| `POST /clipboard` | `{ text }` | `{ success }` |
| `POST /shutdown` | none | `{ success, message }` |

### GET /capture Special Case
- **204 (hash match)**: Single JSON response with `{ next_hash }`
- **200 (new image)**: Two messages - JSON metadata first `{ next_hash, date }`, then binary JPEG

## Code Structure

### core/config.py
```python
PORT = 6485
```

### core/state.py
```python
import threading

mouse_down_timers: dict[str, threading.Timer] = {}
```

### main.py
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pyautogui

from routes import (
    screen_size,
    capture,
    mouse_position,
    mouse_move,
    mouse_button,
    mouse_scroll,
    key_press,
    clipboard,
    shutdown,
    websocket,
)
from core.config import PORT

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Disable pyautogui failsafe
pyautogui.FAILSAFE = False


@app.get("/")
def root():
    return {"message": "Mobile Remote Desktop Server", "status": "running"}


# Register routers
app.include_router(screen_size.router)
app.include_router(capture.router)
app.include_router(mouse_position.router)
app.include_router(mouse_move.router)
app.include_router(mouse_button.router)
app.include_router(mouse_scroll.router)
app.include_router(key_press.router)
app.include_router(clipboard.router)
app.include_router(shutdown.router)
app.include_router(websocket.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
```

### routes/screen_size.py
```python
from fastapi import APIRouter
import pyautogui

router = APIRouter()

@router.get("/screen-size")
def screen_size():
    size = pyautogui.size()
    return {"width": size.width, "height": size.height}
```

### routes/capture.py
```python
from fastapi import APIRouter, Response, Header
from typing import Optional
import mss
import hashlib
import pyautogui
from PIL import Image
from io import BytesIO

router = APIRouter()

def get_image_hash(data: bytes) -> str:
    return hashlib.md5(data).hexdigest()

def parse_area(area: Optional[str]) -> dict:
    """Parse area string 'x,y,w,h' into dict. Returns full screen if None."""
    if area:
        parts = area.split(",")
        if len(parts) == 4:
            return {
                "left": int(parts[0]),
                "top": int(parts[1]),
                "width": int(parts[2]),
                "height": int(parts[3]),
            }
    # Default to full screen
    size = pyautogui.size()
    return {"left": 0, "top": 0, "width": size.width, "height": size.height}

@router.get("/capture")
def capture(
    area: Optional[str] = None,
    quality: int = 50,
    last_hash: Optional[str] = Header(None, alias="Last-Hash")
):
    monitor = parse_area(area)

    with mss.mss() as sct:
        img = sct.grab(monitor)
        # Convert to PIL Image
        pil_img = Image.frombytes("RGB", img.size, img.bgra, "raw", "BGRX")

    # Compress to JPEG
    buffer = BytesIO()
    pil_img.save(buffer, format="JPEG", quality=quality, optimize=True)
    jpeg_data = buffer.getvalue()

    new_hash = get_image_hash(jpeg_data)

    # If client provided Last-Hash and it matches, return 204
    if last_hash and last_hash == new_hash:
        return Response(status_code=204, headers={"Next-Hash": new_hash})

    return Response(
        content=jpeg_data,
        media_type="image/jpeg",
        headers={"Next-Hash": new_hash}
    )
```

### routes/mouse_position.py
```python
from fastapi import APIRouter
import pyautogui

router = APIRouter()

@router.get("/mouse/position")
def mouse_position():
    pos = pyautogui.position()
    return {"x": pos.x, "y": pos.y}
```

### routes/mouse_move.py
```python
from fastapi import APIRouter
from pydantic import BaseModel
import pyautogui

router = APIRouter()

class Position(BaseModel):
    x: int
    y: int

@router.post("/mouse/move")
def mouse_move(pos: Position):
    pyautogui.moveTo(pos.x, pos.y)
    return {"success": True, "x": pos.x, "y": pos.y}
```

### routes/mouse_button.py
```python
from fastapi import APIRouter
import pyautogui
import threading

from core.state import mouse_down_timers

router = APIRouter()

def auto_release_button(button: str):
    pyautogui.mouseUp(button=button)
    mouse_down_timers.pop(button, None)

@router.post("/mouse/{button}/{action}")
def mouse_button(button: str, action: str):
    if action == "down":
        pyautogui.mouseDown(button=button)
        if button in mouse_down_timers:
            mouse_down_timers[button].cancel()
        timer = threading.Timer(10.0, auto_release_button, args=[button])
        timer.start()
        mouse_down_timers[button] = timer
    elif action == "up":
        pyautogui.mouseUp(button=button)
        if button in mouse_down_timers:
            mouse_down_timers[button].cancel()
            del mouse_down_timers[button]
    else:
        return {"success": False, "error": "Invalid action"}

    return {"success": True, "button": button, "action": action}
```

### routes/mouse_scroll.py
```python
from fastapi import APIRouter
from pydantic import BaseModel
import pyautogui

router = APIRouter()

class ScrollInput(BaseModel):
    x: int
    y: int

@router.post("/mouse/scroll")
def mouse_scroll(scroll: ScrollInput):
    pyautogui.scroll(scroll.y)
    if scroll.x != 0:
        pyautogui.hscroll(scroll.x)
    return {"success": True, "x": scroll.x, "y": scroll.y}
```

### routes/key_press.py
```python
from fastapi import APIRouter
import pyautogui

router = APIRouter()

@router.post("/key/{key}")
def key_press(key: str):
    pyautogui.press(key)
    return {"success": True, "key": key}
```

### routes/clipboard.py
```python
from fastapi import APIRouter
from pydantic import BaseModel
import pyperclip

router = APIRouter()

class ClipboardText(BaseModel):
    text: str

@router.get("/clipboard")
def get_clipboard():
    try:
        text = pyperclip.paste()
        return {"text": text}
    except Exception:
        return {"text": ""}

@router.post("/clipboard")
def set_clipboard(data: ClipboardText):
    pyperclip.copy(data.text)
    return {"success": True}
```

### routes/shutdown.py
```python
from fastapi import APIRouter
import pyautogui
import threading
import os

from core.state import mouse_down_timers

router = APIRouter()

@router.post("/shutdown")
def shutdown():
    for button, timer in list(mouse_down_timers.items()):
        timer.cancel()
        pyautogui.mouseUp(button=button)
    mouse_down_timers.clear()

    def stop():
        os._exit(0)

    threading.Timer(0.5, stop).start()
    return {"success": True, "message": "Server shutting down"}
```

### routes/__init__.py
```python
from . import (
    screen_size,
    capture,
    mouse_position,
    mouse_move,
    mouse_button,
    mouse_scroll,
    key_press,
    clipboard,
    shutdown,
    websocket,
)
```

## Dependencies

```
# requirements.txt
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
pyautogui>=0.9.54
mss>=9.0.1
pyperclip>=1.8.2
Pillow>=10.0.0
```

## Scripts

```bash
# Install dependencies
pip install -r requirements.txt

# Run development server
python main.py

# Or with uvicorn directly
uvicorn main:app --host 0.0.0.0 --port 6485 --reload
```

## CORS

Enable CORS for mobile web client access. Allowed all origins.

## Error Handling

All routes should handle exceptions and return appropriate HTTP status codes:
- 200: Success
- 204: No Content (when LAST_HASH matches current capture)
- 400: Bad Request (invalid parameters)
- 500: Server Error

## Key Implementation Notes

### Screen Capture
- Use `mss` for fast screen capture (faster than PIL/Pillow)
- mss returns raw RGB data, use `mss.tools.to_png()` to convert
- Client sends `Last-Hash` header with previous capture's hash
- Server returns `Next-Hash` header with current capture's MD5 hash
- If hashes match, return 204 No Content (no image data)

### Mouse Down Safety
- On `/mouse/{button}/down`, start 10-second timer
- If timer fires, auto-call mouseUp
- On `/mouse/{button}/up`, cancel the timer if exists

### PyAutoGUI Settings
- Set `pyautogui.FAILSAFE = False` to disable corner failsafe
- This prevents interruption when cursor moves to screen corner
