import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/**
 * Sends a message to the backend chatbot proxy (/api/intern/chat)
 * The backend proxies to the AI support service securely.
 * 
 * @param {string} message - User query text
 * @returns {Promise<{ answer: string }>}
 */
export const sendChatMessage = async (message) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/intern/chat`,
      { message },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        withCredentials: true,
        timeout: 70000
      }
    );
    return response.data;
  } catch (err) {
    if (err.response?.data?.message) {
      throw new Error(err.response.data.message);
    }
    throw new Error('Unable to connect to the assistant. Please try again.');
  }
};

