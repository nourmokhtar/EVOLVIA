from typing import Any, Dict, Optional
from threading import Lock
from time import time


class SessionNotFound(Exception):
    """Raised when a session is not found or expired."""

    def __init__(self, session_id: str) -> None:
        super().__init__(session_id)
        self.session_id = session_id


class SessionStore:
    """Simple in-memory session store with optional expiration (seconds)."""

    def __init__(self) -> None:
        self._store: Dict[str, Dict[str, Any]] = {}
        self._lock = Lock()

    def set(self, session_id: str, value: Dict[str, Any], ttl: Optional[int] = None) -> None:
        """Store session value; ttl in seconds (optional)."""
        entry = {"value": value, "created_at": time(), "ttl": ttl}
        with self._lock:
            self._store[session_id] = entry

    def get(self, session_id: str) -> Dict[str, Any]:
        """Return stored value or raise SessionNotFound."""
        with self._lock:
            entry = self._store.get(session_id)
            if not entry:
                raise SessionNotFound(session_id)
            ttl = entry.get("ttl")
            if ttl is not None and (time() - entry["created_at"]) > ttl:
                # expired
                del self._store[session_id]
                raise SessionNotFound(session_id)
            return entry["value"]

    def delete(self, session_id: str) -> None:
        with self._lock:
            self._store.pop(session_id, None)
