from fastapi import APIRouter
import pyautogui
import threading
import os

from core.state import mouse_down_timers, key_down_timers

router = APIRouter()


@router.post("/shutdown")
def shutdown():
    # Release mouse buttons
    for button, timer in list(mouse_down_timers.items()):
        timer.cancel()
        pyautogui.mouseUp(button=button)
    mouse_down_timers.clear()

    # Release keys
    for key, timer in list(key_down_timers.items()):
        timer.cancel()
        pyautogui.keyUp(key)
    key_down_timers.clear()

    def stop():
        os._exit(0)

    threading.Timer(0.5, stop).start()
    return {"success": True, "message": "Server shutting down"}
