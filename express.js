const express = require("express")
const SteaksRouter = require("./router/streak.route");
const totalDownloads = require("./router/total_downloads.route");

require("dotenv").config()

const app = express()

app.use("/streak/", SteaksRouter);
app.use("/total-downloads/", totalDownloads);

module.exports = app;