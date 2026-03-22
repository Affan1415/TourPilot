"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  MoreVertical,
  UserPlus,
  Tag,
  Sparkles,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Channel configuration
const channels = [
  { id: "all", icon: MessageSquare, label: "All", bgColor: "bg-gray-500", unread: 0 },
  { id: "instagram", icon: Instagram, label: "Instagram", bgColor: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400", unread: 0 },
  { id: "whatsapp", icon: MessageCircle, label: "WhatsApp", bgColor: "bg-[#25D366]", unread: 0 },
  { id: "messenger", icon: MessageSquare, label: "Messenger", bgColor: "bg-[#0084FF]", unread: 0 },
  { id: "sms", icon: Phone, label: "SMS", bgColor: "bg-purple-500", unread: 0 },
  { id: "email", icon: Mail, label: "Email", bgColor: "bg-gray-500", unread: 0 },
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
  subject?: string;
  status: string;
  customer: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    avatar?: string;
  } | null;
  lastMessageAt: string;
  lastMessagePreview: string;
  unreadCount: number;
  assignedTo?: {
    id: string;
    name: string;
  } | null;
}

interface Message {
  id: string;
  direction: "inbound" | "outbound";
  status: string;
  senderName: string;
  content: string;
  contentType: string;
  attachments?: any[];
  createdAt: string;
}

interface QuickReply {
  id: string;
  shortcut: string;
  content: string;
}

