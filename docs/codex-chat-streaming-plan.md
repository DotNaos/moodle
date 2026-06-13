# Codex Chat Streaming Plan

Date: 2026-06-13

This note captures the local POC findings for streaming Codex chat output into the web app. The app implementation target is React and TypeScript.

## Goal

The chat UI should show Codex assistant text while it is being generated. It must not wait for the full turn to complete before rendering the answer.

The primary path should use WebSocket streaming. If WebSocket is not available or fails, the app should fall back to HTTP streaming.

## POC Summary

Local POC directory:

```text
/tmp/codex-cli-stream-poc
```

Local POC URL:

```text
http://127.0.0.1:53124
```

The POC uses the local Codex CLI app server. It does not use an OpenAI API key.

Codex app server command used for the POC:

```sh
codex -c service_tier='"flex"' app-server --listen ws://127.0.0.1:53123
```

Bridge command used for the POC:

```sh
node /tmp/codex-cli-stream-poc/bridge.mjs
```

Combined helper script:

```sh
/tmp/codex-cli-stream-poc/start-poc.sh
```

## Confirmed Findings

1. Codex streams assistant text through `item/agentMessage/delta`.
2. The final turn boundary is `turn/completed`.
3. A browser should not connect directly to the Codex app server WebSocket.
   - Direct browser WebSocket requests include an `Origin` header.
   - The Codex app server rejected those browser requests during the POC.
4. A small app-side bridge works:
   - Browser connects to the app/backend.
   - App/backend connects to the Codex app server.
   - The app/backend forwards Codex JSON-RPC notifications to the browser.
5. HTTP fallback can stream text with `text/event-stream`.
   - The POC used `POST /chat-http`.
   - The browser consumed the response with `response.body.getReader()`.
   - This works for POST prompts, unlike browser `EventSource`, which is GET-only.
6. The HTTP fallback was verified in the in-app Browser.
   - It completed with hundreds of streamed text chunks.
   - The UI appended text as chunks arrived.
7. The POC must start Codex from an existing working directory.
   - Starting Codex from a temp directory and later deleting that directory caused `failed to load configuration: No such file or directory`.
   - The real app should start/own the bridge from a stable app-managed working directory.
8. The default service tier must be conservative.
   - Use `flex` by default.
   - Do not use `fast` unless the user explicitly selects it in the frontend for that turn or session.

## Target Architecture

```text
React chat UI
  |
  | primary: WebSocket
  v
App streaming endpoint / local bridge
  |
  | JSON-RPC over WebSocket
  v
Codex app server
```

Fallback:

```text
React chat UI
  |
  | POST + streaming response
  v
App HTTP streaming endpoint
  |
  | JSON-RPC over WebSocket
  v
Codex app server
```

The browser-facing API should be owned by the app. The Codex app server should stay behind that boundary.

## React/TypeScript Implementation Plan

1. Add a small streaming transport layer.
   - `sendTurnViaWebSocket(input, handlers)`
   - `sendTurnViaHttp(input, handlers)`
   - Shared handler shape:

```ts
type ChatStreamHandlers = {
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: unknown) => void;
};
```

2. Add a single app-facing message stream API.
   - Start with WebSocket.
   - If connection setup or turn start fails before meaningful output begins, retry over HTTP.
   - Do not silently restart after partial output unless the UI clearly marks the first response as failed.

3. Update chat state incrementally.
   - Create the assistant message immediately when the turn starts.
   - Append every `delta` to that same message.
   - Mark the message complete on `turn/completed`.
   - Mark failed on stream error or abort.

4. Preserve message identity.
   - Store a stable local assistant message id before streaming starts.
   - All deltas update that id.
   - Avoid replacing the whole message list on each chunk.

5. Handle cancellation.
   - WebSocket path: close or send the appropriate interrupt/abort request once wired.
   - HTTP path: use `AbortController` for the fetch request.
   - UI should leave partial text visible and mark it as stopped.

6. Add service-tier selection as an explicit user choice.
   - Default to `flex`.
   - Only send `serviceTier: "fast"` to Codex when the user selects a fast mode in the frontend.
   - Show the selected tier in the UI while the turn is running so token/cost-sensitive behavior is visible.

7. Add tests around stream parsing and reducer behavior.
   - Unit test appending multiple deltas to one assistant message.
   - Unit test `turn/completed` marks the message done.
   - Unit test HTTP event parsing across split chunks.
   - Integration test fallback when WebSocket connection fails before output.

8. Browser verification.
   - Use `@Browser` against the local app.
   - Verify a long answer shows partial output while the turn is still active.
   - Verify forced HTTP fallback also streams partial output.

## POC Code

The POC is intentionally plain JavaScript. When moving this into the app, translate the client pieces to TypeScript and keep the transport/reducer logic separate from React rendering.

### Bridge HTTP Fallback

