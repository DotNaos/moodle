import { describe, expect, test } from "bun:test";

import {
  derivePipelineGate,
  firstPipelineGateError,
  isPipelineGateError,
} from "@/lib/pipeline-inspector-gate";

describe("pipeline inspector gate", () => {
  test("keeps the pipeline in checking while access is unresolved", () => {
    const gate = derivePipelineGate({
      blockingError: null,
      inventoryLoaded: false,
      loading: true,
      statusLoaded: false,
    });
    expect(gate.kind).toBe("checking");
  });

  test("does not allow ready without proven status", () => {
    const gate = derivePipelineGate({
      blockingError: null,
      inventoryLoaded: true,
      loading: false,
      statusLoaded: false,
    });
    expect(gate.kind).toBe("blocked");
    expect(gate.kind === "blocked" ? gate.issue.code : null).toBe("pipeline_status_missing");
  });

  test("does not allow ready without proven inventory", () => {
    const gate = derivePipelineGate({
      blockingError: null,
      inventoryLoaded: false,
      loading: false,
      statusLoaded: true,
    });
    expect(gate.kind).toBe("blocked");
    expect(gate.kind === "blocked" ? gate.issue.code : null).toBe("pipeline_inventory_missing");
  });

  test("allows ready only when required evidence is loaded", () => {
    expect(derivePipelineGate({
      blockingError: null,
      inventoryLoaded: true,
      loading: false,
      statusLoaded: true,
    })).toEqual({ kind: "ready" });
  });

  test("treats auth and connection failures as blocking gate errors", () => {
    expect(isPipelineGateError({ code: "moodle_not_connected", message: "Connect Moodle.", status: 409 })).toBe(true);
    expect(isPipelineGateError({ message: "authentication required" })).toBe(true);
    expect(isPipelineGateError({ message: "random optional endpoint failed", status: 500 })).toBe(false);
  });

  test("selects the first blocking error before optional graph data", () => {
    const error = firstPipelineGateError([
      { message: "optional preview failed", status: 500 },
      { code: "moodle_session_expired", message: "Session expired.", status: 409 },
    ]);
    expect(error?.code).toBe("moodle_session_expired");
    expect(error?.status).toBe(409);
  });
});
