const fs = require("fs");
require("dotenv").config();
const axios = require("axios");
const octokit = require("@octokit/core");

const client = new octokit.Octokit({ auth: process.env.GH_TOKEN });

async function updateAllRepos() {
	try {
		const res = await client.request("GET /user/repos", {
			sort: "updated",
			per_page: "100",
		});
		const repos = res.data.filter(r => r.name !== "geraldiner");
		for (let i = 0; i < repos.length; i++) {
			const { name } = repos[i];
			updateReadMe(name);
		}
	} catch (error) {
		console.log(error);
	}
}

async function updateReadMe(repo) {
	try {
		const res = await client.request(`GET /repos/geraldiner/${repo}/contents/README.md`);
		const { path, sha, download_url } = res.data;
		const raw = await axios.get(download_url);
		const rawText = raw.data;
		const startIndex = rawText.indexOf("## Other Projects");
		const updatedContent = rawText.slice(0, startIndex) + getNewProjectSection();
		commitNewReadme(repo, path, sha, updatedContent);
	} catch (error) {
		try {
			const content = getNewProjectSection();
			await client.request(`PUT /repos/geraldiner/${repo}/contents/README.md`, {
				message: "Create README",
				content: Buffer.from(content, "utf-8").toString("base64"),
			});
		} catch (err) {
			console.log(err);
		}
	}
}

async function commitNewReadme(repo, path, sha, updatedContent) {
	try {
		await client.request(`PUT /repos/geraldiner/${repo}/contents/{path}`, {
			message: "Update README",
			content: Buffer.from(updatedContent, "utf-8").toString("base64"),
			path,
			sha,
		});
	} catch (err) {
		console.log(err);
	}
}

function getNewProjectSection() {
	return fs.readFileSync("projects.md").toString();
}

updateAllRepos();
