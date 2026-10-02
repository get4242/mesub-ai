import { describe,expect,it,vi } from "vitest";
import { runWorkerCycle } from "./runtime";
import type { LineRuntimeConfig } from "../line/conversation-contract";

const config={ ai: { limits: { maxAttempts: 3 } },line: { environment: "development",messagingAccessToken: "test" } } as LineRuntimeConfig;
function admin(attempt: number,claimed=true,terminal=false) {
  return { rpc: vi.fn(async(name: string,args?: Record<string,unknown>)=>({ error: null,data:
    name==="read_line_jobs_server" ? [{ message_id: 1,read_count: attempt,message: { eventId: "event",schemaVersion: 1 } }] :
    name==="claim_line_webhook_server" ? claimed ? [{ event_id: "event",event_type: "message",payload: { test: true } }] : [] :
    name==="fail_line_webhook_server" ? args?.target_dead_letter ? "dead_letter" : "queued" :
    name==="line_event_terminal_server" ? terminal : [],
  })) };
}
describe("durable LINE conversation execution",()=>{
  it("completes and archives only after conversation delivery succeeds",async()=>{
    const client=admin(1); const conversation=vi.fn(async()=>true);
    await runWorkerCycle(client,config,1,{ conversation });
    expect(conversation).toHaveBeenCalledWith({ test: true },client,config);
    expect(client.rpc).toHaveBeenCalledWith("complete_line_webhook_server",{ target_event_id: "event",target_ignored: false });
    expect(client.rpc).toHaveBeenCalledWith("archive_line_job_server",{ message_id: 1 });
  });
  it("retains a failed job for retry and never marks it completed",async()=>{
    const client=admin(1);
    await runWorkerCycle(client,config,1,{ conversation: async()=>{ throw new Error("network"); } });
    expect(client.rpc).toHaveBeenCalledWith("fail_line_webhook_server",{ target_event_id: "event",target_dead_letter: false });
    expect(client.rpc).not.toHaveBeenCalledWith("complete_line_webhook_server",expect.anything());
    expect(client.rpc).not.toHaveBeenCalledWith("archive_line_job_server",expect.anything());
  });
  it("dead-letters exhausted attempts",async()=>{
    const client=admin(3);
    await runWorkerCycle(client,config,1,{ conversation: async()=>{ throw new Error("network"); } });
    expect(client.rpc).toHaveBeenCalledWith("fail_line_webhook_server",{ target_event_id: "event",target_dead_letter: true });
    expect(client.rpc).toHaveBeenCalledWith("archive_line_job_server",{ message_id: 1 });
  });
  it("does not archive another worker's active lease",async()=>{
    const client=admin(1,false,false);const conversation=vi.fn(async()=>true);
    await runWorkerCycle(client,config,1,{ conversation });
    expect(conversation).not.toHaveBeenCalled();
    expect(client.rpc).not.toHaveBeenCalledWith("archive_line_job_server",expect.anything());
  });
});