export default function InboxPage() {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChannel, setActiveChannel] = useState<string>("all");
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (activeChannel !== "all") params.set("channel", activeChannel);

      const res = await fetch(`/api/inbox/conversations?${params}`);
      if (res.ok) {
        const { data } = await res.json();
        setConversations(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setLoading(false);
    }
  }, [activeChannel]);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    setMessagesLoading(true);
    try {
      const res = await fetch(`/api/inbox/conversations/${conversationId}/messages`);
      if (res.ok) {
        const { data } = await res.json();
        setMessages(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  // Fetch quick replies
  const fetchQuickReplies = useCallback(async () => {
    try {
      const res = await fetch("/api/inbox/quick-replies");
      if (res.ok) {
        const { data } = await res.json();
        setQuickReplies(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch quick replies:", error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchConversations();
    fetchQuickReplies();
  }, [fetchConversations, fetchQuickReplies]);

  // Refetch when channel changes
  useEffect(() => {
    setLoading(true);
    fetchConversations();
  }, [activeChannel, fetchConversations]);

  // Load messages when conversation selected
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);

      // Mark as read in local state
      setConversations(prev =>
        prev.map(c =>
          c.id === selectedConversation.id ? { ...c, unreadCount: 0 } : c
        )
      );
    }
  }, [selectedConversation, fetchMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Polling for new messages
  useEffect(() => {
    if (selectedConversation) {
      pollingRef.current = setInterval(() => {
        fetchMessages(selectedConversation.id);
      }, 10000); // Poll every 10 seconds
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [selectedConversation, fetchMessages]);

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch =
      conv.customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessagePreview?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
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
    const messageContent = newMessage;
    setNewMessage("");

    // Optimistic update
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      direction: "outbound",
      status: "pending",
      senderName: "You",
      content: messageContent,
      contentType: "text",
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const res = await fetch(`/api/inbox/conversations/${selectedConversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: messageContent }),
      });

      if (res.ok) {
        const { messageId } = await res.json();
        // Update optimistic message with real ID and status
        setMessages(prev =>
          prev.map(m =>
            m.id === optimisticMessage.id
              ? { ...m, id: messageId, status: "sent" }
              : m
          )
        );
        toast.success("Message sent");
      } else {
        const { error } = await res.json();
        toast.error(error || "Failed to send message");
        // Remove optimistic message on failure
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
        setNewMessage(messageContent);
      }
    } catch (error) {
      toast.error("Failed to send message");
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickReply = (reply: QuickReply) => {
    setNewMessage(reply.content);
    setShowQuickReplies(false);
  };

  const handleGetAISuggestion = async () => {
    if (!selectedConversation || messages.length === 0) return;

    toast.info("Getting AI suggestions...");

    try {
      const res = await fetch("/api/ai/smart-replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messages[messages.length - 1]?.content || "",
          conversation_history: messages.slice(-5).map(m => ({
            role: m.direction === "inbound" ? "user" : "assistant",
            content: m.content,
          })),
        }),
      });

      if (res.ok) {
        const { replies } = await res.json();
        if (replies && replies.length > 0) {
          setNewMessage(replies[0]);
          toast.success("AI suggestion applied");
        }
      } else {
        toast.error("Failed to get AI suggestion");
      }
    } catch (error) {
      toast.error("Failed to get AI suggestion");
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
            const unreadCount = channel.id === "all"
              ? conversations.reduce((sum, c) => sum + c.unreadCount, 0)
              : conversations.filter(c => c.channel === channel.id).reduce((sum, c) => sum + c.unreadCount, 0);

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
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {unreadCount > 9 ? "9+" : unreadCount}
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
                  <h1 className="text-lg font-semibold text-gray-900">{channel?.label || "Inbox"}</h1>
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
              <p className="text-gray-400 text-sm">No conversations yet</p>
            </div>
          ) : (
            <div className="px-2">
              {filteredConversations.map((conversation) => {
                const isSelected = selectedConversation?.id === conversation.id;
                const channelInfo = channelConfig[conversation.channel];

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
                    <div className="relative">
                      <Avatar className="h-11 w-11 border border-gray-100">
                        <AvatarFallback className="bg-gradient-to-br from-[#3b82f6] to-[#60a5fa] text-white text-sm font-medium">
                          {conversation.customer?.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("") || "?"}
                        </AvatarFallback>
                      </Avatar>
                      {channelInfo && (
                        <div className={cn("absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center", channelInfo.bgColor)}>
                          <channelInfo.icon className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                    </div>
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
                          {conversation.lastMessagePreview || "No messages yet"}
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
                  {selectedConversation.customer?.email || selectedConversation.customer?.phone || `via ${channelConfig[selectedConversation.channel]?.label}`}
                </p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign to team member
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Tag className="h-4 w-4 mr-2" />
                  Add tags
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 px-6 py-4">
            {messagesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
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
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
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
            )}
          </ScrollArea>

          {/* Compose Area */}
          <div className="px-6 py-4 border-t border-gray-100">
            <div className="max-w-2xl mx-auto">
              {/* Quick Replies */}
              {showQuickReplies && quickReplies.length > 0 && (
                <div className="mb-3 p-2 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-2 px-2">Quick Replies</p>
                  <div className="flex flex-wrap gap-2">
                    {quickReplies.slice(0, 6).map((reply) => (
                      <button
                        key={reply.id}
                        onClick={() => handleQuickReply(reply)}
                        className="px-3 py-1.5 text-sm bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      >
                        {reply.shortcut}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <Textarea
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="min-h-[48px] max-h-32 resize-none rounded-2xl border-gray-200 bg-gray-50 pr-28 text-sm placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-[#3b82f6]"
                    rows={1}
                  />
                  <div className="absolute right-3 bottom-3 flex items-center gap-1">
                    <button
                      onClick={() => setShowQuickReplies(!showQuickReplies)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Quick Replies"
                    >
                      <Smile className="h-5 w-5 text-gray-400" />
                    </button>
                    <button
                      onClick={handleGetAISuggestion}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                      title="AI Suggestion"
                    >
                      <Sparkles className="h-5 w-5 text-purple-400" />
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
        /* Empty State */
        <div className="flex-1 flex flex-col items-center justify-center bg-white relative">
          <div className="text-center">
            <div className="relative mx-auto mb-6">
              <div className="absolute inset-0 bg-[#3b82f6]/10 rounded-full blur-2xl scale-150" />
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#eff6ff] to-white border border-[#dbeafe] flex items-center justify-center">
                <MessageSquare className="h-10 w-10 text-[#3b82f6]" />
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              Select a Conversation
            </h2>
            <p className="text-gray-500 max-w-sm mb-8">
              Choose a conversation from the sidebar to view messages and respond to customers.
            </p>

            <div className="flex items-center justify-center gap-2 flex-wrap max-w-md">
              {channels.slice(1, 5).map((channel) => {
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
