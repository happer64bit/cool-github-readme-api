const express = require("express")
const SteaksRouter = require("./router/streak.route");
const totalDownloads = require("./router/total_downloads.route");
const cors = require('cors');

const app = express()

app.use(cors({
    origin: "github.com"
}))

app.use("/streak/", SteaksRouter);
app.use("/total-downloads/", totalDownloads);

module.exports = app;