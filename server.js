const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const edgeNs = io.of('/edge');
const adminNs = io.of('/admin');
const DEV_TOKEN = (process.env.ADNEXUS_DEV_TOKEN || '').trim();

// Static assets (for the player app)
app.use(express.static(path.join(__dirname, 'apps/player')));

// 1. Streaming Middleware for partial content
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

// 2. Master Clock Sync & Orchestration
let campaignState = {
    startTime: Date.now(),
    loopDurationMs: 15000, // Total duration for 3 videos, 5 seconds each
    playlistId: "global_loop_01",
    timeline: {
        "SCREEN_NODE_01": [
            { start: 0, end: 5000, type: "video", url: "/stream/promo_part1.mp4" },
            { start: 5000, end: 10000, type: "video", url: "/stream/promo_part2.mp4" },
            { start: 10000, end: 15000, type: "video", url: "/stream/promo_part3.mp4" }
        ]
    }
};

function emitCampaignState(target = edgeNs) {
    target.emit('ORCHESTRATED_CAMPAIGN_SYNC', campaignState);
}

function pushPlaylist(nodeId, playlist) {
    edgeNs.to(`node:${nodeId}`).emit('PLAYLIST_UPDATE', playlist);
}

setInterval(() => {
    if (Date.now() - campaignState.startTime >= campaignState.loopDurationMs) {
        campaignState.startTime = Date.now();
        emitCampaignState();
    }
}, 1000);

edgeNs.on('connection', (socket) => {
    const nodeId = socket.handshake.auth?.nodeId;
    if (!nodeId || typeof nodeId !== 'string') {
        socket.disconnect(true);
        return;
    }

    socket.join(`node:${nodeId}`);
    socket.data.lastSeen = Date.now();

    const heartbeat = setInterval(() => {
        socket.emit('EDGE_PING', Date.now());
    }, 30000);

    socket.on('CLOCK_PING', (clientPing) => {
        socket.emit('CLOCK_PONG', Date.now(), clientPing);
    });

    socket.on('EDGE_PONG', () => {
        socket.data.lastSeen = Date.now();
    });

    socket.emit('ORCHESTRATED_CAMPAIGN_SYNC', campaignState);
    socket.on('disconnect', (reason) => {
        clearInterval(heartbeat);
        console.log(`[Edge Disconnect] ${nodeId} -> ${reason}`);
    });
});

adminNs.use((socket, next) => {
    if (!DEV_TOKEN || socket.handshake.auth?.token !== DEV_TOKEN) {
        next(new Error('Forbidden'));
        return;
    }

    next();
});

adminNs.on('connection', (socket) => {
    socket.on('ADMIN_FORCE_LOOP_RESET', () => {
        campaignState.startTime = Date.now();
        emitCampaignState();
        console.log(`[Admin Action] Global playlist loop reset by admin. New startTime: ${campaignState.startTime}`);
    });
});

module.exports = { server, pushPlaylist };
server.listen(3000, () => console.log('AdNexus Master Clock Server running on :3000'));
