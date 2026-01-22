import threading

mouse_down_timers: dict[str, threading.Timer] = {}
key_down_timers: dict[str, threading.Timer] = {}
