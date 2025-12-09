const express = require("express");
const app = express();

// RAW hanya untuk endpoint /frame (lebih aman, tidak makan RAM seluruh server)
app.post("/frame", express.raw({
    type: "image/jpeg",
    limit: "2mb"
}), (req, res) => {

    if (!req.body || req.body.length < 20) {
        return res.status(400).send("no raw");
    }

    latestFrame = Buffer.from(req.body);
    lastFrameTime = Date.now();

    return res.sendStatus(200);
});

// JSON untuk endpoint lainnya
app.use(express.json({ limit: "1mb" }));

let latestFrame = null;
let lastFrameTime = Date.now();
let lastCommand = "stop";

// STREAM MJPEG
app.get("/stream", (req, res) => {
    res.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": "multipart/x-mixed-replace; boundary=frame"
    });

    const timer = setInterval(() => {
        if (!latestFrame) return;

        res.write(`--frame\r\n`);
        res.write("Content-Type: image/jpeg\r\n");
        res.write(`Content-Length: ${latestFrame.length}\r\n\r\n`);
        res.write(latestFrame);
        res.write("\r\n");
    }, 120);

    req.on("close", () => clearInterval(timer));
});

// COMMAND GET
app.get("/command", (req, res) => {
    res.json({ cmd: lastCommand, ts: Date.now() });
});

// COMMAND POST
app.post("/cmd", (req, res) => {
    if (req.body.cmd) {
        lastCommand = req.body.cmd;
        return res.send("ok");
    }
    res.send("invalid");
});

// UI
app.use(express.static("public"));

// START
const port = process.env.PORT || 3000;
app.listen(port, () => console.log("SERVER READY on " + port));
