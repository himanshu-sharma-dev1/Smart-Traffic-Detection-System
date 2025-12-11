import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Custom hook for global keyboard shortcuts
 * 
 * Shortcuts:
 * - Alt+H: Home
 * - Alt+D: Detection page
 * - Alt+L: Live Detection
 * - Alt+A: Dashboard (Analytics)
 * - Alt+P: Profile
 * - Alt+K: Show shortcuts modal
 * - Escape: Close modals
 * - Ctrl+/: Toggle dark mode
 */

// Shortcut definitions
export const SHORTCUTS = [
    { keys: ['Alt', 'H'], description: 'Go to Home', action: 'navigate', path: '/' },
    { keys: ['Alt', 'D'], description: 'Go to Detection', action: 'navigate', path: '/detect' },
    { keys: ['Alt', 'L'], description: 'Go to Live Detection', action: 'navigate', path: '/live' },
    { keys: ['Alt', 'A'], description: 'Go to Dashboard', action: 'navigate', path: '/dashboard' },
    { keys: ['Alt', 'P'], description: 'Go to Profile', action: 'navigate', path: '/profile' },
    { keys: ['Alt', 'S'], description: 'Go to History', action: 'navigate', path: '/history' },
    { keys: ['Alt', 'K'], description: 'Show keyboard shortcuts', action: 'showShortcuts' },
    { keys: ['Ctrl', '/'], description: 'Toggle dark mode', action: 'toggleDarkMode' },
    { keys: ['Escape'], description: 'Close modal/panel', action: 'closeModal' },
];

export function useKeyboardShortcuts({ onToggleDarkMode, onShowShortcuts, onCloseModal } = {}) {
    const navigate = useNavigate();
    const [isEnabled, setIsEnabled] = useState(true);

    const handleKeyDown = useCallback((event) => {
        // Don't trigger shortcuts when typing in inputs
        if (
            !isEnabled ||
            event.target.tagName === 'INPUT' ||
            event.target.tagName === 'TEXTAREA' ||
            event.target.isContentEditable
        ) {
            return;
        }

        const key = event.key.toLowerCase();
        const isAlt = event.altKey;
        const isCtrl = event.ctrlKey || event.metaKey;

        // Alt + Key shortcuts (navigation)
        if (isAlt) {
            switch (key) {
                case 'h':
                    event.preventDefault();
                    navigate('/');
                    break;
                case 'd':
                    event.preventDefault();
                    navigate('/detect');
                    break;
                case 'l':
                    event.preventDefault();
                    navigate('/live');
                    break;
                case 'a':
                    event.preventDefault();
                    navigate('/dashboard');
                    break;
                case 'p':
                    event.preventDefault();
                    navigate('/profile');
                    break;
                case 's':
                    event.preventDefault();
                    navigate('/history');
                    break;
                case 'k':
                    event.preventDefault();
                    onShowShortcuts?.();
                    break;
                default:
                    break;
            }
        }

        // Ctrl + / for dark mode toggle
        if (isCtrl && key === '/') {
            event.preventDefault();
            onToggleDarkMode?.();
        }

        // Escape to close modal
        if (key === 'escape') {
            onCloseModal?.();
        }
    }, [navigate, isEnabled, onToggleDarkMode, onShowShortcuts, onCloseModal]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);

    return {
        isEnabled,
        setIsEnabled,
        shortcuts: SHORTCUTS
    };
}

/**
 * Component to display keyboard shortcuts in a modal
 */
export function KeyboardShortcutsDisplay({ shortcuts = SHORTCUTS }) {
    return (
        <div className="keyboard-shortcuts-list">
            {shortcuts.map((shortcut, index) => (
                <div key={index} className="keyboard-shortcut">
                    <span className="shortcut-keys">
                        {shortcut.keys.map((key, i) => (
                            <span key={i}>
                                <kbd>{key}</kbd>
                                {i < shortcut.keys.length - 1 && ' + '}
                            </span>
                        ))}
                    </span>
                    <span className="shortcut-description">{shortcut.description}</span>
                </div>
            ))}
        </div>
    );
}

export default useKeyboardShortcuts;
