import express from "express";
import cors from "cors";
import { ExpressPeerServer } from "peer";
import { Server } from "socket.io";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// store rooms and peers
const rooms: { [key: string]: { name: string; peerId: string }[] } = {};

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const peerServer = ExpressPeerServer(server, {
  path: "/",
});

app.use("/peerjs", peerServer);

peerServer.on("connection", (client) => {
  console.log(`Peer connected: ${client.getId()}`);
});

peerServer.on("disconnect", (client) => {
  console.log(`Peer disconnected: ${client.getId()}`);

  // remove peer from all rooms
  for (const roomId in rooms) {
    if (rooms[roomId].some((id) => id.peerId === client.getId())) {
      rooms[roomId] = rooms[roomId].filter((id) => id.peerId !== client.getId());

      // notify other peers in the room about the disconnection
      io.to(roomId).emit("peer-left", { peerId: client.getId() });

      // if the room is empty, delete it
      if (rooms[roomId].length === 0) {
        delete rooms[roomId];
      }
    }
  }
});

// Socket.IO connection handler
io.on("connection", (socket) => {
  socket.on("join-room", (payload: { roomId: string; peerId: string; name: string }) => {
    const { roomId, peerId, name } = payload;

    if (!roomId || !peerId) {
      console.log("No roomId or peerId");
      return;
    }

    // create room if it doesn't exist
    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }

    // add peer to room
    if (!rooms[roomId].includes({ name, peerId })) {
      rooms[roomId].push({ name, peerId });
    }

    console.log(`Peer ${peerId} joined room ${roomId}`);
    console.log("Current rooms:", rooms);

    // join the room
    socket.join(roomId);

    // send room details to the new peer
    socket.emit("room-details", {
      roomId,
      peers: rooms[roomId].filter((id) => id.peerId !== peerId),
    });

    // notify other peers in the room about the new peer
    socket.to(roomId).emit("peer-joined", { peerId, name });
  });

  socket.on("media-state-change", (payload: { roomId: string; peerId: string; videoEnabled: boolean; audioEnabled: boolean }) => {
    const { roomId, peerId, videoEnabled, audioEnabled } = payload;

    socket.to(roomId).emit("media-state-change", { peerId, videoEnabled, audioEnabled });
  });

  socket.on("send-chat-message", (payload: { roomId: string; senderId: string; senderName: string; content: string }) => {
    const { roomId, senderId, senderName, content } = payload;

    socket.to(roomId).emit("chat-message", { senderId, senderName, content, timestamp: new Date().toISOString() });
  });
});
