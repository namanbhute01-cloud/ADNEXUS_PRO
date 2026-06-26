class AdNexusCacheEngine {
    constructor(cacheName = "adn-media-v2", chunkSize = 5 * 1024 * 1024) {
        this.cacheName = cacheName;
        this.chunkSize = chunkSize;
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

    // Downloads a large asset in chunks
    async cacheChunkedAssetToLocalDisk(assetUrl, fileSize) {
        const cache = await caches.open(this.cacheName);
        let bytesDownloaded = 0;
        let chunkIndex = 0;

        while (bytesDownloaded < fileSize) {
            const start = bytesDownloaded;
            const end = Math.min(start + this.chunkSize - 1, fileSize - 1);
            const chunkUrl = `${assetUrl}?chunk=${chunkIndex}`;

            const existingRecord = await cache.match(chunkUrl);
            if (!existingRecord) {
                try {
                    const response = await fetch(assetUrl, {
                        headers: { Range: `bytes=${start}-${end}` }
                    });
                    if (!response.ok) throw new Error(`Failed to fetch chunk ${chunkIndex}`);
                    await cache.put(chunkUrl, response);
                } catch (error) {
                    console.error(`[Cache Engine] Failed to cache chunk ${chunkIndex}`, error);
                    return false;
                }
            }
            bytesDownloaded = end + 1;
            chunkIndex++;
        }
        return true;
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
