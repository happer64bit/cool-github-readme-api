const express = require("express")
const SteaksRouter = require("./router/streak.route");
const totalDownloads = require("./router/total_downloads.route");
const Stars = require("./router/stars.route");

require("dotenv").config()

const app = express()

app.use("/streak/", SteaksRouter);
app.use("/total-downloads/", totalDownloads);
app.use("/stars/", Stars);

module.exports = app;