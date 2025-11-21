import json
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException

from ..models import CalendarChatRequest
from ..config import client
from ..prompts import CAL_CHAT_SYSTEM_PROMPT, CAL_CHAT_TOOLS
from ..google_calendar import (
    get_calendar_service,
    CAL_CHAT_TOOL_IMPLS,
)

router = APIRouter(prefix="/api/chat", tags=["calendar-chat"])


@router.post("/calendar")
async def chat_with_calendar(req: CalendarChatRequest):
    # Ensure Google is connected
    try:
        get_calendar_service()
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Google auth failed: {e}")

    messages: List[Dict[str, Any]] = [
        {"role": "system", "content": CAL_CHAT_SYSTEM_PROMPT}
    ]
    for m in req.messages:
        if m.role in ("user", "assistant"):
            messages.append({"role": m.role, "content": m.content})

    first = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=messages,
        tools=CAL_CHAT_TOOLS,
        tool_choice="auto",
    )

    msg = first.choices[0].message
    tool_calls = msg.tool_calls or []
    if not tool_calls:
        return {"reply": msg.content}

    tool_call_dicts = []
    tool_results_messages = []

    for tc in tool_calls:
        fn_name = tc.function.name
        raw_args = tc.function.arguments or "{}"
        try:
            parsed_args = json.loads(raw_args)
        except json.JSONDecodeError:
            parsed_args = {}

        impl = CAL_CHAT_TOOL_IMPLS.get(fn_name)
        if impl is None:
            result = {"error": f"Unknown tool {fn_name}"}
        else:
            try:
                result = impl(**parsed_args)
            except Exception as e:
                result = {"error": f"Tool {fn_name} failed: {e}"}

        tool_call_dicts.append(
            {
                "id": tc.id,
                "type": tc.type,
                "function": {"name": fn_name, "arguments": raw_args},
            }
        )
        tool_results_messages.append(
            {
                "role": "tool",
                "tool_call_id": tc.id,
                "name": fn_name,
                "content": json.dumps(result),
            }
        )

    followup_messages: List[Dict[str, Any]] = messages + [
        {
            "role": "assistant",
            "content": msg.content or "",
            "tool_calls": tool_call_dicts,
        }
    ]
    followup_messages.extend(tool_results_messages)

    second = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=followup_messages,
    )

    final_msg = second.choices[0].message
    return {"reply": final_msg.content}
