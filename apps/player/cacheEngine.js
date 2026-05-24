class AdNexusCacheEngine {
    constructor(cacheName = "adn-media-v2") {
        this.cacheName = cacheName;
        this.objectUrlCache = new Map();
    }

    // Downloads an asset completely into local cache memory
    async cacheAssetToLocalDisk(assetUrl) {
        const cache = await caches.open(this.cacheName);
        
        // Query to check if the file is already safely stored locally
        const existingRecord = await cache.match(assetUrl);
        if (existingRecord) {
            console.log(`[Cache Engine] Asset found on local disk. Bypassing server load for: ${assetUrl}`);
            return true;
        }

        console.log(`[Cache Engine] Warming cache. Downloading heavy file from server: ${assetUrl}`);
        
        try {
            // Trigger download and store the exact server response object natively
            await cache.add(assetUrl);
            console.log(`[Cache Engine] Asset downloaded and cached successfully: ${assetUrl}`);
            return true;
        } catch (error) {
            console.error(`[Cache Engine] Failed to cache heavy media target over network paths: ${assetUrl}`, error);
            return false;
        }
    }

    // Serves a local cache URL reference for the HTML5 player
    async getCachedMediaUrl(assetUrl) {
        const existingObjectUrl = this.objectUrlCache.get(assetUrl);
        if (existingObjectUrl) {
            return existingObjectUrl;
        }

        const cache = await caches.open(this.cacheName);
        const matchedResponse = await cache.match(assetUrl);

        if (!matchedResponse) {
            console.warn(`[Cache Engine] Cache miss encountered. Falling back to active network stream: ${assetUrl}`);
            return assetUrl; 
        }

        // Extract the cached blob stream data directly
        const mediaBlob = await matchedResponse.blob();
        const objectUrl = URL.createObjectURL(mediaBlob);
        this.objectUrlCache.set(assetUrl, objectUrl);
        return objectUrl;
    }

    destroy() {
        for (const objectUrl of this.objectUrlCache.values()) {
            URL.revokeObjectURL(objectUrl);
        }

        this.objectUrlCache.clear();
    }
}
