"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { postRoomMessageAction } from "@/app/actions";

function SendButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-white transition hover:brightness-110 active:scale-95 disabled:opacity-50"
    >
      {pending ? "…" : "➤"}
    </button>
  );
}

export default function RoomMessageForm({ roomId }: { roomId: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(fd) => {
        postRoomMessageAction(fd);
        formRef.current?.reset();
      }}
      className="sticky bottom-0 flex items-center gap-2 border-t border-border-soft glass px-4 py-3"
    >
      <input type="hidden" name="room_id" value={roomId} />
      <input
        name="content"
        required
        placeholder="Say something…"
        autoComplete="off"
        className="min-w-0 flex-1 rounded-full border border-border bg-surface/50 px-4 py-2.5 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
      />
      <SendButton />
    </form>
  );
}
