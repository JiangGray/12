const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

let tables = {}; // { tableId: { players: [], boardState: ... } }

io.on("connection", socket => {
  console.log("New user connected:", socket.id);

  // 傳送大廳狀態
  socket.emit("lobbyUpdate", Object.keys(tables));

  socket.on("createTable", tableId => {
    if (!tables[tableId]) {
      tables[tableId] = { players: [], boardState: null, turn: 1 };
      io.emit("lobbyUpdate", Object.keys(tables));
    }
  });

  socket.on("joinTable", tableId => {
    const table = tables[tableId];
    if (table && table.players.length < 2) {
      table.players.push(socket.id);
      const playerNum = table.players.length;
      socket.emit("playerAssigned", { playerNum, tableId });

      if (table.players.length === 2) {
        io.to(table.players[0]).emit("gameStart", { boardState: null, turn: 1 });
        io.to(table.players[1]).emit("gameStart", { boardState: null, turn: 1 });
      }
    }
  });

  socket.on("move", ({ tableId, newState, nextTurn }) => {
    const table = tables[tableId];
    if (table) {
      table.boardState = newState;
      table.turn = nextTurn;
      table.players.forEach(p => {
        io.to(p).emit("updateState", { boardState: newState, turn: nextTurn });
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    for (const [id, table] of Object.entries(tables)) {
      if (table.players.includes(socket.id)) {
        delete tables[id];
      }
    }
    io.emit("lobbyUpdate", Object.keys(tables));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
