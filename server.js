const express = require("express");
const app = express();

// --- RAW JPEG handler khusus /frame ---
app.post("/frame", express.raw({
    type: "image/jpeg",
    limit: "2mb"
}), (req, res) => {
    if (!req.body || req.body.length < 10) {
        return res.status(400).send("no raw");
    }
    latestFrame = Buffer.from(req.body);
    lastFrameTime = Date.now();
    res.sendStatus(200);
});

// --- JSON handler ---
app.use(express.json({ limit: "1mb" }));

let latestFrame = null;
let lastFrameTime = Date.now();
let lastCommand = "stop";

// streaming
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
    }, 150);

    req.on("close", () => clearInterval(timer));
});

app.get("/command", (req, res) => {
    res.json({ cmd: lastCommand });
});

app.post("/cmd", (req, res) => {
    if (req.body && req.body.cmd) {
        lastCommand = req.body.cmd;
        return res.send("ok");
    }
    res.send("invalid");
});

app.use(express.static("public"));

// ---- THIS IS THE MOST IMPORTANT PART ----
const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () =>
    console.log("SERVER READY on " + port)
);
