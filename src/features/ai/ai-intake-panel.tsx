"use client";

import { useMemo, useState } from "react";
import { intakeSubmitState } from "./ui-state";

type IntakeSubmit = (input: Record<string, unknown>) => Promise<{ ok: boolean }>;

export function AiIntakePanel({ media, submit }: { media: Array<{ id: string; original_filename: string }>; submit: IntakeSubmit }) {
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const state = useMemo(() => intakeSubmitState(text, selected.length), [text, selected]);
  return <section className="panel"><h2>ให้ AI ช่วยจัดข้อมูล</h2><label htmlFor="aiText">รายละเอียดทรัพย์</label><textarea id="aiText" value={text} maxLength={12000} onChange={(event) => setText(event.target.value)} />{media.map((item) => <label key={item.id}><input type="checkbox" checked={selected.includes(item.id)} onChange={() => setSelected((value) => value.includes(item.id) ? value.filter((id) => id !== item.id) : [...value, item.id])} />{item.original_filename}</label>)}<p>{state.message}</p><button disabled={state.disabled} onClick={async () => { setMessage("กำลังส่งงานให้ AI…"); const result = await submit({ agentText: text, mediaIds: selected, tasks: ["extraction"], idempotencyKey: crypto.randomUUID() }); setMessage(result.ok ? "รับงานแล้ว" : "ส่งงานไม่สำเร็จ"); }}>ส่งให้ AI</button><p role="status" aria-live="polite">{message}</p></section>;
}
