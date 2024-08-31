const { Router } = require("express");
const fs = require('fs');
const path = require('path');
const cache = require("apicache").middleware;

require('cachedfs').patchInPlace();

const SteaksRouter = Router();

SteaksRouter.get("/:username", cache("1 minute"), async (req, res) => {
    const { username } = req.params;
    const {
        theme = 'dark',
        size,
        border = "797067"
    } = req.query;

    try {
        const response = await fetch(`https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(username)}?y=2024`);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        const contributions = data.contributions;

        function calculateStreaks(contributions) {
            if (contributions.length === 0) return 0;

            const validContributions = contributions
                .filter(contribution => new Date(contribution.date) <= new Date())
                .sort((a, b) => new Date(b.date) - new Date(a.date));

            let maxStreak = 0;
            let currentStreak = 0;

            for (let i = 0; i < validContributions.length; i++) {
                const currentContribution = validContributions[i];

                if (currentContribution.count > 0) {
                    currentStreak = 1;
                    for (let j = i + 1; j < validContributions.length; j++) {
                        const prevContribution = validContributions[j - 1];
                        const nextContribution = validContributions[j];

                        const diff = (new Date(prevContribution.date) - new Date(nextContribution.date)) / (1000 * 60 * 60 * 24);

                        if (diff === 1 && nextContribution.count > 0) {
                            currentStreak++;
                        } else {
                            break;
                        }
                    }
                    maxStreak = Math.max(maxStreak, currentStreak);
                    break;
                }
            }

            return maxStreak;
        }

        const numberOfSteaks = calculateStreaks(contributions);

        const themeFile = theme === 'light' ? 'light.svg' : 'dark.svg';
        const filePath = path.join(__dirname, `./../assets/steaks/${themeFile}`);
        let svgContent = fs.readFileSync(filePath, 'utf8');

        svgContent = svgContent.replace(/\$num/g, encodeURIComponent(numberOfSteaks))
                               .replace(/\$size/g, encodeURIComponent(size || 250))
                               .replace(/\$stroke/g, `stroke=\"${encodeURIComponent(border)}\"`);

        res.setHeader('Content-Type', 'image/svg+xml');
        res.send(svgContent);
    } catch (error) {
        console.error('Error fetching contributions:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = SteaksRouter;