```js
import { readFile } from "node:fs/promises";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { WebSocket, WebSocketServer } from "ws";

const root = fileURLToPath(new URL(".", import.meta.url));
const bridgePort = Number(process.env.PORT || 53124);
const codexUrl = process.env.CODEX_WS_URL || "ws://127.0.0.1:53123";

function writeEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function codexRequest(socket, method, params, state) {
  const id = state.nextRequestId++;
  socket.send(JSON.stringify({ id, method, params }));

  return new Promise((resolve, reject) => {
    state.pending.set(id, { resolve, reject });
  });
}

async function streamCodexOverHttp(res, prompt) {
  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    "x-accel-buffering": "no",
  });

  const upstream = new WebSocket(codexUrl);
  const state = { nextRequestId: 1, pending: new Map() };

  upstream.on("message", (message) => {
    const parsed = JSON.parse(message.toString());

    if ("id" in parsed && state.pending.has(parsed.id)) {
      const pending = state.pending.get(parsed.id);
      state.pending.delete(parsed.id);

      if (parsed.error) pending.reject(parsed.error);
      else pending.resolve(parsed.result);
      return;
    }

    if (parsed.method === "item/agentMessage/delta") {
      writeEvent(res, "delta", parsed.params.delta);
    }

    if (parsed.method === "turn/completed") {
      writeEvent(res, "done", {});
      res.end();
      upstream.close();
    }

    if (parsed.method === "error") {
      writeEvent(res, "error", parsed.params);
      res.end();
      upstream.close();
    }
  });

  await new Promise((resolve, reject) => {
    upstream.once("open", resolve);
    upstream.once("error", reject);
  });

  await codexRequest(upstream, "initialize", {
    clientInfo: {
      name: "codex-cli-stream-poc-http",
      title: "Codex CLI Stream POC HTTP",
      version: "0.0.1",
    },
    capabilities: { experimentalApi: true },
  }, state);

  const thread = await codexRequest(upstream, "thread/start", {
    cwd: root,
    approvalPolicy: "never",
    sandbox: "read-only",
    ephemeral: true,
    sessionStartSource: "startup",
    baseInstructions: "Antworte kurz. Verwende keine Tools und fuehre keine Befehle aus.",
  }, state);

  await codexRequest(upstream, "turn/start", {
    threadId: thread.thread.id,
    input: [{ type: "text", text: prompt, text_elements: [] }],
  }, state);
}
```

### Bridge WebSocket Forwarder

```js
const wss = new WebSocketServer({ server, path: "/codex" });

wss.on("connection", (client) => {
  const upstream = new WebSocket(codexUrl);
  const queuedMessages = [];

  client.on("message", (message) => {
    if (upstream.readyState === WebSocket.OPEN) {
      upstream.send(message.toString());
    } else {
      queuedMessages.push(message.toString());
    }
  });

  upstream.on("open", () => {
    for (const message of queuedMessages.splice(0)) {
      upstream.send(message);
    }
  });

  upstream.on("message", (message) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message.toString());
    }
  });

  upstream.on("close", () => client.close());
  client.on("close", () => upstream.close());
});
```

### Browser HTTP Stream Consumer

```js
function parseServerEvents(buffer, onEvent) {
  const frames = buffer.split("\n\n");
  const remainder = frames.pop() || "";

  for (const frame of frames) {
    let event = "message";
    let data = "";

    for (const line of frame.split("\n")) {
      if (line.startsWith("event:")) {
        event = line.slice("event:".length).trim();
      }

      if (line.startsWith("data:")) {
        data += line.slice("data:".length).trim();
      }
    }

    if (data) {
      onEvent(event, JSON.parse(data));
    }
  }

  return remainder;
}

async function sendViaHttpStream(prompt) {
  const response = await fetch("/chat-http", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok || !response.body) {
    throw new Error(await response.text());
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    buffer = parseServerEvents(buffer, (eventName, data) => {
      if (eventName === "delta") {
        appendToAssistantMessage(data);
      }

      if (eventName === "error") {
        throw new Error(JSON.stringify(data));
      }
    });
  }
}
```

### Browser WebSocket Consumer

```js
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);

  if (message.method === "item/agentMessage/delta") {
    appendToAssistantMessage(message.params.delta);
  }

  if (message.method === "turn/completed") {
    markAssistantMessageDone();
  }

  if (message.method === "error") {
    markAssistantMessageFailed(message.params);
  }
});
```

## Open Questions For App Integration

1. Which process owns the Codex app server lifecycle in the production app?
2. Should the fallback endpoint be SSE-style `text/event-stream`, NDJSON, or an existing app protocol shape?
3. How should partial output be persisted if the user navigates away mid-turn?
4. Should HTTP fallback preserve the same Codex thread as the failed WebSocket attempt, or start a new ephemeral thread only when no output has been shown yet?
