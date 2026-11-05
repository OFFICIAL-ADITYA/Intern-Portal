import React, { useState, useRef, useEffect } from 'react';
import useChat from '../hooks/useChat';
import './ChatWidget.css';

/**
 * Parses inline markdown: **bold**, `code`, [link](url)
 */
function renderInline(text) {
  if (!text) return '';
  const parts = [];
  let remaining = String(text);
  let keyIndex = 0;

  const inlineRegex = /(\*\*(.*?)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/;

  while (remaining) {
    const match = remaining.match(inlineRegex);
    if (!match) {
      parts.push(remaining);
      break;
    }

    const matchIndex = match.index;
    if (matchIndex > 0) {
      parts.push(remaining.substring(0, matchIndex));
    }

    const fullMatch = match[0];
    if (fullMatch.startsWith('**')) {
      parts.push(<strong key={keyIndex++}>{match[2]}</strong>);
    } else if (fullMatch.startsWith('`')) {
      parts.push(<code key={keyIndex++} className="chat-inline-code">{match[3]}</code>);
    } else if (fullMatch.startsWith('[')) {
      parts.push(
        <a key={keyIndex++} href={match[5]} target="_blank" rel="noopener noreferrer" className="chat-link">
          {match[4]}
        </a>
      );
    }

    remaining = remaining.substring(matchIndex + fullMatch.length);
  }

  return parts;
}

/**
 * Formats multi-line Markdown text including tables, headers, lists, dividers and code blocks.
 */
function FormattedMessage({ text }) {
  if (!text) return null;

  const lines = String(text).split('\n');
  const blocks = [];
  let i = 0;
  let blockKey = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // Horizontal Rule: --- or ***
    if (/^(\-{3,}|\*{3,})$/.test(trimmed)) {
      blocks.push(<hr key={blockKey++} className="chat-divider" />);
      i++;
      continue;
    }

    // Code Block: ```
    if (trimmed.startsWith('```')) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].trim().startsWith('```')) {
        i++; // skip closing ```
      }
      blocks.push(
        <pre key={blockKey++} className="chat-code-block">
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // Headings: #, ##, ###
    if (/^#{1,4}\s+/.test(trimmed)) {
      const content = trimmed.replace(/^#{1,4}\s+/, '');
      blocks.push(
        <h4 key={blockKey++} className="chat-heading">
          {renderInline(content)}
        </h4>
      );
      i++;
      continue;
    }

    // Markdown Table: lines starting and ending with |
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerCells = tableLines[0]
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());

        const hasSeparator = /^\|[\s\-:|]+\|$/.test(tableLines[1]);
        const startIndex = hasSeparator ? 2 : 1;

        const bodyRows = tableLines.slice(startIndex).map((rowLine) =>
          rowLine
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim())
        );

        blocks.push(
          <div key={blockKey++} className="chat-table-wrapper">
            <table className="chat-table">
              <thead>
                <tr>
                  {headerCells.map((h, idx) => (
                    <th key={idx}>{renderInline(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx}>{renderInline(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // Ordered List: 1. , 2. 
    if (/^\d+\.\s+/.test(trimmed)) {
      const listItems = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push(
        <ol key={blockKey++} className="chat-ol">
          {listItems.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Unordered List: - or *
    if (/^[-*]\s+/.test(trimmed)) {
      const listItems = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={blockKey++} className="chat-ul">
          {listItems.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Regular paragraph
    blocks.push(
      <p key={blockKey++} className="chat-paragraph">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <div className="chat-formatted-body">{blocks}</div>;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const { messages, isLoading, error, sendMessage, retryLastMessage, clearChat } = useChat();

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll messages to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Keyboard navigation: Escape key closes the widget
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSend = (e) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    sendMessage(inputValue);
    setInputValue('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-widget-wrapper" aria-label="Support Chatbot">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          className="chat-floating-button"
          onClick={() => setIsOpen(true)}
          aria-label="Open support chat"
          title="Ask UPTOSKILL Support Bot"
        >
          <svg className="chat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="chat-button-label">Need Help?</span>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="chat-panel" role="dialog" aria-modal="true" aria-labelledby="chat-title">
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-info">
              <div className="chat-status-indicator" aria-hidden="true"></div>
              <div>
                <h3 id="chat-title" className="chat-title">UPTOSKILL Assistant</h3>
                <span className="chat-subtitle">Instant Guidance & FAQs</span>
              </div>
            </div>
            <div className="chat-header-actions">
              <button
                className="chat-icon-btn"
                onClick={clearChat}
                title="Clear conversation"
                aria-label="Clear chat"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button
                className="chat-icon-btn"
                onClick={() => setIsOpen(false)}
                title="Close chat"
                aria-label="Close chat"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Disclaimer Banner */}
          <div className="chat-disclaimer">
            <span>Note: Chatbot responses are AI-assisted and may contain inaccuracies. Official requests are managed by your TL or support@uptoskill.com.</span>
          </div>

          {/* Messages Container */}
          <div className="chat-messages-container" tabIndex={0} aria-label="Conversation History">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-bubble-row ${msg.sender === 'user' ? 'user-row' : 'bot-row'}`}
              >
                <div className={`chat-bubble ${msg.sender === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
                  <div className="chat-message-text">
                    <FormattedMessage text={msg.text} />
                  </div>
                  <div className="chat-message-time">{msg.timestamp}</div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="chat-bubble-row bot-row">
                <div className="chat-bubble bot-bubble typing-bubble">
                  <div className="typing-dots">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message with Retry */}
            {error && (
              <div className="chat-error-banner">
                <span>{error}</span>
                <button className="chat-retry-btn" onClick={retryLastMessage}>
                  Retry
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form className="chat-input-form" onSubmit={handleSend}>
            <input
              ref={inputRef}
              type="text"
              className="chat-input-field"
              placeholder="Ask a question about certificates or deadlines..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              maxLength={1000}
              disabled={isLoading}
              aria-label="Your question"
            />
            <button
              type="submit"
              className="chat-send-btn"
              disabled={!inputValue.trim() || isLoading}
              aria-label="Send message"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
