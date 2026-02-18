// ============================================================
// Cloud Sync via Google Sheets (iframe-based, no CORS issues)
// ============================================================
// Uses hidden iframes for all communication with Google Apps Script.
// Saves: fire-and-forget iframe navigation
// Loads: iframe + postMessage to receive data back
const SYNC_URL = 'https://script.google.com/macros/s/AKfycbxK0Mt5IXKlzIxb1DRZaQFqvwnmomZvXmVo8LuFECGUjlEhFxRhW-7RuiaOB5y-Ng/exec'

export const isCloudEnabled = () => !!SYNC_URL

// Reusable hidden iframe for save operations
let saveFrame = null
function getSaveFrame() {
    if (!saveFrame || !saveFrame.parentNode) {
        saveFrame = document.createElement('iframe')
        saveFrame.style.display = 'none'
        saveFrame.name = '_vani_save'
        document.body.appendChild(saveFrame)
    }
    return saveFrame
}

function buildSaveParams(data) {
    const params = {
        action: 'save',
        userId: data.userId || '',
        tab: data.tab || '',
        trackTitle: data.trackTitle || '',
        trackTheme: data.trackTheme || '',
        trackLink: data.trackLink || '',
        time: String(data.time || 0)
    }
    if (data.completedTracks && data.completedTracks.length > 0) {
        params.completedTracks = JSON.stringify(data.completedTracks)
    }
    return params
}

// Load data via hidden iframe + postMessage
function iframeLoad(params, timeout = 20000) {
    return new Promise((resolve, reject) => {
        const rid = Math.random().toString(36).slice(2)
        const qs = new URLSearchParams({ ...params, rid })
        const iframe = document.createElement('iframe')
        iframe.style.display = 'none'

        const timer = setTimeout(() => {
            cleanup()
            reject(new Error('Cloud load timeout'))
        }, timeout)

        function cleanup() {
            clearTimeout(timer)
            window.removeEventListener('message', handler)
            setTimeout(() => {
                if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
            }, 2000)
        }

        function handler(event) {
            try {
                const msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
                if (msg && msg._rid === rid) {
                    cleanup()
                    console.log('[CloudSync] received:', params.action, msg.result)
                    resolve(msg.result)
                }
            } catch (e) {}
        }

        window.addEventListener('message', handler)
        iframe.src = `${SYNC_URL}?${qs}`
        document.body.appendChild(iframe)
    })
}

export async function cloudLoad(userId) {
    if (!SYNC_URL) return null
    try {
        const result = await iframeLoad({ action: 'load', userId })
        return result.success ? result.data : null
    } catch (e) {
        console.warn('[CloudSync] load error:', e)
        return null
    }
}

export function cloudSave(data) {
    if (!SYNC_URL) return
    try {
        const params = new URLSearchParams(buildSaveParams(data))
        getSaveFrame().src = `${SYNC_URL}?${params}`
        console.log('[CloudSync] save fired')
    } catch (e) {
        console.warn('[CloudSync] save error:', e)
    }
}

export function cloudSaveBeacon(data) {
    if (!SYNC_URL) return
    try {
        const params = new URLSearchParams(buildSaveParams(data))
        const iframe = document.createElement('iframe')
        iframe.style.display = 'none'
        iframe.src = `${SYNC_URL}?${params}`
        document.body.appendChild(iframe)
    } catch (e) {}
}

export async function cloudLoadUsers() {
    if (!SYNC_URL) return []
    try {
        const result = await iframeLoad({ action: 'users' })
        return result.success ? result.users : []
    } catch (e) {
        console.warn('[CloudSync] users error:', e)
        return []
    }
}
