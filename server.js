// server.js
const express = require('express');
const cors = require('cors');
const EventEmitter = require('events');

const app = express();
app.use(cors());
app.use(express.static('public')); // index.html akan diletakkan di /public
app.set('trust proxy', true);

const FRAME_EVENT = new EventEmitter();
let latestFrame = null;
let clients = []; // untuk streaming HTTP multipart
let currentCommand = "stop"; // command terakhir yang dikirim browser

// Terima frame JPEG (binary) dari ESP32
app.post('/frame', express.raw({ type: 'image/jpeg', limit: '2mb' }), (req, res) => {
  if (!req.body || req.body.length === 0) {
    return res.status(400).send('no image');
  }
  latestFrame = req.body;
  // notify clients
  FRAME_EVENT.emit('frame', latestFrame);
  res.sendStatus(200);
});

// Endpoint streaming MJPEG sederhana
app.get('/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
    'Cache-Control': 'no-cache',
    'Connection': 'close',
    'Pragma': 'no-cache'
  });

  const sendFrame = (frame) => {
    try {
      res.write(`--frame\r\n`);
      res.write(`Content-Type: image/jpeg\r\nContent-Length: ${frame.length}\r\n\r\n`);
      res.write(frame);
      res.write('\r\n');
    } catch (e) {
      // connection likely closed
      FRAME_EVENT.removeListener('frame', sendFrame);
    }
  };

  // send the latest immediately if exists
  if (latestFrame) sendFrame(latestFrame);

  // subscribe to future frames
  FRAME_EVENT.on('frame', sendFrame);

  // cleanup on close
  req.on('close', () => {
    FRAME_EVENT.removeListener('frame', sendFrame);
  });
});

// Browser mengirim perintah kontrol (via fetch)
app.post('/control', express.json(), (req, res) => {
  const cmd = (req.body && req.body.cmd) ? req.body.cmd : null;
  if (!cmd) return res.status(400).send('no cmd');
  currentCommand = cmd;
  console.log('Control set to:', currentCommand);
  res.json({ ok: true });
});

// ESP polls untuk mendapat perintah. Kita kembalikan currentCommand.
app.get('/command', (req, res) => {
  res.json({ cmd: currentCommand, ts: Date.now() });
});

// health
app.get('/ping', (req, res) => res.send('pong'));

// start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
