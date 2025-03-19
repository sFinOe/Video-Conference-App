import { useEffect } from "react";
import { createTheme, MantineProvider } from "@mantine/core";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { io } from "socket.io-client";
import Home from "./pages/Home";
import Room from "./pages/Room";
import "@mantine/core/styles.css";

// socket connection
const socket = io("http://localhost:3000");

function App() {
  const theme = createTheme({
    primaryColor: "violet",
  });

  useEffect(() => {
    socket.on("connect", () => {
      console.log("connected to server");
    });
  }, []);

  return (
    <>
      <MantineProvider theme={theme}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/room" element={<Room socket={socket} />} />
          </Routes>
        </BrowserRouter>
      </MantineProvider>
    </>
  );
}

export default App;
