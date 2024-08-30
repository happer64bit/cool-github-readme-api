const express = require("express")
const SteaksRouter = require("./router/steaks.route")

const app = express()

app.use("/steaks/", SteaksRouter);

app.listen(5000)