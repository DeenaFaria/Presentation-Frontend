import { io } from "socket.io-client";

const socket = io("http://localhost:3001"); // Connect to the server

export default socket;
