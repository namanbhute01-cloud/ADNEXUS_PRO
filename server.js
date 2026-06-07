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

app.use(express.static(path.join(__dirname, 'apps/player')));

app.get('/stream/:filename', (req, res) => {
    // Search recursively in public/uploads for the file
    const findFile = (dir, name) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const p = path.join(dir, file);
            if (fs.statSync(p).isDirectory()) {
                const found = findFile(p, name);
                if (found) return found;
            } else if (file.endsWith(name)) return p;
        }
        return null;
    };

    const mediaPath = findFile(path.join(__dirname, 'apps/web/public/uploads'), req.params.filename);

    if (!mediaPath || !fs.existsSync(mediaPath)) return res.status(404).send('File not found');


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
    timeline: {}
};

async function syncStateFromDb() {
    try {
        const res = await fetch('http://localhost:3000/api/admin/assignments');
        if (res.ok) {
            const data = await res.json();
            // Map data to timeline
            data.forEach(a => {
                campaignState.timeline[a.nodeId] = [{ start: 0, end: 15000, type: "video", url: "/stream/" + a.campaignId }];
            });
        }
    } catch(e) { console.error("Sync failed", e); }
}

syncStateFromDb();
setInterval(syncStateFromDb, 60000); // Poll every minute

function emitCampaignState(target = edgeNs, specificNodeId = null) {
    if (specificNodeId) {
        const targetedState = {
            ...campaignState,
            timeline: { [specificNodeId]: campaignState.timeline[specificNodeId] || [] }
        };
        target.to(`node:${specificNodeId}`).emit('ORCHESTRATED_CAMPAIGN_SYNC', targetedState);
    } else {
        edgeNs.sockets.forEach((socket) => {
            const nodeId = socket.handshake.auth?.nodeId;
            if (nodeId) emitCampaignState(edgeNs, nodeId);
        });
    }
}

edgeNs.on('connection', (socket) => {
    const nodeId = socket.handshake.auth?.nodeId;
    if (!nodeId) { socket.disconnect(true); return; }

    socket.join(`node:${nodeId}`);
    socket.emit('ORCHESTRATED_CAMPAIGN_SYNC', { ...campaignState, timeline: { [nodeId]: campaignState.timeline[nodeId] || [] } });
});

adminNs.on('connection', (socket) => {
    socket.on('ADMIN_FORCE_LOOP_RESET', () => {
        campaignState.startTime = Date.now();
        emitCampaignState();
    });
});

server.listen(3001, () => console.log('AdNexus Master Clock Server running on :3001'));
module.exports = { server };
