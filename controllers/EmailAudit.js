// Función para enviar el correo electrónico
const { response, request } = require("express");
const nodemailer = require('nodemailer');
const winston = require('winston');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

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
        console.log("La contraseña de pasa es:", process.env.PASSWORD_GMAIL);
        console.log("El correo es:", process.env.GMAIL);

        const reportHtml = "<h1>Reporte De prueba de que funcia EMAIL</h1><p>Asegurese de que funciona el correo como esta confiurado aqui.</p>";
        await sendEmail(reportHtml);
        res.status(200).json({ msg: "Correo enviado exitosamente" });

    } catch (error) {

        res.status(500).json({ msg: "Error al enviar el correo", error: error.message });
        console.error("Error al enviar el correo:", error);

    }

}





async function sendEmail(reportHtml) {
    try {
        const { data, error } = await resend.emails.send({
            from: 'chatbotvazquez@bot.lara.com',
            to: 'jmlr231201@gmail.com',
            subject: 'Auditoría PRTG con UISP',
            html: reportHtml,
        });

        if (error) throw error;
        console.log('✅ Correo enviado con Resend:', data);
    } catch (e) {
        console.error('❌ Error al enviar con Resend:', e);
    }
}
module.exports = {
    probeEmail
}   
