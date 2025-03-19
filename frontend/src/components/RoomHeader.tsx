import React from "react";
import { Flex, Group, ThemeIcon, Title, Text, Badge, ActionIcon, Tooltip, CopyButton, MantineTheme } from "@mantine/core";
import { IconVideo, IconUsers, IconCopy, IconCheck } from "@tabler/icons-react";

interface RoomHeaderProps {
  roomId: string;
  participantCount: number;
  theme: MantineTheme;
}

const RoomHeader: React.FC<RoomHeaderProps> = ({ roomId, participantCount, theme }) => {
  return (
    <Flex
      justify="space-between"
      py="sm"
      style={{
        borderBottom: `1px solid ${theme.colors.gray[2]}`,
      }}
    >
      <Group>
        <ThemeIcon size={40} radius="md" variant="light" color="violet">
          <IconVideo size={24} />
        </ThemeIcon>
        <Title order={4}>Meeting Room:</Title>
        <Group
          bg="violet"
          align="center"
          gap={2}
          px="sm"
          py={2}
          style={{
            borderRadius: theme.radius.md,
          }}
        >
          <Text fw={500} size="xs" color="white">
            {roomId}
          </Text>
          <CopyButton value={roomId} timeout={2000}>
            {({ copied, copy }) => (
              <Tooltip label={copied ? "Copied" : "Copy"} withArrow position="right">
                <ActionIcon size="sm" color={"white"} variant="subtle" onClick={copy}>
                  {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                </ActionIcon>
              </Tooltip>
            )}
          </CopyButton>
        </Group>
      </Group>

      <Group>
        <Badge color="violet" size="lg" radius="sm">
          <Group gap={5}>
            <IconUsers size={14} />
            <Text fw="bold" size="xs">
              {participantCount} participants
            </Text>
          </Group>
        </Badge>
      </Group>
    </Flex>
  );
};

export default RoomHeader;
