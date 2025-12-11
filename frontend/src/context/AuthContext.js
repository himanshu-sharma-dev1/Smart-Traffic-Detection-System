import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Create Auth Context
const AuthContext = createContext(null);

// Custom hook to use auth context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Auth Provider Component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    // Configure axios defaults
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
    }, [token]);

    // Check if user is logged in on mount
    useEffect(() => {
        const verifyToken = async () => {
            if (token) {
                try {
                    const response = await axios.get(`${API_URL}/api/auth/me`);
                    setUser(response.data);
                } catch (error) {
                    // Token is invalid
                    localStorage.removeItem('token');
                    setToken(null);
                    setUser(null);
                }
            }
            setLoading(false);
        };
        verifyToken();
    }, [token]);

    // Register function
    const register = async (username, email, password) => {
        try {
            const response = await axios.post(`${API_URL}/api/auth/register`, {
                username,
                email,
                password
            });

            const { access_token, user: userData } = response.data;

            localStorage.setItem('token', access_token);
            setToken(access_token);
            setUser(userData);

            return { success: true };
        } catch (error) {
            const message = error.response?.data?.detail || 'Registration failed';
            return { success: false, error: message };
        }
    };

    // Login function
    const login = async (email, password) => {
        try {
            const response = await axios.post(`${API_URL}/api/auth/login`, {
                email,
                password
            });

            const { access_token, user: userData } = response.data;

            localStorage.setItem('token', access_token);
            setToken(access_token);
            setUser(userData);

            return { success: true };
        } catch (error) {
            const message = error.response?.data?.detail || 'Login failed';
            return { success: false, error: message };
        }
    };

    // Logout function
    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    // Update profile (username)
    const updateProfile = async (data) => {
        try {
            const response = await axios.put(`${API_URL}/api/auth/me`, data);
            setUser(response.data);
            return { success: true };
        } catch (error) {
            const message = error.response?.data?.detail || 'Update failed';
            return { success: false, error: message };
        }
    };

    // Change password
    const changePassword = async (currentPassword, newPassword) => {
        try {
            await axios.put(`${API_URL}/api/auth/me/password`, {
                current_password: currentPassword,
                new_password: newPassword
            });
            return { success: true };
        } catch (error) {
            const message = error.response?.data?.detail || 'Password change failed';
            return { success: false, error: message };
        }
    };

    // Fetch user stats
    const fetchUserStats = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/detections/stats`);
            return { success: true, data: response.data };
        } catch (error) {
            const message = error.response?.data?.detail || 'Failed to fetch stats';
            return { success: false, error: message };
        }
    };

    // Refresh user data
    const refreshUser = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/auth/me`);
            setUser(response.data);
            return { success: true };
        } catch (error) {
            return { success: false };
        }
    };

    const value = {
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        register,
        updateProfile,
        changePassword,
        fetchUserStats,
        refreshUser
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
