"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Mail,
  Send,
  Search,
  Inbox,
  Star,
  Trash2,
  RefreshCw,
  Plus,
  ArrowLeft,
  MoreVertical,
  Reply,
  LogOut,
  Loader2,
  SendHorizonal,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  body: string;
  htmlBody: string;
  isUnread: boolean;
  isStarred: boolean;
  labelIds: string[];
}

interface GmailUser {
  email: string;
  name: string;
  picture: string;
}

export default function CommunicationsPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [user, setUser] = useState<GmailUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<GmailMessage | null>(null);
  const [activeFolder, setActiveFolder] = useState<"inbox" | "sent">("inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const email = document.cookie
        .split("; ")
        .find((row) => row.startsWith("gmail_user_email="))
        ?.split("=")[1];

      const name = document.cookie
        .split("; ")
        .find((row) => row.startsWith("gmail_user_name="))
        ?.split("=")[1];

      const picture = document.cookie
        .split("; ")
        .find((row) => row.startsWith("gmail_user_picture="))
        ?.split("=")[1];

      if (email) {
        setIsConnected(true);
        setUser({
          email: decodeURIComponent(email),
          name: name ? decodeURIComponent(name) : "",
          picture: picture ? decodeURIComponent(picture) : "",
        });
        await fetchMessages("inbox");
      }
    } catch (error) {
      console.error("Error checking connection:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (folder: "inbox" | "sent" = activeFolder) => {
    try {
      setRefreshing(true);
      const response = await fetch(`/api/google/gmail/messages?folder=${folder}`);

      if (response.status === 401) {
        setIsConnected(false);
        setUser(null);
        toast.error("Session expired", { description: "Please reconnect your Gmail account." });
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch messages");
      }

      setMessages(data.messages || []);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages", {
        description: error.message || "Please try again"
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      const response = await fetch("/api/google/auth");
      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error connecting to Gmail:", error);
      toast.error("Failed to connect to Gmail");
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch("/api/google/disconnect", { method: "POST" });
      setIsConnected(false);
      setUser(null);
      setMessages([]);
      setSelectedMessage(null);
      toast.success("Disconnected from Gmail");
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast.error("Failed to disconnect");
    }
  };

  const handleFolderChange = async (folder: "inbox" | "sent") => {
    setActiveFolder(folder);
    setSelectedMessage(null);
    await fetchMessages(folder);
  };

  const handleSelectMessage = async (message: GmailMessage) => {
    setSelectedMessage(message);

    if (message.isUnread) {
      try {
        await fetch("/api/google/gmail/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "markRead", messageId: message.id }),
        });

        setMessages((prev) =>
          prev.map((m) => (m.id === message.id ? { ...m, isUnread: false } : m))
        );
      } catch (error) {
        console.error("Error marking as read:", error);
      }
    }
  };

  const handleStar = async (messageId: string, currentlyStarred: boolean) => {
    try {
      await fetch("/api/google/gmail/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "star",
          messageId,
          starred: !currentlyStarred,
        }),
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, isStarred: !currentlyStarred } : m
        )
      );
    } catch (error) {
      console.error("Error starring message:", error);
      toast.error("Failed to star message");
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      await fetch("/api/google/gmail/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", messageId }),
      });

      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(null);
      }
      toast.success("Message moved to trash");
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Failed to delete message");
    }
  };

  const handleSendEmail = async () => {
    if (!composeTo || !composeSubject || !composeBody) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setSending(true);
      const response = await fetch("/api/google/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: composeTo,
          subject: composeSubject,
          body: composeBody,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send email");
      }

      toast.success("Email sent successfully!");
      setIsComposeOpen(false);
      setComposeTo("");
      setComposeSubject("");
      setComposeBody("");

      if (activeFolder === "sent") {
        fetchMessages("sent");
      }
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error("Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const handleReply = (message: GmailMessage) => {
    const senderEmail = message.from.match(/<(.+)>/)?.[1] || message.from;
    setComposeTo(senderEmail);
    setComposeSubject("Re: " + message.subject);
    setComposeBody("\n\n---\nOn " + format(new Date(message.date), "PPpp") + ", " + message.from + " wrote:\n\n" + (message.body || message.snippet));
    setIsComposeOpen(true);
  };

  const parseEmailName = (email: string) => {
    const match = email.match(/^(.+?)\s*<.+>$/);
    return match ? match[1].replace(/"/g, "") : email.split("@")[0];
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-yellow-500 flex items-center justify-center">
            <Mail className="h-10 w-10 text-white" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Connect Your Gmail</h1>
            <p className="text-muted-foreground">
              Connect your Gmail account to view your inbox, send emails, and manage all your communications in one place.
            </p>
          </div>
          <Button
            size="lg"
            className="w-full gap-2"
            onClick={handleConnect}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Connect with Google
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            We only request access to read and send emails. Your data is secure.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="border-b p-4 flex items-center justify-between bg-background">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Communications
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64 hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchMessages()}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>

          <Button
            className="gap-2 gradient-primary border-0"
            onClick={() => setIsComposeOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Compose
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.picture} />
                  <AvatarFallback>{getInitials(user?.name || user?.email || "U")}</AvatarFallback>
                </Avatar>
                <span className="hidden md:inline text-sm">{user?.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="px-2 py-1.5">
                <p className="font-medium">{user?.name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDisconnect} className="text-red-600">
                <LogOut className="h-4 w-4 mr-2" />
                Disconnect Gmail
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-56 border-r p-4 space-y-2 hidden md:block">
          <Button
            variant={activeFolder === "inbox" ? "secondary" : "ghost"}
            className="w-full justify-start gap-2"
            onClick={() => handleFolderChange("inbox")}
          >
            <Inbox className="h-4 w-4" />
            Inbox
            {messages.filter((m) => m.isUnread && activeFolder === "inbox").length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {messages.filter((m) => m.isUnread).length}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeFolder === "sent" ? "secondary" : "ghost"}
            className="w-full justify-start gap-2"
            onClick={() => handleFolderChange("sent")}
          >
            <SendHorizonal className="h-4 w-4" />
            Sent
          </Button>
        </div>

        <div className={cn(
          "w-full md:w-96 border-r flex flex-col",
          selectedMessage && "hidden md:flex"
        )}>
          <ScrollArea className="flex-1">
            {messages.length === 0 ? (
              <div className="p-8 text-center">
                <Inbox className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No messages</p>
              </div>
            ) : (
              <div className="divide-y">
                {messages
                  .filter((m) =>
                    searchQuery
                      ? m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        m.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        m.snippet.toLowerCase().includes(searchQuery.toLowerCase())
                      : true
                  )
                  .map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                        message.isUnread && "bg-blue-50/50",
                        selectedMessage?.id === message.id && "bg-muted"
                      )}
                      onClick={() => handleSelectMessage(message)}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarFallback>
                            {getInitials(parseEmailName(message.from))}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p
                              className={cn(
                                "text-sm truncate",
                                message.isUnread && "font-semibold"
                              )}
                            >
                              {parseEmailName(message.from)}
                            </p>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDistanceToNow(new Date(message.date), { addSuffix: true })}
                            </span>
                          </div>
                          <p
                            className={cn(
                              "text-sm truncate",
                              message.isUnread ? "font-medium" : "text-muted-foreground"
                            )}
                          >
                            {message.subject || "(no subject)"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {message.snippet}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStar(message.id, message.isStarred);
                          }}
                          className="flex-shrink-0"
                        >
                          <Star
                            className={cn(
                              "h-4 w-4",
                              message.isStarred
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground"
                            )}
                          />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className={cn(
          "flex-1 flex flex-col",
          !selectedMessage && "hidden md:flex"
        )}>
          {selectedMessage ? (
            <>
              <div className="border-b p-4">
                <div className="flex items-center gap-2 md:hidden mb-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedMessage(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-medium">Back</span>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>
                        {getInitials(parseEmailName(selectedMessage.from))}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-lg font-semibold">
                        {selectedMessage.subject || "(no subject)"}
                      </h2>
                      <p className="text-sm">
                        <span className="font-medium">
                          {parseEmailName(selectedMessage.from)}
                        </span>
                        <span className="text-muted-foreground">
                          {" <"}{selectedMessage.from.match(/<(.+)>/)?.[1] || selectedMessage.from}{">"}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        To: {selectedMessage.to}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground hidden md:inline">
                      {format(new Date(selectedMessage.date), "PPpp")}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleReply(selectedMessage)}>
                          <Reply className="h-4 w-4 mr-2" />
                          Reply
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStar(selectedMessage.id, selectedMessage.isStarred)}>
                          <Star className="h-4 w-4 mr-2" />
                          {selectedMessage.isStarred ? "Unstar" : "Star"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(selectedMessage.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1 p-6">
                {selectedMessage.htmlBody ? (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedMessage.htmlBody }}
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-sm">
                    {selectedMessage.body || selectedMessage.snippet}
                  </div>
                )}
              </ScrollArea>

              <div className="border-t p-4">
                <Button
                  variant="outline"
                  className="w-full justify-start text-muted-foreground"
                  onClick={() => handleReply(selectedMessage)}
                >
                  <Reply className="h-4 w-4 mr-2" />
                  Click here to reply
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Mail className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p>Select a message to read</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                placeholder="recipient@example.com"
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Subject"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Message</Label>
              <Textarea
                id="body"
                placeholder="Write your message..."
                className="min-h-[200px]"
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsComposeOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={sending}
              className="gap-2 gradient-primary border-0"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
