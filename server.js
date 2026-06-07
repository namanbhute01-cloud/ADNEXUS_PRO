const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'apps/player')));

app.get('/stream/:filename', (req, res) => {
    const mediaPath = path.join(__dirname, 'public', 'assets', req.params.filename);
    if (!fs.existsSync(mediaPath)) return res.status(404).send('File not found');
    const stat = fs.statSync(mediaPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(mediaPath, { start, end });
        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4',
        });
        file.pipe(res);
    } else {
        res.writeHead(200, { 'Content-Length': fileSize, 'Content-Type': 'video/mp4' });
        fs.createReadStream(mediaPath).pipe(res);
    }
});

let campaignState = {
    startTime: Date.now(),
    loopDurationMs: 15000, 
    playlistId: "global_loop_01",
    timeline: {
        "SCREEN_NODE_01": [
            { start: 0, end: 5000, type: "video", url: "/stream/promo_part1.mp4" },
            { start: 5000, end: 10000, type: "video", url: "/stream/promo_part2.mp4" },
            { start: 10000, end: 15000, type: "video", url: "/stream/promo_part3.mp4" }
        ]
    }
};

setInterval(() => {
    if (Date.now() - campaignState.startTime >= campaignState.loopDurationMs) {
        campaignState.startTime = Date.now();
    }
    io.emit('ORCHESTRATED_CAMPAIGN_SYNC', campaignState);
}, 100);

io.on('connection', (socket) => {
    socket.on('CLOCK_PING', (clientPing) => {
        socket.emit('CLOCK_PONG', Date.now(), clientPing);
    });
    socket.on('ADMIN_FORCE_LOOP_RESET', () => {
        campaignState.startTime = Date.now();
        io.emit('ORCHESTRATED_CAMPAIGN_SYNC', campaignState);
        console.log(`[Admin Action] Loop reset. New startTime: ${campaignState.startTime}`);
    });
    socket.emit('ORCHESTRATED_CAMPAIGN_SYNC', campaignState);
});

server.listen(3000, () => console.log('AdNexus Master Clock Server running on :3000'));
