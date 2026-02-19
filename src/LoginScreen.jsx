import React, { useState } from 'react';
import { User, ArrowRight } from 'lucide-react';

const LoginScreen = ({ onLogin }) => {
    const [userId, setUserId] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (userId.trim()) {
            onLogin(userId.trim());
        }
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
            zIndex: 1000,
            padding: '24px'
        }}>
            <div style={{
                background: 'rgba(30, 41, 59, 0.7)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '40px',
                borderRadius: '32px',
                width: '100%',
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
                }}>Welcome</h1>

                <p style={{
                    color: '#94a3b8',
                    marginBottom: '24px',
                    fontSize: '0.9rem',
                    lineHeight: '1.5'
                }}>
                    Enter your User ID to begin your spiritual journey.
                </p>

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
                            fontSize: '16px',
                            marginBottom: '16px',
                            outline: 'none',
                            textAlign: 'center',
                            fontWeight: '600'
                        }}
                        autoFocus
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
                            minHeight: '52px'
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
