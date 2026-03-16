"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  Send,
  Paperclip,
  CheckCheck,
  Clock,
  Smile,
  Check,
  Loader2,
  MessageSquare,
  Instagram,
  MessageCircle,
  Phone,
  Mail,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Image from "next/image";

// Channel configuration
const channels = [
  { id: "instagram", icon: Instagram, label: "Instagram", bgColor: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400", unread: 3 },
  { id: "telegram", icon: Send, label: "Telegram", bgColor: "bg-[#0088cc]", unread: 0 },
  { id: "whatsapp", icon: MessageCircle, label: "WhatsApp", bgColor: "bg-[#25D366]", unread: 5 },
  { id: "messenger", icon: MessageSquare, label: "Messenger", bgColor: "bg-[#0084FF]", unread: 2 },
  { id: "sms", icon: Phone, label: "SMS", bgColor: "bg-purple-500", unread: 0 },
  { id: "email", icon: Mail, label: "Email", bgColor: "bg-gray-500", unread: 1 },
];

const channelConfig: Record<string, { icon: any; label: string; bgColor: string }> = {
  instagram: { icon: Instagram, label: "Instagram", bgColor: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400" },
  telegram: { icon: Send, label: "Telegram", bgColor: "bg-[#0088cc]" },
  whatsapp: { icon: MessageCircle, label: "WhatsApp", bgColor: "bg-[#25D366]" },
  messenger: { icon: MessageSquare, label: "Messenger", bgColor: "bg-[#0084FF]" },
  sms: { icon: Phone, label: "SMS", bgColor: "bg-purple-500" },
  email: { icon: Mail, label: "Email", bgColor: "bg-gray-500" },
};

interface Conversation {
  id: string;
  channel: string;
  customer: {
    id: string;
    name: string;
    username?: string;
    avatar?: string;
  } | null;
  lastMessageAt: string;
  lastMessagePreview: string;
  unreadCount: number;
}

interface Message {
  id: string;
  direction: "inbound" | "outbound";
  status: string;
  senderName: string;
  content: string;
  createdAt: string;
}

// Mock data for demo
const mockConversations: Conversation[] = [
  {
    id: "1",
    channel: "instagram",
    customer: { id: "c1", name: "John Smith", username: "@johnsmith" },
    lastMessageAt: new Date().toISOString(),
    lastMessagePreview: "Hi, I wanted to check availability",
    unreadCount: 2,
  },
  {
    id: "2",
    channel: "instagram",
    customer: { id: "c2", name: "Emma Wilson", username: "@emmaw" },
    lastMessageAt: new Date(Date.now() - 1800000).toISOString(),
    lastMessagePreview: "Thanks for the quick response!",
    unreadCount: 1,
  },
  {
    id: "3",
    channel: "whatsapp",
    customer: { id: "c3", name: "Sarah Johnson", username: "+1 234 567 8900" },
    lastMessageAt: new Date(Date.now() - 3600000).toISOString(),
    lastMessagePreview: "Can I book for tomorrow?",
    unreadCount: 3,
  },
  {
    id: "4",
    channel: "whatsapp",
    customer: { id: "c4", name: "Mike Davis", username: "+1 987 654 3210" },
    lastMessageAt: new Date(Date.now() - 7200000).toISOString(),
    lastMessagePreview: "What time does it start?",
    unreadCount: 2,
  },
  {
    id: "5",
    channel: "messenger",
    customer: { id: "c5", name: "Lisa Brown", username: "@lisab" },
    lastMessageAt: new Date(Date.now() - 10800000).toISOString(),
    lastMessagePreview: "Is there parking available?",
    unreadCount: 2,
  },
  {
    id: "6",
    channel: "email",
    customer: { id: "c6", name: "David Lee", username: "david@example.com" },
    lastMessageAt: new Date(Date.now() - 86400000).toISOString(),
    lastMessagePreview: "Re: Booking Confirmation",
    unreadCount: 1,
  },
];

const mockMessages: Message[] = [
  {
    id: "m1",
    direction: "inbound",
    status: "read",
    senderName: "John Smith",
    content: "Hi! I saw your post. Is the service available?",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "m2",
    direction: "outbound",
    status: "delivered",
    senderName: "You",
    content: "Hello! Yes, we're available. Would you like to book?",
    createdAt: new Date(Date.now() - 5400000).toISOString(),
  },
  {
    id: "m3",
    direction: "inbound",
    status: "read",
    senderName: "John Smith",
    content: "Hi, I wanted to check availability",
    createdAt: new Date().toISOString(),
  },
];

export default function YettiInboxPage() {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChannel, setActiveChannel] = useState<string>("instagram");
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => {
      setConversations(mockConversations);
      setLoading(false);
    }, 500);
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      setMessages(mockMessages);
      setConversations(prev =>
        prev.map(c =>
          c.id === selectedConversation.id ? { ...c, unreadCount: 0 } : c
        )
      );
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch =
      conv.customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessagePreview.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesChannel = conv.channel === activeChannel;
    return matchesSearch && matchesChannel;
  });

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, "h:mm a");
    } else if (isYesterday(date)) {
      return "Yesterday";
    }
    return format(date, "MMM d");
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setSending(true);

    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      direction: "outbound",
      status: "pending",
      senderName: "You",
      content: newMessage,
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage("");

    setTimeout(() => {
      setMessages(prev =>
        prev.map(m =>
          m.id === optimisticMessage.id ? { ...m, status: "delivered" } : m
        )
      );
      setSending(false);
      toast.success("Message sent");
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-[#f8fafc]">
        <Loader2 className="h-8 w-8 animate-spin text-[#3b82f6]" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-[#f8fafc] overflow-hidden">
      {/* Channel Sidebar */}
      <div className="w-20 bg-white border-r border-gray-100 flex flex-col items-center py-4">
        <h2 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-4">Channels</h2>

        <div className="flex-1 flex flex-col items-center space-y-2 w-full px-2">
          {channels.map((channel) => {
            const Icon = channel.icon;
            const isActive = activeChannel === channel.id;

            return (
              <TooltipProvider key={channel.id}>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setActiveChannel(channel.id)}
                      className={cn(
                        "relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200",
                        isActive
                          ? "bg-[#eff6ff] ring-2 ring-[#3b82f6]"
                          : "hover:bg-gray-50"
                      )}
                    >
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", channel.bgColor)}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      {channel.unread > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {channel.unread}
                        </span>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-gray-900 text-white border-0">
                    {channel.label}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>

      </div>

      {/* Chat List Panel */}
      <div className="w-[300px] bg-white border-r border-gray-100 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            {(() => {
              const channel = channels.find(c => c.id === activeChannel);
              const Icon = channel?.icon || MessageSquare;
              return (
                <>
                  <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", channel?.bgColor)}>
                    <Icon className="h-3.5 w-3.5 text-white" />
                  </div>
                  <h1 className="text-lg font-semibold text-gray-900">{channel?.label || "Chat"}</h1>
                </>
              );
            })()}
          </div>
          <p className="text-xs text-gray-400">
            {filteredConversations.length} conversation{filteredConversations.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search chat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 bg-gray-50 border-0 rounded-xl text-sm placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-[#3b82f6]"
            />
          </div>
        </div>

        {/* Conversation List */}
        <ScrollArea className="flex-1">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                <MessageSquare className="h-7 w-7 text-gray-300" />
              </div>
              <p className="text-gray-400 text-sm">No chat found</p>
            </div>
          ) : (
            <div className="px-2">
              {filteredConversations.map((conversation) => {
                const isSelected = selectedConversation?.id === conversation.id;

                return (
                  <div
                    key={conversation.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 mb-1",
                      isSelected
                        ? "bg-[#eff6ff]"
                        : "hover:bg-gray-50"
                    )}
                    onClick={() => setSelectedConversation(conversation)}
                  >
                    <Avatar className="h-11 w-11 border border-gray-100">
                      <AvatarFallback className="bg-gradient-to-br from-[#3b82f6] to-[#60a5fa] text-white text-sm font-medium">
                        {conversation.customer?.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("") || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "font-medium text-sm truncate",
                          conversation.unreadCount > 0 ? "text-gray-900" : "text-gray-700"
                        )}>
                          {conversation.customer?.name || "Unknown"}
                        </span>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                          {formatMessageTime(conversation.lastMessageAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className={cn(
                          "text-sm truncate",
                          conversation.unreadCount > 0
                            ? "text-gray-600 font-medium"
                            : "text-gray-400"
                        )}>
                          {conversation.lastMessagePreview}
                        </p>
                        {conversation.unreadCount > 0 && (
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#3b82f6] text-white text-xs flex items-center justify-center font-medium">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col bg-white">
          {/* Chat Header */}
          <div className="h-16 px-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-gray-100">
                <AvatarFallback className="bg-gradient-to-br from-[#3b82f6] to-[#60a5fa] text-white text-sm font-medium">
                  {selectedConversation.customer?.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("") || "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {selectedConversation.customer?.name || "Unknown"}
                </h3>
                <p className="text-xs text-gray-400">
                  {selectedConversation.customer?.username || "via " + channelConfig[selectedConversation.channel]?.label}
                </p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-4 max-w-2xl mx-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.direction === "outbound" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[70%] rounded-2xl px-4 py-3",
                      message.direction === "outbound"
                        ? "bg-[#3b82f6] text-white"
                        : "bg-gray-100 text-gray-900"
                    )}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    <div
                      className={cn(
                        "flex items-center gap-1.5 mt-1.5 text-xs",
                        message.direction === "outbound"
                          ? "text-white/70"
                          : "text-gray-400"
                      )}
                    >
                      <span>{format(new Date(message.createdAt), "h:mm a")}</span>
                      {message.direction === "outbound" && (
                        <>
                          {message.status === "pending" && <Clock className="h-3 w-3" />}
                          {message.status === "sent" && <Check className="h-3 w-3" />}
                          {message.status === "delivered" && <CheckCheck className="h-3 w-3" />}
                          {message.status === "read" && <CheckCheck className="h-3 w-3 text-blue-200" />}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Compose Area */}
          <div className="px-6 py-4 border-t border-gray-100">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <Textarea
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="min-h-[48px] max-h-32 resize-none rounded-2xl border-gray-200 bg-gray-50 pr-24 text-sm placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-[#3b82f6]"
                    rows={1}
                  />
                  <div className="absolute right-3 bottom-3 flex items-center gap-1">
                    <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                      <Smile className="h-5 w-5 text-gray-400" />
                    </button>
                    <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                      <Paperclip className="h-5 w-5 text-gray-400" />
                    </button>
                  </div>
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="h-12 px-6 rounded-2xl bg-[#3b82f6] hover:bg-[#2563eb] text-white font-medium shadow-sm"
                >
                  {sending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>

        </div>
      ) : (
        /* Empty State - Select a Chat */
        <div className="flex-1 flex flex-col items-center justify-center bg-white relative">
          <div className="text-center">
            {/* Chat Icon with Glow */}
            <div className="relative mx-auto mb-6">
              <div className="absolute inset-0 bg-[#3b82f6]/10 rounded-full blur-2xl scale-150" />
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#eff6ff] to-white border border-[#dbeafe] flex items-center justify-center">
                <MessageSquare className="h-10 w-10 text-[#3b82f6]" />
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              Select a Chat
            </h2>
            <p className="text-gray-500 max-w-sm mb-8">
              Choose a chat from the sidebar to view their conversation and manage your potential customers.
            </p>

            {/* Channel Quick Links */}
            <div className="flex items-center justify-center gap-2 flex-wrap max-w-md">
              {channels.slice(0, 4).map((channel) => {
                const Icon = channel.icon;
                return (
                  <button
                    key={channel.id}
                    onClick={() => setActiveChannel(channel.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-[#3b82f6] hover:bg-[#eff6ff] transition-all duration-200 group"
                  >
                    <div className={cn("w-5 h-5 rounded-lg flex items-center justify-center", channel.bgColor)}>
                      <Icon className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-600 group-hover:text-[#3b82f6]">
                      {channel.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
