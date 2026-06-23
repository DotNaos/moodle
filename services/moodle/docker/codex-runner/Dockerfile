FROM node:24-bookworm-slim

ARG CODEX_VERSION=0.130.0
ARG CODEX_SDK_VERSION=0.125.0

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g @openai/codex@${CODEX_VERSION} \
  && mkdir -p /opt/moodle-codex-runner \
  && cd /opt/moodle-codex-runner \
  && npm init -y \
  && npm install @openai/codex-sdk@${CODEX_SDK_VERSION} \
  && useradd -m -u 10001 codex \
  && mkdir -p /home/codex/.codex \
  && chown -R codex:codex /home/codex/.codex

COPY sdk-runner.mjs /opt/moodle-codex-runner/sdk-runner.mjs
RUN chmod +x /opt/moodle-codex-runner/sdk-runner.mjs

USER codex
WORKDIR /work
ENV HOME=/home/codex
ENV CODEX_HOME=/home/codex/.codex

CMD ["sh", "-lc", "codex --version"]
