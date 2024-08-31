const { Router } = require("express");
const fs = require('fs');
const path = require('path');
const cache = require("apicache").middleware;

require('cachedfs').patchInPlace();

const totalDownloads = Router();

totalDownloads.get("/:username/:repo", cache("1 minute"), async (req, res) => {
    const { username, repo } = req.params;
    const { theme = 'dark', border = "797067" } = req.query;

    try {
        const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo)}/releases`);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const releases = await response.json();
        
        const totalDownloads = releases.reduce((total, release) => {
            return total + release.assets.reduce((assetTotal, asset) => assetTotal + asset.download_count, 0);
        }, 0);
        
        const themeFile = theme === 'light' ? 'light.svg' : 'dark.svg';
        const filePath = path.join(__dirname, `./../assets/total-downloads/${themeFile}`);
        let svgContent = fs.readFileSync(filePath, 'utf8');

        svgContent = svgContent
            .replace(/\$total_number/g, encodeURIComponent(totalDownloads))
            .replace(/\$repo/g, `${encodeURIComponent(username)} / ${encodeURIComponent(repo)}`)
            .replace(/\$stroke/g, `stroke=\"${encodeURIComponent(border)}\"`);

        res.setHeader('Content-Type', 'image/svg+xml');
        res.send(svgContent);
    } catch (error) {
        console.error('Error fetching releases:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = totalDownloads;
