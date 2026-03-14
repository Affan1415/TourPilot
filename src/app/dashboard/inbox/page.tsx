"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  Mail,
  MessageSquare,
  Phone,
  Instagram,
  Send,
  Paperclip,
  MoreVertical,
  CheckCheck,
  Clock,
  User,
  Tag,
  Archive,
  Trash2,
  Star,
  RefreshCw,
  Filter,
  Settings,
  Plus,
  ChevronDown,
  ExternalLink,
  X,
  Smile,
  Image,
  FileText,
  AlertCircle,
  Check,
  Loader2,
} from "lucide-react";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

// Channel icons and colors
const channelConfig: Record<string, { icon: any; color: string; label: string }> = {
  email: { icon: Mail, color: "text-blue-500", label: "Email" },
  whatsapp: { icon: MessageSquare, color: "text-green-500", label: "WhatsApp" },
  instagram: { icon: Instagram, color: "text-pink-500", label: "Instagram" },
  sms: { icon: Phone, color: "text-purple-500", label: "SMS" },
  messenger: { icon: MessageSquare, color: "text-blue-600", label: "Messenger" },
  internal: { icon: FileText, color: "text-gray-500", label: "Internal" },
};

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  pending: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800",
  spam: "bg-gray-100 text-gray-800",
};

interface Conversation {
  id: string;
  channel: string;
  subject: string | null;
  status: string;
  priority: number;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  } | null;
  assignedTo: string | null;
  lastMessageAt: string;
  lastMessagePreview: string;
  unreadCount: number;
  tags: string[];
}

interface Message {
  id: string;
  direction: "inbound" | "outbound";
  status: string;
  senderType: string;
  senderName: string;
  content: string;
  contentType: string;
  attachments: any[];
  createdAt: string;
}

// Mock data for demo
const mockConversations: Conversation[] = [
  {
    id: "1",
    channel: "whatsapp",
    subject: null,
    status: "open",
    priority: 1,
    customer: { id: "c1", name: "John Smith", email: "john@example.com", phone: "+1234567890" },
    assignedTo: null,
    lastMessageAt: new Date().toISOString(),
    lastMessagePreview: "Hi, I wanted to check if the sunset tour is available tomorrow?",
    unreadCount: 2,
    tags: ["VIP"],
  },
  {
    id: "2",
    channel: "email",
    subject: "Re: Booking Confirmation #BK-2024-0042",
    status: "open",
    priority: 0,
    customer: { id: "c2", name: "Sarah Johnson", email: "sarah.j@gmail.com", phone: "" },
    assignedTo: null,
    lastMessageAt: new Date(Date.now() - 3600000).toISOString(),
    lastMessagePreview: "Thank you for the confirmation. Just wanted to confirm the meeting point...",
    unreadCount: 1,
    tags: [],
  },
  {
    id: "3",
    channel: "instagram",
    subject: null,
    status: "pending",
    priority: 0,
    customer: { id: "c3", name: "Mike Wilson", email: "", phone: "" },
    assignedTo: null,
    lastMessageAt: new Date(Date.now() - 7200000).toISOString(),
    lastMessagePreview: "Hey! Saw your amazing photos. How much for a private tour?",
    unreadCount: 0,
    tags: [],
  },
  {
    id: "4",
    channel: "sms",
    subject: null,
    status: "resolved",
    priority: 0,
    customer: { id: "c4", name: "Emily Davis", email: "emily@company.com", phone: "+1987654321" },
    assignedTo: null,
    lastMessageAt: new Date(Date.now() - 86400000).toISOString(),
    lastMessagePreview: "Got it, thanks for the update!",
    unreadCount: 0,
    tags: ["Corporate"],
  },
];

const mockMessages: Message[] = [
  {
    id: "m1",
    direction: "inbound",
    status: "read",
    senderType: "customer",
    senderName: "John Smith",
    content: "Hi! I saw your sunset tour on Instagram. Is it available tomorrow evening?",
    contentType: "text",
    attachments: [],
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "m2",
    direction: "outbound",
    status: "delivered",
    senderType: "staff",
    senderName: "Tour Team",
    content: "Hello John! Yes, we have availability for the sunset tour tomorrow. We have slots at 5:30 PM and 6:00 PM. Which would you prefer?",
    contentType: "text",
    attachments: [],
    createdAt: new Date(Date.now() - 5400000).toISOString(),
  },
  {
    id: "m3",
    direction: "inbound",
    status: "read",
    senderType: "customer",
    senderName: "John Smith",
    content: "5:30 PM works great! How many people can join? I'm thinking of bringing my family - 2 adults and 2 kids.",
    contentType: "text",
    attachments: [],
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "m4",
    direction: "inbound",
    status: "delivered",
    senderType: "customer",
    senderName: "John Smith",
    content: "Hi, I wanted to check if the sunset tour is available tomorrow?",
    contentType: "text",
    attachments: [],
    createdAt: new Date().toISOString(),
  },
];

