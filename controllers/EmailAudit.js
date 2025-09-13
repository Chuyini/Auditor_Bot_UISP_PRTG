// Función para enviar el correo electrónico
const { response, request } = require("express");
const nodemailer = require('nodemailer');
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'email-errors.log', level: 'error' }),
        new winston.transports.File({ filename: 'email-info.log' })
    ]
});



async function probeEmail(req = request, res = response) {
    try {
        const reportHtml = "<h1>Reporte De prueba de que funcia EMAIL</h1><p>Asegurese de que funciona el correo como esta confiurado aqui.</p>";
        await sendEmail(reportHtml);
        res.status(200).json({ msg: "Correo enviado exitosamente" });

    } catch (error) {

        res.status(500).json({ msg: "Error al enviar el correo", error: error.message });
        console.error("Error al enviar el correo:", error);

    }

}

async function sendEmail(reportHtml) {



    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL,
            pass: process.env.PASSWORD_GMAIL
        }
    });

    let mailOptions = {
        from: process.env.GMAIL,
        to: 'jmlr231201@gmail.com',
        subject: 'Auditoría PRTG con UISP',
        html: reportHtml
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            logger.error('Error al enviar el correo', { error });
        } else {
            logger.info('Correo enviado correctamente', { response: info.response });
        }
    });

}

module.exports = {
    probeEmail
}   
