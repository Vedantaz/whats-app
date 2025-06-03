import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
  autoConnect: false,
  auth: {
    token: localStorage.getItem("token"),
  },
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  transports: ["websocket", "polling"],
  upgrade: true,
  rememberUpgrade: true,
  forceNew: false,
});

export default socket;
