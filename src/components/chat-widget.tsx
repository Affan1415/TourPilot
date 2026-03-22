"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Send, Minimize2, MessageCircle } from "lucide-react";

interface Message {
  id: string;
  content: string;
  sender_type: "customer" | "staff" | "system";
  sender_name: string;
  sent_at: string;
}

interface ChatWidgetProps {
  widgetKey: string;
  position?: "bottom-right" | "bottom-left";
  primaryColor?: string;
}

export function ChatWidget({ widgetKey, position = "bottom-right", primaryColor = "#6366f1" }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [showPreChat, setShowPreChat] = useState(true);
  const [preChatData, setPreChatData] = useState({ name: "", email: "" });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const positionClasses = position === "bottom-right"
    ? "right-4 bottom-4"
    : "left-4 bottom-4";

  // Load widget config
  useEffect(() => {
    fetch(`/api/chat/widget?widget_key=${widgetKey}`)
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(console.error);
  }, [widgetKey]);

  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`chat_${widgetKey}`);
    if (stored) {
      const { conversationId, visitorId } = JSON.parse(stored);
      setConversationId(conversationId);
      setVisitorId(visitorId);
      setShowPreChat(false);
    }
  }, [widgetKey]);

  // Poll for new messages
  useEffect(() => {
    if (conversationId && visitorId && isOpen) {
      const poll = async () => {
        try {
          const res = await fetch(
            `/api/chat/widget?conversation_id=${conversationId}&visitor_id=${visitorId}`
          );
          const data = await res.json();
          if (data.messages) {
            setMessages(data.messages);
          }
        } catch (error) {
          console.error("Polling error:", error);
        }
      };

      poll();
      pollIntervalRef.current = setInterval(poll, 3000);

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      };
    }
  }, [conversationId, visitorId, isOpen]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startChat = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat/widget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          widget_key: widgetKey,
          name: preChatData.name || undefined,
          email: preChatData.email || undefined,
          page_url: window.location.href,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setConversationId(data.conversation_id);
        setVisitorId(data.visitor_id);
        setShowPreChat(false);
        localStorage.setItem(
          `chat_${widgetKey}`,
          JSON.stringify({ conversationId: data.conversation_id, visitorId: data.visitor_id })
        );
        if (data.welcome_message) {
          setMessages([data.welcome_message]);
        }
      }
    } catch (error) {
      console.error("Start chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || !conversationId || !visitorId) return;

    const content = inputValue.trim();
    setInputValue("");

    // Optimistic update
    const tempMessage: Message = {
      id: `temp_${Date.now()}`,
      content,
      sender_type: "customer",
      sender_name: preChatData.name || "You",
      sent_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      const res = await fetch("/api/chat/widget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "message",
          conversation_id: conversationId,
          visitor_id: visitorId,
          content,
        }),
      });

      const data = await res.json();
      if (data.success && data.message) {
        // Replace temp message with real one
        setMessages(prev => prev.map(m => m.id === tempMessage.id ? data.message : m));
      }
    } catch (error) {
      console.error("Send message error:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!config) return null;

  return (
    <div className={`fixed ${positionClasses} z-50`}>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110"
          style={{ backgroundColor: primaryColor || config.primary_color }}
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-80 sm:w-96 bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col" style={{ height: isMinimized ? "auto" : "500px" }}>
          {/* Header */}
          <div
            className="p-4 text-white flex items-center justify-between"
            style={{ backgroundColor: primaryColor || config.primary_color }}
          >
            <div>
              <h3 className="font-semibold">{config.company_name || "Support"}</h3>
              <p className="text-sm opacity-90">We typically reply in minutes</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-white/20 rounded"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Pre-chat form */}
              {showPreChat ? (
                <form onSubmit={startChat} className="flex-1 p-4 flex flex-col justify-center">
                  <p className="text-gray-600 mb-4">{config.greeting}</p>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Your name"
                      value={preChatData.name}
                      onChange={(e) => setPreChatData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2"
                      style={{ "--tw-ring-color": primaryColor || config.primary_color } as any}
                    />
                    <input
                      type="email"
                      placeholder="Your email (optional)"
                      value={preChatData.email}
                      onChange={(e) => setPreChatData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2"
                    />
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2 rounded-lg text-white font-medium disabled:opacity-50"
                      style={{ backgroundColor: primaryColor || config.primary_color }}
                    >
                      {isLoading ? "Starting..." : "Start Chat"}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender_type === "customer" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] px-3 py-2 rounded-lg ${
                            message.sender_type === "customer"
                              ? "text-white"
                              : "bg-gray-100 text-gray-800"
                          }`}
                          style={
                            message.sender_type === "customer"
                              ? { backgroundColor: primaryColor || config.primary_color }
                              : undefined
                          }
                        >
                          {message.sender_type !== "customer" && (
                            <p className="text-xs text-gray-500 mb-1">{message.sender_name}</p>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div className="p-3 border-t">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type a message..."
                        className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!inputValue.trim()}
                        className="p-2 rounded-lg text-white disabled:opacity-50"
                        style={{ backgroundColor: primaryColor || config.primary_color }}
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default ChatWidget;
