import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axios";
import socket from "../socket/Socket.io";
import type { Chat as ChatType } from "../types/Chat";
import type { User } from "../types/User";
import type { Message } from "../types/Message";

export default function Chat() {
  const [activeChat, setActiveChat] = useState<ChatType | null>(null);
  const [activeTab, setActiveTab] = useState<"chats" | "contacts">("chats");
  const [chats, setChats] = useState<ChatType[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }

    // Initialize socket connection
    const initializeSocket = () => {
      // Update auth token before connecting
      socket.auth = { token };

      // Add connection event listeners
      socket.on("connect", () => {
        console.log("Socket connected successfully");
        if (currentUser?._id) {
          socket.emit("setUserOnline", { userId: currentUser._id });
        }
      });

      socket.on("connect_error", (error) => {
        console.error("Socket connection error:", error.message);
      });

      socket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);
      });

      // Connect if not already connected
      if (!socket.connected) {
        socket.connect();
        console.log("Attempting socket connection to port 3000...");
      }
    };

    initializeSocket();

    // Fetch initial data
    fetchChats();
    fetchUsers();

    return () => {
      socket.off("connect");
      socket.off("connect_error");
      socket.off("disconnect");
    };
  }, [navigate, currentUser._id]);

  useEffect(() => {
    const handleNewMessage = (message: Message) => {
      console.log("Received new message:", message); // Debug log

      // Extract chat ID from message (handle both string and object formats)
      const messageChatId =
        typeof message.chat === "string"
          ? message.chat
          : (message.chat as any)?._id;

      console.log("Message chat ID:", messageChatId);
      console.log("Active chat ID:", activeChat?._id);

      // Add message to current chat if it matches
      if (messageChatId === activeChat?._id) {
        console.log("Adding message to current chat");
        setMessages((prev) => {
          const exists = prev.some((msg) => msg._id === message._id);
          if (exists) {
            console.log("Message already exists, skipping");
            return prev;
          }
          console.log("Adding new message to chat");
          const newMessages = [...prev, message];
          // Auto-scroll to bottom after adding message
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 100);
          return newMessages;
        });
      } else {
        console.log("Message not for current chat, skipping display");
      }

      // Always refresh chats to update last message
      fetchChats();
    };

    const handleUserStatusChange = (data: {
      userId: string;
      username?: string;
      status: "online" | "offline";
    }) => {
      console.log(
        `🔄 User status change: ${data.username || data.userId} is now ${
          data.status
        }`
      ); // Debug log

      // Update users list
      setUsers((prev) =>
        prev.map((user) =>
          user._id === data.userId
            ? { ...user, online: data.status === "online" }
            : user
        )
      );

      // Update chats list (for online status in chat list)
      setChats((prev) =>
        prev.map((chat) => ({
          ...chat,
          users: chat.users.map((user) =>
            user._id === data.userId
              ? { ...user, online: data.status === "online" }
              : user
          ),
        }))
      );

      // Update active chat if the status change is for a user in the current chat
      if (activeChat) {
        const isUserInActiveChat = activeChat.users.some(
          (user) => user._id === data.userId
        );
        if (isUserInActiveChat) {
          setActiveChat((prev) =>
            prev
              ? {
                  ...prev,
                  users: prev.users.map((user) =>
                    user._id === data.userId
                      ? { ...user, online: data.status === "online" }
                      : user
                  ),
                }
              : null
          );
        }
      }
    };

    const handleOnlineUsersList = (data: {
      onlineUsers: Array<{ userId: string; username?: string; email?: string }>;
    }) => {
      console.log(
        "📋 Received online users list:",
        data.onlineUsers.map((u) => `${u.username || u.email} (${u.userId})`)
      );

      const onlineUserIds = data.onlineUsers.map((u) => u.userId);

      // Update users list with online status
      setUsers((prev) =>
        prev.map((user) => ({
          ...user,
          online: onlineUserIds.includes(user._id),
        }))
      );

      // Update chats list with online status
      setChats((prev) =>
        prev.map((chat) => ({
          ...chat,
          users: chat.users.map((user) => ({
            ...user,
            online: onlineUserIds.includes(user._id),
          })),
        }))
      );

      // Update active chat with online status
      if (activeChat) {
        setActiveChat((prev) =>
          prev
            ? {
                ...prev,
                users: prev.users.map((user) => ({
                  ...user,
                  online: onlineUserIds.includes(user._id),
                })),
              }
            : null
        );
      }
    };

    const handleOnlineUsersUpdate = (data: {
      onlineUsers: Array<{ userId: string; username?: string; email?: string }>;
    }) => {
      const onlineUserIds = data.onlineUsers.map((u) => u.userId);

      // Update users list with online status
      setUsers((prev) =>
        prev.map((user) => ({
          ...user,
          online: onlineUserIds.includes(user._id),
        }))
      );

      // Update chats list with online status
      setChats((prev) =>
        prev.map((chat) => ({
          ...chat,
          users: chat.users.map((user) => ({
            ...user,
            online: onlineUserIds.includes(user._id),
          })),
        }))
      );

      // Update active chat with online status
      if (activeChat) {
        setActiveChat((prev) =>
          prev
            ? {
                ...prev,
                users: prev.users.map((user) => ({
                  ...user,
                  online: onlineUserIds.includes(user._id),
                })),
              }
            : null
        );
      }
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("userStatusChange", handleUserStatusChange);
    socket.on("onlineUsersList", handleOnlineUsersList);
    socket.on("onlineUsersUpdate", handleOnlineUsersUpdate);

    // Request current online users when component mounts
    socket.emit("getOnlineUsers");

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("userStatusChange", handleUserStatusChange);
      socket.off("onlineUsersList", handleOnlineUsersList);
      socket.off("onlineUsersUpdate", handleOnlineUsersUpdate);
    };
  }, [activeChat]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      socket.disconnect();
      console.log("Socket disconnected");
    };
  }, []);

  const fetchChats = async () => {
    try {
      // Use the new optimized endpoint that gets chats for authenticated user
      const res = await axios.get("/chats/my-chats");
      console.log("Fetched chats:", res.data); // Debug log
      setChats(res.data || []);
    } catch (error) {
      console.error("Error fetching chats:", error);
      setChats([]); // Set empty array on error
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get("/users");
      setUsers(res.data.filter((user: User) => user._id !== currentUser._id));
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      console.log("🔄 Fetching messages for chat:", chatId);
      setLoading(true);
      const res = await axios.get(`/chats/messages/${chatId}`);
      console.log("📨 Fetched messages:", res.data.length, "messages");
      console.log("📨 Messages data:", res.data);
      setMessages(res.data);
      // Auto-scroll to bottom after loading messages
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error) {
      console.error("❌ Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChat = (chat: ChatType) => {
    console.log("🎯 Selected chat:", chat._id);
    console.log("🎯 Chat details:", chat);

    setActiveChat(chat);

    // Check if chat already has messages loaded from getUserChats
    if ((chat as any).messages && (chat as any).messages.length > 0) {
      console.log(
        "📨 Using pre-loaded messages:",
        (chat as any).messages.length
      );
      setMessages((chat as any).messages);
      // Auto-scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      console.log("📨 No pre-loaded messages, fetching from API");
      fetchMessages(chat._id);
    }

    socket.emit("joinRoom", chat._id);
  };

  const handleCreateChat = async (userId: string) => {
    try {
      console.log("Getting/creating chat with user:", userId);
      console.log("Current user:", currentUser._id);

      // First check if chat already exists in our current chats list
      const existingChat = chats.find((chat) => {
        const otherUser = getOtherUser(chat);
        return otherUser?._id === userId;
      });

      if (existingChat) {
        console.log("Found existing chat in local list:", existingChat._id);
        setActiveChat(existingChat);
        fetchMessages(existingChat._id);
        socket.emit("joinRoom", existingChat._id);
        setActiveTab("chats");
        return;
      }

      // If not found locally, get/create from server
      const res = await axios.post("/chats/with-user", {
        userId: userId,
      });

      console.log("Got chat from server:", res.data); // Debug log

      const { chat, messages } = res.data;

      setActiveChat(chat);
      setMessages(messages || []);
      socket.emit("joinRoom", chat._id);

      // Refresh chats list to show the new chat
      fetchChats();

      // Switch to chats tab to show the new chat
      setActiveTab("chats");
    } catch (error) {
      console.error("Error creating chat:", error);
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !activeChat) return;

    const payload = {
      senderId: currentUser._id,
      chatId: activeChat._id,
      content: newMessage,
    };

    console.log("Sending message:", payload); // Debug log
    setNewMessage("");
    socket.emit("sendMessage", payload);

    // Auto-scroll to bottom after sending
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);

    // Refresh chats to update last message
    setTimeout(() => {
      fetchChats();
    }, 500); // Small delay to ensure message is saved
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    socket.disconnect();
    navigate("/");
  };

  const getOtherUser = (chat: ChatType) => {
    return (
      chat.users.find((user) => user._id !== currentUser._id) || chat.users[0]
    );
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Navbar */}
      <div className="bg-green-600 text-white px-4 py-3 flex items-center justify-between">
        {/* Left Side - WhatsApp Header */}
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center">
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" className="text-green-600">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.097"/>
            </svg>
          </div>
          <span className="text-lg font-semibold">WhatsApp</span>
        </div>

        {/* Right Side - Navigation & Actions */}
        <div className="flex items-center space-x-4">
          {/* Chats & Contacts Navigation */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setActiveTab("chats")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === "chats"
                  ? "bg-green-700 text-white"
                  : "text-green-100 hover:bg-green-700 hover:text-white"
              }`}
            >
              Chats
            </button>
            <button
              onClick={() => setActiveTab("contacts")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === "contacts"
                  ? "bg-green-700 text-white"
                  : "text-green-100 hover:bg-green-700 hover:text-white"
              }`}
            >
              Contacts
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-1 border-l border-green-500 pl-4">
            {/* Refresh Icon */}
            <button
              onClick={() => {
                fetchChats();
                fetchUsers();
              }}
              className="p-2 hover:bg-green-700 rounded-full transition-colors"
              title="Refresh"
            >
              <svg
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>

            {/* New Chat Icon */}
            <button
              onClick={() => setActiveTab("contacts")}
              className="p-2 hover:bg-green-700 rounded-full transition-colors"
              title="New Chat"
            >
              <svg
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
            </button>

            {/* Logout Icon */}
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-green-700 rounded-full transition-colors"
              title="Logout"
            >
              <svg
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Sidebar - 30% */}
        <div className="w-[30%] bg-white border-r">
          {activeTab === "chats" ? (
            <div className="h-full overflow-y-auto">
              {chats.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <p className="text-sm">No chats yet</p>
                  <p className="text-xs mt-1">
                    Start a conversation by selecting a contact
                  </p>
                </div>
              ) : (
                chats.map((chat) => {
                  const otherUser = getOtherUser(chat);
                  const lastMessage = chat.lastMessage;
                  

                  return (
                    <div
                      key={chat._id}
                      onClick={() => handleSelectChat(chat)}
                      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                        activeChat?._id === chat._id
                          ? "bg-green-50 border-l-4 border-l-green-500"
                          : ""
                      }`}
                    >
                      {/* Horizontal Layout: Picture -> Content */}
                      <div className="flex items-start space-x-3">
                        {/* Profile Picture */}
                        <div className="relative flex-shrink-0">
                          {otherUser?.online && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                          )}
                        </div>

                        {/* Chat Content */}
                        <div className="flex-1 min-w-0">
                          {/* Top Row: Name and Time */}
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-gray-900 truncate text-base">
                              {otherUser?.username || "Unknown User"}
                            </h3>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              {lastMessage && (
                                <span className="text-xs text-gray-500">
                                  {new Date(
                                    lastMessage.createdAt
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Bottom Row: Last Message */}
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-600 truncate flex-1 mr-2">
                              {lastMessage ? (
                                <span className="flex items-center">
                                  {lastMessage.content}
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">
                                  Start a conversation...
                                </span>
                              )}
                            </p>

                            {/* Status indicators */}
                            <div className="flex items-center space-x-1 flex-shrink-0">
                              {!otherUser?.online && (
                                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="h-full overflow-y-auto">
              {users.map((user) => (
                <div
                  key={user._id}
                  onClick={() => handleCreateChat(user._id)}
                  className="p-3 border-b cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {user.username?.charAt(0).toUpperCase() || "U"}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">
                        {user.username || "Unknown"}
                      </h3>
                      <div className="flex items-center space-x-1">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            user.online ? "bg-green-500" : "bg-gray-300"
                          }`}
                        ></span>
                        <span className="text-xs text-gray-500">
                          {user.online ? "online" : "offline"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Chat Area - 70% */}
        <div className="w-[70%] flex flex-col">
          {activeChat ? (
            <>
              {/* Chat Header */}
              <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium">
                      {getOtherUser(activeChat)
                        ?.username?.charAt(0)
                        .toUpperCase() || "U"}
                    </span>
                  </div>
                  <div>
                    <h2 className="font-medium text-gray-900">
                      {getOtherUser(activeChat)?.username || "Unknown"}
                    </h2>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            getOtherUser(activeChat)?.online
                              ? "bg-green-500"
                              : "bg-gray-300"
                          }`}
                        ></span>
                        <span className="text-xs text-gray-500">
                          {getOtherUser(activeChat)?.online
                            ? "online"
                            : "offline"}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        • {messages.length} messages
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-1">
                  {/* Reload Messages Icon */}
                  <button
                    onClick={() => fetchMessages(activeChat._id)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    title="Reload Messages"
                  >
                    <svg
                      width="20"
                      height="20"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </button>

                  {/* Phone Call Icon */}
                  <button
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    title="Voice Call"
                  >
                    <svg
                      width="20"
                      height="20"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                  </button>

                  {/* Video Call Icon */}
                  <button
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    title="Video Call"
                  >
                    <svg
                      width="20"
                      height="20"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </button>

                  {/* More Options Icon */}
                  <button
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    title="More Options"
                  >
                    <svg
                      width="20"
                      height="20"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Messages Area - WhatsApp Style */}
              <div
                className="flex-1 overflow-y-auto bg-gray-50"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f0f0f0' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                  backgroundSize: "60px 60px",
                }}
              >
                {loading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow">
                      <div className="animate-spin w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full"></div>
                      <span className="text-gray-600">Loading messages...</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    {messages.length === 0 ? (
                      <div className="flex justify-center items-center h-full">
                        <div className="text-center bg-white p-6 rounded-lg shadow-sm">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <svg
                              width="24"
                              height="24"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                              className="text-gray-400"
                            >
                              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </div>
                          <p className="text-gray-600 font-medium">
                            No messages yet
                          </p>
                          <p className="text-gray-400 text-sm mt-1">
                            Start the conversation!
                          </p>
                        </div>
                      </div>
                    ) : (
                      messages.map((message, index) => {
                        // Handle both string and object sender formats
                        const senderId =
                          typeof message.sender === "string"
                            ? message.sender
                            : message.sender?._id;

                        const senderName =
                          typeof message.sender === "object"
                            ? message.sender?.username || message.sender?.email
                            : "Unknown";

                        const isSender = senderId === currentUser._id;

                        // Check if this message is from the same sender as the previous one
                        const prevMessage =
                          index > 0 ? messages[index - 1] : null;
                        const prevSenderId = prevMessage
                          ? typeof prevMessage.sender === "string"
                            ? prevMessage.sender
                            : prevMessage.sender?._id
                          : null;
                        const isConsecutive = prevSenderId === senderId;

                        // Check if we need to show date separator
                        const messageDate = new Date(
                          message.createdAt
                        ).toDateString();
                        const prevMessageDate = prevMessage
                          ? new Date(prevMessage.createdAt).toDateString()
                          : null;
                        const showDateSeparator =
                          messageDate !== prevMessageDate;

                        return (
                          <div key={message._id}>
                            {/* Date Separator */}
                            {showDateSeparator && (
                              <div className="flex justify-center my-4">
                                <span className="bg-white px-3 py-1 rounded-full text-xs text-gray-500 shadow-sm">
                                  {new Date(
                                    message.createdAt
                                  ).toLocaleDateString([], {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>
                            )}

                            {/* Message Bubble */}
                            <div
                              className={`flex ${
                                isSender ? "justify-end" : "justify-start"
                              } ${isConsecutive ? "mt-1" : "mt-3"}`}
                            >
                              <div
                                className={`relative max-w-xs lg:max-w-md px-4 py-2 rounded-2xl shadow-sm ${
                                  isSender
                                    ? "bg-green-500 text-white rounded-br-md"
                                    : "bg-white text-gray-900 rounded-bl-md border"
                                }`}
                              >
                                {/* Sender name for received messages (only if not consecutive) */}
                                {!isSender && !isConsecutive && (
                                  <p className="text-xs font-semibold mb-1 text-green-600">
                                    {senderName}
                                  </p>
                                )}

                                {/* Message content */}
                                <p className="text-sm leading-relaxed break-words">
                                  {message.content}
                                </p>

                                {/* Time and status */}
                                <div
                                  className={`flex items-center justify-end mt-1 space-x-1 ${
                                    isSender
                                      ? "text-green-100"
                                      : "text-gray-400"
                                  }`}
                                >
                                  <span className="text-xs">
                                    {new Date(
                                      message.createdAt
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                  {isSender && (
                                    <svg
                                      width="12"
                                      height="12"
                                      fill="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                    </svg>
                                  )}
                                </div>

                                {/* Message tail */}
                                <div
                                  className={`absolute top-0 w-3 h-3 ${
                                    isSender
                                      ? "right-0 -mr-1 bg-green-500 transform rotate-45"
                                      : "left-0 -ml-1 bg-white border-l border-t transform rotate-45"
                                  } ${isConsecutive ? "hidden" : ""}`}
                                ></div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    {/* Auto-scroll target */}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Message Input - WhatsApp Style */}
              <div className="bg-gray-100 px-4 py-3 border-t">
                <div className="flex items-end space-x-3">
                  {/* Emoji Button */}
                  <button
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"
                    title="Emoji"
                  >
                    <svg
                      width="22"
                      height="22"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 14s1.5 2 4 2 4-2 4-2"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 9h.01"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 9h.01"
                      />
                    </svg>
                  </button>

                  {/* Message Input Container */}
                  <div className="flex-1 relative">
                    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm">
                      <div className="flex items-end">
                        <input
                          type="text"
                          placeholder="Type a message"
                          className="flex-1 px-4 py-3 bg-transparent border-none outline-none resize-none text-gray-900 placeholder-gray-500"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              sendMessage();
                            }
                          }}
                        />

                        {/* Attachment Button */}
                        <button
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors mr-1"
                          title="Attach File"
                        >
                          <svg
                            width="20"
                            height="20"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Send Button */}
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className={`p-3 rounded-full transition-all duration-200 ${
                      newMessage.trim()
                        ? "bg-green-500 hover:bg-green-600 text-white shadow-lg transform hover:scale-105"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                    title={
                      newMessage.trim() ? "Send Message" : "Type a message"
                    }
                  >
                    {newMessage.trim() ? (
                      <svg
                        width="20"
                        height="20"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                        />
                      </svg>
                    ) : (
                      <svg
                        width="20"
                        height="20"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-white">
              <div className="flex flex-col items-center">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <svg
                      width="20"
                      height="20"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      className="text-green-600"
                    >
                      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <span className="text-xl font-medium text-gray-900">
                    WhatsApp Web
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-4 text-center">
                  Select a chat to start messaging
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md">
                  <div className="flex items-center space-x-2 text-green-700">
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-sm font-medium">Quick Start</span>
                  </div>
                  <p className="text-xs text-green-600 mt-2">
                    Click on "Contacts" to find someone to chat with, or select
                    an existing chat from the list.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
