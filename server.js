const express = require("express");
const cors = require("cors");
const app = express();
const http = require("http");
const bodyParser = require("body-parser");
const { Server } = require("socket.io");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
let port = process.env.PORT || 3001;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    // origin: "http://localhost:3000",
    origin: "https://jointalk.netlify.app",
    methods: ["GET", "POST"],
  },
});

let connectedUsers = {};

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // connectedUsers[socket.id] = socket.id;
  // io.emit("user connected", connectedUsers);

  socket.on("new user", (username) => {
    connectedUsers[socket.id] = {
      id: socket.id,
      username: username,
    };
    io.emit("user connected", connectedUsers);
  });

  console.log(connectedUsers);

  socket.emit("me", socket.id);
  socket.emit("connectedUsers", connectedUsers);

  socket.on("join_room", (data) => {
    socket.join(data);
  });

  socket.on("send_message", (data) => {
    const recipientSocket = Object.values(connectedUsers).find(
      (user) => user.id === data.recipient
    );
    if (recipientSocket) {
      socket.to(recipientSocket.id).emit("receive_message", data);
    } else {
      socket.emit("error", { message: "Recipient not found" });
    }
    // socket.to(data.room).emit("receive_message", data);
  });

  socket.on("disconnect", () => {
    socket.broadcast.emit("callEnded");
    console.log("User Disconnected", socket.id);
    delete connectedUsers[socket.id];
    io.emit("user disconnected", connectedUsers);
  });

  //Calling User
  socket.on("callUser", (data) => {
    try {
      io.to(data.userToCall).emit("callUser", {
        signal: data.signalData,
        from: data.from,
        name: data.name,
      });
      console.log("successfully called");
    } catch (error) {
      console.log(error);
    }
  });

  //Answering User
  socket.on("answerCall", (data) => {
    try {
      io.to(data.to).emit("callAccepted", data.signal);
      console.log("successfully answered");
    } catch (error) {
      console.log(error);
    }
  });
});

server.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
