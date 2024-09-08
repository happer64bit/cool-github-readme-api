const { Router } = require("express");
const fs = require('fs').promises;
const path = require('path');
const cache = require("apicache").middleware;

require('cachedfs').patchInPlace();

const totalDownloads = Router();

// Cache SVG templates in memory for faster access
const svgCache = {};

const getSvgTemplate = async (theme) => {
    if (!svgCache[theme]) {
        const themeFile = theme === 'light' ? 'light.svg' : 'dark.svg';
        const filePath = path.join(__dirname, `./../assets/total-downloads/${themeFile}`);
        try {
            svgCache[theme] = await fs.readFile(filePath, 'utf8');
        } catch (error) {
            console.error(`Error loading SVG file: ${filePath}`, error);
            throw new Error('SVG template not found');
        }
    }
    return svgCache[theme];
};

// Cache GitHub API responses for 5 minutes to avoid rate limit issues
const githubCache = new Map();

const fetchGithubReleases = async (username, repo) => {
    const cacheKey = `${username}/${repo}`;
    const cachedData = githubCache.get(cacheKey);

    if (cachedData && Date.now() - cachedData.timestamp < 5 * 60 * 1000) { // 5 minutes cache
        return cachedData.releases;
    }

    // Fetch release data from GitHub API
    const response = await fetch(`https://api.github.com/repos/${username}/${repo}/releases`);
    if (!response.ok) {
        throw new Error(`GitHub API error! Status: ${response.status}`);
    }

    const releases = await response.json();
    githubCache.set(cacheKey, { releases, timestamp: Date.now() });
    
    return releases;
};

totalDownloads.get("/:username/:repo", cache("1 minute"), async (req, res) => {
    const { username, repo } = req.params;
    const { theme = 'dark', border = "797067" } = req.query;

    try {
        // Fetch release data from GitHub API with caching
        const releases = await fetchGithubReleases(username, repo);

        // Calculate total downloads
        const totalDownloads = releases.reduce((total, release) => {
            return total + release.assets.reduce((assetTotal, asset) => assetTotal + asset.download_count, 0);
        }, 0);

        // Fetch SVG template based on the theme (light or dark)
        let svgContent = await getSvgTemplate(theme);

        // Replace placeholders with actual data
        svgContent = svgContent
            .replace(/\$total_number/g, encodeURIComponent(totalDownloads))
            .replace(/\$repo/g, `${encodeURIComponent(username)} / ${encodeURIComponent(repo)}`)
            .replace(/\$stroke/g, `stroke="${encodeURIComponent(border)}"`);

        // Send the modified SVG as a response
        res.setHeader('Content-Type', 'image/svg+xml');
        res.send(svgContent);
    } catch (error) {
        console.error('Error handling request:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = totalDownloads;
