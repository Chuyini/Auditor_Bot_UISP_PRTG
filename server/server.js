const express = require("express");
const cors = require("cors");
const bodyParser = require('body-parser');

class Server {

    constructor() {

        this.app = express();
        this.port = process.env.PORT;
        this.auditorPATH = "/api/audit";
        
        this.middlewares();
        this.routes();



    }

    middlewares() {

        this.app.use(bodyParser.json()); 
        this.app.use(cors());
    }
    routes() {

        //ruta a las rutas

        this.app.use(this.auditorPATH, require("../router/audit_UISP_PRTG"));

    }
    listen() {
        this.app.listen(this.port, () => {
            console.log(`servidor corriendo en el puerto ${this.port}`);
        });
    }


}

module.exports = Server;