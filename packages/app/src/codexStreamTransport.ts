import type {
  CodexRunRequest,
  CodexRunResponse,
  CodexStreamEvent,
  MoodleCodexAction,
} from "./codex";

export function getCodexRunWebSocketUrl({
  runUrl,
  useVpsCodex,
}: {
  runUrl: string;
  useVpsCodex: boolean;
}): string | null {
  if (useVpsCodex || !/^https?:\/\//i.test(runUrl)) {
    return null;
  }

  try {
    const url = new URL(runUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = `${url.pathname.replace(/\/$/, "")}/ws`;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function streamCodexTaskOverWebSocket(
  request: CodexRunRequest,
  onEvent: (event: CodexStreamEvent) => void,
  webSocketUrl: string,
): Promise<CodexRunResponse> {
  if (typeof WebSocket === "undefined") {
    return Promise.reject(new Error("Codex WebSocket is not available in this runtime."));
  }

  return new Promise((resolve, reject) => {
    const socket = new WebSocket(webSocketUrl);
    let settled = false;

    const cleanup = () => {
      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("message", handleMessage);
      socket.removeEventListener("error", handleError);
      socket.removeEventListener("close", handleClose);
    };

    const finish = (result: CodexRunResponse) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve(result);
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    };

    const fail = (error: unknown) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(error);
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    };

    function handleOpen() {
      socket.send(JSON.stringify({ ...request, stream: true }));
    }

    function handleMessage(message: MessageEvent) {
      const event = parseStreamEvent(String(message.data));
      if (!event) {
        return;
      }

      onEvent(event);
      if (event.type === "done") {
        finish({
          threadId: event.threadId,
          finalResponse: event.finalResponse,
          actions: parseActions(event.actions),
        });
      } else if (event.type === "error") {
        fail(new Error(event.error));
      }
    }

    function handleError() {
      fail(new Error("Codex WebSocket stream failed."));
    }

    function handleClose() {
      if (!settled) {
        fail(new Error("Codex WebSocket stream closed before completion."));
      }
    }

    socket.addEventListener("open", handleOpen);
    socket.addEventListener("message", handleMessage);
    socket.addEventListener("error", handleError);
    socket.addEventListener("close", handleClose);
  });
}

function parseStreamEvent(line: string): CodexStreamEvent | null {
  if (!line.trim()) {
    return null;
  }

  return JSON.parse(line) as CodexStreamEvent;
}

function parseActions(value: unknown): MoodleCodexAction[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value as MoodleCodexAction[];
}
