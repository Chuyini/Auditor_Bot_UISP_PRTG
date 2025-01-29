
const axios = require("axios");

async function postMessageIDSite(PRTG_device, newMessage) {
    try {


        if (!newMessage || !PRTG_device || !PRTG_device.objid) {
            throw new Error("Faltaron parametros");
        }
        const encodedMessage = encodeURIComponent(newMessage);
        const apiUrlDevicePRTG = `http://45.189.154.179:8045/api/setobjectproperty.htm?name=comments&value=${encodedMessage}&id=${PRTG_device.objid}&apitoken=${process.env.PRTG_UISP_DEVICE}`;


        console.log(`Mensaje para ${PRTG_device.name} : ${newMessage} id : ${PRTG_device.objid}`);
        axios.get(apiUrlDevicePRTG, {
            headers: {
                Accept: '*/*',
                'Accept-Encoding': 'gzip, deflate, br',
                Connection: 'keep-alive'
            },

            timeout: 30000,
        }).then(response => {
            console.log(response.data);
        }).catch(error => {
            console.error(error.response?.data || error.message);
        });
    } catch (e) {

        console.error("Error en el bloque de postear un id de sitio mensajes en PRTG: ", e);

    }


}


async function postMessageIDClient(PRTG_device, newMessage) {
    try {
        if (!newMessage || !PRTG_device || !PRTG_device.objid) {
            throw new Error("Faltaron parámetros");
        }

        // Normaliza el mensaje para evitar secuencias de escape extra
        const normalizedMessage = newMessage.replace(/\r?\n/g, "\n").trim(); // Reemplaza \r\n o \r por \n
        const encodedMessage = encodeURIComponent(normalizedMessage); // Codifica el mensaje para la URL

        const apiUrlDevicePRTG = `http://45.189.154.179:8045/api/setobjectproperty.htm?name=comments&value=${encodedMessage}&id=${PRTG_device.objid}&apitoken=${process.env.PRTG_UISP_DEVICE}`;


        console.log(`Mensaje para ${PRTG_device.name}: ${normalizedMessage} | ID: ${PRTG_device.objid}`);

        // Realizar la solicitud HTTP
        await axios.get(apiUrlDevicePRTG, {
            headers: {
                Accept: '*/*',
                'Accept-Encoding': 'gzip, deflate, br',
                Connection: 'keep-alive',
            },
            timeout: 30000,
        });

        console.log("Mensaje enviado con éxito");
    } catch (e) {
        console.error("Error en el bloque postear un nuevo id de cliente mensajes en PRTG:", e);
    }
}

async function postMessageIPComments(PRTG_device, newMessage) {
    try {
        if (!newMessage || !PRTG_device || !PRTG_device.objid) {
            throw new Error("Faltaron parámetros");
        }

        // Normaliza el mensaje para evitar secuencias de escape extra
        const normalizedMessage = newMessage.replace(/\r?\n/g, "\n").trim(); // Reemplaza \r\n o \r por \n
        const encodedMessage = encodeURIComponent(normalizedMessage); // Codifica el mensaje para la URL

        const apiUrlDevicePRTG = `http://45.189.154.179:8045/api/setobjectproperty.htm?name=comments&value=${encodedMessage}&id=${PRTG_device.objid}&apitoken=${process.env.PRTG_UISP_DEVICE}`;


        console.log(`Mensaje para ${PRTG_device.name}: ${normalizedMessage} | ID: ${PRTG_device.objid}`);

        // Realizar la solicitud HTTP
        await axios.get(apiUrlDevicePRTG, {
            headers: {
                Accept: '*/*',
                'Accept-Encoding': 'gzip, deflate, br',
                Connection: 'keep-alive',
            },
            timeout: 30000,
        });

        console.log("Mensaje enviado con éxito");
    } catch (e) {
        console.error("Error en el bloque de actualizar la ip  mensajes en PRTG:", e);
    }
}




