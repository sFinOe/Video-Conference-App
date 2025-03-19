import React from "react";
import { Flex, Card, ActionIcon, Tooltip, Button, MantineTheme } from "@mantine/core";
import {
  IconMicrophone,
  IconMicrophoneOff,
  IconVideo,
  IconVideoOff,
  IconPhone,
  IconMessage,
  IconScreenShare,
  IconScreenShareOff,
} from "@tabler/icons-react";

interface RoomControlsProps {
  audioEnabled: boolean;
  videoEnabled: boolean;
  isScreenSharing: boolean;
  chatOpen: boolean;
  theme: MantineTheme;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onEndCall: () => void;
}

const RoomControls: React.FC<RoomControlsProps> = ({
  audioEnabled,
  videoEnabled,
  isScreenSharing,
  chatOpen,
  theme,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleChat,
  onEndCall,
}) => {
  return (
    <Flex
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1,
      }}
    >
      <Card py="md" px="lg" w="100vw">
        <div style={{ display: "flex", justifyContent: "center", gap: theme.spacing.lg, alignItems: "center" }}>
          <Tooltip label={audioEnabled ? "Mute microphone" : "Unmute microphone"}>
            <ActionIcon
              onClick={onToggleAudio}
              size="xl"
              radius="xl"
              color={audioEnabled ? "violet" : "red"}
              variant={audioEnabled ? "light" : "filled"}
            >
              {audioEnabled ? <IconMicrophone size={24} /> : <IconMicrophoneOff size={24} />}
            </ActionIcon>
          </Tooltip>

          <Tooltip label={videoEnabled ? "Turn off camera" : "Turn on camera"}>
            <ActionIcon
              onClick={onToggleVideo}
              size="xl"
              radius="xl"
              color={videoEnabled ? "violet" : "red"}
              variant={videoEnabled ? "light" : "filled"}
              disabled={isScreenSharing}
            >
              {videoEnabled ? <IconVideo size={24} /> : <IconVideoOff size={24} />}
            </ActionIcon>
          </Tooltip>

          <Button
            onClick={onEndCall}
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

          <Tooltip label={isScreenSharing ? "Stop sharing screen" : "Share screen"}>
            <ActionIcon
              size="xl"
              variant={isScreenSharing ? "filled" : "light"}
              radius="xl"
              color={isScreenSharing ? "teal" : "violet"}
              onClick={onToggleScreenShare}
            >
              {isScreenSharing ? <IconScreenShareOff size={24} /> : <IconScreenShare size={24} />}
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Chat">
            <ActionIcon size="xl" variant={chatOpen ? "filled" : "light"} radius="xl" color={chatOpen ? "gray" : "violet"} onClick={onToggleChat}>
              <IconMessage size={24} />
            </ActionIcon>
          </Tooltip>
        </div>
      </Card>
    </Flex>
  );
};

export default RoomControls;
