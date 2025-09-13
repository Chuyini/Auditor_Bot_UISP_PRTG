const { response, request } = require("express");
const https = require("https");
const axios = require("axios");
const informationUISP = require("../shared/statusServices");
const stringSimilarity = require('string-similarity');
const toolsPRTG_Uisp = require("../shared/UtilsPrtgUisp");
const html = require('../shared/htmlMail');
const nodemailer = require('nodemailer');


// Variable global para almacenar las actualizaciones realizadas
let globalUpdates = {
    updatedSiteIDs: new Set(), // Usamos Set para evitar duplicados
    updateIPPublic: new Set(),
    updateIDClient: new Set(),
    devicesWithoutSiteID: new Set(),
    askAboutDevicesWithoutSite: new Set(),
    noIPPublica: new Set(),
    switchDevices: new Set(),
    withoutIdsTags: new Set(),
    trueServicesEnd: new Set(),
    trueServicesSuspended: new Set(),
    finalNotFoundServices: new Set()
};

// Función principal con reintentos
async function checkIPServices(req = request, res = response) {
    let retries = 0;
    const maxRetries = 1;
    let apiResponsePRTG; // Declarar la variable fuera del bucle
    //Setear la variables de 0
    globalUpdates.trueServicesEnd = new Set();
    globalUpdates.trueServicesSuspended = new Set();
    globalUpdates.finalNotFoundServices = new Set();
    globalUpdates.withoutIdsTags = new Set();
    globalUpdates.switchDevices = new Set();
    globalUpdates.devicesWithoutSiteID = new Set();
    globalUpdates.askAboutDevicesWithoutSite = new Set();
    globalUpdates.updatedSiteIDs = new Set();
    globalUpdates.noIPPublica = new Set();
    globalUpdates.updateIPPublic = new Set();
    globalUpdates.updateIDClient = new Set();
    

    while (retries < maxRetries) {
        try {



            const agent = new https.Agent({
                rejectUnauthorized: false,
            });

            // URLs de las APIs
            const apiUrlDevicesUISP = "https://uisp.elpoderdeinternet.mx/v2.1/devices";
            const apiUrlDevicePRTG = `http://45.189.154.179:8045/api/table.json?content=devices&columns=host,group,device,name,comments,tags,sensor,objid&count=3000&apitoken=${process.env.PRTG_UISP_DEVICE}`;

            // Llamadas a las APIs
            const apiResponseUISP = await axios.get(apiUrlDevicesUISP, {
                headers: {
                    "Content-Type": "application/json",
                    "x-auth-token": process.env.UISP_GET_DEVICES,
                },
                httpsAgent: agent,
                timeout: 30000,
            });

            apiResponsePRTG = await axios.get(apiUrlDevicePRTG, { // Asignar a la variable declarada fuera del bucle
                headers: {
                    "Content-Type": "application/json",
                    "x-auth-token": process.env.PRTG_UISP_DEVICE,
                },
                httpsAgent: agent,
                timeout: 30000,
            });

            console.log("Éxito en las llamadas de APIs de UISP y PRTG");

            const devicesUISP = apiResponseUISP.data;
            let devicesPRTG = apiResponsePRTG.data.devices;

            // 1. Filtrar dispositivos de tipo switch
            devicesPRTG = devicesPRTG.filter((device) => {
                if (device.tags.includes("sw")) {
                    globalUpdates.switchDevices.add(device); // Usamos add para evitar duplicados
                    return false;
                }
                return true;
            });

            // 2. Filtrar dispositivos cancelados
            devicesPRTG = devicesPRTG.filter((device) => {
                if (device.tags.includes("cancelado")) {
                    return false; // No los incluimos en el procesamiento
                }
                return true;
            });

            // 3. Filtrar dispositivos de sonda local o especiales
            devicesPRTG = devicesPRTG.filter((device) => {
                if (device.name.includes("Servidor central de PRTG") || device.name.includes("Dispositivo de sonda") || (device.group == 'Routers y Sensores')) {
                    return false; // No los incluimos en el procesamiento
                }
                return true;
            });

            // 4. Encontrar dispositivos duplicados
            const deviceDuplicates = findDuplicateDevices(devicesPRTG);

            // 5. Validar IDs de sitio
            for (const device of devicesPRTG) {
                try {
                    await toolsPRTG_Uisp.cleanAndRepostMessage(device);
                    const statusOrSiteID = await toolsPRTG_Uisp.isIdSiteOkay(devicesUISP, device);

                    if (typeof statusOrSiteID === 'string' && /^[a-zA-Z0-9-]+$/.test(statusOrSiteID)) {
                        const newMessage = `${device.comments}\n\n #$Site=${statusOrSiteID}`;

                        await toolsPRTG_Uisp.postMessageIDSite(device, newMessage);

                        globalUpdates.devicesWithoutSiteID.add(device); // Usamos add para evitar duplicados
                        globalUpdates.updatedSiteIDs.add(device); // Usamos add para evitar duplicados
                        console.log("Entra a la a   condicion  ");

                        continue;
                    }

                    switch (statusOrSiteID) {
                        case 0: // Sin comentarios
                        case 1: // Formato incorrecto
                        case 2: // No se encontró el ID
                            const matchingDevices = devicesUISP.filter(uispDevice =>
                                uispDevice.ipAddress === device.host ||
                                uispDevice.ipAddress === `${device.host}/24` ||
                                uispDevice.ipAddress === `${device.host}/23` ||
                                uispDevice.ipAddress === `${device.host}/22` ||
                                uispDevice.ipAddress === `${device.host}/21` ||
                                uispDevice.ipAddress === `${device.host}/20`
                            );


                            if (!matchingDevices.length) {
                                console.warn(`No se encontró un dispositivo UISP para la IP: ${device.host}`);
                                continue;
                            }

                            const newIDSite = matchingDevices[0].identification.site.id;
                            const newMessage = `${device.comments}\n\n#$Site=${newIDSite}`;
                            await toolsPRTG_Uisp.postMessageIDSite(device, newMessage);
                            globalUpdates.devicesWithoutSiteID.add(device); // Usamos add para evitar duplicados
                            globalUpdates.updatedSiteIDs.add(device); // Usamos add para evitar duplicados
                            break;

                        case 3: // Sin ID de sitio en UISP, requiere consulta
                            globalUpdates.askAboutDevicesWithoutSite.add(device); // Usamos add para evitar duplicados
                            break;

                        case 4: // Todo está en orden, ID coinciden
                            console.log(`Dispositivo ${device.name} ya tiene un ID de sitio válido.`);
                            break;

                        case 6: // Dispositivo no encontrado en UISP
                            console.error(`Dispositivo ${device.name} no encontrado en UISP con IP ${device.host}.`);
                            break;

                        default: // Caso desconocido
                            console.warn(`Estado desconocido (${statusOrSiteID}) para el dispositivo ${device.name}.`);
                    }
                } catch (error) {
                    console.error(`Error procesando el dispositivo ${device.name}:`, error);
                }
            }

            // 6. Validar IDs de clientes
            for (const device of devicesPRTG) {
                try {
                    await toolsPRTG_Uisp.cleanAndRepostMessage(device);
                    const responsIDFunction = await informationUISP.found_Id_Uisp_Prtg(device);


                    if (responsIDFunction?.id && responsIDFunction.consult === false) {
                        device.idClient = responsIDFunction.id;
                    } else if (responsIDFunction?.id && responsIDFunction.consult === true) {
                        globalUpdates.updateIDClient.add(device); // Usamos add para evitar duplicados
                    } else if (!responsIDFunction || !responsIDFunction.id) {
                        globalUpdates.withoutIdsTags.add(device); // Usamos add para evitar duplicados
                    }
                } catch (error) {
                    console.error(`Error procesando el dispositivo bloque de validacion de IDs ${device.name || device.host}:`, error);
                }
            }

            // 7. Validar IPs públicas
            for (const device of devicesPRTG) {
                await toolsPRTG_Uisp.cleanAndRepostMessage(device);

                const resp = await informationUISP.found_ip_services(device, devicesUISP);

                if (resp.updateC === true && resp.ip) {
                    const oldIP = await toolsPRTG_Uisp.identifyIPPublic(device);
                    if (oldIP) {
                        const betterMessageIp = device.comments.replace(`#$IP_Publica=${oldIP}`, ` #$IP_Publica=${resp.ip}`);
                        globalUpdates.updateIPPublic.add(device); // Usamos add para evitar duplicados
                        await toolsPRTG_Uisp.postMessageIPComments(device, betterMessageIp);
                    } else {
                        const NewMessageIp = device.comments + ` #$IP_Publica=${resp.ip}`;
                        globalUpdates.updateIPPublic.add(device); // Usamos add para evitar duplicados
                        await toolsPRTG_Uisp.postMessageIPComments(device, NewMessageIp);
                        await toolsPRTG_Uisp.cleanAndRepostMessage(device);
                    }
                } else if (resp.updateC === false && resp.ip) {
                    console.log("Todo en orden con la IP pública");
                } else if (resp.updateC === false && !resp.ip) {
                    console.log("NO IP PUBLICA\n");
                    globalUpdates.noIPPublica.add(device); // Usamos add para evitar duplicados
                }
            }

            // 8. Buscar dispositivos no encontrados en UISP
            const ipsNoEncontradas = [];
            devicesPRTG.forEach(devicePRTG => {
                const foundDevice = devicesUISP.find(deviceUISP =>
                    deviceUISP.ipAddress === devicePRTG.host ||
                    deviceUISP.ipAddress === `${devicePRTG.host}/24` ||
                    deviceUISP.ipAddress === `${devicePRTG.host}/23` ||
                    deviceUISP.ipAddress === `${devicePRTG.host}/22` ||
                    deviceUISP.ipAddress === `${devicePRTG.host}/21` ||
                    deviceUISP.ipAddress === `${devicePRTG.host}/20`
                );
                if (!foundDevice) {
                    const notDevicesF = {
                        "company": devicePRTG.group,
                        "name": devicePRTG.name,
                        "ip": devicePRTG.host,
                        "tags": devicePRTG.tags
                    };
                    ipsNoEncontradas.push(notDevicesF);
                }
            });

            // 9. Verificar servicios suspendidos y cancelados
            if (ipsNoEncontradas.length > 0) {
                let servicesPRTG_NotFounded = ipsNoEncontradas;
                const uniqueIDs = new Set();
                const uniqueListIDsDevices = servicesPRTG_NotFounded.filter(device => {
                    if (device.idClient && !uniqueIDs.has(device.idClient)) { // Verificar si idClient está definido
                        uniqueIDs.add(device.idClient);
                        return true;
                    }
                    return false;
                });

                const servicesEndAndSuspended = [];
                for (const service of uniqueListIDsDevices) {
                    try {
                        if (service.idClient) { // Verificar si idClient está definido
                            const result = await informationUISP.ServicesOfCompany(service.idClient);
                            if (result) {
                                servicesEndAndSuspended.push(result);
                            }
                        } else {
                            console.warn(`ID de cliente no definido para el dispositivo: ${service.name}`);
                        }
                    } catch (error) {
                        console.error(`Error obteniendo servicios para ID Cliente: ${service.idClient} - ${error.message}`);
                    }
                }

                for (const devPRTG of servicesPRTG_NotFounded) {
                    servicesEndAndSuspended.forEach((serviceGroup) => {
                        if (serviceGroup.servicesSuspended.length > 0) {
                            serviceGroup.servicesSuspended.forEach(service => {
                                if (stringSimilarity.compareTwoStrings(devPRTG.name, service.name) > 0.6) {
                                    globalUpdates.trueServicesSuspended.add(devPRTG); // Usamos add para evitar duplicados
                                }
                            });
                        }

                        if (serviceGroup.servicesEnded.length > 0) {
                            serviceGroup.servicesEnded.forEach(service => {
                                if (stringSimilarity.compareTwoStrings(devPRTG.name, service.name) > 0.6) {
                                    globalUpdates.trueServicesEnd.add(devPRTG); // Usamos add para evitar duplicados
                                }
                            });
                        }
                    });
                }

                // Guardar dispositivos no encontrados
                servicesPRTG_NotFounded.forEach(device => globalUpdates.finalNotFoundServices.add(device)); // Usamos add para evitar duplicados
            }

            // Si no hay más actualizaciones pendientes, salimos del bucle
            if (globalUpdates.updatedSiteIDs.size === 0 && globalUpdates.updateIPPublic.size === 0 && globalUpdates.updateIDClient.size === 0) {
                break;
            }

            retries++;
            console.log(`Reintento número ${retries} de ${maxRetries}`);
        } catch (error) {
            console.error("Ocurrió un error en el servidor", error);
            retries++;
            console.log(`Reintento número ${retries} de ${maxRetries}`);
        }
    }

    // Generar el reporte final con todas las actualizaciones
    if (apiResponsePRTG && apiResponsePRTG.data) { // Verificar si apiResponsePRTG está definido
        const totalDev = apiResponsePRTG.data.devices.length;
        const htmlReport = html.generateReportHtml(
            new Set(Array.from(new Set(globalUpdates.trueServicesEnd))), // Convertimos Set a Array
            Array.from(new Set(globalUpdates.trueServicesSuspended)),
            Array.from(new Set(globalUpdates.finalNotFoundServices)),
            Array.from(new Set(globalUpdates.withoutIdsTags)),
            Array.from(new Set(globalUpdates.switchDevices)),
            Array.from(new Set(globalUpdates.devicesWithoutSiteID)),
            Array.from(new Set(globalUpdates.askAboutDevicesWithoutSite)),
            Array.from(new Set(globalUpdates.updatedSiteIDs)),
            Array.from(new Set(globalUpdates.noIPPublica)),
            Array.from(new Set(globalUpdates.updateIPPublic)),
            Array.from(new Set(globalUpdates.updateIDClient)),
            totalDev
        );

        await sendEmail(htmlReport);

        res.status(200).json({
            "Mensaje": "Dispositivos auditados",
        });




        console.log("Fue mandado con éxito el mensaje");
    } else {
        console.error("No se pudo obtener la respuesta de PRTG.");
        res.status(500).json({
            "msg": "No se pudo obtener la respuesta de PRTG.",
        });
    }
}

// Función para encontrar dispositivos duplicados
function findDuplicateDevices(devices) {
    const occurrences = {};
    const duplicates = [];

    devices.forEach((device, index) => {
        if (occurrences[device.host]) {
            occurrences[device.host].count++;
            occurrences[device.host].indexes.push(index);
        } else {
            occurrences[device.host] = { count: 1, indexes: [index] };
        }
    });

    for (const key in occurrences) {
        if (occurrences[key].count > 1) {
            occurrences[key].indexes.forEach((i) => duplicates.push(devices[i]));
        }
    }

    return duplicates;
}

// Función para enviar el correo electrónico
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
        to: 'jmlr231201@gmail.com',//'noc@elpoderdeinternet.mx',
        subject: 'Auditoría PRTG con UISP',
        html: reportHtml
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log('Error al enviar el correo:', error);
        } else {
            console.log('Correo enviado:', info.response);
        }
    });
}

module.exports = { checkIPServices };