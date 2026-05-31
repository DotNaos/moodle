import { Agent, fetch as undiciFetch } from "undici";

export const TASK_FORGE_URL =
  process.env.TASK_FORGE_URL ?? "https://moodle-task-forge.os-home.net";

const TASK_FORGE_RESOLVE_IP = process.env.TASK_FORGE_RESOLVE_IP?.trim();
let taskForgeAgent: Agent | undefined;

export function getTaskForgeInternalSecret(): string {
  const secret = process.env.TASK_FORGE_INTERNAL_SECRET;
  if (!secret) {
    throw new Error("Task Forge connection secret is not configured.");
  }
  return secret;
}

export function taskForgeFetch(input: string, init?: RequestInit): Promise<Response> {
  if (!TASK_FORGE_RESOLVE_IP || new URL(input).protocol !== "https:") {
    return fetch(input, init);
  }

  taskForgeAgent ??= new Agent({
    connect: {
      lookup: (_hostname, _options, callback) => {
        if (_options?.all) {
          callback(null, [{ address: TASK_FORGE_RESOLVE_IP, family: 4 }]);
          return;
        }
        callback(null, TASK_FORGE_RESOLVE_IP, 4);
      }
    }
  });

  return undiciFetch(input, {
    ...init,
    dispatcher: taskForgeAgent
  } as Parameters<typeof undiciFetch>[1]) as unknown as Promise<Response>;
}
