from fastapi import APIRouter
import pyautogui
import threading

from core.state import key_down_timers

router = APIRouter()


def auto_release_key(key: str):
    pyautogui.keyUp(key)
    key_down_timers.pop(key, None)


@router.post("/key/{key}")
def key_press(key: str):
    pyautogui.press(key)
    return {"success": True, "key": key}


@router.post("/key/{key}/{action}")
def key_action(key: str, action: str):
    if action == "down":
        pyautogui.keyDown(key)
        if key in key_down_timers:
            key_down_timers[key].cancel()
        timer = threading.Timer(30.0, auto_release_key, args=[key])
        timer.start()
        key_down_timers[key] = timer
    elif action == "up":
        pyautogui.keyUp(key)
        if key in key_down_timers:
            key_down_timers[key].cancel()
            del key_down_timers[key]
    else:
        return {"success": False, "error": "Invalid action"}

    return {"success": True, "key": key, "action": action}
