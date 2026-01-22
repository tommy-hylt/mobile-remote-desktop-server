from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import pyautogui
import os

from routes import (
    screen_size,
    capture,
    mouse_position,
    mouse_move,
    mouse_button,
    mouse_scroll,
    key_press,
    text,
    clipboard,
    shutdown,
    websocket,
)
from core.config import PORT

app = FastAPI(title="Mobile Remote Desktop Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Disable pyautogui failsafe
pyautogui.FAILSAFE = False

# Static files directory
STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "mobile-remote-desktop-web2", "dist")

# Register API routers
app.include_router(screen_size.router)
app.include_router(capture.router)
app.include_router(mouse_position.router)
app.include_router(mouse_move.router)
app.include_router(mouse_button.router)
app.include_router(mouse_scroll.router)
app.include_router(key_press.router)
app.include_router(text.router)
app.include_router(clipboard.router)
app.include_router(shutdown.router)
app.include_router(websocket.router)

# Mount static files (after API routes so API takes precedence)
if os.path.exists(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.get("/")
    def serve_root():
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))

    @app.get("/{path:path}")
    def serve_spa(path: str):
        # Try to serve the file directly
        file_path = os.path.join(STATIC_DIR, path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        # Otherwise serve index.html for SPA routing
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))

if __name__ == "__main__":
    import uvicorn
    print(f"Mobile Remote Desktop Server running on port {PORT}")
    uvicorn.run(app, host="0.0.0.0", port=PORT)
