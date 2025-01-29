const https = require("https");
const axios = require("axios");
const utilsPost = require("../shared/UtilsPrtgUisp");
//const stringSimilarity = require('string-similarity');

async function found_Id_Uisp_Prtg(sensorData) {//extrae el id como pueda
    try {
        // Configurar agente HTTPS para evitar validación de certificados (solo en entornos de prueba)
        const agent = new https.Agent({
            rejectUnauthorized: false,
        });

        // Validar datos de entrada
        if (!sensorData || !sensorData.tags) {
            console.log("Dispositivo sin tags o sensor nulo", sensorData);
            return null;
        }

        // Extraer ID de cliente desde los comentarios
        const idFromComments = await utilsPost.identifyIDClient(sensorData);
        if (idFromComments) {
            return { id: idFromComments, consult: false }; // ID encontrado en comentarios, no se hizo consulta
        }

        // Extraer el ID de las etiquetas
        const etiquetas = sensorData.tags;
        if (typeof etiquetas !== "string") {
            throw new Error("Las etiquetas no están disponibles o no son una cadena.");
        }

        const idMatch = etiquetas.match(/\d+/);
        if (!idMatch) {
            console.log("No se encontró ningún ID en las etiquetas.", sensorData);
            return null;
        }

        const id = idMatch[0];
        console.log("ID encontrado en etiquetas:", id);

        // Hacer la solicitud a la API para encontrar el ID en UISP
        const apiUrlToFindIdClient = `https://45.189.154.77/crm/api/v1.0/clients?userIdent=${id}`;
        const response = await axios.get(apiUrlToFindIdClient, {
            headers: {
                "Content-Type": "application/json",
                "X-Auth-App-Key": process.env.UISP_PERMANENT_GET_KEY,
            },
            httpsAgent: agent,
            timeout: 30000,
        });

        // Procesar la respuesta de la API
        if (response.data && response.data.length > 0) {
            const idToUisp = response.data[0].id; // ID encontrado en la API
            console.log("ID extraído desde la API:", idToUisp);

            // Crear mensaje para actualizar los comentarios
            const newID = sensorData.comments+` \n\n#$idClientU=${idToUisp} `;
            await utilsPost.postMessageIDClient(sensorData, newID); // Actualizar los comentarios en PRTG

            return { id: idToUisp, consult: true }; // Indicar que se hizo consulta y devolver el ID
        } else {
            console.log("No se encontró ningún cliente con el ID proporcionado.");
            throw new Error("No se encontró el cliente correspondiente en UISP.");
        }
    } catch (error) {
        // Manejo de errores
        if (error.response) {
            console.error("Error en la respuesta de la API:", error.response.data);
        } else if (error.request) {
            console.error("No hubo respuesta de la API:", error.request);
        } else {
            console.error("Error al buscar el ID del cliente:", error.message);
        }
        return null; // En caso de error, devolver null
    }
}



//Checa la ip de servicio basado en el id de sitio

async function found_ip_services(sensorData, devicesUISP) {
    try {
        // Validar datos de entrada
        if (!sensorData) {
            throw new Error("Dispositivo sin comentario o sensor nulo: ", sensorData);

        }

        // Extraer IP pública desde los comentarios
        const ipFromComments = await utilsPost.identifyIPPublic(sensorData); //<-- puede regresar null lo que implica que no esta la ip

        // Extraer ID de sitio desde los comentarios
        const idSiteFromCommentsPRTG = await utilsPost.identifySiteID(sensorData);//<-- puede regresar null lo que implica que no id de sitio




        if (!idSiteFromCommentsPRTG) {//<-- lanzamos el error porque para este punto ya debimos haber filtrado y encontrado el id de sitio
            throw new Error(`No fue posible encontrar el ID de sitio para: ${sensorData.name}`);
        }




        // Filtrar dispositivos en UISP que coincidan con el ID de sitio, lo correcto es que sean 2 pero habrá mas o menos
        const devicesIDSiteprtg = devicesUISP.filter(device => {
            if (device.identification?.site?.id !== undefined && device.identification.site.id == idSiteFromCommentsPRTG) {

                return true;
            } else {
                return false;
            }
        });



        console.log(`El dispositivo ${sensorData.name} en sitio de UISP tiene ${devicesIDSiteprtg.length} objetos`);
        devicesIDSiteprtg.forEach((element, index) => {
            console.log(`Dispositivo ${index + 1}:`, JSON.stringify(element.identification.name, null, 2));
            console.log(`ROL :`, JSON.stringify(element.identification.role, null, 2));

        });
        if (devicesIDSiteprtg.length > 0) { // debe haber al menos 1 objeto para asegurarnos de que hay un router

            console.log("Dispositivos que estan en ese id de sitio: \n");

            const router = devicesIDSiteprtg.find(device =>
                device.identification.role === "router" && !/^192\.168\./.test(device.ipAddress)
            );
            
            console.log(`Dispositivo router:`, JSON.stringify(router.ipAddress, null, 2)); console.log("ip de comentarios prtg: ", ipFromComments);
            if (router) {
                const ipService = router.ipAddress;

                if (ipFromComments !== ipService) {//<-- se hizo la actualizacion no coincidian
                    return { ip: ipService, updateC: true };
                } else if (!ipFromComments) {//<-- se hizo actualizacion ya que no había ip en comentarios
                    return { ip: ipService, updateC: true }
                } if (ipFromComments === ipService) {//<-- no se hizo actualizacion
                    return { ip: ipService, updateC: false }
                }
            } else {
                console.warn(`No se encontró un dispositivo con rol "router" para el sitio de ${sensorData.name}`);
                return { ip: null, updateC: false }
            }
        } else {
            return { ip: null, updateC: false }; //<-- no habia router
        }
    } catch (error) {
        console.error("Error al buscar la IP del servicio:", error.message);
        return { ip: null, updateC: false }; // En caso de error, devolver null
    }
}



