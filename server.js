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

  // 傳送大廳資料
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

  // 同步棋盤
  socket.on("move", ({ tableId, newS
