// ============================================================
// Cloud Sync via Google Sheets
// ============================================================
// Paste your deployed Google Apps Script Web App URL below.
// Leave empty to disable cloud sync (localStorage-only mode).
const SYNC_URL = 'https://script.google.com/macros/s/AKfycbxK0Mt5IXKlzIxb1DRZaQFqvwnmomZvXmVo8LuFECGUjlEhFxRhW-7RuiaOB5y-Ng/exec'

export const isCloudEnabled = () => !!SYNC_URL

export async function cloudLoad(userId) {
    if (!SYNC_URL) return null
    try {
        const res = await fetch(
            `${SYNC_URL}?action=load&userId=${encodeURIComponent(userId)}`
        )
        if (!res.ok) return null
        const json = await res.json()
        return json.success ? json.data : null
    } catch (e) {
        return null
    }
}

export async function cloudSave(data) {
    if (!SYNC_URL) return
    try {
        const encoded = encodeURIComponent(JSON.stringify(data))
        await fetch(`${SYNC_URL}?action=save&data=${encoded}`)
    } catch (e) {}
}

export function cloudSaveBeacon(data) {
    if (!SYNC_URL) return
    try {
        const encoded = encodeURIComponent(JSON.stringify(data))
        const url = `${SYNC_URL}?action=save&data=${encoded}`
        fetch(url, { keepalive: true }).catch(() => {})
    } catch (e) {}
}

export async function cloudLoadUsers() {
    if (!SYNC_URL) return []
    try {
        const res = await fetch(`${SYNC_URL}?action=users`)
        if (!res.ok) return []
        const json = await res.json()
        return json.success ? json.users : []
    } catch (e) {
        return []
    }
}
