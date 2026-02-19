import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
    Search, Play, Pause, ChevronLeft, ChevronRight,
    X, Shuffle, RotateCcw, RotateCw,
    MoreHorizontal, AlertCircle, Loader2, Link2, Info, Share2, LogOut
} from 'lucide-react'
import prabhupadaImg from './assets/prabhupada.png'
import rnsmImg from './assets/rnsm.png'
import hhbrsmImg from './assets/hhbrsm.png'
import vaishnavaSongImg from './assets/vaishnavasong.png'
import rspImg from './assets/RSP.jpeg'
import LoginScreen from './LoginScreen.jsx'
import { isCloudEnabled, cloudLoad, cloudSave, cloudSaveBeacon, cloudLoadUsers } from './cloudSync.js'

class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ background: '#0f172a', color: 'white', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px' }}>
                    <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '20px' }} />
                    <h1 style={{ fontWeight: 800 }}>Application Halted</h1>
                    <button onClick={() => window.location.reload()} style={{ marginTop: '24px', padding: '12px 24px', borderRadius: '8px', border: 'none', background: '#fbbf24', color: '#0f172a', fontWeight: 'bold' }}>Restart Player</button>
                </div>
            );
        }
        return this.props.children;
    }
}

const TrackList = React.memo(function TrackList({
    items,
    activeTab,
    currentTrack,
    isPlaying,
    onPlay,
    artwork,
    completedTracks
}) {
    return (
        <>
            {items.map((track, i) => {
                const isCompleted = completedTracks.has(getTrackId(track))
                return (
                    <div key={track.link || `${track.title}-${i}`} className="song-card" onClick={() => onPlay(track, activeTab)}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', marginRight: '16px', flexShrink: 0, position: 'relative' }}>
                            <img src={artwork} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Art" loading="lazy" />
                            {isCompleted && (
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(74, 222, 128, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span style={{ color: '#0b0b0c', fontSize: '12px', fontWeight: 900, lineHeight: 1 }}>{'\u2713'}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="song-info">
                            <div className="song-title" style={{ color: currentTrack === track ? '#fbbf24' : isCompleted ? '#4ade80' : 'white' }}>{String(track.title)}</div>
                            <div className="song-meta">
                                {String(track.Theme || activeTab).substring(0, 100)}
                                {isCompleted && <span style={{ color: '#4ade80', marginLeft: '8px', fontSize: '0.65rem', fontWeight: 700 }}>Listened</span>}
                            </div>
                        </div>
                        <div>
                            {currentTrack === track && isPlaying ? <Pause size={20} fill="#fbbf24" stroke="none" /> : <Play size={20} style={isCompleted ? { color: '#4ade80' } : undefined} />}
                        </div>
                    </div>
                )
            })}
        </>
    )
})

const getArtworkForTab = (tab) => {
    if (tab === 'HHBRSM') return hhbrsmImg
    if (tab === 'HHRNSM') return rnsmImg
    if (tab === 'SP-Iskcon desire tree') return prabhupadaImg
    if (tab === 'Vaishnav Songs') return vaishnavaSongImg
    if (tab === 'HGRSP') return rspImg
    return prabhupadaImg
}

const resolveUrl = (track) => {
    let url = String(track.link || '')
    if (url.includes('drive.google.com') && !url.includes('export=download')) {
        const id = url.split('id=')[1]?.split('&')[0]
        if (id) return `https://drive.google.com/uc?id=${id}&export=download`
    }
    return url
}

const slugifyTitle = (title) => {
    return String(title || '')
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

const getBasePath = () => {
    const basePath = import.meta.env.BASE_URL || '/'
    return basePath.endsWith('/') ? basePath : `${basePath}/`
}

const getSlugFromLocation = () => {
    const basePath = getBasePath()
    const path = window.location.pathname
    if (path.startsWith(basePath) && path.length > basePath.length) {
        const raw = path.slice(basePath.length).replace(/^\/+|\/+$/g, '')
        if (raw) return decodeURIComponent(raw)
    }
    const params = new URLSearchParams(window.location.search)
    const p = params.get('p')
    return p ? decodeURIComponent(p) : ''
}

const buildShareUrl = (track) => {
    const basePath = getBasePath()
    const base = new URL(basePath, window.location.origin).toString()
    const slug = track?.title ? slugifyTitle(track.title) : ''
    return slug ? `${base}${encodeURIComponent(slug)}` : base
}

const getTrackId = (track) => track?.link || `${track?.title}|${track?.Theme || ''}`

const VaniPlayer = () => {
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            return localStorage.getItem('vani_current_user') || null
        } catch (e) {
            return null
        }
    })

    const [tabList, setTabList] = useState([])
    const [tabFiles, setTabFiles] = useState({})
    const [tabData, setTabData] = useState({})
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(null)

    const [activeTab, setActiveTab] = useState('')
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [currentTrack, setCurrentTrack] = useState(null)
    const [currentTrackTab, setCurrentTrackTab] = useState('')
    const [isPlaying, setIsPlaying] = useState(false)
    const [progress, setProgress] = useState(0)
    const [duration, setDuration] = useState(0)
    const [currentTime, setCurrentTime] = useState(0)
    const [playbackRate, setPlaybackRate] = useState(1)
    const [showDetail, setShowDetail] = useState(false)
    const [playbackError, setPlaybackError] = useState(null)
    const [shareNotice, setShareNotice] = useState('')

    const storageKey = currentUser ? `vani_progress_${currentUser}` : 'vani_progress'
    const completedKey = currentUser ? `vani_completed_${currentUser}` : 'vani_completed'

    const audioRef = useRef(new Audio())
    const listRef = useRef(null)
    const progressRef = useRef(null)
    const lastProgressUpdateRef = useRef(0)
    const lastRestoredKeyRef = useRef('')
    const lastCloudSaveRef = useRef(0)
    const cloudSyncedRef = useRef('')
    const completedTracksRef = useRef(new Set())

    const [completedTracks, setCompletedTracks] = useState(new Set())

    // Keep ref in sync for use in beforeunload/beacon (avoids stale closures)
    useEffect(() => { completedTracksRef.current = completedTracks }, [completedTracks])

    const handleLogin = (userId) => {
        setCurrentUser(userId)
        lastRestoredKeyRef.current = ''
        cloudSyncedRef.current = ''
        try {
            localStorage.setItem('vani_current_user', userId)
            const raw = localStorage.getItem('vani_users')
            const users = raw ? JSON.parse(raw) : []
            if (!users.includes(userId)) {
                users.push(userId)
                localStorage.setItem('vani_users', JSON.stringify(users))
            }
        } catch (e) {
            // Ignore storage failures
        }
    }

    const handleLogout = () => {
        if (audioRef.current) {
            audioRef.current.pause()
        }
        setCurrentUser(null)
        setCurrentTrack(null)
        setIsPlaying(false)
        setShowDetail(false)
        try {
            localStorage.removeItem('vani_current_user')
        } catch (e) {
            // Ignore storage failures
        }
    }

    const findTrackInList = (items, savedTrack) => {
        if (!items || !savedTrack) return null
        const { link, title, Theme } = savedTrack
        if (!items) return null
        return items.find(item =>
            (link && item.link === link) ||
            (title && String(item.title) === String(title) && String(item.Theme) === String(Theme || ''))
        ) || null
    }

    // Load completed tracks when user changes
    useEffect(() => {
        try {
            const raw = localStorage.getItem(completedKey)
            setCompletedTracks(raw ? new Set(JSON.parse(raw)) : new Set())
        } catch (e) {
            setCompletedTracks(new Set())
        }
    }, [completedKey])

    const markCompleted = React.useCallback((track) => {
        if (!track) return
        const id = getTrackId(track)
        setCompletedTracks(prev => {
            const next = new Set(prev)
            next.add(id)
            try {
                localStorage.setItem(completedKey, JSON.stringify([...next]))
            } catch (e) {}
            return next
        })
    }, [completedKey])

    const saveProgressNow = React.useCallback((forceCloud = false) => {
        if (!currentUser || !currentTrack) return
        const tabForTrack = currentTrackTab || activeTab
        const state = {
            tab: tabForTrack,
            track: {
                title: currentTrack.title,
                Theme: currentTrack.Theme,
                link: currentTrack.link
            },
            time: audioRef.current ? audioRef.current.currentTime : 0,
            lastPlayed: Date.now()
        }
        try {
            localStorage.setItem(storageKey, JSON.stringify(state))
        } catch (e) {}

        // Cloud sync (debounced: every 30s unless forced)
        if (isCloudEnabled()) {
            const now = Date.now()
            if (forceCloud || now - lastCloudSaveRef.current > 30000) {
                lastCloudSaveRef.current = now
                cloudSave({
                    userId: currentUser,
                    tab: tabForTrack,
                    trackTitle: currentTrack.title,
                    trackTheme: currentTrack.Theme,
                    trackLink: currentTrack.link,
                    time: audioRef.current ? audioRef.current.currentTime : 0,
                    completedTracks: [...completedTracksRef.current]
                })
            }
        }
    }, [currentUser, currentTrack, activeTab, currentTrackTab, storageKey])

    const fetchTabData = React.useCallback(async (tabName) => {
        const file = tabFiles[tabName]
        if (!file) return null
        try {
            const res = await fetch(`data/tabs/${file}`)
            if (!res.ok) throw new Error("Sync failed")
            const data = await res.json()
            setTabData(prev => (prev[tabName] ? prev : { ...prev, [tabName]: data }))
            return data
        } catch (err) {
            setLoadError(err.message || "Sync failed")
            return null
        }
    }, [tabFiles])

    // Load last progress (Local)
    useEffect(() => {
        if (lastRestoredKeyRef.current === storageKey) return
        if (!tabList.length) return
        if (getSlugFromLocation()) { lastRestoredKeyRef.current = storageKey; return }
        try {
            const raw = localStorage.getItem(storageKey)
            if (!raw) { lastRestoredKeyRef.current = storageKey; return }
            const saved = JSON.parse(raw)
            const { tab, time, track } = saved || {}
            if (!tab) { lastRestoredKeyRef.current = storageKey; return }
            setActiveTab(tab)
            const loadSaved = async () => {
                const items = tabData[tab] || await fetchTabData(tab)
                const found = findTrackInList(items, track)
                if (!found) return
                lastRestoredKeyRef.current = storageKey
                setCurrentTrack(found)
                setCurrentTrackTab(tab)
                setTimeout(() => {
                    if (audioRef.current) {
                        audioRef.current.src = resolveUrl(found)
                        audioRef.current.load()
                        const seekWhenReady = () => {
                            audioRef.current.currentTime = time || 0
                            setCurrentTime(time || 0)
                            audioRef.current.removeEventListener('loadedmetadata', seekWhenReady)
                        }
                        audioRef.current.addEventListener('loadedmetadata', seekWhenReady)
                    }
                }, 300)
            }
            loadSaved()
        } catch (e) {
            lastRestoredKeyRef.current = storageKey
        }
    }, [tabList, tabData, fetchTabData, storageKey])

    // Cloud sync — runs once per login, merges cloud with local
    useEffect(() => {
        if (!currentUser || !tabList.length) return
        if (cloudSyncedRef.current === currentUser) return
        if (!isCloudEnabled()) { cloudSyncedRef.current = currentUser; return }

        cloudSyncedRef.current = currentUser
        const syncFromCloud = async () => {
            const cloudData = await cloudLoad(currentUser)
            if (!cloudData) return

            // Merge completed tracks (union of local + cloud)
            if (cloudData.completedTracks?.length) {
                setCompletedTracks(prev => {
                    const merged = new Set([...prev, ...cloudData.completedTracks])
                    try { localStorage.setItem(completedKey, JSON.stringify([...merged])) } catch (e) {}
                    return merged
                })
            }

            // Compare timestamps — use whichever session is more recent
            let localTime = 0
            try {
                const localRaw = localStorage.getItem(storageKey)
                if (localRaw) localTime = JSON.parse(localRaw)?.lastPlayed || 0
            } catch (e) {}

            const cloudTime = cloudData.lastPlayed ? new Date(cloudData.lastPlayed).getTime() : 0

            if (cloudTime > localTime && cloudData.trackLink) {
                // Cloud is more recent — restore from cloud
                setActiveTab(cloudData.tab)
                const items = tabData[cloudData.tab] || await fetchTabData(cloudData.tab)
                if (!items) return
                const cloudTrack = { title: cloudData.trackTitle, Theme: cloudData.trackTheme, link: cloudData.trackLink }
                const found = findTrackInList(items, cloudTrack)
                if (found) {
                    lastRestoredKeyRef.current = storageKey
                    setCurrentTrack(found)
                    setCurrentTrackTab(cloudData.tab)
                    setTimeout(() => {
                        if (audioRef.current) {
                            audioRef.current.src = resolveUrl(found)
                            audioRef.current.load()
                            const seekWhenReady = () => {
                                audioRef.current.currentTime = Number(cloudData.time) || 0
                                setCurrentTime(Number(cloudData.time) || 0)
                                audioRef.current.removeEventListener('loadedmetadata', seekWhenReady)
                            }
                            audioRef.current.addEventListener('loadedmetadata', seekWhenReady)
                        }
                    }, 500)
                    // Also update localStorage with the cloud data
                    try {
                        localStorage.setItem(storageKey, JSON.stringify({
                            tab: cloudData.tab,
                            track: cloudTrack,
                            time: Number(cloudData.time) || 0,
                            lastPlayed: cloudTime
                        }))
                    } catch (e) {}
                }
            }
        }
        syncFromCloud()
    }, [currentUser, tabList, tabData, fetchTabData, storageKey, completedKey])

    // Auto-Save Progress (Local) — every 3s + on page hide/close
    useEffect(() => {
        if (!currentUser || !currentTrack) return;
        const interval = setInterval(saveProgressNow, 3000);
        return () => clearInterval(interval);
    }, [currentUser, currentTrack, saveProgressNow])

    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === 'hidden') saveProgressNow(true)
        }
        const handleBeforeUnload = () => {
            saveProgressNow() // localStorage (fast)
            // Cloud save via beacon (survives page close)
            if (isCloudEnabled() && currentUser && currentTrack) {
                cloudSaveBeacon({
                    userId: currentUser,
                    tab: currentTrackTab || activeTab,
                    trackTitle: currentTrack.title,
                    trackTheme: currentTrack.Theme,
                    trackLink: currentTrack.link,
                    time: audioRef.current ? audioRef.current.currentTime : 0,
                    completedTracks: [...completedTracksRef.current]
                })
            }
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        document.addEventListener('visibilitychange', handleVisibility)
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
            document.removeEventListener('visibilitychange', handleVisibility)
        }
    }, [saveProgressNow, currentUser, currentTrack, activeTab, currentTrackTab])

    useEffect(() => {
        fetch('data/tabs.json')
            .then(res => { if (!res.ok) throw new Error("Sync failed"); return res.json(); })
            .then(payload => {
                const tabs = payload?.tabs || []
                const fileMap = {}
                tabs.forEach(t => { if (t?.name && t?.file) fileMap[t.name] = t.file })
                setTabList(tabs)
                setTabFiles(fileMap)
                if (tabs[0]?.name) setActiveTab(tabs[0].name)
            })
            .catch(err => { setLoadError(err.message); setLoading(false); });
    }, [])

    useEffect(() => {
        if (!activeTab) return
        if (tabData[activeTab]) { setLoading(false); return }
        fetchTabData(activeTab).then(() => setLoading(false))
    }, [activeTab, tabData, fetchTabData])

    useEffect(() => {
        if (!tabList.length) return
        const slug = getSlugFromLocation()
        if (!slug) return
        const loadBySlug = async () => {
            try {
                const res = await fetch('data/slug_index.json')
                if (!res.ok) throw new Error("Sync failed")
                const index = await res.json()
                const entry = index?.[slug]
                if (!entry?.tab) return
                setActiveTab(entry.tab)
                const items = tabData[entry.tab] || await fetchTabData(entry.tab)
                if (!items) return
                const found = items[entry.index] || items.find(item => slugifyTitle(item.title) === slug)
                if (found) {
                    setCurrentTrack(found)
                    setCurrentTrackTab(entry.tab)
                }
            } catch (e) {
                setLoadError("Sync failed")
            }
        }
        loadBySlug()
    }, [tabList, tabData, fetchTabData])

    useEffect(() => {
        const handle = setTimeout(() => setDebouncedSearch(search), 150)
        return () => clearTimeout(handle)
    }, [search])

    useEffect(() => {
        if (!currentTrack || currentTrackTab) return
        if (activeTab) setCurrentTrackTab(activeTab)
    }, [currentTrack, currentTrackTab, activeTab])

    useEffect(() => {
        if (!currentTrack) return
        const url = buildShareUrl(currentTrack)
        window.history.replaceState({}, '', url)
    }, [currentTrack, currentTrackTab, activeTab])

    const currentTabItems = useMemo(() => {
        if (!activeTab) return []
        const items = tabData[activeTab] || []
        if (activeTab !== 'HHBRSM') return items
        return items
            .slice()
            .sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), undefined, { sensitivity: 'base' }))
    }, [tabData, activeTab])
    const filteredData = useMemo(() => {
        const kw = debouncedSearch.toLowerCase()
        return currentTabItems.filter(item =>
            String(item.title).toLowerCase().includes(kw) || String(item.Theme).toLowerCase().includes(kw)
        )
    }, [debouncedSearch, currentTabItems])

    const activeTabArtwork = useMemo(() => getArtworkForTab(activeTab), [activeTab])

    const PAGE_SIZE = 40
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
    const visibleItems = useMemo(() => filteredData.slice(0, visibleCount), [filteredData, visibleCount])
    const canLoadMore = visibleCount < filteredData.length

    useEffect(() => {
        if (listRef.current) listRef.current.scrollTop = 0
        setVisibleCount(PAGE_SIZE)
    }, [activeTab, search])

    const handlePlay = React.useCallback(async (track, trackTab) => {
        setPlaybackError(null);
        const resolved = resolveUrl(track);
        if (currentTrack === track) {
            if (trackTab && trackTab !== currentTrackTab) setCurrentTrackTab(trackTab);
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
                saveProgressNow(true);
            } else {
                try {
                    await audioRef.current.play();
                    setIsPlaying(true);
                } catch (e) {
                    // Audio not loaded yet — reload and retry
                    audioRef.current.src = resolved;
                    audioRef.current.load();
                    try {
                        await audioRef.current.play();
                        setIsPlaying(true);
                    } catch (e2) {
                        setPlaybackError("Couldn't resume. Tap the track again.");
                    }
                }
            }
            return;
        }
        saveProgressNow(true);
        setCurrentTrack(track);
        if (trackTab) setCurrentTrackTab(trackTab);
        audioRef.current.src = resolved;
        audioRef.current.playbackRate = playbackRate;
        audioRef.current.load();
        try {
            await audioRef.current.play();
            setIsPlaying(true);
            // Force cloud save immediately when a new track starts
            if (isCloudEnabled()) {
                lastCloudSaveRef.current = Date.now()
                cloudSave({
                    userId: currentUser,
                    tab: trackTab || activeTab,
                    trackTitle: track.title,
                    trackTheme: track.Theme,
                    trackLink: track.link,
                    time: 0,
                    completedTracks: [...completedTracksRef.current]
                })
            }
        } catch (e) {
            if (!resolved.includes('drive.google.com')) {
                const filename = resolved.split('/').pop().replace(/ /g, '%20');
                const attempts = [`https://audio.iskcondesiretree.com/06_-_More/01_-_ISKCON_Pune/2025/${filename}`, `https://audio.iskcondesiretree.com/06_-_More/07_-_ISKCON_Punjabi_Baugh/2025/${filename}`];
                for (const alt of attempts) {
                    try { audioRef.current.src = alt; await audioRef.current.play(); setIsPlaying(true); setPlaybackError(null); return; } catch (err) { continue; }
                }
            }
            setPlaybackError("Link unavailable.");
        }
    }, [currentTrack, currentTrackTab, isPlaying, playbackRate, saveProgressNow])

    const skip = (s) => { if (audioRef.current.duration) audioRef.current.currentTime += s; }
    const changeSpeed = () => {
        const rates = [0.5, 0.75, 1, 1.25, 1.5, 2]
        const next = rates[(rates.indexOf(playbackRate) + 1) % rates.length]
        setPlaybackRate(next); audioRef.current.playbackRate = next;
    }

    const handleSeek = (e) => {
        if (!progressRef.current || !audioRef.current.duration) return;
        const r = progressRef.current.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const pos = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
        audioRef.current.currentTime = pos * audioRef.current.duration;
    };

    const handleShare = async () => {
        if (!currentTrack) return
        const url = buildShareUrl(currentTrack)
        try {
            await navigator.clipboard.writeText(url)
            setShareNotice('Share link copied!')
            setTimeout(() => setShareNotice(''), 2000)
        } catch (e) {
            window.prompt('Copy this link:', url)
        }
    }

    useEffect(() => {
        const audio = audioRef.current
        const update = (force = false) => {
            const now = Date.now()
            if (!force && now - lastProgressUpdateRef.current < 250) return
            lastProgressUpdateRef.current = now
            setProgress(isNaN(audio.currentTime / audio.duration) ? 0 : (audio.currentTime / audio.duration) * 100)
            setCurrentTime(audio.currentTime)
            setDuration(audio.duration || 0)
        }
        const handleLoadedMetadata = () => update(true)
        const handleEnded = () => {
            setIsPlaying(false)
            if (currentTrack) markCompleted(currentTrack)
            saveProgressNow(true)
        }
        const handleError = () => { if (isPlaying) setPlaybackError("Transmission interrupted."); setIsPlaying(false); }
        audio.addEventListener('timeupdate', update)
        audio.addEventListener('loadedmetadata', handleLoadedMetadata)
        audio.addEventListener('ended', handleEnded)
        audio.addEventListener('error', handleError)
        return () => {
            audio.removeEventListener('timeupdate', update)
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
            audio.removeEventListener('ended', handleEnded)
            audio.removeEventListener('error', handleError)
        }
    }, [isPlaying, currentTrack, markCompleted, saveProgressNow])

    if (!currentUser) {
        return <LoginScreen onLogin={handleLogin} />
    }

    if (loading) return (
        <div className="loading-screen">
            <Loader2 size={48} className="animate-spin loading-icon" />
            <h2 className="loading-title">VANI ARCHIVE LOADING...</h2>
        </div>
    )

    if (loadError) return (
        <div className="loading-screen">
            <AlertCircle size={48} className="error-icon" />
            <h2 className="loading-title">Couldn't sync the archive</h2>
            <p className="error-text">{String(loadError)}</p>
            <button className="primary-btn" onClick={() => window.location.reload()}>Try Again</button>
        </div>
    )

    return (
        <div className="main-layout" style={{ height: '100vh', overflow: 'hidden' }}>
            <header className="app-header" style={{ opacity: showDetail ? 0 : 1, transition: '0.3s', position: 'relative' }}>

                <div className="hero-strip">
                    <div className="hero-overlay" />
                    <div className="hero-content">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div style={{ flex: 1 }} />
                            <div style={{ flex: 1, textAlign: 'center' }}>
                                <h1 className="brand-title">Vani Player</h1>
                            </div>
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={handleLogout}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        borderRadius: '12px',
                                        padding: '8px 14px',
                                        color: '#f5f5f7',
                                        fontSize: '0.75rem',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        transition: 'all 0.2s ease'
                                    }}
                                    title={`Logged in as ${currentUser}`}
                                >
                                    <LogOut size={14} />
                                    <span style={{ display: 'none' }} className="show-on-desktop">{currentUser}</span>
                                </button>
                            </div>
                        </div>
                        <p className="brand-tagline">DIVINE INSTRUCTION PORTAL</p>
                    </div>
                </div>
                <div className="quote-banner">
                    <p className="quote-text">“Loving devotional service to the Lord begins with hearing about the Lord.”</p>
                    <p className="quote-meta">Śrīmad‑Bhāgavatam 1.7.7 • Śrīla Prabhupāda</p>
                </div>
                <div className="search-container">
                    <Search size={20} style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} />
                    <input className="search-input" placeholder="Search teachings..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="tab-row">
                    {tabList.map(t => (
                        <button key={t.name} className={`tab-btn ${activeTab === t.name ? 'active' : ''}`} onClick={() => setActiveTab(t.name)}>{t.name}</button>
                    ))}
                </div>
            </header>

            <main ref={listRef} className="song-grid" style={{ flexGrow: 1, overflowY: 'auto', opacity: showDetail ? 0 : 1 }}>
                <TrackList
                    items={visibleItems}
                    activeTab={activeTab}
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    onPlay={handlePlay}
                    artwork={activeTabArtwork}
                    completedTracks={completedTracks}
                />
                {canLoadMore && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0 30px' }}>
                        <button className="primary-btn" onClick={() => setVisibleCount(c => Math.min(filteredData.length, c + PAGE_SIZE))}>
                            Load more
                        </button>
                    </div>
                )}
            </main>

            {currentTrack && !showDetail && (
                <div className="mini-player" onClick={() => setShowDetail(true)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }}>
                            <img src={getArtworkForTab(currentTrackTab || activeTab)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{String(currentTrack.title)}</div>
                            <div style={{ fontSize: '0.65rem', color: '#fbbf24', fontWeight: 700 }}>{currentTrackTab || activeTab}</div>
                        </div>
                    </div>
                    <button className="icon-btn" onClick={(e) => { e.stopPropagation(); handlePlay(currentTrack, currentTrackTab || activeTab); }}>
                        {isPlaying ? <Pause size={28} fill="white" /> : <Play size={28} fill="white" />}
                    </button>
                </div>
            )}

            {showDetail && currentTrack && (
                <div className="detail-view">
                    <div className="detail-header">
                        <button className="icon-btn" onClick={() => setShowDetail(false)}>
                            <X size={32} color="white" />
                        </button>
                    </div>

                    <div className="detail-content">
                        <div className="artwork-box">
                            <img src={getArtworkForTab(currentTrackTab || activeTab)} />
                        </div>
                        <h2 className="detail-title">{String(currentTrack.title)}</h2>
                        <p className="detail-meta">{currentTrackTab || activeTab} • {currentTrack.Theme || 'Spiritual Archive'}</p>
                        {playbackError && <div style={{ color: '#f87171', fontSize: '0.85rem', fontWeight: 700, marginTop: '10px' }}>{playbackError}</div>}
                    </div>

                    <div className="player-controls-bar">
                        <div className="progress-container">
                            <div
                                className="progress-bar-base"
                                ref={progressRef}
                                onClick={handleSeek}
                                onTouchStart={handleSeek}
                                onTouchMove={handleSeek}
                            >
                                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                            </div>
                            <div className="time-stamps">
                                <span>{Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}</span>
                                <span>{Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}</span>
                            </div>
                        </div>
                        <div className="controls-row">
                            <div style={{ flex: 1, opacity: 0.3 }}><Shuffle size={24} /></div>
                            <div className="main-controls">
                                <button className="icon-btn" onClick={() => skip(-10)} style={{ position: 'relative' }}>
                                    <RotateCcw size={36} /><span style={{ position: 'absolute', top: '55%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '10px', fontWeight: 900 }}>10</span>
                                </button>
                                <div className="play-pause-circle" onClick={() => handlePlay(currentTrack)}>
                                    {isPlaying ? <Pause size={40} fill="black" /> : <Play size={40} fill="black" style={{ marginLeft: '4px' }} />}
                                </div>
                                <button className="icon-btn" onClick={() => skip(30)} style={{ position: 'relative' }}>
                                    <RotateCw size={36} /><span style={{ position: 'absolute', top: '55%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '10px', fontWeight: 900 }}>30</span>
                                </button>
                            </div>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '20px' }}>
                                <button className="util-btn" onClick={changeSpeed}>{playbackRate}x</button>
                                <button className="icon-btn" onClick={handleShare} title="Copy share link">
                                    <Share2 size={26} />
                                </button>
                                <a href={resolveUrl(currentTrack)} target="_blank" rel="noreferrer" style={{ color: '#94a3b8' }}><Link2 size={28} /></a>
                            </div>
                        </div>
                        {shareNotice && (
                            <div style={{ color: '#fbbf24', fontSize: '0.75rem', fontWeight: 700, marginTop: '10px', textAlign: 'right' }}>
                                {shareNotice}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

const App = () => (<ErrorBoundary> <VaniPlayer /> </ErrorBoundary>)
export default App
