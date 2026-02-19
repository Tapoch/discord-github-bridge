import { config } from "../config.js";
import type { GitHubApp } from "./app.js";

const { owner, repo } = config.github;

export async function createIssue(
  github: GitHubApp,
  title: string,
  body: string,
  labels?: string[],
): Promise<{ number: number; html_url: string }> {
  const octokit = await github.getOctokit();
  const { data } = await octokit.request("POST /repos/{owner}/{repo}/issues", {
    owner,
    repo,
    title,
    body,
    labels,
  });
  return { number: data.number, html_url: data.html_url };
}

export async function closeIssue(
  github: GitHubApp,
  issueNumber: number,
  comment?: string,
): Promise<void> {
  const octokit = await github.getOctokit();
  if (comment) {
    await octokit.request(
      "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
      { owner, repo, issue_number: issueNumber, body: comment },
    );
  }
  await octokit.request(
    "PATCH /repos/{owner}/{repo}/issues/{issue_number}",
    { owner, repo, issue_number: issueNumber, state: "closed" },
  );
}

export async function addComment(
  github: GitHubApp,
  issueNumber: number,
  body: string,
): Promise<void> {
  const octokit = await github.getOctokit();
  await octokit.request(
    "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
    { owner, repo, issue_number: issueNumber, body },
  );
}

export async function getIssue(
  github: GitHubApp,
  issueNumber: number,
): Promise<{ title: string; state: string; html_url: string; labels: string[] }> {
  const octokit = await github.getOctokit();
  const { data } = await octokit.request(
    "GET /repos/{owner}/{repo}/issues/{issue_number}",
    { owner, repo, issue_number: issueNumber },
  );
  return {
    title: data.title,
    state: data.state,
    html_url: data.html_url,
    labels: data.labels
      .map((l: string | { name?: string }) => (typeof l === "string" ? l : l.name ?? ""))
      .filter(Boolean),
  };
}
