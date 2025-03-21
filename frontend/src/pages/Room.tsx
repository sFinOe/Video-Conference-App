import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import Peer from "peerjs";
import { useLocation } from "react-router-dom";
import { Container, Stack, Card, Text, Avatar, useMantineTheme, Grid } from "@mantine/core";
import RoomHeader from "../components/RoomHeader";
import RoomControls from "../components/RoomControls";
import ChatDrawer from "../components/ChatDrawer";

interface ChatMessage {
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
}

function Room({ socket }: { socket: Socket }) {
  const theme = useMantineTheme();
  const { roomId, name } = useLocation().state as { roomId: string; name: string };
  const [myPeerId, setMyPeerId] = useState<string>("");
  const [peers, setPeers] = useState<{ name: string; peerId: string; videoEnabled: boolean; audioEnabled: boolean; isScreenSharing?: boolean }[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const remoteVideoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerInstance = useRef<Peer | null>(null);
  const connections = useRef<{
    [key: string]: {
      close: () => void;
      remoteStream?: MediaStream;
    };
  }>({});

  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [videoEnabled, setVideoEnabled] = useState<boolean>(true);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);

  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const originalStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // get local media stream and store it
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setLocalStream(stream);
        originalStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      })
      .catch((err) => {
        console.error("Failed to get local stream", err);
      });
  }, []);

  // stop screen sharing
  const stopScreenSharing = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (originalStreamRef.current && peerInstance.current) {
      const originalVideoTrack = originalStreamRef.current.getVideoTracks()[0];

      // replace the screen track with the original camera track on all connections
      Object.keys(connections.current).forEach((peerId) => {
        try {
          // Type assertion for connections
          const peerConnections = peerInstance.current?.connections as unknown as { [key: string]: { peerConnection: RTCPeerConnection }[] };
          const peerConnection = peerConnections?.[peerId]?.[0]?.peerConnection;

          if (peerConnection) {
            const senders = peerConnection.getSenders();
            const videoSender = senders.find((sender: RTCRtpSender) => sender.track && sender.track.kind === "video");

            if (videoSender) {
              videoSender.replaceTrack(originalVideoTrack);
            }
          }
        } catch (err) {
          console.error("Error replacing track for peer", peerId, err);
        }
      });

      // restore the local video display
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = originalStreamRef.current;
      }

      setLocalStream(originalStreamRef.current);

      setIsScreenSharing(false);
      screenStreamRef.current = null;

      socket.emit("screen-share-change", {
        roomId,
        peerId: myPeerId,
        isScreenSharing: false,
      });
    }
  };

  useEffect(() => {
    if (!localStream) return;

    const peer = new Peer({
      host: import.meta.env.VITE_PEER_URL || "localhost",
      port: import.meta.env.VITE_API_PORT || 3000,
      path: "/peerjs",
    });

    peer.on("open", (id) => {
      setMyPeerId(id);

      // add user to the room
      socket.emit("join-room", { roomId, peerId: id, name });
    });

    peer.on("call", (call) => {
      call.answer(localStream);
      call.on("stream", (remoteStream) => {
        connections.current[call.peer] = call;

        updateRemoteVideo(call.peer, remoteStream);
      });
    });

    peerInstance.current = peer;

    return () => {
      Object.values(connections.current).forEach((conn) => {
        if (conn) conn.close();
      });
      peer.destroy();
    };
  }, [localStream, roomId]);

  // establish connection with a new peer
  const connectToPeer = (peerId: string) => {
    if (!peerInstance.current || !localStream || connections.current[peerId]) return;

    const call = peerInstance.current.call(peerId, localStream);
    call.on("stream", (remoteStream) => {
      connections.current[peerId] = call;
      updateRemoteVideo(peerId, remoteStream);
    });
    call.on("error", (err) => {
      console.error("Error in peer connection", err);
    });
  };

  // update remote video elements
  const updateRemoteVideo = (peerId: string, stream: MediaStream | null) => {
    const videoElement = remoteVideoRefs.current[peerId];
    if (videoElement) {
      videoElement.srcObject = stream;
    } else {
      setTimeout(() => {
        const delayedVideoElement = remoteVideoRefs.current[peerId];
        if (delayedVideoElement) {
          delayedVideoElement.srcObject = stream;
        }
      }, 500);
    }
  };

  useEffect(() => {
    if (!localStream) return;

    // get room details
    const onRoomDetails = (payload: {
      roomId: string;
      peers: { name: string; peerId: string; videoEnabled: boolean; audioEnabled: boolean; isScreenSharing?: boolean }[];
    }) => {
      setPeers(payload.peers.filter((id) => id.peerId !== myPeerId));
      payload.peers.forEach((peer) => {
        if (peer.peerId !== myPeerId) {
          connectToPeer(peer.peerId);
        }
      });
    };

    // add user to the room
    const onPeerJoined = (payload: { peerId: string; name: string }) => {
      if (payload.peerId !== myPeerId) {
        connectToPeer(payload.peerId);
        setPeers((prevPeers) => {
          if (!prevPeers.some((id) => id.peerId === payload.peerId)) {
            return [...prevPeers, { name: payload.name, peerId: payload.peerId, videoEnabled: true, audioEnabled: true }];
          }
          return prevPeers;
        });

        // add system message when someone joins
        setChatMessages((prev) => [
          ...prev,
          {
            senderId: "system",
            senderName: "System",
            content: `${payload.name} has joined the meeting`,
            timestamp: new Date(),
          },
        ]);
      }
    };

    // remove user from the room
    const onPeerLeft = (payload: { peerId: string }) => {
      if (connections.current[payload.peerId]) {
        connections.current[payload.peerId].close();
        delete connections.current[payload.peerId];
      }

      // Find the name of the peer who left
      const peerName = peers.find((p) => p.peerId === payload.peerId)?.name || "Someone";

      setPeers((prevPeers) => prevPeers.filter((id) => id.peerId !== payload.peerId));

      // Add system message when someone leaves
      setChatMessages((prev) => [
        ...prev,
        {
          senderId: "system",
          senderName: "System",
          content: `${peerName} has left the meeting`,
          timestamp: new Date(),
        },
      ]);
    };

    // update media state
    const onMediaStateChange = (payload: { peerId: string; videoEnabled: boolean; audioEnabled: boolean }) => {
      setPeers((prevPeers) =>
        prevPeers.map((peer) =>
          peer.peerId === payload.peerId ? { ...peer, videoEnabled: payload.videoEnabled, audioEnabled: payload.audioEnabled } : peer
        )
      );
    };

    // update screen share state
    const onScreenShareChange = (payload: { peerId: string; isScreenSharing: boolean }) => {
      setPeers((prevPeers) =>
        prevPeers.map((peer) => (peer.peerId === payload.peerId ? { ...peer, isScreenSharing: payload.isScreenSharing } : peer))
      );
    };

    // update chat messages
    const onChatMessage = (payload: { senderId: string; senderName: string; content: string; timestamp: string }) => {
      setChatMessages((prev) => [
        ...prev,
        {
          senderId: payload.senderId,
          senderName: payload.senderName,
          content: payload.content,
          timestamp: new Date(payload.timestamp),
        },
      ]);
    };

    socket.on("room-details", onRoomDetails);
    socket.on("peer-joined", onPeerJoined);
    socket.on("peer-left", onPeerLeft);
    socket.on("media-state-change", onMediaStateChange);
    socket.on("chat-message", onChatMessage);
    socket.on("screen-share-change", onScreenShareChange);

    return () => {
      socket.off("room-details", onRoomDetails);
      socket.off("peer-joined", onPeerJoined);
      socket.off("peer-left", onPeerLeft);
      socket.off("media-state-change", onMediaStateChange);
      socket.off("chat-message", onChatMessage);
      socket.off("screen-share-change", onScreenShareChange);
    };
  }, [localStream, myPeerId, socket, peers, chatOpen]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [chatMessages]);

  // set up ref callback for remote videos
  const setVideoRef = (peerId: string) => (el: HTMLVideoElement | null) => {
    remoteVideoRefs.current[peerId] = el;

    const existingConnection = connections.current[peerId];
    if (el && existingConnection && existingConnection.remoteStream) {
      el.srcObject = existingConnection.remoteStream;
    }
  };

  // toggle audio
  const toggleAudio = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setAudioEnabled(!audioEnabled);

      // notify other participants about audio state change
      socket.emit("media-state-change", {
        roomId,
        peerId: myPeerId,
        videoEnabled,
        audioEnabled: !audioEnabled,
      });
    }
  };

  // toggle video
  const toggleVideo = () => {
    if (localStream && !isScreenSharing) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setVideoEnabled(!videoEnabled);
      socket.emit("media-state-change", {
        roomId,
        peerId: myPeerId,
        videoEnabled: !videoEnabled,
        audioEnabled,
      });
    }
  };

  // screen sharing
  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });

        screenStreamRef.current = screenStream;

        if (!originalStreamRef.current) {
          originalStreamRef.current = localStream;
        }

        // stop screen sharing
        screenStream.getVideoTracks()[0].onended = () => {
          stopScreenSharing();
        };

        // replace track on all peer connections
        if (peerInstance.current) {
          const videoTrack = screenStream.getVideoTracks()[0];

          // Type assertion for connections
          const peerConnections = peerInstance.current?.connections as unknown as { [key: string]: { peerConnection: RTCPeerConnection }[] };
          Object.keys(peerConnections).forEach((peerId) => {
            try {
              const peerConnection = peerConnections?.[peerId]?.[0]?.peerConnection;
              if (peerConnection) {
                const senders = peerConnection.getSenders();
                const videoSender = senders.find((sender: RTCRtpSender) => sender.track && sender.track.kind === "video");

                if (videoSender) {
                  videoSender.replaceTrack(videoTrack);
                }
              }
            } catch (err) {
              console.error("Error replacing track for peer", peerId, err);
            }
          });

          // update local video display
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = screenStream;
          }

          // keep audio tracks from original stream
          if (originalStreamRef.current) {
            const audioTracks = originalStreamRef.current.getAudioTracks();
            audioTracks.forEach((track) => {
              screenStream.addTrack(track);
            });
          }

          setLocalStream(screenStream);
          setIsScreenSharing(true);

          // Notify peers
          socket.emit("screen-share-change", {
            roomId,
            peerId: myPeerId,
            isScreenSharing: true,
          });
        }
      } else {
        // stop screen sharing
        stopScreenSharing();
      }
    } catch (err) {
      console.error("Error in screen sharing:", err);
      setIsScreenSharing(false);
    }
  };

  // end call
  const endCall = () => {
    window.location.href = "/";
  };

  // Toggle chat drawer
  const toggleChat = () => {
    setChatOpen(!chatOpen);
  };

  // send chat message
  const sendChatMessage = () => {
    if (currentMessage.trim() === "") return;

    const newMessage: ChatMessage = {
      senderId: myPeerId,
      senderName: `${name} (You)`,
      content: currentMessage,
      timestamp: new Date(),
    };

    // update local state
    setChatMessages((prev) => [...prev, newMessage]);

    // send message to other users in the room
    socket.emit("send-chat-message", {
      roomId,
      senderId: myPeerId,
      senderName: name,
      content: currentMessage,
      timestamp: new Date().toISOString(),
    });

    setCurrentMessage("");
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Container fluid h="100%">
      <RoomHeader roomId={roomId} participantCount={peers.length + 1} theme={theme} />

      {/* video grid */}
      <Grid grow mt="md">
        {/* local video */}
        <Grid.Col span="auto">
          <Card shadow="sm" p={0} radius="md" withBorder style={{ width: "100%" }} h={`calc(100vh - 11rem)`}>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: theme.radius.md,
                transform: "scaleX(-1)",
                display: videoEnabled ? "block" : "none",
              }}
            />
            {!videoEnabled && (
              <Stack align="center" justify="center" style={{ width: "100%", height: "100%" }}>
                <Avatar size={80} radius={100} color="violet">
                  {name.charAt(0).toUpperCase()}
                </Avatar>
                <Text ta="center" fw={500}>
                  {name} (You)
                </Text>
              </Stack>
            )}
            <Text
              style={{
                position: "absolute",
                bottom: "10px",
                left: "10px",
                backgroundColor: "rgba(0,0,0,0.5)",
                padding: "2px 8px",
                borderRadius: theme.radius.sm,
                color: "white",
              }}
            >
              {name} (You)
            </Text>
          </Card>
        </Grid.Col>

        {/* remote videos */}
        {peers.map((peer) => (
          <Grid.Col key={peer.peerId} span="auto">
            <Card shadow="sm" p={0} radius="md" withBorder h={`calc(100vh - 11rem)`}>
              {peer.videoEnabled || peer.videoEnabled == undefined ? (
                <>
                  <video
                    ref={setVideoRef(peer.peerId)}
                    autoPlay
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: theme.radius.md,
                    }}
                  />
                  <Text
                    style={{
                      position: "absolute",
                      bottom: "10px",
                      left: "10px",
                      backgroundColor: "rgba(0,0,0,0.5)",
                      padding: "2px 8px",
                      borderRadius: theme.radius.sm,
                      color: "white",
                    }}
                  >
                    {peer.name}
                  </Text>
                </>
              ) : (
                <Stack align="center" justify="center" style={{ width: "100%", height: "100%" }}>
                  <Avatar size={80} radius={100} color="violet">
                    {peer.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Text ta="center" fw={500}>
                    {peer.name}
                  </Text>
                </Stack>
              )}
            </Card>
          </Grid.Col>
        ))}
      </Grid>

      <ChatDrawer
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={chatMessages}
        currentMessage={currentMessage}
        setCurrentMessage={setCurrentMessage}
        sendMessage={sendChatMessage}
        formatTime={formatTime}
        chatScrollRef={chatScrollRef as React.RefObject<HTMLDivElement>}
        theme={theme}
        myPeerId={myPeerId}
      />

      <RoomControls
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        isScreenSharing={isScreenSharing}
        chatOpen={chatOpen}
        theme={theme}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={toggleScreenShare}
        onToggleChat={toggleChat}
        onEndCall={endCall}
      />
    </Container>
  );
}

export default Room;
