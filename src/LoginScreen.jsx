import React, { useState, useEffect } from 'react';
import { User, ArrowRight, X } from 'lucide-react';
import { isCloudEnabled, cloudLoadUsers } from './cloudSync.js';

const LoginScreen = ({ onLogin }) => {
    const [userId, setUserId] = useState('');
    const [knownUsers, setKnownUsers] = useState([]);

    useEffect(() => {
        const loadUsers = async () => {
            let localUsers = [];
            try {
                const raw = localStorage.getItem('vani_users');
                if (raw) localUsers = JSON.parse(raw);
            } catch (e) {}

            if (isCloudEnabled()) {
                const cloudUsers = await cloudLoadUsers();
                // Merge and deduplicate
                const merged = [...new Set([...localUsers, ...cloudUsers])];
                setKnownUsers(merged);
                // Persist merged list locally
                try { localStorage.setItem('vani_users', JSON.stringify(merged)); } catch (e) {}
            } else {
                setKnownUsers(localUsers);
            }
        };
        loadUsers();
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (userId.trim()) {
            onLogin(userId.trim());
        }
    };

    const handleRemoveUser = (e, user) => {
        e.stopPropagation();
        const updated = knownUsers.filter(u => u !== user);
        setKnownUsers(updated);
        try {
            localStorage.setItem('vani_users', JSON.stringify(updated));
        } catch (e) {}
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: '#0f172a',
            backgroundImage: `
        radial-gradient(at 0% 0%, hsla(215, 25%, 27%, 1) 0, transparent 50%),
        radial-gradient(at 50% 0%, hsla(202, 32%, 18%, 0.5) 0, transparent 50%),
        radial-gradient(at 100% 0%, hsla(38, 92%, 50%, 0.1) 0, transparent 50%)
      `,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                background: 'rgba(30, 41, 59, 0.7)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '40px',
                borderRadius: '32px',
                width: '90%',
                maxWidth: '400px',
                textAlign: 'center',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                <div style={{
                    width: '80px',
                    height: '80px',
                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                    boxShadow: '0 10px 25px -5px rgba(251, 191, 36, 0.4)'
                }}>
                    <User size={40} color="#0f172a" strokeWidth={2.5} />
                </div>

                <h1 style={{
                    color: 'white',
                    fontSize: '2rem',
                    fontWeight: '800',
                    marginBottom: '8px',
                    letterSpacing: '-0.02em'
                }}>Welcome Back</h1>

                <p style={{
                    color: '#94a3b8',
                    marginBottom: '24px',
                    fontSize: '0.9rem',
                    lineHeight: '1.5'
                }}>
                    Enter your User ID to resume your spiritual journey exactly where you left off.
                </p>

                {knownUsers.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                        <p style={{
                            color: '#64748b',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            marginBottom: '10px'
                        }}>Previous Sessions</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {knownUsers.map(user => (
                                <button
                                    key={user}
                                    onClick={() => onLogin(user)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        width: '100%',
                                        padding: '12px 16px',
                                        borderRadius: '14px',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        background: 'rgba(15, 23, 42, 0.5)',
                                        color: 'white',
                                        fontSize: '0.95rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        textAlign: 'left'
                                    }}
                                >
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        background: 'rgba(251, 191, 36, 0.15)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        <User size={18} color="#fbbf24" />
                                    </div>
                                    <span style={{ flex: 1 }}>{user}</span>
                                    <div
                                        onClick={(e) => handleRemoveUser(e, user)}
                                        style={{
                                            padding: '4px',
                                            borderRadius: '8px',
                                            color: '#64748b',
                                            cursor: 'pointer',
                                            transition: 'color 0.2s'
                                        }}
                                    >
                                        <X size={16} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '16px',
                    color: '#475569',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                }}>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                    {knownUsers.length > 0 ? 'or enter new User ID' : 'Enter User ID'}
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                </div>

                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Enter User ID (e.g. Suraj)"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '16px 24px',
                            borderRadius: '16px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            background: 'rgba(15, 23, 42, 0.6)',
                            color: 'white',
                            fontSize: '1rem',
                            marginBottom: '16px',
                            outline: 'none',
                            textAlign: 'center',
                            fontWeight: '600'
                        }}
                        autoFocus={knownUsers.length === 0}
                    />

                    <button
                        type="submit"
                        style={{
                            width: '100%',
                            padding: '16px',
                            borderRadius: '16px',
                            border: 'none',
                            background: userId.trim() ? '#fbbf24' : '#334155',
                            color: userId.trim() ? '#0f172a' : '#64748b',
                            fontWeight: '800',
                            fontSize: '1rem',
                            cursor: userId.trim() ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.2s',
                            transform: userId.trim() ? 'translateY(0)' : 'none'
                        }}
                        disabled={!userId.trim()}
                    >
                        Start Listening <ArrowRight size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginScreen;
