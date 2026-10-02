import { describe, expect, it, vi, afterEach } from "vitest";
import { handleLineAppointment } from "./appointments";
import type { ConversationInput } from "./conversation";

const id = "00000000-0000-4000-8000-000000000001";
function input(text: string, data: unknown = null): ConversationInput {
  return { event: { eventId: "event", type: "message", messageType: "text", text, destination: "encrypted", subjectHash: "a".repeat(64) },
    context: { actor: null, propertyIds: [id] }, origin: "https://example.com",
    config: { line: { providerId: "provider", environment: "development" } } as ConversationInput["config"],
    admin: { rpc: vi.fn(async () => ({ data, error: null })) } };
}
afterEach(() => vi.useRealTimers());
describe("LINE appointment routing", () => {
  it("does not intercept intake/search messages", async () => {
    const request = input("เพิ่มทรัพย์"); expect(await handleLineAppointment(request)).toBeNull(); expect(request.admin.rpc).not.toHaveBeenCalled();
  });
  it("requires an exact selected property", async () => {
    const request = input("นัดพรุ่งนี้บ่ายสอง ชื่อ สมชาย โทร 0812345678"); request.context.propertyIds = [id, "00000000-0000-4000-8000-000000000002"];
    expect(JSON.stringify(await handleLineAppointment(request))).toContain("เลือกปุ่ม"); expect(request.admin.rpc).not.toHaveBeenCalled();
  });
  it("stores a proposal and requests consent instead of creating on natural text", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-28T10:00:00Z"));
    const request = input("นัดพรุ่งนี้บ่ายสอง ชื่อ สมชาย โทร 0812345678", { token: id, propertyId: id, startsAt: "2026-09-29T07:00:00Z", endsAt: "2026-09-29T08:00:00Z", customerName: "สมชาย", customerPhone: "0812345678" });
    const result = await handleLineAppointment(request);
    expect(result?.[0]?.type).toBe("flex"); expect(JSON.stringify(result)).toContain(`appointment:confirm:${id}`);
    expect(request.admin.rpc).toHaveBeenCalledOnce();
    expect(request.admin.rpc).toHaveBeenCalledWith("line_appointment_proposal_server", expect.objectContaining({ target_subject_hash: "a".repeat(64), target_proposal: expect.objectContaining({ startsAt: "2026-09-29T07:00:00.000Z" }) }));
  });
  it("confirmation uses the stored subject-bound proposal token", async () => {
    const request = input("", { id, starts_at: "2026-09-29T07:00:00Z", status: "requested" }); request.event.postback = `appointment:confirm:${id}`;
    expect(JSON.stringify(await handleLineAppointment(request))).toContain("รอ Agent ยืนยัน");
    expect(request.admin.rpc).toHaveBeenCalledWith("line_appointment_confirm_server", expect.objectContaining({ target_token: id, target_subject_hash: "a".repeat(64) }));
  });
  it("does not claim success or leak errors on forbidden operations", async () => {
    const request = input(`ยกเลิกนัด ${id}`); request.admin.rpc = vi.fn(async () => ({ data: null, error: { message: "secret SQL detail" } }));
    const reply = JSON.stringify(await handleLineAppointment(request)); expect(reply).toContain("ไม่สำเร็จ"); expect(reply).not.toContain("secret");
  });
});
