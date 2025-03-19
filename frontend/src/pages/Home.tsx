import React, { useState } from "react";
import { Button, Card, Container, TextInput, Title, Text, Stack, Group, ThemeIcon, Center } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { IconVideo, IconRefresh } from "@tabler/icons-react";

function Home() {
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const navigate = useNavigate();

  const generateRandomRoomId = () => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 10; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    setRoomId(result);
  };

  const joinRoom = () => {
    if (name && roomId) {
      navigate("/room", { state: { name, roomId } });
    }
  };

  return (
    <Container size="xs" h="100%">
      <Center h="100%">
        <Card shadow="md" radius="md" p="xl" withBorder>
          <Stack align="center" gap="lg">
            <ThemeIcon size={70} radius="md" variant="light" color="violet">
              <IconVideo size={45} stroke={1.5} />
            </ThemeIcon>

            <Title order={1} c="violet">
              Video Conference
            </Title>

            <Text c="dimmed" size="lg">
              Connect with others through video conferencing
            </Text>

            <TextInput
              label="Your Name"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              radius="md"
              size="md"
              required
              w="100%"
            />

            <Group grow align="flex-end" w="100%">
              <TextInput
                label="Room ID"
                placeholder="Enter room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                radius="md"
                size="md"
                required
                rightSection={
                  <ThemeIcon color="violet" radius="md" onClick={generateRandomRoomId}>
                    <IconRefresh size={16} />
                  </ThemeIcon>
                }
              />
            </Group>

            <Button onClick={joinRoom} size="lg" radius="md" fullWidth disabled={!name || !roomId}>
              Join Meeting
            </Button>
          </Stack>
        </Card>
      </Center>
    </Container>
  );
}

export default Home;
