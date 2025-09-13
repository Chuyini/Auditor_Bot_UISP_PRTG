const { Router } = require("express");
const CheckIp = require("./../controllers/audit_PRTG_FromUISP");
const auditEmail = require("../controllers/EmailAudit");

const router = Router();

//funiciones

router.get("/", CheckIp.checkIPServices);
router.get("/probeEmail", auditEmail.probeEmail);


module.exports = router;