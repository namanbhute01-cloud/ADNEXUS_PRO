import { MediaSyncEngine } from './syncEngine.js';
import './developerPanel.js';

const params = new URLSearchParams(window.location.search);
const screenId = params.get('screenId') || "SCREEN_NODE_01";
const devToken = params.get('devToken');
const edgeSocket = io('/edge', { auth: { nodeId: screenId } });

window.socketInstance = edgeSocket;
window.SCREEN_ID = screenId;

document.addEventListener('DOMContentLoaded', () => {
    const displayMonitor = document.getElementById('primary-monitor');
    const videoHostContainer = displayMonitor.shadowRoot.getElementById('video-host-container');
    const devOverlay = document.querySelector('adn-developer-panel');

    // Create the initial video element within the shadow DOM
    const initialVideoElement = document.createElement('video');
    initialVideoElement.id = 'adnexus-media-element';
    initialVideoElement.preload = "auto";
    initialVideoElement.muted = true; // Essential for seamless programmatic autoplay execution
    initialVideoElement.playsInline = true;
    initialVideoElement.style.width = "100%";
    initialVideoElement.style.height = "100%";
    initialVideoElement.style.objectFit = "cover";
    videoHostContainer.appendChild(initialVideoElement);

    const syncEngine = new MediaSyncEngine(
        displayMonitor,
        edgeSocket,
        window.SCREEN_ID
    );

    edgeSocket.on('connect', () => {
        document.getElementById('connection-status').innerText = 'System Synchronized';
    });

    edgeSocket.on('disconnect', () => {
        document.getElementById('connection-status').innerText = 'Link Degraded';
    });

    edgeSocket.on('connect_error', () => {
        document.getElementById('connection-status').innerText = 'Edge Auth Failed';
    });

    if (devToken && devOverlay) {
        const adminSocket = io('/admin', { auth: { token: devToken } });
        adminSocket.on('connect', () => devOverlay.setAccess({ enabled: true, adminSocket }));
        adminSocket.on('connect_error', () => devOverlay.setAccess({ enabled: false, adminSocket: null }));
    } else if (devOverlay) {
        devOverlay.setAccess({ enabled: false, adminSocket: null });
    }

    // Start continuous telemetry updates for the display monitor and dev panel
    let lastFrameTime = 0;
    function animate(currentTime) {
        if (!lastFrameTime) lastFrameTime = currentTime;
        const deltaTime = currentTime - lastFrameTime;
        const fps = (1000 / deltaTime).toFixed(0);
        lastFrameTime = currentTime;

        const nodeStatus = navigator.onLine ? "ONLINE" : "OFFLINE";
        const offset = `${window.serverTimeOffset || 0}ms`;
        const playhead = `${(window.currentPlayheadMs / 1000 || 0).toFixed(2)}s`;
        
        displayMonitor.updateTelemetry(nodeStatus, fps, offset, playhead);

        if (window.devOverlay && window.devOverlay._isAdminMode) {
            window.devOverlay.shadowRoot.getElementById('val-network').innerText = nodeStatus;
            window.devOverlay.shadowRoot.getElementById('val-offset').innerText = offset;
            // The following now correctly reads from the global window.currentPlayheadMs
            window.devOverlay.shadowRoot.getElementById('val-playhead').innerText = playhead;
            if (window.nextAdPlaybackEpoch) {
                const targetTime = new Date(window.nextAdPlaybackEpoch).toTimeString().split(' ')[0];
                window.devOverlay.shadowRoot.getElementById('val-next-trigger').innerText = targetTime;
            }
        }

        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);

    // Initial clock ping on load
    edgeSocket.emit('CLOCK_PING', Date.now());

    window.addEventListener('beforeunload', () => {
        syncEngine.destroy();
        edgeSocket.disconnect();
    });
});
