class AdNexusDeveloperPanel extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._isAdminMode = false;
        this._isDevAccessEnabled = false;
        this._logBuffer = [];
        this._telemetryInterval = null;
        this._adminSocket = null;
        
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    z-index: 99999;
                    font-family: 'SF Pro Mono', monospace;
                    display: none;
                }
                .dev-toggle {
                    background: #121420;
                    color: #00ffcc;
                    border: 1px solid #00ffcc;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: bold;
                    box-shadow: 0 4px 12px rgba(0,255,204,0.2);
                }
                .panel-container {
                    display: none;
                    width: 450px;
                    max-height: 550px;
                    background: rgba(10, 11, 16, 0.95);
                    backdrop-filter: blur(12px);
                    border: 1px solid #ff3366;
                    border-radius: 8px;
                    padding: 16px;
                    color: #f0f4f8;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.8);
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    padding-bottom: 8px;
                    margin-bottom: 12px;
                }
                .header-title { color: #ff3366; font-weight: bold; font-size: 14px; }
                .metric-row { display: flex; justify-content: space-between; margin: 6px 0; font-size: 12px; }
                .metric-label { color: #64748b; }
                .metric-value { color: #00ffcc; }
                .log-box {
                    background: #000;
                    height: 120px;
                    overflow-y: auto;
                    border-radius: 4px;
                    padding: 8px;
                    font-size: 11px;
                    color: #a7f3d0;
                    margin-top: 12px;
                    border: 1px solid rgba(255,255,255,0.05);
                }
                .admin-controls {
                    margin-top: 12px;
                    padding-top: 12px;
                    border-top: 1px solid rgba(255,255,255,0.1);
                }
                .input-field {
                    background: #121420;
                    border: 1px solid #64748b;
                    color: #fff;
                    padding: 4px 8px;
                    border-radius: 4px;
                    width: 70px;
                    font-size: 12px;
                }
                .btn-action {
                    background: #ff3366;
                    color: #fff;
                    border: none;
                    padding: 4px 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 11px;
                }
            </style>
            
            <button class="dev-toggle" id="toggle-trigger">ENG_CONSOLE</button>
            
            <div class="panel-container" id="main-panel">
                <div class="header">
                    <span class="header-title">NEXUS TELEMETRY OVERLAY v2.0</span>
                    <button class="btn-action" style="background:#2dd4bf" id="btn-refresh-cache">WIPE CACHE</button>
                </div>
                
                <div class="metric-row">
                    <span class="metric-label">NETWORK MODE:</span>
                    <span class="metric-value" id="val-network">ONLINE</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">SERVER OFFSET DELTA:</span>
                    <span class="metric-value" id="val-offset">0ms</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">CURRENT PLAYHEAD SEC:</span>
                    <span class="metric-value" id="val-playhead">0.00s</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">NEXT AD HAND-OFF TIME:</span>
                    <span class="metric-value" id="val-next-trigger">00:00:00</span>
                </div>

                <div class="admin-controls">
                    <span style="font-size: 12px; color: #ff3366; font-weight: bold;">ADMIN RUNTIME HOT-FIXES</span>
                    <div class="metric-row" style="margin-top:8px;">
                        <span class="metric-label">MANUAL DRIFT ADJUST (ms):</span>
                        <input type="number" class="input-field" id="input-drift-override" value="0">
                    </div>
                    <button class="btn-action" style="width:100%; margin-top:6px;" id="btn-force-sync">FORCE GLOBAL TIMELINE RESET</button>
                </div>

                <div class="log-box" id="log-stream">
                    [SYSTEM] Terminal Initialized Engine Standby...<br>
                </div>
            </div>
        `;
    }

    connectedCallback() {
        this.shadowRoot.getElementById('toggle-trigger').addEventListener('click', () => this.togglePanel());
        this.shadowRoot.getElementById('btn-refresh-cache').addEventListener('click', () => this.clearLocalCache());
        this.shadowRoot.getElementById('btn-force-sync').addEventListener('click', () => this.triggerGlobalReset());
        this.shadowRoot.getElementById('input-drift-override').addEventListener('input', (e) => this.updateDriftOverride(e.target.value));

        // Expose to global scope for other modules to log
        window.devOverlay = this;
    }

    disconnectedCallback() {
        if (this._telemetryInterval) {
            clearInterval(this._telemetryInterval);
            this._telemetryInterval = null;
        }
    }

    setAccess({ enabled, adminSocket = null }) {
        this._isDevAccessEnabled = enabled;
        this._adminSocket = adminSocket;
        this.style.display = enabled ? 'block' : 'none';

        if (enabled && !this._telemetryInterval) {
            this.startTelemetryPolling();
            this.pushLog("[ACCESS] Developer panel unlocked.");
        }

        if (!enabled) {
            this._isAdminMode = false;
            this.shadowRoot.getElementById('main-panel').style.display = 'none';
            if (this._telemetryInterval) {
                clearInterval(this._telemetryInterval);
                this._telemetryInterval = null;
            }
        }
    }

    togglePanel() {
        if (!this._isDevAccessEnabled) return;
        this._isAdminMode = !this._isAdminMode;
        const panel = this.shadowRoot.getElementById('main-panel');
        panel.style.display = this._isAdminMode ? 'block' : 'none';
        this.pushLog(`[CONSOLE] Developer visibility flag shifted: ${this._isAdminMode}`);
    }

    pushLog(message) {
        const logBox = this.shadowRoot.getElementById('log-stream');
        const timestamp = new Date().toISOString().slice(11, 19);
        logBox.innerHTML += `[${timestamp}] ${message}<br>`;
        logBox.scrollTop = logBox.scrollHeight;
    }

    clearLocalCache() {
        caches.delete("adn-media-v2").then(() => {
            this.pushLog("[CACHE] Hard eviction triggered. Wiped all structural media blocks.");
        });
    }

    triggerGlobalReset() {
        if (this._adminSocket?.connected) {
            this._adminSocket.emit('ADMIN_FORCE_LOOP_RESET');
            this.pushLog("[NET] Global socket reset command dispatched to central server pipeline.");
        }
    }

    updateDriftOverride(val) {
        window.customDriftOffset = parseInt(val, 10) || 0;
        this.pushLog(`[TUNER] Local internal timeline alignment value updated to: ${val}ms`);
    }

    startTelemetryPolling() {
        this._telemetryInterval = setInterval(() => {
            if (!this._isAdminMode) return;

            // Update live operational values dynamically from global runtime scopes
            this.shadowRoot.getElementById('val-network').innerText = navigator.onLine ? "ONLINE" : "OFFLINE ISOLATED RUNTIME";
            this.shadowRoot.getElementById('val-offset').innerText = `${window.serverTimeOffset || 0}ms`;
            
            const activeMediaElement = document.getElementById('adnexus-media-element');
            if (activeMediaElement && activeMediaElement.tagName === 'VIDEO') {
                this.shadowRoot.getElementById('val-playhead').innerText = `${activeMediaElement.currentTime.toFixed(2)}s`;
            }

            if (window.nextAdPlaybackEpoch) {
                const targetTime = new Date(window.nextAdPlaybackEpoch).toTimeString().split(' ')[0];
                this.shadowRoot.getElementById('val-next-trigger').innerText = targetTime;
            }
        }, 300);
    }
}

customElements.define('adn-developer-panel', AdNexusDeveloperPanel);
