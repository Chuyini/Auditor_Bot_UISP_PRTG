const { Router } = require("express");
const CheckIp = require("./../controllers/audit_PRTG_FromUISP");

const router = Router();
 
//funiciones

router.get("/", CheckIp.checkIPServices);


module.exports = router;