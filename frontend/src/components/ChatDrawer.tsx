import React from "react";
import { Drawer, Group, Text, ScrollArea, Stack, Paper, Flex, TextInput, ActionIcon, MantineTheme } from "@mantine/core";
import { IconMessage, IconSend } from "@tabler/icons-react";

interface ChatMessage {
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
}

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  currentMessage: string;
  setCurrentMessage: (message: string) => void;
  sendMessage: () => void;
  formatTime: (date: Date) => string;
  chatScrollRef: React.RefObject<HTMLDivElement>;
  theme: MantineTheme;
  myPeerId: string;
}

const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  currentMessage,
  setCurrentMessage,
  sendMessage,
  formatTime,
  chatScrollRef,
  theme,
  myPeerId,
}) => {
  return (
    <Drawer
      opened={isOpen}
      onClose={onClose}
      position="right"
      size="md"
      title={
        <Group>
          <IconMessage size={20} />
          <Text fw={600}>Meeting Chat</Text>
        </Group>
      }
      styles={{
        body: {
          display: "flex",
          flexDirection: "column",
          height: "calc(100% - 60px)",
        },
      }}
    >
      <ScrollArea h="calc(100vh - 180px)" viewportRef={chatScrollRef} scrollbarSize={6}>
        <Stack p="md" gap="md">
          {messages.map((msg, index) => (
            <Paper
              key={index}
              p="xs"
              withBorder
              style={{
                backgroundColor: msg.senderId === "system" ? theme.colors.gray[0] : msg.senderId === myPeerId ? theme.colors.violet[0] : theme.white,
                alignSelf: msg.senderId === myPeerId ? "flex-end" : "flex-start",
                width: msg.senderId === "system" ? "100%" : "80%",
                borderRadius: theme.radius.md,
              }}
            >
              {msg.senderId !== "system" && (
                <Text size="xs" fw={500} c={msg.senderId === myPeerId ? "violet" : "blue"}>
                  {msg.senderName.replace(" (You)", "")}
                </Text>
              )}
              <Text>{msg.content}</Text>
              <Text size="xs" c="dimmed" style={{ textAlign: msg.senderId === myPeerId ? "right" : "left" }}>
                {formatTime(msg.timestamp)}
              </Text>
            </Paper>
          ))}
        </Stack>
      </ScrollArea>

      <Flex gap="xs" p="md" align="center" style={{ marginTop: "auto" }}>
        <TextInput
          placeholder="Type a message..."
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          style={{ flex: 1 }}
        />
        <ActionIcon size="lg" radius="xl" color="violet" variant="filled" onClick={sendMessage} disabled={currentMessage.trim() === ""}>
          <IconSend size={18} />
        </ActionIcon>
      </Flex>
    </Drawer>
  );
};

export default ChatDrawer;
