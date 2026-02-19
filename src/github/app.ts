import { App } from "@octokit/app";
import type { Octokit } from "@octokit/core";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";

export interface GitHubApp {
  getOctokit(): Promise<Octokit>;
}

export function createGitHubApp(): GitHubApp {
  const app = new App({
    appId: config.github.appId,
    privateKey: config.github.privateKey,
  });

  let octokit: Octokit | null = null;
  let expiresAt = 0;

  return {
    async getOctokit() {
      if (octokit && Date.now() < expiresAt) {
        return octokit;
      }
      octokit = await app.getInstallationOctokit(
        config.github.installationId,
      );
      // Installation tokens last 1 hour, refresh at 50 min
      expiresAt = Date.now() + 50 * 60 * 1000;
      logger.info("GitHub installation token refreshed");
      return octokit;
    },
  };
}
