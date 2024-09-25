const { Router } = require("express");
const fs = require('fs').promises;
const path = require('path');
const cache = require("apicache").middleware;

require('cachedfs').patchInPlace();

const SteaksRouter = Router();

// Cache SVG templates in memory for faster access
const svgCache = {};

// Function to load and cache SVG templates based on theme
const getSvgTemplate = async (theme) => {
    if (!svgCache[theme]) {
        const themeFile = theme === 'light' ? 'light.svg' : 'dark.svg';
        const filePath = path.join(__dirname, `./../assets/streak/${themeFile}`);

        try {
            svgCache[theme] = await fs.readFile(filePath, 'utf8');
        } catch (error) {
            console.error(`Error loading SVG file: ${filePath}`, error);
            throw new Error('SVG template not found');
        }
    }
    return svgCache[theme];
};

const calculateStreaks = (contributions) => {
    if (contributions.length === 0) return 0;

    // Sort contributions by date descending (latest first)
    const validContributions = contributions
        .filter(contribution => new Date(contribution.date) <= new Date())
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    let maxStreak = 0;
    let currentStreak = 0;

    for (let i = 0; i < validContributions.length; i++) {
        const currentContribution = validContributions[i];
        const nextContribution = validContributions[i + 1];

        if (currentContribution.count > 0) {
            // If it's the first contribution or there's no gap, increment streak
            if (currentStreak === 0 || (nextContribution && nextContribution.date === getNextDay(currentContribution.date))) {
                currentStreak++;
            } else {
                currentStreak = 0;
            }
        } else {
            // Reset streak if current contribution has no count
            currentStreak = 0;
        }

        // Update maxStreak at the end of each iteration
        maxStreak = Math.max(maxStreak, currentStreak);
    }

    return maxStreak;
};

// Helper function to get the next day's date
function getNextDay(dateString) {
    const date = new Date(dateString);
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0]; // Extract date part only
}

// Cache GraphQL responses for 5 minutes
const graphqlCache = new Map();

const fetchGithubContributions = async (username) => {
    const cacheKey = `${username}-contributions`;
    const cachedData = graphqlCache.get(cacheKey);

    if (cachedData && Date.now() - cachedData.timestamp < 5 * 60 * 1000) { // 5 minutes cache
        return cachedData.contributions;
    }

    const query = `
    {
        user(login: "${username}") {
            contributionsCollection {
                contributionCalendar {
                    weeks {
                        contributionDays {
                            contributionCount
                            date
                        }
                    }
                }
            }
        }
    }`;

    const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.GH_TOKEN}`,
        },
        body: JSON.stringify({ query }),
    });

    if (!response.ok) {
        throw new Error(`GitHub API error! Status: ${response.status}`);
    }

    const result = await response.json();
    const weeks = result.data.user.contributionsCollection.contributionCalendar.weeks;

    // Flatten the array of contribution days across weeks
    const contributions = weeks.flatMap(week =>
        week.contributionDays.map(day => ({
            count: day.contributionCount,
            date: day.date,
        }))
    );

    // Cache the result
    graphqlCache.set(cacheKey, { contributions, timestamp: Date.now() });

    return contributions;
};

SteaksRouter.get("/:username", cache("1 minute"), async (req, res) => {
    const { username } = req.params;
    const { theme = 'dark', size = 250, border = "797067" } = req.query;

    try {
        // Fetch GitHub contributions with caching
        const contributions = await fetchGithubContributions(username);

        // Calculate the number of streaks
        const numberOfStreaks = calculateStreaks(contributions);

        // Fetch SVG template based on theme
        let svgContent = await getSvgTemplate(theme);

        // Replace placeholders with actual data
        svgContent = svgContent.replace(/\$num/g, encodeURIComponent(numberOfStreaks))
            .replace(/\$size/g, encodeURIComponent(size))
            .replace(/\$stroke/g, `stroke="${encodeURIComponent(border)}"`);

        // Send the modified SVG as a response
        res.setHeader('Content-Type', 'image/svg+xml');
        res.send(svgContent);
    } catch (error) {
        console.error('Error fetching contributions:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = SteaksRouter;
