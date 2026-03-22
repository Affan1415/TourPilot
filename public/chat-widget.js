/**
 * TourPilot Live Chat Widget
 * Embeddable chat widget for customer support
 *
 * Usage:
 * <script src="https://yourdomain.com/chat-widget.js" data-widget-key="YOUR_WIDGET_KEY"></script>
 */

(function() {
  'use strict';

  // Get configuration from script tag
  const scriptTag = document.currentScript;
  const widgetKey = scriptTag?.getAttribute('data-widget-key');
  const position = scriptTag?.getAttribute('data-position') || 'bottom-right';
  const primaryColor = scriptTag?.getAttribute('data-color') || '#6366f1';
  const baseUrl = scriptTag?.src.replace('/chat-widget.js', '') || '';

  if (!widgetKey) {
    console.error('TourPilot Chat Widget: Missing data-widget-key attribute');
    return;
  }

  // State
  let config = null;
  let conversationId = null;
  let visitorId = null;
  let messages = [];
  let pollInterval = null;
  let isOpen = false;
  let isMinimized = false;
  let showPreChat = true;

  // Elements
  let container = null;
  let chatButton = null;
  let chatWindow = null;
  let messagesContainer = null;
  let inputField = null;

  // Styles
  const styles = `
    .tp-chat-widget * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .tp-chat-button {
      position: fixed;
      ${position === 'bottom-right' ? 'right: 20px;' : 'left: 20px;'}
      bottom: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: ${primaryColor};
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
      z-index: 9999;
    }
    .tp-chat-button:hover {
      transform: scale(1.1);
    }
    .tp-chat-button svg {
      width: 28px;
      height: 28px;
      fill: white;
    }
    .tp-chat-window {
      position: fixed;
      ${position === 'bottom-right' ? 'right: 20px;' : 'left: 20px;'}
      bottom: 20px;
      width: 360px;
      height: 500px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 9999;
    }
    .tp-chat-window.minimized {
      height: auto;
    }
    .tp-chat-header {
      background: ${primaryColor};
      color: white;
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .tp-chat-header-info h3 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 600;
    }
    .tp-chat-header-info p {
      margin: 0;
      font-size: 12px;
      opacity: 0.9;
    }
    .tp-chat-header-actions {
      display: flex;
      gap: 8px;
    }
    .tp-chat-header-actions button {
      background: transparent;
      border: none;
      color: white;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
    }
    .tp-chat-header-actions button:hover {
      background: rgba(255,255,255,0.2);
    }
    .tp-chat-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }
    .tp-prechat-form {
      padding: 24px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      height: 100%;
    }
    .tp-prechat-form p {
      margin: 0 0 16px 0;
      color: #4b5563;
    }
    .tp-prechat-form input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      margin-bottom: 12px;
      font-size: 14px;
    }
    .tp-prechat-form input:focus {
      outline: none;
      border-color: ${primaryColor};
      box-shadow: 0 0 0 2px ${primaryColor}20;
    }
    .tp-prechat-form button {
      width: 100%;
      padding: 12px;
      background: ${primaryColor};
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
    }
    .tp-prechat-form button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .tp-message {
      margin-bottom: 12px;
      display: flex;
    }
    .tp-message.outbound {
      justify-content: flex-end;
    }
    .tp-message-bubble {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.4;
    }
    .tp-message.inbound .tp-message-bubble {
      background: #f3f4f6;
      color: #1f2937;
    }
    .tp-message.outbound .tp-message-bubble {
      background: ${primaryColor};
      color: white;
    }
    .tp-message-sender {
      font-size: 11px;
      color: #6b7280;
      margin-bottom: 4px;
    }
    .tp-chat-input {
      padding: 12px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 8px;
    }
    .tp-chat-input input {
      flex: 1;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
    }
    .tp-chat-input input:focus {
      outline: none;
      border-color: ${primaryColor};
    }
    .tp-chat-input button {
      padding: 10px;
      background: ${primaryColor};
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
    }
    .tp-chat-input button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    @media (max-width: 400px) {
      .tp-chat-window {
        width: calc(100vw - 40px);
        height: calc(100vh - 100px);
      }
    }
  `;

  // Icons
  const chatIcon = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>';
  const closeIcon = '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
  const minimizeIcon = '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M19 13H5v-2h14v2z"/></svg>';
  const sendIcon = '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';

  // Load configuration
  async function loadConfig() {
    try {
      const res = await fetch(`${baseUrl}/api/chat/widget?widget_key=${widgetKey}`);
      config = await res.json();
      return config;
    } catch (error) {
      console.error('Failed to load chat config:', error);
    }
  }

  // Create widget
  function createWidget() {
    // Add styles
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

    // Create container
    container = document.createElement('div');
    container.className = 'tp-chat-widget';
    document.body.appendChild(container);

    // Create chat button
    createChatButton();

    // Check localStorage for existing conversation
    const stored = localStorage.getItem(`tp_chat_${widgetKey}`);
    if (stored) {
      const data = JSON.parse(stored);
      conversationId = data.conversationId;
      visitorId = data.visitorId;
      showPreChat = false;
    }
  }

  function createChatButton() {
    chatButton = document.createElement('button');
    chatButton.className = 'tp-chat-button';
    chatButton.innerHTML = chatIcon;
    chatButton.onclick = openChat;
    container.appendChild(chatButton);
  }

  function openChat() {
    isOpen = true;
    chatButton.style.display = 'none';
    createChatWindow();
  }

  function closeChat() {
    isOpen = false;
    if (chatWindow) {
      chatWindow.remove();
      chatWindow = null;
    }
    chatButton.style.display = 'flex';
    stopPolling();
  }

  function toggleMinimize() {
    isMinimized = !isMinimized;
    if (chatWindow) {
      chatWindow.classList.toggle('minimized', isMinimized);
      const body = chatWindow.querySelector('.tp-chat-body');
      const input = chatWindow.querySelector('.tp-chat-input');
      if (body) body.style.display = isMinimized ? 'none' : 'block';
      if (input) input.style.display = isMinimized ? 'none' : 'flex';
    }
  }

  function createChatWindow() {
    chatWindow = document.createElement('div');
    chatWindow.className = 'tp-chat-window';
    chatWindow.innerHTML = `
      <div class="tp-chat-header">
        <div class="tp-chat-header-info">
          <h3>${config?.company_name || 'Support'}</h3>
          <p>We typically reply in minutes</p>
        </div>
        <div class="tp-chat-header-actions">
          <button onclick="window.TourPilotChat.toggleMinimize()">${minimizeIcon}</button>
          <button onclick="window.TourPilotChat.closeChat()">${closeIcon}</button>
        </div>
      </div>
      ${showPreChat ? createPreChatForm() : createChatBody()}
    `;
    container.appendChild(chatWindow);

    if (!showPreChat) {
      loadMessages();
      startPolling();
    }
  }

  function createPreChatForm() {
    return `
      <div class="tp-prechat-form">
        <p>${config?.greeting || "Hi! How can we help you today?"}</p>
        <input type="text" id="tp-name" placeholder="Your name">
        <input type="email" id="tp-email" placeholder="Your email (optional)">
        <button onclick="window.TourPilotChat.startChat()">Start Chat</button>
      </div>
    `;
  }

  function createChatBody() {
    return `
      <div class="tp-chat-body" id="tp-messages"></div>
      <div class="tp-chat-input">
        <input type="text" id="tp-input" placeholder="Type a message..." onkeypress="if(event.key==='Enter')window.TourPilotChat.sendMessage()">
        <button onclick="window.TourPilotChat.sendMessage()">${sendIcon}</button>
      </div>
    `;
  }

  async function startChat() {
    const name = document.getElementById('tp-name')?.value;
    const email = document.getElementById('tp-email')?.value;

    try {
      const res = await fetch(`${baseUrl}/api/chat/widget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          widget_key: widgetKey,
          name: name || undefined,
          email: email || undefined,
          page_url: window.location.href,
        }),
      });

      const data = await res.json();
      if (data.success) {
        conversationId = data.conversation_id;
        visitorId = data.visitor_id;
        showPreChat = false;
        localStorage.setItem(`tp_chat_${widgetKey}`, JSON.stringify({ conversationId, visitorId }));

        if (data.welcome_message) {
          messages = [data.welcome_message];
        }

        // Recreate chat window with messages
        chatWindow.remove();
        createChatWindow();
      }
    } catch (error) {
      console.error('Start chat error:', error);
    }
  }

  async function sendMessage() {
    inputField = document.getElementById('tp-input');
    const content = inputField?.value?.trim();
    if (!content || !conversationId || !visitorId) return;

    inputField.value = '';

    // Optimistic update
    const tempId = `temp_${Date.now()}`;
    messages.push({
      id: tempId,
      content,
      sender_type: 'customer',
      sender_name: 'You',
      sent_at: new Date().toISOString(),
    });
    renderMessages();

    try {
      const res = await fetch(`${baseUrl}/api/chat/widget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'message',
          conversation_id: conversationId,
          visitor_id: visitorId,
          content,
        }),
      });

      const data = await res.json();
      if (data.success && data.message) {
        const idx = messages.findIndex(m => m.id === tempId);
        if (idx !== -1) messages[idx] = data.message;
        renderMessages();
      }
    } catch (error) {
      console.error('Send message error:', error);
    }
  }

  async function loadMessages() {
    if (!conversationId || !visitorId) return;

    try {
      const res = await fetch(
        `${baseUrl}/api/chat/widget?conversation_id=${conversationId}&visitor_id=${visitorId}`
      );
      const data = await res.json();
      if (data.messages) {
        messages = data.messages;
        renderMessages();
      }
    } catch (error) {
      console.error('Load messages error:', error);
    }
  }

  function renderMessages() {
    messagesContainer = document.getElementById('tp-messages');
    if (!messagesContainer) return;

    messagesContainer.innerHTML = messages.map(msg => `
      <div class="tp-message ${msg.sender_type === 'customer' ? 'outbound' : 'inbound'}">
        <div class="tp-message-bubble">
          ${msg.sender_type !== 'customer' ? `<div class="tp-message-sender">${msg.sender_name}</div>` : ''}
          ${msg.content}
        </div>
      </div>
    `).join('');

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function startPolling() {
    pollInterval = setInterval(loadMessages, 3000);
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  // Initialize
  async function init() {
    await loadConfig();
    if (config && !config.error) {
      createWidget();
    }
  }

  // Expose API
  window.TourPilotChat = {
    open: openChat,
    close: closeChat,
    closeChat: closeChat,
    toggleMinimize: toggleMinimize,
    startChat: startChat,
    sendMessage: sendMessage,
  };

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
