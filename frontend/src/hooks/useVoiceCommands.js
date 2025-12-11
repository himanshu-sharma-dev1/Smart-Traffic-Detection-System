/**
 * useVoiceCommands - Voice command recognition hook
 * Provides hands-free control of the detection system
 * 
 * Commands:
 * - "start/begin detection" - Start detecting
 * - "stop/pause detection" - Stop detecting
 * - "take screenshot/capture" - Capture current frame
 * - "switch camera/flip" - Toggle camera
 * - "toggle tracking" - Enable/disable object tracking
 * - "toggle sound/mute" - Toggle sound alerts
 * - "export/download/save pdf" - Export PDF report
 * - "fullscreen" - Toggle fullscreen
 * - "help" - Show available commands
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Fuzzy match helper - checks if spoken text contains command keywords
const fuzzyMatch = (spoken, keywords) => {
    const lowerSpoken = spoken.toLowerCase().trim();
    return keywords.some(keyword =>
        lowerSpoken.includes(keyword.toLowerCase())
    );
};

// Command definitions with variations
const COMMANDS = {
    START_DETECTION: {
        keywords: ['start', 'begin', 'go', 'detect', 'run'],
        description: 'Start detection'
    },
    STOP_DETECTION: {
        keywords: ['stop', 'pause', 'halt', 'end'],
        description: 'Stop detection'
    },
    SCREENSHOT: {
        keywords: ['screenshot', 'capture', 'snap', 'photo', 'picture'],
        description: 'Take screenshot'
    },
    SWITCH_CAMERA: {
        keywords: ['switch', 'flip', 'camera', 'toggle camera', 'front', 'back'],
        description: 'Switch camera'
    },
    TOGGLE_TRACKING: {
        keywords: ['tracking', 'track'],
        description: 'Toggle object tracking'
    },
    TOGGLE_SOUND: {
        keywords: ['sound', 'mute', 'audio', 'unmute'],
        description: 'Toggle sound alerts'
    },
    EXPORT_REPORT: {
        keywords: ['export', 'download', 'save', 'report'],
        description: 'Export detection report'
    },
    FULLSCREEN: {
        keywords: ['fullscreen', 'full screen', 'maximize', 'big'],
        description: 'Toggle fullscreen'
    },
    TOGGLE_TRAFFIC_SIGNS: {
        keywords: ['traffic', 'signs', 'sign detection', 'yolo'],
        description: 'Toggle traffic sign detection'
    },
    TOGGLE_COUNTING: {
        keywords: ['counting', 'count', 'counter'],
        description: 'Toggle counting zones'
    },
    TOGGLE_LICENSE_PLATE: {
        keywords: ['plate', 'license', 'number plate', 'ocr'],
        description: 'Toggle license plate OCR'
    },
    HELP: {
        keywords: ['help', 'commands', 'what can you do'],
        description: 'Show available commands'
    }
};

const useVoiceCommands = (handlers = {}) => {
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [lastCommand, setLastCommand] = useState(null);
    const [error, setError] = useState(null);

    const recognitionRef = useRef(null);
    const restartTimeoutRef = useRef(null);

    // Check browser support
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        setIsSupported(!!SpeechRecognition);

        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            if (restartTimeoutRef.current) {
                clearTimeout(restartTimeoutRef.current);
            }
        };
    }, []);

    // Parse command from transcript
    const parseCommand = useCallback((text) => {
        const lowerText = text.toLowerCase();

        for (const [commandName, command] of Object.entries(COMMANDS)) {
            if (fuzzyMatch(lowerText, command.keywords)) {
                return commandName;
            }
        }
        return null;
    }, []);

    // Execute command
    const executeCommand = useCallback((command) => {
        setLastCommand({ command, timestamp: Date.now() });

        switch (command) {
            case 'START_DETECTION':
                handlers.onStartDetection?.();
                break;
            case 'STOP_DETECTION':
                handlers.onStopDetection?.();
                break;
            case 'SCREENSHOT':
                handlers.onScreenshot?.();
                break;
            case 'SWITCH_CAMERA':
                handlers.onSwitchCamera?.();
                break;
            case 'TOGGLE_TRACKING':
                handlers.onToggleTracking?.();
                break;
            case 'TOGGLE_SOUND':
                handlers.onToggleSound?.();
                break;
            case 'EXPORT_REPORT':
                handlers.onExportReport?.();
                break;
            case 'FULLSCREEN':
                handlers.onFullscreen?.();
                break;
            case 'TOGGLE_TRAFFIC_SIGNS':
                handlers.onToggleTrafficSigns?.();
                break;
            case 'TOGGLE_COUNTING':
                handlers.onToggleCounting?.();
                break;
            case 'TOGGLE_LICENSE_PLATE':
                handlers.onToggleLicensePlate?.();
                break;
            case 'HELP':
                handlers.onHelp?.();
                break;
            default:
                break;
        }
    }, [handlers]);

    // Start listening
    const startListening = useCallback(() => {
        if (!recognitionRef.current || isListening) return;

        setError(null);

        recognitionRef.current.onstart = () => {
            setIsListening(true);
        };

        recognitionRef.current.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalTranscript += result[0].transcript;
                } else {
                    interimTranscript += result[0].transcript;
                }
            }

            setTranscript(interimTranscript || finalTranscript);

            if (finalTranscript) {
                const command = parseCommand(finalTranscript);
                if (command) {
                    executeCommand(command);
                    // Clear transcript after successful command
                    setTranscript('');
                }
            }
        };

        recognitionRef.current.onerror = (event) => {
            if (event.error === 'no-speech' || event.error === 'aborted') {
                // Ignore these errors, just restart
                return;
            }
            setError(event.error);
            setIsListening(false);
        };

        recognitionRef.current.onend = () => {
            // Auto-restart listening after it ends (for continuous mode)
            // Only restart if we're supposed to be listening
            if (isListening) {
                restartTimeoutRef.current = setTimeout(() => {
                    try {
                        recognitionRef.current?.start();
                    } catch (e) {
                        // Ignore if already started
                    }
                }, 100);
            } else {
                setIsListening(false);
            }
        };

        try {
            recognitionRef.current.start();
        } catch (err) {
            setError('Failed to start voice recognition');
        }
    }, [isListening, parseCommand, executeCommand]);

    // Stop listening
    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        setIsListening(false);
        setTranscript('');
    }, []);

    // Toggle listening
    const toggleListening = useCallback(() => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    }, [isListening, startListening, stopListening]);

    // Get available commands
    const getAvailableCommands = useCallback(() => {
        return Object.entries(COMMANDS).map(([key, value]) => ({
            name: key,
            keywords: value.keywords,
            description: value.description
        }));
    }, []);

    return {
        isListening,
        isSupported,
        transcript,
        lastCommand,
        error,
        startListening,
        stopListening,
        toggleListening,
        getAvailableCommands
    };
};

export default useVoiceCommands;

// Voice Commands Display Component
export const VoiceCommandsHelp = () => {
    const commands = Object.entries(COMMANDS);

    return (
        <div className="voice-commands-help">
            <h5>🎤 Available Voice Commands</h5>
            <table className="table table-sm">
                <thead>
                    <tr>
                        <th>Say...</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {commands.map(([key, cmd]) => (
                        <tr key={key}>
                            <td><code>"{cmd.keywords[0]}"</code></td>
                            <td>{cmd.description}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