const quickReplies = [
  { shortcut: "/thanks", content: "Thank you for your message! We'll get back to you shortly." },
  { shortcut: "/hours", content: "Our office hours are Monday-Saturday, 8 AM - 6 PM." },
  { shortcut: "/location", content: "We're located at the marina. I'll send you the map link." },
];

export default function UnifiedInboxPage() {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setConversations(mockConversations);
      setLoading(false);
    }, 500);
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      setMessages(mockMessages);
      // Mark as read
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
      conv.lastMessagePreview.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.subject?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesChannel = channelFilter === "all" || conv.channel === channelFilter;
    const matchesStatus = statusFilter === "all" || conv.status === statusFilter;

    return matchesSearch && matchesChannel && matchesStatus;
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

    // Add optimistic message
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      direction: "outbound",
      status: "pending",
      senderType: "staff",
      senderName: "You",
      content: newMessage,
      contentType: "text",
      attachments: [],
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage("");

    // Simulate sending
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

  const handleQuickReply = (content: string) => {
    setNewMessage(content);
    setShowQuickReplies(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
    if (newMessage.startsWith("/") && !showQuickReplies) {
      setShowQuickReplies(true);
    }
  };

  const updateConversationStatus = (status: string) => {
    if (!selectedConversation) return;
    setConversations(prev =>
      prev.map(c =>
        c.id === selectedConversation.id ? { ...c, status } : c
      )
    );
    setSelectedConversation(prev => prev ? { ...prev, status } : null);
    toast.success(`Marked as ${status}`);
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Inbox
            {totalUnread > 0 && (
              <Badge className="bg-red-500 text-white">{totalUnread}</Badge>
            )}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Sync
          </Button>
          <Link href="/dashboard/inbox/settings">
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              Channels
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Conversation List */}
        <div className="w-80 border-r flex flex-col bg-muted/30">
          {/* Search and Filters */}
          <div className="p-3 space-y-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 justify-between">
                    <span className="flex items-center gap-1">
                      {channelFilter === "all" ? (
                        "All Channels"
                      ) : (
                        <>
                          {(() => {
                            const config = channelConfig[channelFilter];
                            const Icon = config?.icon || Mail;
                            return <Icon className={cn("h-3 w-3", config?.color)} />;
                          })()}
                          {channelConfig[channelFilter]?.label}
                        </>
                      )}
                    </span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setChannelFilter("all")}>
                    All Channels
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {Object.entries(channelConfig).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <DropdownMenuItem key={key} onClick={() => setChannelFilter(key)}>
                        <Icon className={cn("h-4 w-4 mr-2", config.color)} />
                        {config.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 justify-between">
                    {statusFilter === "all" ? "All Status" : statusFilter}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                    All Status
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setStatusFilter("open")}>
                    <div className="h-2 w-2 rounded-full bg-blue-500 mr-2" />
                    Open
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("pending")}>
                    <div className="h-2 w-2 rounded-full bg-yellow-500 mr-2" />
                    Pending
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("resolved")}>
                    <div className="h-2 w-2 rounded-full bg-green-500 mr-2" />
                    Resolved
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Conversation List */}
          <ScrollArea className="flex-1">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No conversations found</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredConversations.map((conversation) => {
                  const ChannelIcon = channelConfig[conversation.channel]?.icon || Mail;
                  const isSelected = selectedConversation?.id === conversation.id;

                  return (
                    <div
                      key={conversation.id}
                      className={cn(
                        "p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                        isSelected && "bg-muted",
                        conversation.unreadCount > 0 && "bg-blue-50/50"
                      )}
                      onClick={() => setSelectedConversation(conversation)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {conversation.customer?.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("") || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className={cn(
                              "absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-white flex items-center justify-center"
                            )}
                          >
                            <ChannelIcon
                              className={cn(
                                "h-3 w-3",
                                channelConfig[conversation.channel]?.color
                              )}
                            />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={cn(
                                "font-medium truncate",
                                conversation.unreadCount > 0 && "font-semibold"
                              )}
                            >
                              {conversation.customer?.name || "Unknown"}
                            </span>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatMessageTime(conversation.lastMessageAt)}
                            </span>
                          </div>
                          {conversation.subject && (
                            <p className="text-sm text-muted-foreground truncate">
                              {conversation.subject}
                            </p>
                          )}
                          <p
                            className={cn(
                              "text-sm truncate",
                              conversation.unreadCount > 0
                                ? "text-foreground"
                                : "text-muted-foreground"
                            )}
                          >
                            {conversation.lastMessagePreview}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {conversation.unreadCount > 0 && (
                              <Badge className="h-5 px-1.5 bg-blue-500 text-white text-xs">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                            {conversation.priority > 0 && (
                              <Badge variant="outline" className="h-5 px-1.5 text-xs border-orange-300 text-orange-600">
                                High
                              </Badge>
                            )}
                            {conversation.tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="h-5 px-1.5 text-xs"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Message Thread */}
        {selectedConversation ? (
          <div className="flex-1 flex flex-col">
            {/* Thread Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {selectedConversation.customer?.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("") || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {selectedConversation.customer?.name || "Unknown"}
                    </span>
                    <Badge className={cn("text-xs", statusColors[selectedConversation.status])}>
                      {selectedConversation.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {(() => {
                      const config = channelConfig[selectedConversation.channel];
                      const Icon = config?.icon || Mail;
                      return (
                        <>
                          <Icon className={cn("h-3 w-3", config?.color)} />
                          <span>{config?.label}</span>
                        </>
                      );
                    })()}
                    {selectedConversation.customer?.email && (
                      <>
                        <span>-</span>
                        <span>{selectedConversation.customer.email}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedConversation.customer && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href={`/dashboard/customers/${selectedConversation.customer.id}`}>
                          <Button variant="outline" size="sm">
                            <User className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>View Customer Profile</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => updateConversationStatus("resolved")}>
                      <Check className="h-4 w-4 mr-2" />
                      Mark Resolved
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateConversationStatus("pending")}>
                      <Clock className="h-4 w-4 mr-2" />
                      Mark Pending
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Tag className="h-4 w-4 mr-2" />
                      Add Tag
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <User className="h-4 w-4 mr-2" />
                      Assign To...
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => updateConversationStatus("spam")}>
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Mark as Spam
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-3xl mx-auto">
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
                        "max-w-[70%] rounded-lg p-3",
                        message.direction === "outbound"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <div
                        className={cn(
                          "flex items-center gap-1 mt-1 text-xs",
                          message.direction === "outbound"
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        )}
                      >
                        <span>{format(new Date(message.createdAt), "h:mm a")}</span>
                        {message.direction === "outbound" && (
                          <>
                            {message.status === "pending" && (
                              <Clock className="h-3 w-3" />
                            )}
                            {message.status === "sent" && (
                              <Check className="h-3 w-3" />
                            )}
                            {message.status === "delivered" && (
                              <CheckCheck className="h-3 w-3" />
                            )}
                            {message.status === "read" && (
                              <CheckCheck className="h-3 w-3 text-blue-400" />
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Compose */}
            <div className="p-4 border-t">
              <div className="relative max-w-3xl mx-auto">
                {showQuickReplies && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-popover border rounded-lg shadow-lg p-2">
                    <div className="text-xs text-muted-foreground mb-2 px-2">
                      Quick Replies
                    </div>
                    {quickReplies
                      .filter((qr) =>
                        qr.shortcut.toLowerCase().includes(newMessage.toLowerCase())
                      )
                      .map((qr) => (
                        <button
                          key={qr.shortcut}
                          className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-sm"
                          onClick={() => handleQuickReply(qr.content)}
                        >
                          <span className="font-mono text-primary">{qr.shortcut}</span>
                          <span className="text-muted-foreground ml-2 truncate">
                            {qr.content}
                          </span>
                        </button>
                      ))}
                    <button
                      className="absolute top-2 right-2"
                      onClick={() => setShowQuickReplies(false)}
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <div className="flex-1 relative">
                    <Textarea
                      placeholder="Type a message... (/ for quick replies)"
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        if (!e.target.value.startsWith("/")) {
                          setShowQuickReplies(false);
                        }
                      }}
                      onKeyDown={handleKeyDown}
                      className="min-h-[44px] max-h-32 resize-none pr-24"
                      rows={1}
                    />
                    <div className="absolute right-2 bottom-2 flex items-center gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Smile className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Emoji</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Paperclip className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Attach File</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="gap-2"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/30">
            <div className="text-center">
              <Mail className="h-16 w-16 mx-auto text-muted-foreground/30" />
              <h3 className="mt-4 text-lg font-medium">Select a conversation</h3>
              <p className="text-muted-foreground">
                Choose a conversation from the list to view messages
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