//Te regresa divido en arreglos todos los servicios de un cliente
async function ServicesOfCompany(clientID) {
    try {
        const agent = new https.Agent({
            rejectUnauthorized: false, // Ignorar certificados (solo en pruebas)
        });

        if (!clientID) {

            throw new Error("Cliente NULLO");


        }

        const apiUrl = `https://45.189.154.77/crm/api/v1.0/clients/services?clientId=${clientID}&statuses%5B%5D=2&statuses%5B%5D=3`;

        const response = await axios.get(apiUrl, {
            headers: {
                "Content-Type": "application/json",
                "X-Auth-App-Key": process.env.UISP_PERMANENT_GET_KEY,
            },
            httpsAgent: agent,
            timeout: 30000,
        });

        const services = response.data;

        // Clasificar servicios
        const servicesSuspended = services.filter(s => s.status === 3);
        const servicesEnded = services.filter(s => s.status === 2);
        const servicesOk = services.filter(s => s.status !== 2 && s.status !== 3);

        return {
            /*totalServices: services.length, // Total de servicios
                servicesOk,
             // Servicios activos
             // Servicios suspendidos

            */
            servicesSuspended,
            servicesEnded,
            servicesOk // Servicios terminados
        };
    } catch (error) {
        if (error.response) {
            console.error("Error en la respuesta de la API:", error.response.data);
        } else if (error.request) {
            console.error("No hubo respuesta de la API:", error.request);
        } else {
            console.error("Error general al buscar servicios:", error.message);
        }

        throw new Error("Error al obtener los servicios del cliente."); // Mejor manejo de errores
    }
}





async function statusOfService(clientID, sensorData) {
    try {
        // Configurar agente HTTPS para evitar validación de certificados (solo en entornos de prueba)
        const agent = new https.Agent({
            rejectUnauthorized: false,
        });


        // Construir URL para la solicitud, con esta api obtenemos los servicios
        const apiUrlToKnowstatusOfService = `https://45.189.154.77/crm/api/v1.0/clients/services?clientId=${clientID}&statuses%5B%5D=2&statuses%5B%5D=3`;

        // Hacer la petición para buscar el ID en UISP
        const response = await axios.get(apiUrlToKnowstatusOfService, {
            headers: {
                "Content-Type": "application/json",
                "X-Auth-App-Key": process.env.UISP_PERMANENT_GET_KEY,
            },
            httpsAgent: agent,
            timeout: 30000,
        });

        // Extraer el ID de la respuesta
        if (response.data.length === 0) {

            return 0;
        } else {


            const services = response.data;

            const similarity = stringSimilarity(services.name, sensorData.device);

            console.log("la similaridad es ", similarity);

            if (similarity > 0.5) {

                return similarity

            } else {

                return 0;
            }


        }

    } catch (error) {
        if (error.response) {
            console.error("Error en la respuesta de la API:", error.response.data);
        } else if (error.request) {
            console.error("No hubo respuesta de la API:", error.request);
        } else {
            console.error("Error al buscar el ID del usuario:", error.message);
        }
        return null; // En caso de error, devolver null
    }
}


module.exports = { found_Id_Uisp_Prtg, ServicesOfCompany, statusOfService, found_ip_services };
