// test-socket.js  (put this in miro-clone root)
const http = require('http');
const fs = require('fs');

const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Socket Test</title>
</head>
<body>
  <h3>Socket.io Test</h3>
  <div id="status">Connecting...</div>
  <div id="logs" style="font-family:monospace;font-size:13px"></div>

  <script src="http://localhost:3003/socket.io/socket.io.js"></script>
  <script>
    const TOKEN   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhNDMxNjNlYy0yODAwLTQ5ZDYtODQzOC1mYTBiMmQyODNhZWQiLCJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20iLCJpYXQiOjE3ODM4NzY2MjcsImV4cCI6MTc4Mzg3NzUyN30.7Qv6vH9DrWpLJRNz3miA5rLR-VBiBK6XJtGPVT0YykU';
    const BOARD_ID = 'PASTE_YOUR_BOARD_ID_HERE';

    function log(msg) {
      console.log(msg);
      document.getElementById('logs').innerHTML +=
        '<div>' + new Date().toLocaleTimeString() + ' — ' + msg + '</div>';
    }

    const socket = io('http://localhost:3003', {
      auth:       { token: 'Bearer ' + TOKEN },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      document.getElementById('status').textContent = '✅ Connected: ' + socket.id;
      log('Connected! ID: ' + socket.id);
      socket.emit('board:join', BOARD_ID);
    });

    socket.on('board:state', (data) => {
      log('Board state: ' + JSON.stringify(data));
    });

    socket.on('user:joined', (data) => {
      log('User joined: ' + JSON.stringify(data));
    });

    socket.on('connect_error', (err) => {
      document.getElementById('status').textContent = '❌ Error: ' + err.message;
      log('Error: ' + err.message);
    });

    socket.on('disconnect', (reason) => {
      log('Disconnected: ' + reason);
    });
  </script>
</body>
</html>
`;

http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
}).listen(9999, () => {
    console.log('Test page running at http://localhost:9999');
    console.log('Open that URL in your browser');
});