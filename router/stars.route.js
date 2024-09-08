const { Router } = require("express");
const fs = require('fs').promises;
const path = require('path');
const cache = require("apicache").middleware;

require('cachedfs').patchInPlace();

const Stars = Router();

// Helper function to fetch data from GitHub API
async function github(path) {
    const GITHUB_API = 'https://api.github.com';
    return fetch(`${GITHUB_API}${path}`, {
        headers: {
            'User-Agent': 'GitHub-Star-Counter',
        }
    });
}

// Helper function to get total stars of a user
async function getTotalStars(username) {
    const resp = await github(`/users/${username}/repos?per_page=100`);
    const repos = await resp.json();

    if (!Array.isArray(repos)) {
        throw new Error('Failed to fetch repositories');
    }

    let totalStars = repos.reduce((acc, repo) => acc + repo.stargazers_count, 0);

    const pageCount = Math.ceil(repos[0].owner.public_repos / 100);
    for (let i = 2; i <= pageCount; i++) {
        const pagedResp = await github(`/users/${username}/repos?per_page=100&page=${i}`);
        const pagedRepos = await pagedResp.json();
        totalStars += pagedRepos.reduce((acc, repo) => acc + repo.stargazers_count, 0);
    }

    return totalStars;
}

Stars.get("/:username", cache("1 minute"), async (req, res) => {
    const { username } = req.params;
    const { theme = 'dark', border = "797067", size = "250" } = req.query;

    try {
        // Get total stars for the user from GitHub
        const totalStars = await getTotalStars(username);

        // Choose the appropriate SVG file based on the theme
        const themeFile = theme === 'light' ? 'light.svg' : 'dark.svg';
        const filePath = path.join(__dirname, `./../assets/stars/${themeFile}`);
        
        // Read the SVG template file asynchronously
        let svgContent = await fs.readFile(filePath, 'utf8');

        // Replace placeholders in the SVG content with actual data
        svgContent = svgContent
            .replace(/\$stars/g, encodeURIComponent(totalStars))
            .replace(/\$stroke/g, `stroke="${encodeURIComponent(border)}"`)
            .replace(/\$size/g, size)
			.replace(/\$username/g, username);

        // Set the response content type to SVG
        res.setHeader('Content-Type', 'image/svg+xml');
        res.send(svgContent);
    } catch (error) {
        console.error('Error fetching stars:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = Stars;
