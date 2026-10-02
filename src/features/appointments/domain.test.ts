import { describe, expect, it } from "vitest";
import { appointmentInputSchema, bangkokLocalToIso, calendarDays } from "./domain";
import { appointmentContact, parseAppointmentTime } from "../line/appointment-time";

describe("appointments and Thai time", () => {
  const now = new Date("2026-09-28T10:00:00Z");
  it("resolves tomorrow afternoon in Bangkok, including the UTC date boundary", () => {
    expect(parseAppointmentTime("นัดพรุ่งนี้บ่ายสอง", now)?.startsAt).toBe("2026-09-29T07:00:00.000Z");
    expect(parseAppointmentTime("นัดพรุ่งนี้บ่ายสองครึ่ง", new Date("2026-09-28T18:00:00Z"))?.startsAt).toBe("2026-09-30T07:30:00.000Z");
  });
  it("requires explicit unambiguous date and time in the future", () => {
    for (const text of ["พรุ่งนี้", "บ่ายสอง", "นัดวันนี้บ่ายสอง", "2026-02-30 14:00", "2026-09-30 25:00", "สัปดาห์หน้า"]) expect(parseAppointmentTime(text, now)).toBeNull();
    expect(parseAppointmentTime("นัด 2026-10-01 เวลา 09:30", now)?.startsAt).toBe("2026-10-01T02:30:00.000Z");
  });
  it("extracts explicitly supplied customer details only", () => {
    expect(appointmentContact("นัดพรุ่งนี้บ่ายสอง ชื่อ สมชาย โทร 081-234-5678")).toEqual({ customerName: "สมชาย", customerPhone: "0812345678" });
    expect(appointmentContact("นัดพรุ่งนี้บ่ายสอง")).toBeNull();
  });
  it("rejects rolled-over calendar dates", () => {
    expect(() => bangkokLocalToIso("2026-02-30T10:00")).toThrow();
    expect(bangkokLocalToIso("2026-09-29T00:30")).toBe("2026-09-28T17:30:00.000Z");
  });
  it("builds a complete six-week calendar crossing month/year boundaries", () => {
    const days = calendarDays("2027-01");
    expect(days).toHaveLength(42); expect(days[0]).toBe("2026-12-27"); expect(days[41]).toBe("2027-02-06");
  });
  it("requires contact details and a positive bounded duration", () => {
    const input = { propertyId: "00000000-0000-4000-8000-000000000001", customerName: "สมชาย", startsAt: "2026-09-29T07:00:00Z", endsAt: "2026-09-29T08:00:00Z", idempotencyKey: "test-request" };
    expect(appointmentInputSchema.safeParse(input).success).toBe(false);
    expect(appointmentInputSchema.safeParse({ ...input, customerPhone: "0812345678" }).success).toBe(true);
    expect(appointmentInputSchema.safeParse({ ...input, customerPhone: "0812345678", endsAt: input.startsAt }).success).toBe(false);
  });
});
