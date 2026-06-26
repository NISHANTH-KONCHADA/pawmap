import { io } from 'socket.io-client';

// Connect to the hosting origin (where the full-stack server runs)
const socketUrl = (import.meta as any).env?.VITE_API_URL || window.location.origin;

console.log(`[Socket.io] Connecting to ${socketUrl}`);
const socket = io(socketUrl);

export default socket;
