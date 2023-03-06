const express = require("express");
const app = express();

const http = require("http").createServer(app);
const io = require("socket.io")(http);

const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { document } = new JSDOM("<!doctype html><html><body></body></html>")
  .window;
global.document = document;
const window = document.defaultView;
const $ = require("jquery")(window);

app.use("/css", express.static("css"));
app.use("/js", express.static("js"));
app.use("/assets", express.static("assets"));

app.get("/lawyerLogin/:roomId", (req, res) => {
  res.sendFile(__dirname + "/lawyerLogin.html");
});
app.get("/prisonerLogin/:roomId", (req, res) => {
  res.sendFile(__dirname + "/prisonerLogin.html");
});

app.get("/lawyer/:roomId", (req, res) => {
  res.sendFile(__dirname + "/lawyer.html");
});

app.get("/prisoner/:roomId", (req, res) => {
  res.sendFile(__dirname + "/prisoner.html");
});

app.get("/header", (req, res) => {
  res.sendFile(__dirname + "/header.html");
});

app.get("/login", (req, res) => {
  res.sendFile(__dirname + "/login.html");
});

app.get("/familyLogin", (req, res) => {
  res.sendFile(__dirname + "/familyLogin.html");
});

app.get("/index", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/family/:roomId", (req, res) => {
  res.sendFile(__dirname + "/family.html");
});

let message = {};

io.on("connection", (socket) => {
  socket.on("create_or_join", ({ role, room }) => {
    message = { role, room };
    socket.join(room);
    socket.to(room).emit("join_room", room);
  });

  socket.on("offer", (offer, room) => {
    socket.join(room);
    socket.to(room).emit("offer", offer);
  });

  socket.on("answer", (answer, room) => {
    socket.join(room);
    socket.to(room).emit("answer", answer);
  });

  socket.on("icecandidate", (candidate, room) => {
    socket.join(room);
    socket.to(room).emit("icecandidate", candidate);
  });

  // 管理后台登入，用于插话、获取律师端截屏
  socket.on("manageJoin", (room) => {
    socket.join(room);
  });

  // 通知律师端开启截屏
  socket.on("screencastOffer", (message) => {
    message.socketId = socket.id;
    socket.to(message.roomId).emit("screencastOffer", message);
  });

  socket.on("screencastAnswer", (message) => {
    let client = io.sockets.connected[message.socketId];
    if (client) {
      client.emit("screencastAnswer", message);
    }
  });

  socket.on("candidateToManage", (message) => {
    let client = io.sockets.connected[message.socketId];
    if (client) {
      client.emit("candidateToManage", message);
    }
  });

  socket.on("candidateToLawyer", (message) => {
    message.socketId = socket.id;
    socket.to(message.roomId).emit("candidateToLawyer", message);
  });

  // 转发笔记至在押人员屏幕
  socket.on("sendNote", (res) => {
    socket.to(res.roomId).emit("receiveNote", res);
  });

  // 转发图片至在押人员屏幕
  socket.on("sendPhoto", (res) => {
    socket.to(res.roomId).emit("receivePhoto", res);
  });

  // 转发挂断
  socket.on("sendQuit", (res) => {
    socket.to(res.roomId).emit("receiveQuit", res);
  });

  // 切回视频
  socket.on("sendVideo", (res) => {
    socket.to(res.roomId).emit("receiveVideo", res);
  });

  // 转发滚动
  socket.on("sendScroll", (res) => {
    socket.to(res.roomId).emit("receiveScroll", res);
  });

  // 后台管理挂断
  socket.on("sendHangUp", (message) => {
    socket.to(message).emit("hangUp");
  });

  socket.on("sendStartScreen", (room) => {
    socket.to(room).emit("startScreen", room);
  });

  socket.on("sendEndScreen", (room) => {
    socket.to(room).emit("endScreen", room);
  });

  // 管理后台插话
  socket.on("sendMessage", (res) => {
    if (res.messageInfo.roleType) {
      socket.to(res.roomId).emit("sendToLawyer", res);
    } else {
      socket.to(res.manageId).emit("sendToManage", res);
    }
  });

  // 三合一 缓存在押端端口
  socket.on("joinRoom", (msg) => {
    const { room, port } = msg;
    socket.join(room);
    socket.to(room).emit("setPort", port);
  });

  // 三合一 同步在押端端口
  socket.on("getRemotePort", (msg) => {
    let { room, port } = msg;
    socket.to(room).emit("setRemotePort", port);
  });

  // 三合一 0-律师会见 1-家属会见
  socket.on("setMeetingType", (msg) => {
    let { room, type } = msg;
    socket.to(room).emit("getMeetingType", type);
  });
});

http.listen(3000, () => {
  console.log("start server success, Listening port: 3000");
});
