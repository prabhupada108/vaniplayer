// ============================================================
// Cloud Sync via Google Sheets (CORS-free)
// ============================================================
// Uses <script> JSONP for reads and <img> pixel for writes.
// This bypasses CORS restrictions with Google Apps Script.
const SYNC_URL = 'https://script.google.com/macros/s/AKfycbxK0Mt5IXKlzIxb1DRZaQFqvwnmomZvXmVo8LuFECGUjlEhFxRhW-7RuiaOB5y-Ng/exec'

export const isCloudEnabled = () => !!SYNC_URL

// JSONP: loads data via <script> tag (no CORS issues)
function jsonpGet(params, timeout = 15000) {
    return new Promise((resolve, reject) => {
        const cb = '_vani_' + Math.random().toString(36).slice(2)
        const qs = new URLSearchParams({ ...params, callback: cb })
        const script = document.createElement('script')

        const timer = setTimeout(() => {
            cleanup()
            reject(new Error('JSONP timeout'))
        }, timeout)

        function cleanup() {
            clearTimeout(timer)
            delete window[cb]
            if (script.parentNode) script.parentNode.removeChild(script)
        }

        window[cb] = (data) => {
            cleanup()
            resolve(data)
        }

        script.src = `${SYNC_URL}?${qs}`
        script.onerror = () => {
            cleanup()
            reject(new Error('JSONP failed'))
        }
        document.head.appendChild(script)
    })
}

// Pixel save: fires a GET via <img> (no CORS issues, fire-and-forget)
function pixelSave(params) {
    const qs = new URLSearchParams(params)
    const img = new Image()
    img.src = `${SYNC_URL}?${qs}`
    console.log('[CloudSync] save fired')
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

export async function cloudLoad(userId) {
    if (!SYNC_URL) return null
    try {
        const result = await jsonpGet({ action: 'load', userId })
        return result.success ? result.data : null
    } catch (e) {
        console.warn('[CloudSync] load error:', e)
        return null
    }
}

export function cloudSave(data) {
    if (!SYNC_URL) return
    try {
        pixelSave(buildSaveParams(data))
    } catch (e) {
        console.warn('[CloudSync] save error:', e)
    }
}

export function cloudSaveBeacon(data) {
    if (!SYNC_URL) return
    try {
        pixelSave(buildSaveParams(data))
    } catch (e) {}
}

export async function cloudLoadUsers() {
    if (!SYNC_URL) return []
    try {
        const result = await jsonpGet({ action: 'users' })
        return result.success ? result.users : []
    } catch (e) {
        console.warn('[CloudSync] users error:', e)
        return []
    }
}
