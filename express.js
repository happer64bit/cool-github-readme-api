const express = require("express")
const SteaksRouter = require("./router/steaks.route");
const totalDownloads = require("./router/total_downloads.route");

const app = express()

app.use("/steaks/", SteaksRouter);
app.use("/total-downloads/", totalDownloads)

module.exports = app;