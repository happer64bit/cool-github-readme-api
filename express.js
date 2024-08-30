const express = require("express")
const SteaksRouter = require("./router/steaks.route")

const app = express()

app.use("/steaks/", SteaksRouter);

module.exports = app;