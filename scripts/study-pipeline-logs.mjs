#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const requestId = process.argv[2]?.trim() ?? "";
const since = process.env.SINCE ?? "2h";
const webSession = process.env.WEB_TMUX_SESSION ?? "moodle-web-dev";
const apiContainer = process.env.API_CONTAINER ?? "moodle-services-moodle-api-1";

const patterns = requestId
  ? [escapeRegExp(requestId)]
  : [
    "study_pipeline\\.proxy",
    "study_pipeline\\.",
    "HeadersTimeout",
    "upstream_headers_timeout",
  ];
const matcher = new RegExp(patterns.join("|"), "i");

printSection("web proxy");
printMatchingLines(run("tmux", ["capture-pane", "-Jpt", webSession, "-S", "-1200"]));

printSection("moodle services");
printMatchingLines(run("docker", ["logs", "--since", since, apiContainer]));

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.error) {
    return `${command}: ${result.error.message}`;
  }
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

function printSection(title) {
  console.log(`\n== ${title} ==`);
}

function printMatchingLines(output) {
  const lines = output
    .split(/\r?\n/)
    .filter((line) => matcher.test(line));
  if (lines.length === 0) {
    console.log("no matching log lines");
    return;
  }
  console.log(lines.join("\n"));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
