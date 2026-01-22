from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from datetime import datetime, timezone
import json
import logging

from routes import screen_size, capture, mouse_position, mouse_move, mouse_button, mouse_scroll, key_press, text, clipboard, shutdown

router = APIRouter()
logger = logging.getLogger("uvicorn")


def format_http_date(dt: datetime) -> str:
    """Format datetime as HTTP date string."""
    return dt.strftime("%a, %d %b %Y %H:%M:%S GMT")


async def handle_request(websocket: WebSocket, msg: dict) -> None:
    """Handle a single WebSocket request message."""
    msg_id = msg.get("id")
    method = msg.get("method", "")
    params = msg.get("params", {})
    client = f"{websocket.client.host}:{websocket.client.port}" if websocket.client else "unknown"

    try:
        # Route to existing handlers
        if method == "GET /screen-size":
            result = screen_size.screen_size()
            await send_response(websocket, msg_id, 200, result, method, client)

        elif method == "GET /capture":
            await handle_capture(websocket, msg_id, params, method, client)

        elif method == "GET /mouse/position":
            result = mouse_position.mouse_position()
            await send_response(websocket, msg_id, 200, result, method, client)

        elif method == "POST /mouse/move":
            from routes.mouse_move import Position
            pos = Position(x=params.get("x"), y=params.get("y"))
            result = mouse_move.mouse_move(pos)
            await send_response(websocket, msg_id, 200, result, method, client)

        elif method.startswith("POST /mouse/") and method.count("/") == 3:
            # POST /mouse/{button}/{action}
            parts = method.split("/")
            button, action = parts[2], parts[3]
            result = mouse_button.mouse_button(button, action)
            await send_response(websocket, msg_id, 200, result, method, client)

        elif method == "POST /mouse/scroll":
            from routes.mouse_scroll import ScrollInput
            scroll = ScrollInput(x=params.get("x", 0), y=params.get("y", 0))
            result = mouse_scroll.mouse_scroll(scroll)
            await send_response(websocket, msg_id, 200, result, method, client)

        elif method.startswith("POST /key/"):
            # POST /key/{key} or POST /key/{key}/{action}
            path = method[10:]  # Remove "POST /key/"
            if "/" in path:
                # POST /key/{key}/{action}
                key, action = path.rsplit("/", 1)
                result = key_press.key_action(key, action)
            else:
                # POST /key/{key}
                result = key_press.key_press(path)
            await send_response(websocket, msg_id, 200, result, method, client)

        elif method.startswith("POST /text/"):
            # POST /text/{text}
            txt = method[11:]  # Remove "POST /text/"
            result = text.type_text(txt)
            await send_response(websocket, msg_id, 200, result, method, client)

        elif method == "GET /clipboard":
            result = clipboard.get_clipboard()
            await send_response(websocket, msg_id, 200, result, method, client)

        elif method == "POST /clipboard":
            from routes.clipboard import ClipboardText
            data = ClipboardText(text=params.get("text", ""))
            result = clipboard.set_clipboard(data)
            await send_response(websocket, msg_id, 200, result, method, client)

        elif method == "POST /shutdown":
            result = shutdown.shutdown()
            await send_response(websocket, msg_id, 200, result, method, client)

        else:
            await send_error(websocket, msg_id, 404, f"Unknown method: {method}", method, client)

    except Exception as e:
        await send_error(websocket, msg_id, 500, str(e), method, client)


async def handle_capture(websocket: WebSocket, msg_id: str, params: dict, method: str, client: str) -> None:
    """Handle GET /capture - special case with binary response."""
    from fastapi import Response

    area = params.get("area")
    quality = params.get("quality", 50)
    resize = params.get("resize")
    last_hash = params.get("last_hash")

    # Call existing capture function
    result = capture.capture(area=area, quality=quality, resize=resize, last_hash=last_hash)

    if isinstance(result, Response):
        next_hash = result.headers.get("Next-Hash", "")
        date_str = format_http_date(datetime.now(timezone.utc))

        if result.status_code == 204:
            await send_response(websocket, msg_id, 204, {"next_hash": next_hash}, method, client)
        else:
            # Send metadata first, then binary
            await send_response(websocket, msg_id, 200, {"next_hash": next_hash, "date": date_str}, method, client)
            await websocket.send_bytes(result.body)


async def send_response(websocket: WebSocket, msg_id: str, status: int, data: dict, method: str, client: str) -> None:
    """Send a JSON response."""
    logger.info(f'{client} - "{method} WS" {status}')
    await websocket.send_json({"id": msg_id, "status": status, "data": data})


async def send_error(websocket: WebSocket, msg_id: str, status: int, error: str, method: str, client: str) -> None:
    """Send an error response."""
    logger.info(f'{client} - "{method} WS" {status}')
    await websocket.send_json({"id": msg_id, "status": status, "error": error})


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                await handle_request(websocket, msg)
            except json.JSONDecodeError:
                await websocket.send_json({"id": None, "status": 400, "error": "Invalid JSON"})
    except WebSocketDisconnect:
        pass
