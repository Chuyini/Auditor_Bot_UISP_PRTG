const { response, request } = require("express");
const https = require("https");
const axios = require("axios");
const informationUISP = require("../shared/statusServices");
const stringSimilarity = require('string-similarity');
const toolsPRTG_Uisp = require("../shared/UtilsPrtgUisp");
const html = require('../shared/htmlMail');

const nodemailer = require('nodemailer');

async function checkIPServices(req = request, res = response) {
    try {
        const agent = new https.Agent({
            rejectUnauthorized: false,
        });

        const apiUrlDevicesUISP = "https://uisp.elpoderdeinternet.mx/v2.1/devices";
        const apiUrlDevicePRTG = `http://45.189.154.179:8045/api/table.json?content=devices&columns=host,group,device,name,comments,tags,sensor,objid&count=420&apitoken=${process.env.PRTG_UISP_DEVICE}`;

        const apiResponseUISP = await axios.get(apiUrlDevicesUISP, {
            headers: {
                "Content-Type": "application/json",
                "x-auth-token": process.env.UISP_GET_DEVICES,
            },
            httpsAgent: agent,
            timeout: 30000,
        });

        const apiResponsePRTG = await axios.get(apiUrlDevicePRTG, {
            headers: {
                "Content-Type": "application/json",
                "x-auth-token": process.env.PRTG_UISP_DEVICE,
            },
            httpsAgent: agent,
            timeout: 30000,
        });

        console.log("Éxito en las llamadas de APIs de UISP y PRTG");



        const devicesUISP = apiResponseUISP.data;
        const switchDevices = [];
        let devicesPRTG = apiResponsePRTG.data.devices;


        // Debemos filtrar aquellos dispositivos de PRTG que sean Switches
        // ya que puede ser que haya dispositivos con misma IP pero interfaz diferente
        // En ese caso la interfaz representa el servicio y no la IP 
        // Debemos darle un trato diferente al habitual

        //Primero debemos asegurarnos que todo está en regla 

        //asegurarnos que se tenga  id de cliente en comentarios
        //asegurarnos que haya id de Sitio
        //Asegurarno que que haya id de servicio




        devicesPRTG = devicesPRTG.filter((device) => {
            if (device.tags.includes("sw")) {
                switchDevices.push(device); // <-- metemos lo de tipo switch
                return false; // <-- quitamos de la lista principal
            }
            return true;
        });


        //Imprimimos en la terminal los de tipo switch
        console.log("***********************");
        switchDevices.forEach((deviceSW) => {
            console.log("* Dispositivos con Switch ", deviceSW);
            console.log("-------------------------");
        });
        console.log("***********************");
        console.log("Total switches: ", switchDevices.length); // <-- aquí puede ser el mismo switch pero son servicios diferentes


        //Ahora vemos cuales están explicistamente cancelados en PRTG para no tratar con ellos

        const canceledDevices = [];//<-- Dispositivos cancelados}

        devicesPRTG = devicesPRTG.filter((device) => {
            if (device.tags.includes("cancelado")) {
                canceledDevices.push(device); // <-- metemos los cancelados
                return false; // <-- quitamos de la lista principal
            }
            return true;
        });
        console.log("\n----------AHORA DISPOSITIVOS EXPLICITAMENTE CANCELADOS PRTG--------------\n");


        canceledDevices.forEach((device) => {
            console.log(device.name);

        });
        console.log("\n****************FIN DISPOSITIVOS EXPLICITAMENTE CANCELADOS PRTG*************\n");

        console.log("Dispositivos Cancelados en PRTG: ", canceledDevices.length);

        //Ahora los dispositivos como sonda local o dispositivos de sonda 

        console.log("Quitamos sonda local\n", canceledDevices.length);


        const noSondaOrSpecialDevices = [];

        devicesPRTG = devicesPRTG.filter((device) => {
            if (device.name.includes("Servidor central de PRTG") || device.name.includes("Dispositivo de sonda") || (device.group == 'Routers y Sensores')) {
                noSondaOrSpecialDevices.push(device); // <-- metemos lo de tipo switch
                return false; // <-- quitamos de la lista principal
            }
            return true;
        });


        console.log("2.Dispositivos Cancelados + Sonda Local y dispositivos de sonda en PRTG: ", canceledDevices.length + noSondaOrSpecialDevices.lengthx);


        // Ahora hay que ver cuáles están repetidos, ya que son dispositivos no sensores

        console.log("\n***********AHORA DISPOSITIVOS DUPLICADOS*****************\n");


        const deviceDuplicates = findDuplicateDevices(devicesPRTG);

        console.log("Cantidad: ", deviceDuplicates.length);
        deviceDuplicates.forEach((device) => {
            console.log(device);

        });
        console.log("\n****************FIN DISPOSITIVOS DUPLICADOS*************\n");

        console.log("Dispositivos duplicados: ", deviceDuplicates.length);
        console.log("++++++++++++++++++++++++++++++++");
        //**************************FILTRADO DE LOS DATOS FINALIZADOS DE PRTG *************************** */


        /*Listo hasta este punto no tenemos los 
            *Dispositivos de tipo switch 
            *Dispositivos duplicados
            *Dispositivo de sonda
            *Dispositivos Cancelados en PRTG

        Nota : Lo ideal es que manejemos todos pero de momento en esta versión así está bien 
        Cuando le pongamos ID de servicio, ID de cliente UISP y ID de sitio será muy sencillo
        Debemos hacer un respaldo antes de hacer eso*/


        //Vamos a checar cuales no tiene id de Cliente



        const devicesWithoutSiteID = []; // Dispositivos que necesitan actualizar ID de sitio
        const ipAndSite = []; // Relación de IPs con sus sitios
        const askAboutDevicesWithoutSite = []; // Dispositivos que requieren consulta con el administrador no tienen id de sitio

        const updatedSiteIDs = []; // Nuevos IDs de sitio aplicados




        //Bloque de validacion de ID de sitio
        for (const device of devicesPRTG) {
            try {
                // Verifica el estado del ID de sitio
                const statusOrSiteID = await toolsPRTG_Uisp.isIdSiteOkay(devicesUISP, device);

                // Si `statusOrSiteID` es un string, es un nuevo ID de sitio (cuando los IDs no coinciden)
                if (typeof statusOrSiteID === 'string' && /^[a-zA-Z0-9-]+$/.test(statusOrSiteID)) {
                    const newMessage = `${device.comments}\n\n#$Site=${statusOrSiteID}`;
                    ipAndSite.push({
                        Sitio: statusOrSiteID,
                        ip: device.host,
                        Bandera: "4", // Indica que se detectó un ID distinto
                        mensajePRTG: device.comments
                    });
                    await toolsPRTG_Uisp.postMessageIDSite(device, newMessage);
                    devicesWithoutSiteID.push(device);

                    updatedSiteIDs.push({
                        deviceName: device.name,
                        oldSiteID: device.comments.match(/#\$Site=([^\s]+)/)?.[1] || null,
                        newSiteID: statusOrSiteID
                    });
                    continue; // Salta al siguiente dispositivo, ya que manejamos este caso
                }

                // Si el retorno es un número, procesamos los casos conocidos
                switch (statusOrSiteID) {
                    case 0: // Sin comentarios
                    case 1: // Formato incorrecto
                    case 2: // No se encontro el id 
                        const matchingDevices = devicesUISP.filter(uispDevice =>
                            uispDevice.ipAddress === device.host ||
                            uispDevice.ipAddress === `${device.host}/24`
                        );

                        if (!matchingDevices.length) {
                            console.error(`No se encontró un dispositivo UISP para la IP: ${device.host}`);
                            continue;
                        }

                        const newIDSite = matchingDevices[0].identification.site.id;
                        const newMessage = `${device.comments}\n\n#$Site=${newIDSite}`;
                        ipAndSite.push({
                            Sitio: newIDSite,
                            ip: device.host,
                            tamIDSite: matchingDevices.length,
                            Bandera: "2", // Indica recalculación del ID
                            mensajePRTG: device.comments
                        });
                        await toolsPRTG_Uisp.postMessageIDSite(device, newMessage);
                        devicesWithoutSiteID.push(device);
                        break;

                    case 3: // Sin ID de sitio en UISP, requiere consulta
                        askAboutDevicesWithoutSite.push(device);
                        break;

                    case 4: // Todo está en orden, ID coinciden
                        console.log(`Dispositivo ${device.name} ya tiene un ID de sitio válido.`);
                        break;

                    case 6: // Dispositivo no encontrado en UISP
                        console.error(`Dispositivo ${device.name} no encontrado en UISP con IP ${device.host}.`);
                        break;

                    default: // Caso desconocido, registrar advertencia
                        console.warn(`Estado desconocido (${statusOrSiteID}) para el dispositivo ${device.name}.`);
                }
            } catch (error) {
                console.error(`Error procesando el dispositivo ${device.name}:`, error);
            }
        }

        console.log("Dispositivos que se actualizaron con un nuevo ID de sitio: ", devicesWithoutSiteID.length);
        console.log("Dispositivos que requieren consulta con administrador: ", askAboutDevicesWithoutSite.length);
        console.log("Nuevos IDs de sitio aplicados: ", updatedSiteIDs.length);



        //**************************VALIDAR IDs de los Dispositivos *************************** */

        const updateIDClient = [];
        const withoutIdsTags = [];
        //Validacion de IDs de Clientes
        for (const device of devicesPRTG) {
            try {
                const responsIDFunction = await informationUISP.found_Id_Uisp_Prtg(device);

                await toolsPRTG_Uisp.cleanAndRepostMessage(device);

                if (responsIDFunction?.id && responsIDFunction.consult === false) {
                    // Caso 1: El ID está en los comentarios (no se usó Axios)
                    device.idClient = responsIDFunction.id; // Actualizar el atributo idClient

                } else if (responsIDFunction?.id && responsIDFunction.consult === true) {
                    // Caso 2: El ID fue encontrado usando Axios (estaba en las etiquetas)
                    updateIDClient.push(device);

                } else if (!responsIDFunction || !responsIDFunction.id) {
                    // Caso 3: responsIDFunction es null/undefined o no tiene un ID
                    withoutIdsTags.push(device);
                }
            } catch (error) {
                console.error(`Error procesando el dispositivo bloque de validacion de IDs ${device.name || device.host}:`, error);
            }
        }
        //****************************************************************************************************************** */

        //******************************Validacion de id de servicio********************************************************* */

        //for (const device of devicesPRTG) {



        //}

        /** **********************Ahora a checar ips de Servicio**********************/

        const noIPPublica = [];
        const updateIPPublic = [];

        for (const device of devicesPRTG) {
            const resp = await informationUISP.found_ip_services(device, devicesUISP);

            // Verificar si se actualizó la IP pública
            if (resp.updateC === true && resp.ip) {
                const oldIP = await toolsPRTG_Uisp.identifyIPPublic(device); // Extraer la IP pública antigua
                if (oldIP) {
                    const betterMessageIp = device.comments.replace(`#$IP_Publica=${oldIP}`, `#$IP_Publica=${resp.ip}`);
                    updateIPPublic.push(device); // Actualización arreglo para el reporte de las actualizaciones
                    await toolsPRTG_Uisp.postMessageIPComments(device, betterMessageIp); // Actualizar el mensaje con la nueva IP pública
                }else{//el otro caso es que este vacio pero aun asi hay que actualizar
                    const NewMessageIp = device.comments + ` #$IP_Publica=${resp.ip}`;

                    updateIPPublic.push(device); // Actualización arreglo para el reporte de las actualizaciones
                    await toolsPRTG_Uisp.postMessageIPComments(device, NewMessageIp);

                }
            } else if (resp.updateC === false && resp.ip) {
                console.log("Todo en orden con la IP pública");
            } else if (resp.updateC === false && !resp.ip) {
                console.log("NO IP PUBLICA\n");
                noIPPublica.push(device);
            }
        }

        console.log(`Dispositivos con IP pública actualizada: ${updateIPPublic.length}`);
        console.log(`Dispositivos sin IP pública encontrada: ${noIPPublica.length}`);



        const ipsNoEncontradas = [];



        //En este punto buscaremos si las ips de PRTG estan en UISP
        devicesPRTG.forEach(devicePRTG => {
            const foundDevice = devicesUISP.find(deviceUISP => deviceUISP.ipAddress === devicePRTG.host || deviceUISP.ipAddress === devicePRTG.host + "/24");
            if (!foundDevice) {

                // Vamos a armar un JSON para tratar los datos que no pudimos encontrar

                const notDevicesF = {
                    "company": devicePRTG.group,
                    "name": devicePRTG.name,
                    "ip": devicePRTG.host,
                    "tags": devicePRTG.tags
                };

                ipsNoEncontradas.push(notDevicesF); // <-- agregar a la lista 
            }
        });

        //Hay una razon por la que no pudieran aparecer en UISP y es que esten canceladas en CRM
        //Por lo tanto debemos saber de esos servicios cuales estan cancelados

        if (ipsNoEncontradas.length > 0) { // <-- valida que si haya IPs no encotradas en la lista

            // Estos son los dispositivos que no se encontraron reales
            let servicesPRTG_NotFounded = ipsNoEncontradas;


            // Ahora vamos a ver cuáles están cancelados y/o suspendidos

            // Para saber qué IDs de servicio necesitamos, los IDs no deben estar duplicados

            const uniqueIDs = new Set();

            const uniqueListIDsDevices = servicesPRTG_NotFounded.filter(device => {
                if (!uniqueIDs.has(device.idClient)) {
                    uniqueIDs.add(device.idClient);
                    return true;
                }
                return false;
            });

            console.log("************* ID de clientes unicos***************\n\n");
            uniqueListIDsDevices.forEach(device => {
                console.log(`ID Cliente unico: ${device.idClient}`);//<-- esto esa para obtener los servicios
            });

            console.log("****************************");
            // Ya tenemos una lista con los IDs que tienen problemas

            const servicesEndAndSuspended = [];
            console.log("\n************Se comienza a obtener los servicios*************\n");

            for (const service of uniqueListIDsDevices) {
                try {
                    // Puede pushear datos vacíos
                    const result = await informationUISP.ServicesOfCompany(service.idClient); // <-- Lista de listas

                    if (result) {
                        servicesEndAndSuspended.push(result);
                        console.log(`Servicios obtenidos para ID Cliente: ${service.idClient}`);
                    } else {
                        console.warn(`No se obtuvieron servicios para ID Cliente: ${service.idClient}`);
                    }
                } catch (error) {
                    console.error(`Error obteniendo servicios para ID Cliente: ${service.idClient} - ${error.message}`);
                }
            }

            // Regresa un objeto con servicios suspendidos y otro con servicios cancelados si es que hay

            console.log("\nResolvimos servicios suspendidos y cancelados\n\n");

            const trueServicesEnd = [];
            const trueServicesSuspended = [];
            const finalNotFoundServices = servicesPRTG_NotFounded;

            for (const devPRTG of servicesPRTG_NotFounded) {
                servicesEndAndSuspended.forEach((serviceGroup, index) => {


                    if (serviceGroup.servicesSuspended.length > 0) {

                        serviceGroup.servicesSuspended.forEach(service => {//buscamos suspendidos

                            if (stringSimilarity.compareTwoStrings(devPRTG.name, service.name) > 0.6) {
                                console.log("Probable dispositivo Suspendido: ", devPRTG);
                                trueServicesSuspended.push(devPRTG);//<-- los servicios de PRTG que aparecen como suspendidos
                                finalNotFoundServices.pop(devPRTG)//<-- quitamos de la lista
                            }


                        });
                    }

                    if (serviceGroup.servicesEnded.length > 0) {//<-- busca en la lista de terminados los que estan terminados

                        serviceGroup.servicesEnded.forEach(service => {
                            if (stringSimilarity.compareTwoStrings(devPRTG.name, service.name) > 0.6) {
                                trueServicesEnd.push(devPRTG);
                                finalNotFoundServices.pop(devPRTG)//<-- quitamos de la lista
                                console.log("Probable dispositivo encontrado en UISP CRM CANCELADO: ", devPRTG);
                            }
                        });
                    }
                });
            }

            console.log("\nDispositivos Auditados\n", apiResponsePRTG.data.devices.length);
            /**
             * 
             * Dispositivos cancelados = trueServicesEnd
             * Dispositivos supendidos = trueServicesSuspended
             * Dispositivos que no encontramos ni en uisp ni suspendidos ni cancelados = finalNotFoundServices
             * Dispositivos sin etiquetas = withoutIdsTags
             * Dispositivos SWITCH = switchDevices
             *  devicesWithoutSiteID = []; // Dispositivos que necesitan actualizar ID de sitio
            *   askAboutDevicesWithoutSite = []; // Dispositivos que requieren consulta con el administrador
            *   updatedSiteIDs = []; // Nuevos IDs de sitio aplicados
                noIPPublica = [];
                updateIPPublic = [];
                updateIDClient = [];
              
             * 
             */

            //console.log(JSON.stringify(servicesEndAndSuspended, null, 2));
            //uniqueListIDsDevices.forEach(device => { console.log(`ID Cliente: ${device.idClient}, Nombre: ${device.name}, IP: ${device.ip}`); });


            const totalDev = apiResponsePRTG.data.devices.length;
            const htmlReport = html.generateReportHtml(
                trueServicesEnd,
                trueServicesSuspended,
                finalNotFoundServices,
                withoutIdsTags,
                switchDevices,
                devicesWithoutSiteID,
                askAboutDevicesWithoutSite,
                updatedSiteIDs,
                noIPPublica,
                updateIPPublic,
                updateIDClient,
                totalDev
            );




            await sendEmail(htmlReport);

            res.status(200).json({
                "Mensaje": "IPs no encontradas en UISP",
                "IPs": ipsNoEncontradas
            });
        } else {


            res.status(200).json({
                "Mensaje": "Todas las IPs fueron encontradas en UISP"
            });
        }

        console.log("Éxito en la consulta");
    } catch (error) {
        console.error("Ocurrió un error en el servidor", error);

        res.status(500).json({
            "msg": "no se pudo",
        });
    }

    console.log("Fue mandado con éxito el mensaje");
}

function findDuplicateDevices(devices) {
    const occurrences = {}; // Objeto para almacenar el número de ocurrencias e índices de cada dispositivo
    const duplicates = [];  // Array para almacenar dispositivos duplicados

    // Contar ocurrencias de cada host
    devices.forEach((device, index) => {
        if (occurrences[device.host]) {
            // Si el host ya existe en 'occurrences', incrementamos el contador y añadimos el índice
            occurrences[device.host].count++;
            occurrences[device.host].indexes.push(index);
        } else {
            // Si el host no existe, lo añadimos con un contador inicial de 1 y su índice
            occurrences[device.host] = { count: 1, indexes: [index] };
        }
    });

    // Identificar dispositivos duplicados
    for (const key in occurrences) {
        if (occurrences[key].count > 1) {
            // Si un host tiene más de una ocurrencia, añadimos todos los dispositivos con ese host a 'duplicates'
            occurrences[key].indexes.forEach((i) => duplicates.push(devices[i]));
        }
    }

    return duplicates; // Devolvemos el array de dispositivos duplicados
}

async function sendEmail(reportHtml) {

    console.log("\nCredeciales de EMAIL\n");
    console.log(`${process.env.GMAIL}`);
    console.log(`${process.env.PASSWORD_GMAIL}`);
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
        subject: 'Reporte de Servicios BOT',
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

// Función para encontrar un dispositivo en UISP basado en la IP
function findDeviceInUISP(devicesUISP, host) {
    return devicesUISP.filter(uispDevice =>
        uispDevice.ipAddress === host || uispDevice.ipAddress === `${host}/24`
    );
}

// Función para generar un nuevo mensaje con el ID de sitio
function generateNewMessage(comments, newSiteID) {
    return `${comments}\n\n#$Site=${newSiteID}`;
}






module.exports = { checkIPServices };
