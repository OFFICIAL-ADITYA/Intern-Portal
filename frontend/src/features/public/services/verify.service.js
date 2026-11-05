import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const publicApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
  // Strictly no auth headers or withCredentials for public verification
});

/**
 * Public certificate verification API.
 * Calls GET /api/verify/:verifyId with no credentials or auth tokens attached.
 *
 * @param {string} verifyId - The unguessable verify ID from the QR code / verification URL
 * @returns {Promise<{
 *   certificateNumber: string,
 *   recipientName: string,
 *   certificateTitle: string,
 *   domain: string,
 *   issuedAt: string,
 *   status: 'valid' | 'revoked',
 *   revokedAt?: string
 * }>}
 */
export const verifyCertificate = async (verifyId) => {
  const response = await publicApi.get(`/api/verify/${encodeURIComponent(verifyId)}`);
  return response.data;
};
