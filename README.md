# - Video Conferencing Application

A real-time video conferencing application built with React, WebRTC, and Socket.io that enables users to connect via video calls, share their screen,
and chat in real-time.

## Features

- **Real-time video conferencing** with multiple participants
- **Screen sharing** functionality
- **Live chat** during meetings
- **Audio/video controls** (mute/unmute, enable/disable camera)
- **Participant status indicators** (shows when cameras are off)
- **Room ID copying** for easy sharing
- **Responsive layout** adapting to different screen sizes

## Tech Stack

- **Frontend**: React, TypeScript, Mantine UI
- **Real-time Communication**: WebRTC (via PeerJS)
- **Signaling**: Socket.io
- **Styling**: Mantine components with custom styling

## Prerequisites

Before running this application, make sure you have the following installed:

- Node.js (v14.0.0 or later)
- npm (v6.0.0 or later)
- Git

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/sFinOe/Video-Conference-App.git
   cd Video-Conference-App
   ```

2. Install dependencies:

   ```bash
   # Install server dependencies
   cd server
   npm install

   # Install frontend dependencies
   cd frontend
   npm install
   ```

## Configuration

The application uses a default configuration that works out of the box, but you can modify the following if needed:

## Running the Application (Local Development)

1. Start the server:

   ```bash
   # From the root directory
   npm run dev
   ```

2. In a separate terminal, start the frontend:

   ```bash
   cd frontend
   npm run dev
   ```

3. Access the application at: `http://localhost:5173`

## Using the Application

### Creating a Meeting

1. Open the application in your browser
2. Enter your name and click "Create Meeting"
3. A new meeting room will be created with a unique Room ID
4. Share the Room ID with others to invite them to join

### Joining a Meeting

1. Open the application in your browser
2. Enter your name and the Room ID provided to you
3. Click "Join Meeting"
4. Grant camera and microphone permissions when prompted

### During a Meeting

#### Video Controls

- **Toggle Microphone**: Click the microphone icon to mute/unmute
- **Toggle Camera**: Click the camera icon to turn your camera on/off
- **Share Screen**: Click the screen share icon to share your screen
- **End Call**: Click the red phone button to leave the meeting

#### Chat

- Click the chat icon to open the chat panel
- Type your message and press Enter or click the send button
- Chat will be visible to all participants in the meeting

#### Viewing Participants

- All participants are displayed in a responsive grid
- When a participant turns off their camera, their avatar will be displayed
- The number of participants is shown in the top-right corner

## Troubleshooting

### Camera or Microphone Not Working

- Ensure your browser has permission to access your camera and microphone
- Check if another application is using your camera
- Try selecting a different camera or microphone in your browser settings

### Connection Issues

- Ensure you have a stable internet connection
- Check if your firewall is blocking WebRTC connections
- Try using a different browser (Chrome and Firefox are recommended)

### Screen Sharing Not Working

- Make sure you're using a compatible browser (Chrome, Edge, or Firefox)
- Ensure you grant screen sharing permissions when prompted
- Some operating systems may require additional permissions for screen sharing

## Browser Compatibility

The application works best on the following browsers:

- Google Chrome (latest version)
- Mozilla Firefox (latest version)
- Microsoft Edge (Chromium-based, latest version)

Safari has limited support for some WebRTC features.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [PeerJS](https://peerjs.com/) for simplifying WebRTC implementation
- [Socket.io](https://socket.io/) for real-time communication
- [Mantine UI](https://mantine.dev/) for the UI components
- [React](https://reactjs.org/) for the frontend framework

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
