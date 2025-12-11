/**
 * License Plate OCR Web Worker
 * 
 * This worker runs Tesseract.js in a SEPARATE THREAD,
 * so the main UI thread never freezes.
 * 
 * Architecture:
 * Main Thread (UI) <--postMessage--> Worker Thread (OCR)
 */

// Import Tesseract.js in worker context
importScripts('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');

let worker = null;
let isInitialized = false;
let isProcessing = false;

// Initialize Tesseract worker
async function initTesseract() {
    if (isInitialized) return;

    try {
        postMessage({ type: 'status', message: 'Initializing OCR engine...' });

        worker = await Tesseract.createWorker('eng', 1, {
            logger: (m) => {
                if (m.status === 'recognizing text') {
                    postMessage({ type: 'progress', progress: m.progress });
                }
            }
        });

        // Optimize for license plates
        await worker.setParameters({
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -',
            tessedit_pageseg_mode: '7', // Single line
        });

        isInitialized = true;
        postMessage({ type: 'ready' });
        console.log('[Worker] Tesseract initialized successfully');
    } catch (error) {
        postMessage({ type: 'error', error: error.message });
    }
}

// Process image and extract plate text
async function processPlate(imageData, trackId) {
    if (!isInitialized || isProcessing) {
        postMessage({
            type: 'skipped',
            trackId,
            reason: isProcessing ? 'busy' : 'not initialized'
        });
        return;
    }

    isProcessing = true;

    try {
        postMessage({ type: 'processing', trackId });

        // Create canvas from image data
        const canvas = new OffscreenCanvas(imageData.width, imageData.height);
        const ctx = canvas.getContext('2d');
        ctx.putImageData(new ImageData(
            new Uint8ClampedArray(imageData.data),
            imageData.width,
            imageData.height
        ), 0, 0);

        // Run OCR
        const { data } = await worker.recognize(canvas);
        const text = data.text.trim().replace(/\s+/g, ' ').toUpperCase();

        // Only return valid plates (at least 4 characters, confidence > 40%)
        if (text.length >= 4 && data.confidence > 40) {
            postMessage({
                type: 'result',
                trackId,
                plate: text,
                confidence: Math.round(data.confidence)
            });
        } else {
            postMessage({
                type: 'noplate',
                trackId,
                reason: text.length < 4 ? 'too short' : 'low confidence'
            });
        }
    } catch (error) {
        postMessage({ type: 'error', trackId, error: error.message });
    } finally {
        isProcessing = false;
    }
}

// Handle messages from main thread
self.onmessage = async function (e) {
    const { type, imageData, trackId } = e.data;

    switch (type) {
        case 'init':
            await initTesseract();
            break;

        case 'process':
            await processPlate(imageData, trackId);
            break;

        case 'terminate':
            if (worker) {
                await worker.terminate();
                worker = null;
                isInitialized = false;
            }
            self.close();
            break;

        default:
            console.log('[Worker] Unknown message type:', type);
    }
};

// Auto-initialize when worker loads
initTesseract();
