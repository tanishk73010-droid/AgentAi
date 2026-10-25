import asyncio
import json
import logging
import uuid
from typing import Dict, List, AsyncGenerator
from datetime import datetime, timezone

from app.schemas.events import WorkflowEvent

logger = logging.getLogger("shadowbuilder.events")


class EventBroadcaster:
    """Manages SSE subscribers and in-memory event logs for runs."""

    def __init__(self):
        # run_id -> list of WorkflowEvent
        self.history: Dict[str, List[WorkflowEvent]] = {}
        # run_id -> list of asyncio.Queue
        self.subscribers: Dict[str, List[asyncio.Queue]] = {}

    def publish(self, run_id: str, agent: str, status: str, message: str, metadata: dict = None) -> WorkflowEvent:
        event = WorkflowEvent(
            run_id=run_id,
            event_id=f"evt_{uuid.uuid4().hex[:8]}",
            timestamp=datetime.now(timezone.utc).isoformat(),
            agent=agent,
            status=status,
            message=message,
            metadata=metadata or {},
        )

        if run_id not in self.history:
            self.history[run_id] = []
        self.history[run_id].append(event)

        logger.info(f"[{run_id}] [{agent.upper()}] [{status}] {message}")

        if run_id in self.subscribers:
            for q in self.subscribers[run_id]:
                try:
                    q.put_nowait(event)
                except asyncio.QueueFull:
                    pass

        return event

    async def subscribe(self, run_id: str) -> AsyncGenerator[str, None]:
        q = asyncio.Queue(maxsize=100)
        if run_id not in self.subscribers:
            self.subscribers[run_id] = []
        self.subscribers[run_id].append(q)

        try:
            # First replay existing events
            if run_id in self.history:
                for past_event in self.history[run_id]:
                    yield f"data: {past_event.model_dump_json()}\n\n"

            # Stream incoming events
            while True:
                try:
                    event = await asyncio.wait_for(q.get(), timeout=20.0)
                    yield f"data: {event.model_dump_json()}\n\n"
                    if event.status in ("succeeded", "failed") and event.agent == "system":
                        break
                except asyncio.TimeoutError:
                    # Keep-alive comment
                    yield ": ping\n\n"
        finally:
            if run_id in self.subscribers and q in self.subscribers[run_id]:
                self.subscribers[run_id].remove(q)

    def get_history(self, run_id: str) -> List[WorkflowEvent]:
        return self.history.get(run_id, [])


events_manager = EventBroadcaster()
