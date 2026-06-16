export type PipelineGateError = {
  code?: string;
  message: string;
  status?: number;
};

export type PipelineGateState =
  | {
      kind: "checking";
      message: string;
    }
  | {
      issue: PipelineGateError;
      kind: "blocked";
      message: string;
    }
  | {
      kind: "ready";
    };

export function derivePipelineGate({
  blockingError,
  inventoryLoaded,
  loading,
  statusLoaded,
}: {
  blockingError: PipelineGateError | null;
  inventoryLoaded: boolean;
  loading: boolean;
  statusLoaded: boolean;
}): PipelineGateState {
  if (blockingError) {
    return {
      issue: blockingError,
      kind: "blocked",
      message: messageForGateError(blockingError),
    };
  }

  if (loading) {
    return {
      kind: "checking",
      message: "Checking access and pipeline state.",
    };
  }

  if (!statusLoaded) {
    return {
      issue: {
        code: "pipeline_status_missing",
        message: "Pipeline status was not loaded.",
      },
      kind: "blocked",
      message: "Pipeline access could not be verified.",
    };
  }

  if (!inventoryLoaded) {
    return {
      issue: {
        code: "pipeline_inventory_missing",
        message: "Resource inventory was not loaded.",
      },
      kind: "blocked",
      message: "Pipeline resources could not be verified.",
    };
  }

  return { kind: "ready" };
}

export function isPipelineGateError(error: unknown): error is PipelineGateError {
  const candidate = normalizePipelineGateError(error);
  if (!candidate) return false;
  return isBlockingPipelineError(candidate);
}

export function normalizePipelineGateError(error: unknown): PipelineGateError | null {
  if (!error) return null;
  if (typeof error === "object" && error !== null) {
    const candidate = error as { code?: unknown; message?: unknown; status?: unknown };
    if (typeof candidate.message === "string") {
      return {
        code: typeof candidate.code === "string" ? candidate.code : undefined,
        message: candidate.message,
        status: typeof candidate.status === "number" ? candidate.status : undefined,
      };
    }
  }
  if (typeof error === "string") {
    return { message: error };
  }
  return null;
}

export function firstPipelineGateError(errors: unknown[]): PipelineGateError | null {
  for (const error of errors) {
    const normalized = normalizePipelineGateError(error);
    if (normalized && isBlockingPipelineError(normalized)) return normalized;
  }
  return null;
}

function isBlockingPipelineError(error: PipelineGateError): boolean {
  if ([401, 403, 409].includes(error.status ?? 0)) return true;
  const code = error.code?.toLowerCase();
  if (
    code === "moodle_not_connected" ||
    code === "moodle_session_expired" ||
    code === "moodle_access_denied" ||
    code === "pipeline_access_unverified" ||
    code === "backend_auth_misconfigured" ||
    code === "backend_internal_secret_missing" ||
    code === "backend_profile_invalid" ||
    code === "backend_profile_mismatch" ||
    code === "backend_profile_mixed_secret" ||
    code === "backend_session_check_failed" ||
    code === "backend_trust_failed" ||
    code === "backend_unreachable"
  ) {
    return true;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("unauthorized") ||
    message.includes("authentication required") ||
    message.includes("connect your moodle account") ||
    message.includes("session expired") ||
    message.includes("access denied")
  );
}

function messageForGateError(error: PipelineGateError): string {
  if (error.status === 401 || error.code === "moodle_session_expired") {
    return "Moodle access is not verified. Reconnect Moodle before opening the pipeline.";
  }
  if (error.status === 403 || error.code === "moodle_access_denied") {
    return "Access to this course is not verified for the current user.";
  }
  if (error.code === "moodle_not_connected") {
    return "Connect Moodle before opening the pipeline.";
  }
  return error.message || "Pipeline access could not be verified.";
}