// Esta función verifica si el ID de servicio existe en los comentarios de PRTG y si coincide con UISP
async function isIdSiteOkay(uispNet_devices, PRTG_device) {

    console.log("\n**********AUDITORÍA ID SITE***********\n");
    const message = PRTG_device.comments; // Capturamos los comentarios


    if (!message) {//si no hay comentarios
        console.log(`${PRTG_device.device}: Sin comentarios de PRTG`);
        return 0;
    }

    if (!message.includes('#$Site=')) {//si no hay sitio de clientes
        console.log(`${PRTG_device.device}: Falta ID site`);
        return 1;
    }

    // Busca el dispositivo correspondiente en UISP de PRTG con la IP de PRTG
    const uispDev = uispNet_devices.filter(uispDevice =>
        uispDevice.ipAddress === PRTG_device.host ||
        uispDevice.ipAddress === `${PRTG_device.host}/24`
    );

    if (uispDev.length > 0) {
        // Validar y extraer el identificador del mensaje de comentarios
        const match = message?.match(/#\$Site=([^\s]+)/);
        if (!match) {
            console.error('El mensaje no hace MATCH con el formato para ID de Sitio');
            return 2;
        }
        const identifierPRTG_message = match[1];

        // Validar que el dispositivo encontrado tiene un ID de sitio
        const siteID = uispDev[0].identification.site.id;
        if (!siteID) {
            console.error('No se encontró el ID del sitio en el JSON de UISP, preguntar');
            return 3;
        }

        console.log(`${siteID}: ID de sitio encontrado en UISP.`);

        if (identifierPRTG_message !== siteID) {
            console.log(`El ID de sitio en el mensaje (${identifierPRTG_message}) no coincide con el ID en UISP (${siteID}) para el dispositivo: ${PRTG_device.name} Preguntar al administrador si se hizo algun cambio`);
            return siteID; // Regresar el ID de sitio de UISP
        } else {
            console.log(`El dispositivo ${PRTG_device.name} tiene un ID de sitio UISP válido: ${siteID}`);
            return 4; // Todo está en orden
        }
    } else {
        console.log(`No se encontró el dispositivo ${PRTG_device.name} con la IP ${PRTG_device.host} en UISP.`);
        return 6;
    }

}
async function cleanAndRepostMessage(PRTG_device) {
    try {
        if (!PRTG_device || !PRTG_device.objid || !PRTG_device.comments) {
            throw new Error("Faltan parámetros o el dispositivo no tiene comentarios.");
        }

        let originalMessage = String(PRTG_device.comments);
        console.log("Comentarios de PRTG: ", originalMessage);

        // Convertir la cadena en un arreglo de caracteres
        let charArray = originalMessage.split('');

        // Recorrer el arreglo de caracteres
        for (let i = 0; i < charArray.length - 1; i++) {
            if (charArray[i] === '\\' && (charArray[i + 1] === 'r' || charArray[i + 1] === 'n')) {
                // Reemplazar \ y el siguiente carácter por espacios
                charArray[i] = ' ';
                charArray[i + 1] = ' ';
            }
        }

        // Convertir el arreglo de caracteres de nuevo a una cadena
        let cleanedMessage = charArray.join('').trim();

        if (originalMessage === cleanedMessage) {
            console.log(`El mensaje de ${PRTG_device.name} ya estaba limpio. No se requiere reposteo. mensaje ${cleanedMessage}`);
            return;
        }

        // Postear el mensaje limpio al sistema sin volver a codificar
        console.log(`Mensaje original para ${PRTG_device.name}: ${originalMessage}`);
        console.log(`Mensaje limpio para ${PRTG_device.name}: ${cleanedMessage}`);

        await postMessageIDSite(PRTG_device, cleanedMessage); // Llama a la función sin volver a codificar el mensaje
        console.log(`Mensaje actualizado para el dispositivo ${PRTG_device.name}.`);
    } catch (error) {
        console.error(`Error al limpiar y repostear el mensaje del dispositivo ${PRTG_device?.name}:`, error);
    }
}




function identifyIDClient(sensorData) {

    try {
        if (!sensorData || !sensorData.comments) {
            console.error("Elementos faltantes o error en el bloque de identificar el ID de los comentarios");
            return null;
        }

        // Normaliza el mensaje para evitar problemas con secuencias de escape
        const message = sensorData.comments.replace(/\r?\n/g, "\n").trim();
        const match = message.match(/#\$idClientU=([^\s]+)/);

        if (!match) {
            console.error("El mensaje no contiene un ID de cliente");
            return null;
        } else {
            const identifierPRTG_message = match[1];
            console.log("Éxito en encontrar el ID de Cliente en los mensajes", identifierPRTG_message);
            return identifierPRTG_message;
        }

    } catch (error) {

        console.log("Error en el bloque de identificar el cliente ", error);

    }

}
function identifySiteID(sensorData) {
    try {
        if (!sensorData || !sensorData.comments) {
            throw new Error("Error en el bloque de obtener el ID de sitio de los comentarios");
        }

        const message = sensorData.comments;
        // Validar y extraer el identificador del mensaje de comentarios
        const match = message?.match(/#\$Site=([^\s]+)/);
        if (!match) {
            console.error('El mensaje no hace MATCH con el formato para ID de Sitio');
            return null;
        } else {
            console.log("El match id sitio es: ", match[1]);
            const cleanIdSite = match[1].replace("#$Sitio=", ""); // Extraer el ID de sitio limpio
            return cleanIdSite;
        }
    } catch (error) {
        console.log("Error en el bloque de identificar el ID de sitio ", error);
    }
}





function identifyIPPublic(sensorData) {

    try {
        if (!sensorData || !sensorData.comments) {

            throw new Error("Error en el bloque de obtener el ID  de sitio de los comentarios");
        }
        const message = sensorData.comments;
        // Validar y extraer el identificador del mensaje de comentarios
        const match = message?.match(/#\$IP_Publica=([^\s]+)/);
        if (!match) {
            console.warn('El mensaje no hace MATCH con el formato para IP Publica');
            return null;
        } else {
            console.log("El match de ip Publica es: ", match[1]);
            const cleanIP = match[1].replace("#$IP_Publica=", "");
            return cleanIP;
        }

    } catch (error) {
        console.log("Error en el bloque de identiciar la IP Publica: ", error);
    }



}




module.exports = { isIdSiteOkay, postMessageIDSite, postMessageIDClient, cleanAndRepostMessage, identifyIDClient, identifySiteID, identifyIPPublic,postMessageIPComments }