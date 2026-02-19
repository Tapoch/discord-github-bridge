import Fastify from "fastify";
import { Webhooks } from "@octokit/webhooks";
import type { Client } from "discord.js";
import type Database from "better-sqlite3";
import { config } from "../config.js";
import type { GitHubApp } from "./app.js";
import { handleIssueEvent } from "./handlers/issueHandler.js";
import { handleCommentEvent } from "./handlers/commentHandler.js";
import { handlePullRequestEvent } from "./handlers/pullRequestHandler.js";
import { logger } from "../utils/logger.js";

export async function startWebhookServer(
  discord: Client,
  _github: GitHubApp,
  db: Database.Database,
) {
  const fastify = Fastify({ logger: false });

  const webhooks = new Webhooks({ secret: config.github.webhookSecret });

  webhooks.on("issues", async ({ payload }) => {
    await handleIssueEvent(payload as any, discord, db);
  });

  webhooks.on("issue_comment", async ({ payload }) => {
    await handleCommentEvent(payload as any, discord, db);
  });

  webhooks.on("pull_request", async ({ payload }) => {
    await handlePullRequestEvent(payload as any, discord, db);
  });

  fastify.get("/health", async () => ({ status: "ok" }));

  fastify.post("/api/webhooks/github", async (request, reply) => {
    const signature = request.headers["x-hub-signature-256"] as string;
    const event = request.headers["x-github-event"] as string;
    const deliveryId = request.headers["x-github-delivery"] as string;
    const body =
      typeof request.body === "string"
        ? request.body
        : JSON.stringify(request.body);

    try {
      await webhooks.verifyAndReceive({
        id: deliveryId,
        name: event as any,
        signature,
        payload: body,
      });
      reply.code(200).send({ ok: true });
    } catch (err) {
      logger.error(err, "Webhook verification/processing failed");
      reply.code(400).send({ error: "Invalid webhook" });
    }
  });

  // Need raw body for signature verification
  fastify.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (_req, body, done) => {
      done(null, body);
    },
  );

  await fastify.listen({ port: config.webhookPort, host: "0.0.0.0" });
  logger.info(`Webhook server listening on port ${config.webhookPort}`);

  return fastify;
}
