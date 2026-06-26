import { AdNexusCacheEngine } from './cacheEngine.js';

export class MediaSyncEngine {
    constructor(videoContainer, socket, screenId) {
        this.container = videoContainer;
        this.socket = socket;
        this.screenId = screenId;
        this.cacheEngine = new AdNexusCacheEngine();
        this.isOnline = navigator.onLine;
        this.serverTimeOffset = 0; 
        this.masterLoopStartTime = 0;
        this.loopDurationMs = 0;
        this.myTimelineWindows = [];
        this.initSocketListeners();
        this.tick();
    }

    initSocketListeners() {
        this.socket.on("CLOCK_PONG", (serverTime, clientPingTimestamp) => {
            const responseTime = Date.now();
            this.serverTimeOffset = serverTime - responseTime + ((responseTime - clientPingTimestamp) / 2);
            window.serverTimeOffset = this.serverTimeOffset;
        });

        this.socket.on("ORCHESTRATED_CAMPAIGN_SYNC", async (payload) => {
            this.masterLoopStartTime = payload.startTime;
            this.loopDurationMs = payload.loopDurationMs;
            this.myTimelineWindows = payload.timeline[this.screenId] || [];
            
            for (let w of this.myTimelineWindows) {
                if (!w.url) continue;
                
                // Use sizeBytes from payload if available
                const size = parseInt(w.sizeBytes || '0', 10);
                
                if (size > 500 * 1024 * 1024) { // > 500MB
                    await this.cacheEngine.cacheChunkedAssetToLocalDisk(w.url, size);
                } else {
                    await this.cacheEngine.cacheAssetToLocalDisk(w.url);
                }
            }
        });

        setInterval(() => {
            if (this.socket.connected) this.socket.emit('CLOCK_PING', Date.now());
        }, 5000);
    }

    async processExecutionTick() {
        if (!this.masterLoopStartTime || this.myTimelineWindows.length === 0) return;
        const trueNow = Date.now() + this.serverTimeOffset;
        if (trueNow < this.masterLoopStartTime) { this.masterLoopStartTime = trueNow; return; }
        
        const progress = (trueNow - this.masterLoopStartTime) % this.loopDurationMs;
        window.currentPlayheadMs = progress;

        const activeWindow = this.myTimelineWindows.find(w => progress >= w.start && progress < w.end);
        if (activeWindow) {
            let url = this.isOnline ? activeWindow.url : await this.cacheEngine.getCachedMediaUrl(activeWindow.url);
            this.render(activeWindow, url);
        } else {
            this.container.shadowRoot.getElementById('video-host-container').innerHTML = '';
        }
    }

    render(windowConfig, url) {
        const container = this.container.shadowRoot.getElementById('video-host-container');
        const activeEl = container.querySelector('#adnexus-media-element');
        if (activeEl && activeEl.dataset.url === url) return;

        container.innerHTML = '';
        const el = document.createElement(windowConfig.type === 'video' ? 'video' : 'img');
        el.id = 'adnexus-media-element';
        el.dataset.url = url;
        el.style.width = "100%";
        el.style.height = "100%";
        el.style.objectFit = "cover";
        
        if (windowConfig.type === 'video') {
            el.muted = true;
            el.loop = true;
            el.src = url;
            el.play().catch(e => console.error("Playback blocked", e));
        } else {
            el.src = url;
        }
        container.appendChild(el);
    }

    tick = async () => {
        await this.processExecutionTick();
        requestAnimationFrame(this.tick);
    }
}
