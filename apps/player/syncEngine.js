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
        this.currentAssetUrl = "";
        this.currentResolvedSource = "";
        this.animationFrameId = null;
        this.clockPingIntervalId = null;

        this.handleClockPong = this.handleClockPong.bind(this);
        this.handleCampaignSync = this.handleCampaignSync.bind(this);
        this.handleAdminLoopReset = this.handleAdminLoopReset.bind(this);
        this.handleEdgePing = this.handleEdgePing.bind(this);
        this.handleOnline = () => this.handleNetworkTransition(true);
        this.handleOffline = () => this.handleNetworkTransition(false);

        this.initNetworkListeners();
        this.initSocketListeners();
        this.tick();
    }

    initNetworkListeners() {
        window.addEventListener('online', this.handleOnline);
        window.addEventListener('offline', this.handleOffline);
    }

    handleNetworkTransition(onlineStatus) {
        this.isOnline = onlineStatus;
        if (window.devOverlay) {
            window.devOverlay.pushLog(`[Network Monitor] Connectivity shift detected. Online state: ${this.isOnline}`);
        }
    }

    initSocketListeners() {
        this.socket.on("CLOCK_PONG", this.handleClockPong);
        this.socket.on("ORCHESTRATED_CAMPAIGN_SYNC", this.handleCampaignSync);
        this.socket.on('ADMIN_FORCE_LOOP_RESET', this.handleAdminLoopReset);
        this.socket.on("EDGE_PING", this.handleEdgePing);

        this.clockPingIntervalId = setInterval(() => {
            if (this.socket.connected) {
                this.socket.emit('CLOCK_PING', Date.now());
            }
        }, 5000);
    }

    getTrueTime() {
        return Date.now() + this.serverTimeOffset + (window.customDriftOffset || 0);
    }

    async processExecutionTick() {
        if (!this.masterLoopStartTime || this.myTimelineWindows.length === 0) return;

        const trueCurrentTime = this.getTrueTime();
        const currentTimelineProgress = (trueCurrentTime - this.masterLoopStartTime) % this.loopDurationMs;
        window.currentPlayheadMs = currentTimelineProgress; // Expose to global

        const activeWindow = this.myTimelineWindows.find(window => 
            currentTimelineProgress >= window.start && currentTimelineProgress < window.end
        );

        if (activeWindow) {
            let resolvedSource = activeWindow.url;
            if (!this.isOnline) {
                if (this.currentAssetUrl === activeWindow.url && this.currentResolvedSource) {
                    resolvedSource = this.currentResolvedSource;
                } else {
                    resolvedSource = await this.cacheEngine.getCachedMediaUrl(activeWindow.url);
                }
            }

            this.currentAssetUrl = activeWindow.url;
            this.currentResolvedSource = resolvedSource;
            this.renderTargetState(activeWindow, resolvedSource, currentTimelineProgress - activeWindow.start);

            // Calculate next ad hand-off time for dev panel
            const index = this.myTimelineWindows.indexOf(activeWindow);
            const nextWindow = this.myTimelineWindows[index + 1] || this.myTimelineWindows[0];
            window.nextAdPlaybackEpoch = this.masterLoopStartTime + nextWindow.start; // Absolute time for next transition
        } else {
            // Handle blackout or idle state if no window is active (e.g., between loops)
             this.currentAssetUrl = "";
             this.currentResolvedSource = "";
             this.renderTargetState({type: "blackout"}, null, 0); 
        }
    }

    renderTargetState(windowConfig, resolvedSource, windowProgressMs) {
        const videoHostContainer = this.container.shadowRoot.getElementById('video-host-container');
        let videoElement = videoHostContainer.querySelector('video');
        let imageElement = videoHostContainer.querySelector('img');

        // Ensure only one media element exists for simplicity and memory management
        if (windowConfig.type === "video") {
            if (!videoElement) {
                videoElement = document.createElement('video');
                videoElement.id = 'adnexus-media-element';
                videoHostContainer.appendChild(videoElement);
                if (imageElement) imageElement.remove();
            }
            // Image element should be hidden/removed if video is active
            if (imageElement) imageElement.style.display = 'none';
            videoElement.style.display = 'block';
        } else if (windowConfig.type === "fallback_image") {
            if (!imageElement) {
                imageElement = document.createElement('img');
                imageElement.id = 'adnexus-media-element';
                videoHostContainer.appendChild(imageElement);
                if (videoElement) videoElement.remove();
            }
            // Video element should be hidden/removed if image is active
            if (videoElement) videoElement.style.display = 'none';
            imageElement.style.display = 'block';
        } else { // blackout or idle_blank
            if (videoElement) videoElement.remove();
            if (imageElement) imageElement.remove();
            return;
        }

        const activeMediaElement = videoElement || imageElement;
        if (!activeMediaElement) return;

        if (activeMediaElement.dataset.sourceKey !== resolvedSource) {
            activeMediaElement.dataset.sourceKey = resolvedSource;
            activeMediaElement.src = resolvedSource;
            if (windowConfig.type === "video") {
                const expectedTime = windowProgressMs / 1000;
                activeMediaElement.muted = true;
                activeMediaElement.playsInline = true;
                activeMediaElement.load();
                activeMediaElement.onloadedmetadata = () => {
                    activeMediaElement.currentTime = expectedTime;
                    activeMediaElement.play().catch(e => {
                        if (window.devOverlay) {
                            window.devOverlay.pushLog(`[Video Playback] Autoplay blocked: ${e.message}`);
                        }
                    });
                };
            }
            if (windowConfig.type === "fallback_image") {
                activeMediaElement.alt = "Campaign fallback";
            }
            if (window.devOverlay) {
                window.devOverlay.pushLog(`[Hand-off Matrix] Switching state to asset: ${resolvedSource}`);
            }
        } else if (windowConfig.type === "video") {
            if (activeMediaElement.readyState >= 2) {
                const expectedTime = windowProgressMs / 1000;
                const drift = Math.abs(activeMediaElement.currentTime - expectedTime);
                if (drift > 0.15) {
                    activeMediaElement.currentTime = expectedTime;
                    if (window.devOverlay) {
                        window.devOverlay.pushLog(`[Sync Warning] Drift of ${drift.toFixed(3)}s detected. Re-seeking.`);
                    }
                }
            }
        }
    }

    tick = async () => {
        await this.processExecutionTick();
        this.animationFrameId = requestAnimationFrame(this.tick);
    }

    async handleCampaignSync(payload) {
        if (window.devOverlay) {
            window.devOverlay.pushLog(`[NET] New manifest arrived: ${payload.playlistId}`);
        }
        this.masterLoopStartTime = payload.startTime;
        this.loopDurationMs = payload.loopDurationMs;
        window.loopDurationMs = this.loopDurationMs;

        const configuration = payload.timeline[this.screenId];
        this.myTimelineWindows = Array.isArray(configuration) ? configuration : [];

        await Promise.allSettled(
            this.myTimelineWindows
                .filter((windowUnit) => Boolean(windowUnit.url))
                .map((windowUnit) => this.cacheEngine.cacheAssetToLocalDisk(windowUnit.url)),
        );
    }

    handleClockPong(serverTime, clientPingTimestamp) {
        const responseTime = Date.now();
        const totalRoundTrip = responseTime - clientPingTimestamp;
        const latency = totalRoundTrip / 2;
        this.serverTimeOffset = serverTime - responseTime + latency;
        window.serverTimeOffset = this.serverTimeOffset;
        if (window.devOverlay) {
            window.devOverlay.pushLog(`[Sync Engine] Synchronized with Master Server. Offset: ${this.serverTimeOffset}ms`);
        }
    }

    handleAdminLoopReset() {
        if (window.devOverlay) {
            window.devOverlay.pushLog('[ADMIN] Server-side loop reset forced.');
        }
    }

    handleEdgePing(timestamp) {
        this.socket.emit("EDGE_PONG", timestamp);
    }

    destroy() {
        window.removeEventListener('online', this.handleOnline);
        window.removeEventListener('offline', this.handleOffline);
        this.socket.off("CLOCK_PONG", this.handleClockPong);
        this.socket.off("ORCHESTRATED_CAMPAIGN_SYNC", this.handleCampaignSync);
        this.socket.off('ADMIN_FORCE_LOOP_RESET', this.handleAdminLoopReset);
        this.socket.off("EDGE_PING", this.handleEdgePing);
        if (this.clockPingIntervalId) {
            clearInterval(this.clockPingIntervalId);
            this.clockPingIntervalId = null;
        }
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.cacheEngine.destroy();
    }
}
