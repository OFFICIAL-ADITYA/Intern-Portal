import { useState, useCallback, useEffect } from 'react';
import { sendChatMessage } from '../services/chat.service';

const INITIAL_GREETING = {
  id: 'msg-welcome',
  sender: 'bot',
  text: "Hello! I am the UPTOSKILL Support Assistant. You can ask me questions about certificate requests, internship status, guidelines, or portal navigation.",
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};

export function useChat() {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem('uptoskill_chat_history');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return [INITIAL_GREETING];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUserMessage, setLastUserMessage] = useState(null);

  // Sync to sessionStorage for the session
  useEffect(() => {
    try {
      sessionStorage.setItem('uptoskill_chat_history', JSON.stringify(messages));
    } catch {
      // Ignore sessionStorage quota errors
    }
  }, [messages]);

  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || '').trim();
    if (!trimmed) return;

    setError(null);
    setLastUserMessage(trimmed);

    const userMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const data = await sendChatMessage(trimmed);
      const botMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        sender: 'bot',
        text: data?.answer || "I received your message, but have no specific response.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      setError(err.message || 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const retryLastMessage = useCallback(() => {
    if (lastUserMessage) {
      sendMessage(lastUserMessage);
    }
  }, [lastUserMessage, sendMessage]);

  const clearChat = useCallback(() => {
    setMessages([INITIAL_GREETING]);
    setError(null);
    setLastUserMessage(null);
    sessionStorage.removeItem('uptoskill_chat_history');
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    retryLastMessage,
    clearChat
  };
}

export default useChat;

