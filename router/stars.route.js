const { Router } = require("express");
const fs = require('fs').promises;
const path = require('path');
const cache = require("apicache").middleware;

require('cachedfs').patchInPlace();

const Stars = Router();

// Cache SVG templates in memory for faster access
const svgCache = {};

// Helper function to fetch data from GitHub API
const github = async (path) => {
    const GITHUB_API = 'https://api.github.com';
    const response = await fetch(`${GITHUB_API}${path}`, {
        headers: {
            'User-Agent': 'GitHub-Star-Counter',
        }
    });

    if (!response.ok) {
        throw new Error(`GitHub API error! Status: ${response.status}`);
    }

    return response.json();
};

// Helper function to get total stars of a user
const getTotalStars = async (username) => {
    let totalStars = 0;
    let page = 1;
    const perPage = 100;

    while (true) {
        const repos = await github(`/users/${username}/repos?per_page=${perPage}&page=${page}`);
        if (repos.length === 0) break;
        totalStars += repos.reduce((acc, repo) => acc + repo.stargazers_count, 0);
        page++;
    }

    return totalStars;
};

// Function to get and cache SVG templates based on theme
const getSvgTemplate = async (theme) => {
    if (!svgCache[theme]) {
        const themeFile = theme === 'light' ? 'light.svg' : 'dark.svg';
        const filePath = path.join(__dirname, `./../assets/stars/${themeFile}`);

        try {
            svgCache[theme] = await fs.readFile(filePath, 'utf8');
        } catch (error) {
            console.error(`Error loading SVG file: ${filePath}`, error);
            throw new Error('SVG template not found');
        }
    }
    return svgCache[theme];
};

Stars.get("/:username", cache("1 minute"), async (req, res) => {
    const { username } = req.params;
    const { theme = 'dark', border = "797067", size = "250" } = req.query;

    try {
        // Get total stars for the user from GitHub
        const totalStars = await getTotalStars(username);

        // Fetch SVG template based on theme
        let svgContent = await getSvgTemplate(theme);

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
        console.error('Error processing request:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = Stars;
