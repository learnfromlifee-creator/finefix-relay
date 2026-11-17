const WebSocket = require('ws');
const PORT = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port: PORT });

// rooms: { pairCode: { server: ws, client: ws } }
const rooms = {};

wss.on('connection', (ws) => {
    ws.on('message', (data) => {
        let msg;
        try { msg = JSON.parse(data); } catch (e) { return; }

        if (msg.type === 'register') {
            // role: "server" (Moto) or "client" (Realme), code: shared pair code
            const code = msg.code;
            if (!rooms[code]) rooms[code] = {};
            rooms[code][msg.role] = ws;
            ws.roomCode = code;
            ws.role = msg.role;
            ws.send(JSON.stringify({ type: 'registered', role: msg.role }));
            return;
        }

        // Relay everything else to the other side of the same room
        const room = rooms[ws.roomCode];
        if (!room) return;
        const target = ws.role === 'server' ? room.client : room.server;
        if (target && target.readyState === WebSocket.OPEN) {
            target.send(data);
        }
    });

    ws.on('close', () => {
        if (ws.roomCode && rooms[ws.roomCode]) {
            delete rooms[ws.roomCode][ws.role];
        }
    });
});

console.log('Relay server running on port ' + PORT);
