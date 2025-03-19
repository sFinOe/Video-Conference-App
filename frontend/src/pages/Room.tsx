import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import Peer from "peerjs";
import { useLocation } from "react-router-dom";
import {
  Container,
  Group,
  Stack,
  Card,
  Text,
  Button,
  ActionIcon,
  ThemeIcon,
  Tooltip,
  Title,
  Modal,
  CopyButton,
  TextInput,
  Box,
  Badge,
  Avatar,
  useMantineTheme,
  Grid,
  Flex,
} from "@mantine/core";
import {
  IconMicrophone,
  IconMicrophoneOff,
  IconVideo,
  IconVideoOff,
  IconPhone,
  IconCopy,
  IconCheck,
  IconInfoCircle,
  IconUsers,
  IconSettings,
  IconMessage,
} from "@tabler/icons-react";

function Room({ socket }: { socket: Socket }) {
  const theme = useMantineTheme();
  const { roomId, name } = useLocation().state as { roomId: string; name: string };
  const [myPeerId, setMyPeerId] = useState<string>("");
  const [peers, setPeers] = useState<{ name: string; peerId: string }[]>([]);
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

  // UI controls state
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [videoEnabled, setVideoEnabled] = useState<boolean>(true);
  const [showRoomInfo, setShowRoomInfo] = useState<boolean>(false);

  // Get local media stream
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setLocalStream(stream);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      })
      .catch((err) => {
        console.error("Failed to get local stream", err);
      });
  }, []);

  // Initialize PeerJS and handle room joining
  useEffect(() => {
    if (!localStream) return; // Wait for local stream to be available

    const peer = new Peer({
      host: "localhost",
      port: 3000,
      path: "/peerjs",
    });

    peer.on("open", (id) => {
      setMyPeerId(id);

      // Join the room
      socket.emit("join-room", { roomId, peerId: id, name });
    });

    peer.on("call", (call) => {
      call.answer(localStream); // Answer the call with the local stream
      call.on("stream", (remoteStream) => {
        // Store the connection
        connections.current[call.peer] = call;

        // Update the video element if it exists
        updateRemoteVideo(call.peer, remoteStream);
      });
    });

    peerInstance.current = peer;

    // Cleanup on unmount
    return () => {
      Object.values(connections.current).forEach((conn) => {
        if (conn) conn.close();
      });
      peer.destroy();
    };
  }, [localStream, roomId]);

  // Function to establish connection with a new peer
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

  // Function to update remote video elements
  const updateRemoteVideo = (peerId: string, stream: MediaStream) => {
    console.log("Updating remote video for", peerId);
    const videoElement = remoteVideoRefs.current[peerId];
    if (videoElement) {
      videoElement.srcObject = stream;
    } else {
      // If the video element isn't ready yet, retry after a short delay
      setTimeout(() => {
        const delayedVideoElement = remoteVideoRefs.current[peerId];
        if (delayedVideoElement) {
          delayedVideoElement.srcObject = stream;
        }
      }, 500);
    }
  };

  // Handle socket events for peer management
  useEffect(() => {
    if (!localStream) return;

    const onRoomDetails = (payload: { roomId: string; peers: { name: string; peerId: string }[] }) => {
      console.log("Room details:", payload);
      setPeers(payload.peers.filter((id) => id.peerId !== myPeerId));
      payload.peers.forEach((peer) => {
        if (peer.peerId !== myPeerId) {
          connectToPeer(peer.peerId);
        }
      });
    };

    const onPeerJoined = (payload: { peerId: string; name: string }) => {
      console.log("Peer joined:", payload.peerId);
      if (payload.peerId !== myPeerId) {
        connectToPeer(payload.peerId);
        setPeers((prevPeers) => {
          if (!prevPeers.some((id) => id.peerId === payload.peerId)) {
            return [...prevPeers, { name: payload.name, peerId: payload.peerId }];
          }
          return prevPeers;
        });
      }
    };

    const onPeerLeft = (payload: { peerId: string }) => {
      console.log("Peer left:", payload.peerId);
      // Close the connection if it exists
      if (connections.current[payload.peerId]) {
        connections.current[payload.peerId].close();
        delete connections.current[payload.peerId];
      }
      setPeers((prevPeers) => prevPeers.filter((id) => id.peerId !== payload.peerId));
    };

    socket.on("room-details", onRoomDetails);
    socket.on("peer-joined", onPeerJoined);
    socket.on("peer-left", onPeerLeft);

    // Cleanup socket listeners
    return () => {
      socket.off("room-details", onRoomDetails);
      socket.off("peer-joined", onPeerJoined);
      socket.off("peer-left", onPeerLeft);
    };
  }, [localStream, myPeerId, socket]);

  // Set up ref callback for remote videos
  const setVideoRef = (peerId: string) => (el: HTMLVideoElement | null) => {
    remoteVideoRefs.current[peerId] = el;

    // If we already have a stream for this peer, set it immediately
    const existingConnection = connections.current[peerId];
    if (el && existingConnection && existingConnection.remoteStream) {
      el.srcObject = existingConnection.remoteStream;
    }
  };

  // Handle audio toggle
  const toggleAudio = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setAudioEnabled(!audioEnabled);
    }
  };

  // Handle video toggle
  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setVideoEnabled(!videoEnabled);
    }
  };

  // Handle call end
  const endCall = () => {
    window.location.href = "/";
  };

  return (
    <Container fluid>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: theme.spacing.md,
          borderBottom: `1px solid ${theme.colors.gray[2]}`,
        }}
      >
        <Group>
          <ThemeIcon size={40} radius="md" variant="light" color="violet">
            <IconVideo size={24} />
          </ThemeIcon>
          <Title order={4}>Meeting Room: {roomId}</Title>
        </Group>

        <Group>
          <Badge color="violet" size="lg" radius="sm">
            <Group gap={5}>
              <IconUsers size={14} />
              <Text>{peers.length + 1} participants</Text>
            </Group>
          </Badge>
        </Group>
      </div>

      {/* Video Grid */}
      <Grid>
        {/* Local video */}
        <Card shadow="sm" p="xs" radius="md" withBorder>
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

        {/* Remote videos */}
        {peers.map((peer) => (
          <Card
            key={peer.peerId}
            shadow="sm"
            p="xs"
            radius="md"
            withBorder
            style={{ position: "relative", aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
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
          </Card>
        ))}
      </Grid>

      {/* Controls */}
      <Flex
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
        }}
      >
        <Card py="md" px="lg" w="100%">
          <div style={{ display: "flex", justifyContent: "center", gap: theme.spacing.lg }}>
            <Tooltip label={audioEnabled ? "Mute microphone" : "Unmute microphone"}>
              <ActionIcon
                onClick={toggleAudio}
                size="xl"
                radius="xl"
                color={audioEnabled ? "blue" : "red"}
                variant={audioEnabled ? "light" : "filled"}
              >
                {audioEnabled ? <IconMicrophone size={24} /> : <IconMicrophoneOff size={24} />}
              </ActionIcon>
            </Tooltip>

            <Tooltip label={videoEnabled ? "Turn off camera" : "Turn on camera"}>
              <ActionIcon
                onClick={toggleVideo}
                size="xl"
                radius="xl"
                color={videoEnabled ? "blue" : "red"}
                variant={videoEnabled ? "light" : "filled"}
              >
                {videoEnabled ? <IconVideo size={24} /> : <IconVideoOff size={24} />}
              </ActionIcon>
            </Tooltip>

            <Button
              onClick={endCall}
              color="red"
              radius="xl"
              styles={{
                root: {
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                },
              }}
            >
              <IconPhone size={20} />
              End Call
            </Button>

            <Tooltip label="Settings">
              <ActionIcon size="xl" variant="subtle" radius="xl">
                <IconSettings size={24} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="Chat">
              <ActionIcon size="xl" variant="subtle" radius="xl">
                <IconMessage size={24} />
              </ActionIcon>
            </Tooltip>
          </div>
        </Card>
      </Flex>
    </Container>
  );
}

export default Room;
