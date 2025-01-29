require('dotenv').config();


const Server = require("./server/server");

const server = new Server();

console.clear();

server.listen();

