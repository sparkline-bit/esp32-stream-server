// super low latency esp32 stream server
const express = require("express");
const app = express();

// IMPORTANT: untuk RAW JPEG dari ESP32
app.use(express.raw({ type: "image/jpeg", limit: "5mb" }));

// UI & command tetap JSON
app.use(express.json({ limit: "1mb" }));

let latestFrame = null;      // JPEG buffer (raw)
let lastFrameTime = Date.now();

let lastCommand = "stop";
let lastCmdTime = Date.now();

// --- menerima frame RAW JPEG ---
app.post("/frame", (req, res) => {
    if (!req.body || req.body.length < 10) {
        return res.status(400).send("no raw");
    }

    latestFrame = Buffer.from(req.body); // langsung simpan JPEG
    lastFrameTime = Date.now();

    return res.sendStatus(200);
});

// --- stream MJPEG realtime ---
app.get("/stream", (req, res) => {
    res.writeHead(200, {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Content-Type": "multipart/x-mixed-replace; boundary=frame"
    });

    const interval = setInterval(() => {
        if (!latestFrame) return;

        res.write(`--frame\r\n`);
        res.write("Content-Type: image/jpeg\r\n");
        res.write(`Content-Length: ${latestFrame.length}\r\n\r\n`);
        res.write(latestFrame);
        res.write("\r\n");
    }, 100); // ~10 FPS realtime

    req.on("close", () => clearInterval(interval));
});

// --- read command ---
app.get("/command", (req, res) => {
    res.json({
        cmd: lastCommand,
        ts: Date.now()
    });
});

// --- set command ---
app.post("/cmd", (req, res) => {
    if (req.body && req.body.cmd) {
        lastCommand = req.body.cmd;
        lastCmdTime = Date.now();
        return res.send("ok");
    }
    res.send("invalid");
});

// --- ping ---
app.get("/ping", (req, res) => res.send("pong"));

// --- static ui (frontend) ---
app.use(express.static("public"));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("SERVER READY on " + port));
