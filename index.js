import dotenv from "dotenv";
import fs from "fs";
import { Octokit } from "octokit";
dotenv.config();

const octokit = new Octokit({ auth: process.env.GH_TOKEN });

// Repos to skip: Github readme
const skipRepos = ["geraldiner"];

async function updateAllRepos() {
  try {
    // Get only the repos that are owned by the user and sort them by last updated
    const allRepos = await octokit.paginate("GET /user/repos", {
      type: "owner",
      per_page: 100,
    });
    // Skip the repos that are in the skipRepos array, forks, or archived
    const repos = allRepos.filter((repo) => {
      if (
        !skipRepos.includes(repo.name.toLowerCase()) &&
        !repo.fork &&
        !repo.archived
      ) {
        return true;
      }
      console.log(`Skipping ${repo.name}...`);
      return false;
    });
    // Update the README for each repo
    for (const repo of repos) {
      console.log(`Updating README for ${repo.name}...`);
      await updateOrCreateREADME(repo);
    }
  } catch (error) {
    console.error(error);
  }
}

async function updateOrCreateREADME(repo) {
  try {
    // Get the README file for the repo
    const response = await octokit.request(
      `GET /repos/geraldiner/${repo.name}/readme`,
    );
    const { path, sha, content, encoding } = response.data;
    const rawContent = Buffer.from(content, encoding).toString();
    const startIndex = rawContent.indexOf("## 🚀 Other Projects");
    const updatedContent =
      `${
        startIndex === -1 ? rawContent : rawContent.slice(0, startIndex)
      }`.trim() + `\n${getNewProjectSection()}`;
    await commitNewReadme(repo.name, path, sha, encoding, updatedContent);
  } catch (error) {
    if (error.status === 404) {
      // If the README file doesn't exist, create it
      const content = `# ${repo.name}\n\n${getNewProjectSection()}`;
      await octokit.request(
        `PUT /repos/geraldiner/${repo.name}/contents/README.md`,
        {
          message: "Create README",
          content: Buffer.from(content, "utf-8").toString("base64"),
        },
      );
    } else {
      console.error(error);
    }
  }
}

function getNewProjectSection() {
  return fs.readFileSync("projects.md").toString();
}

async function commitNewReadme(repo, path, sha, encoding, updatedContent) {
  try {
    await octokit.request(`PUT /repos/geraldiner/${repo}/contents/{path}`, {
      message: "Update README",
      content: Buffer.from(updatedContent, "utf-8").toString(encoding),
      path,
      sha,
    });
  } catch (err) {
    console.error(err);
  }
}

updateAllRepos();
