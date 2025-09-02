const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

let tables = {}; // { tableId: { players: [], boardState: ..., turn: 1 } }

io.on("connection", socket => {
  console.log("玩家連線:", socket.id);

  socket.emit("lobbyUpdate", Object.keys(tables));

  // 建立桌子
  socket.on("createTable", tableId => {
    if (!tables[tableId]) {
      tables[tableId] = { players: [], boardState: null, turn: 1 };
      io.emit("lobbyUpdate", Object.keys(tables));
    }
  });

  // 加入桌子
  socket.on("joinTable", tableId => {
    const table = tables[tableId];
    if (table && table.players.length < 2) {
      table.players.push(socket.id);
      const playerNum = table.players.length;
      socket.emit("playerAssigned", { playerNum, tableId });

      if (table.players.length === 2) {
        table.players.forEach(p => {
          io.to(p).emit("gameStart", { boardState: null, turn: 1 });
        });
      }
    }
  });

  // 玩家同步棋盤
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

  // 玩家離線
  socket.on("disconnect", () => {
    console.log("玩家離線:", socket.id);
    for (const [id, table] of Object.entries(tables)) {
      table.players = table.players.filter(p => p !== socket.id);
      if (table.players.length === 0) delete tables[id];
    }
    io.emit("lobbyUpdate", Object.keys(tables));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("伺服器運行在 http://localhost:" + PORT));
