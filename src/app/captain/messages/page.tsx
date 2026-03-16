"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronLeft,
  MessageSquare,
  Send,
  Radio,
  Bell,
  Check,
  CheckCheck,
  Loader2,
  Ship,
  Clock,
  AlertCircle,
  Megaphone,
  User,
} from "lucide-react";
import { format, formatDistanceToNow, isToday, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  recipient_id: string | null;
  message_type: "chat" | "status_update" | "alert" | "broadcast";
  content: string;
  metadata: Record<string, any>;
  is_read: boolean;
  created_at: string;
  is_mine: boolean;
}

interface StatusUpdate {
  value: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const STATUS_OPTIONS: StatusUpdate[] = [
  { value: "preparing", label: "Preparing", icon: <Clock className="h-4 w-4" />, color: "bg-yellow-500" },
  { value: "boarding", label: "Boarding", icon: <User className="h-4 w-4" />, color: "bg-blue-500" },
  { value: "departed", label: "Departed", icon: <Ship className="h-4 w-4" />, color: "bg-green-500" },
  { value: "returning", label: "Returning", icon: <Ship className="h-4 w-4" />, color: "bg-indigo-500" },
  { value: "docked", label: "Docked", icon: <Check className="h-4 w-4" />, color: "bg-slate-500" },
];

export default function MessagesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [staffId, setStaffId] = useState<string | null>(null);
  const [showStatusPanel, setShowStatusPanel] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
    setupRealtime();
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchData = async () => {
    try {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/captain-login");
        return;
      }

      const { data: staffData } = await supabase
        .from("staff")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (staffData) {
        setStaffId(staffData.id);
      }

      // Fetch messages
      const { data: messagesData } = await supabase
        .from("captain_messages")
        .select(`
          id,
          sender_id,
          recipient_id,
          message_type,
          content,
          metadata,
          is_read,
          created_at,
          sender:staff!captain_messages_sender_id_fkey (
            name,
            role
          )
        `)
        .or(`recipient_id.eq.${staffData?.id},recipient_id.is.null,sender_id.eq.${staffData?.id}`)
        .order("created_at", { ascending: true })
        .limit(100);

      if (messagesData) {
        const formattedMessages: Message[] = messagesData.map((msg: any) => ({
          id: msg.id,
          sender_id: msg.sender_id,
          sender_name: msg.sender?.name || "Unknown",
          sender_role: msg.sender?.role || "staff",
          recipient_id: msg.recipient_id,
          message_type: msg.message_type,
          content: msg.content,
          metadata: msg.metadata || {},
          is_read: msg.is_read,
          created_at: msg.created_at,
          is_mine: msg.sender_id === staffData?.id,
        }));
        setMessages(formattedMessages);
      }

      // Mark unread messages as read
      if (staffData) {
        await supabase
          .from("captain_messages")
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq("recipient_id", staffData.id)
          .eq("is_read", false);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtime = () => {
    const supabase = createClient();

    const channel = supabase
      .channel("captain-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "captain_messages",
        },
        (payload) => {
          // Add new message to list
          const newMsg = payload.new as any;
          if (newMsg.sender_id !== staffId || newMsg.recipient_id === staffId || newMsg.recipient_id === null) {
            fetchData(); // Refetch to get sender info
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !staffId) return;

    setSending(true);
    try {
      const supabase = createClient();

      const { error } = await supabase.from("captain_messages").insert({
        sender_id: staffId,
        recipient_id: null, // Broadcast to dispatch
        message_type: "chat",
        content: newMessage.trim(),
      });

      if (error) throw error;

      setNewMessage("");
      await fetchData();
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleStatusUpdate = async (status: string) => {
    if (!staffId) return;

    try {
      const supabase = createClient();

      const statusOption = STATUS_OPTIONS.find((s) => s.value === status);

      const { error } = await supabase.from("captain_messages").insert({
        sender_id: staffId,
        recipient_id: null,
        message_type: "status_update",
        content: `Status: ${statusOption?.label || status}`,
        metadata: { status },
      });

      if (error) throw error;

      toast.success(`Status updated: ${statusOption?.label}`);
      setShowStatusPanel(false);
      await fetchData();
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const formatMessageTime = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) {
      return format(date, "h:mm a");
    }
    return format(date, "MMM d, h:mm a");
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case "status_update":
        return <Radio className="h-4 w-4" />;
      case "alert":
        return <AlertCircle className="h-4 w-4" />;
      case "broadcast":
        return <Megaphone className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-indigo-50/30 to-background dark:from-indigo-950/10">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/captain")}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-indigo-600" />
              Messages
            </h1>
            <p className="text-sm text-muted-foreground">
              Dispatch & Updates
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setShowStatusPanel(!showStatusPanel)}
          >
            <Radio className="h-4 w-4" />
            Status
          </Button>
        </div>

        {/* Status Quick Panel */}
        {showStatusPanel && (
          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-sm font-medium mb-3">Quick Status Update</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((status) => (
                <Button
                  key={status.value}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => handleStatusUpdate(status.value)}
                >
                  <span className={cn("h-2 w-2 rounded-full", status.color)} />
                  {status.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Messages List */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4 max-w-2xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No messages yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Send a message to dispatch or update your status
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.is_mine ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3",
                    message.is_mine
                      ? "bg-indigo-600 text-white rounded-br-sm"
                      : message.message_type === "broadcast"
                      ? "bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-bl-sm"
                      : message.message_type === "alert"
                      ? "bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-bl-sm"
                      : message.message_type === "status_update"
                      ? "bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-bl-sm"
                      : "bg-white dark:bg-slate-800 border rounded-bl-sm"
                  )}
                >
                  {!message.is_mine && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold">
                        {message.sender_name}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {message.sender_role}
                      </Badge>
                    </div>
                  )}

                  {message.message_type === "status_update" && (
                    <div className="flex items-center gap-2 mb-1">
                      {getMessageIcon(message.message_type)}
                      <span className="text-xs font-medium uppercase">
                        Status Update
                      </span>
                    </div>
                  )}

                  {message.message_type === "broadcast" && (
                    <div className="flex items-center gap-2 mb-1">
                      <Megaphone className="h-4 w-4 text-amber-600" />
                      <span className="text-xs font-medium uppercase text-amber-600">
                        Broadcast
                      </span>
                    </div>
                  )}

                  {message.message_type === "alert" && (
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-xs font-medium uppercase text-red-600">
                        Alert
                      </span>
                    </div>
                  )}

                  <p className={cn(
                    "text-sm",
                    message.is_mine ? "text-white" : "text-foreground"
                  )}>
                    {message.content}
                  </p>

                  <div
                    className={cn(
                      "flex items-center justify-end gap-1 mt-1",
                      message.is_mine ? "text-indigo-200" : "text-muted-foreground"
                    )}
                  >
                    <span className="text-[10px]">
                      {formatMessageTime(message.created_at)}
                    </span>
                    {message.is_mine && (
                      message.is_read ? (
                        <CheckCheck className="h-3 w-3" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="border-t bg-white dark:bg-slate-900 p-4">
        <div className="max-w-2xl mx-auto flex gap-2">
          <Input
            placeholder="Type a message to dispatch..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={sending}
          />
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
          </Button>
        </div>
      </div>
    </div>
  );
}
