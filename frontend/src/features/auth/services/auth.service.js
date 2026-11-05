import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Configure an axios instance for the API
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true
});

/**
 * Login user with email and password
 * @param {string} email - The user's email
 * @param {string} password - The user's password
 * @returns {Promise<Object>} The response data from the backend
 */
export const login = async (email, password) => {
    try {
        const response = await apiClient.post('/api/auth/login', {
            email,
            password,
        });

        // Return the data provided by the backend (e.g., token, user details)
        return response.data;
    } catch (error) {
        // Throw a clean error for the caller to handle
        throw error.response?.data || error;
    }
};



/**
 * Get current user details
 * @returns {Promise<Object>} The response data from the backend
 */
export const getMe = async () => {
    try {
        const response = await apiClient.get('/api/auth/get-me', {
            // Include credentials (cookies) in the request if the backend fetches the token from them
            withCredentials: true,
        });

        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const forgotPassword = async (email) => {
    try {
        const response = await apiClient.post('/api/auth/forgot-password', {
            email,
        });

        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const resetPassword = async (token, newPassword) => {
    try {
        const response = await apiClient.post(`/api/auth/reset-password/${token}`, {
            newPassword,
        });

        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};
