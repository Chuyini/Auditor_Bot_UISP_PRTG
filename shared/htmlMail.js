function generateReportHtml(
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
    totalDevices
) {
    // Función para eliminar duplicados basados en el nombre del dispositivo
    const removeDuplicates = (devices) => {
        const uniqueDevices = [];
        const seenNames = new Set();

        for (const device of devices) {
            if (!seenNames.has(device.name)) {
                seenNames.add(device.name);
                uniqueDevices.push(device);
            }
        }

        return uniqueDevices;
    };

    // Eliminar duplicados de cada lista
    trueServicesEnd = removeDuplicates(trueServicesEnd);
    trueServicesSuspended = removeDuplicates(trueServicesSuspended);
    finalNotFoundServices = removeDuplicates(finalNotFoundServices);
    withoutIdsTags = removeDuplicates(withoutIdsTags);
    switchDevices = removeDuplicates(switchDevices);
    devicesWithoutSiteID = removeDuplicates(devicesWithoutSiteID);
    askAboutDevicesWithoutSite = removeDuplicates(askAboutDevicesWithoutSite);
    updatedSiteIDs = removeDuplicates(updatedSiteIDs);
    noIPPublica = removeDuplicates(noIPPublica);
    updateIPPublic = removeDuplicates(updateIPPublic);
    updateIDClient = removeDuplicates(updateIDClient);

  

    




    // Función helper para agrupar dispositivos
    const groupDevices = (devices, className = 'device') => {
        const grouped = devices.reduce((acc, device) => {
            const group = device.group || 'Sin Grupo';
            if (!acc[group]) acc[group] = [];
            acc[group].push(device);
            return acc;
        }, {});

        return Object.entries(grouped).map(([group, devices]) => `
            <div class="group-item">
                <div class="group-title">🏢 ${group}</div>
                <div class="device-list">
                    ${devices.map(device => `<div class="${className}">🛰️ ${device.name}</div>`).join('')}
                </div>
            </div>
        `).join('');
    };

    // Verificar si solo hay dispositivos de switch y todo lo demás está bien
    const allGood =
        trueServicesEnd.length === 0 &&
        trueServicesSuspended.length === 0 &&
        finalNotFoundServices.length === 0 &&
        withoutIdsTags.length === 0 &&
        devicesWithoutSiteID.length === 0 &&
        askAboutDevicesWithoutSite.length === 0 &&
        noIPPublica.length === 0;

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte de Servicios</title>
    <style>
        body {
            font-family: "Arial", sans-serif;
            margin: 20px;
        }
        h1 {
            color: #2C3E50;
            text-align: center;
            margin: 20px 0;
            font-size: 28px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1.5px;
        }
        h2 {
            color: #1E90FF;
            background-color: #E8F4FF;
            padding: 10px;
            border-radius: 8px;
            margin: 20px 0 10px;
            font-size: 22px;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        h2::before {
            content: "📋";
            font-size: 24px;
        }
        h3 {
            color: #1E90FF;
            margin: 15px 0 10px;
            font-size: 18px;
            font-style: italic;
        }
        .cantidad {
            background-color: #1E90FF;
            color: white;
            padding: 5px 10px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: bold;
            margin-left: auto;
        }
        .subrayado-amarillo {
            font-size: 16px;
            color: #34495E;
            background: linear-gradient(to bottom, yellow 50%, transparent 50%);
            background-size: 100% 2px;
            background-repeat: no-repeat;
            background-position: 0 100%;
            display: inline;
        }
        .imagen-logo {
            display: block;
            margin: 0 auto;
            border-radius: 15px;
            width: 200px;
        }
        .imagen-perfil {
            display: block;
            margin: 20px auto;
            border-radius: 50%;
            width: 100px;
            height: 100px;
            object-fit: cover;
            border: 3px solid #333;
        }
        .group-list {
            margin: 10px 0;
        }
        .group-item {
            margin: 5px 0;
            padding: 8px;
            background-color: #f8f9fa;
            border-radius: 6px;
        }
        .group-title {
            font-weight: bold;
            color: #34495E;
            margin-bottom: 5px;
            padding: 5px;
            background-color: #F5F6FA;
            border-left: 4px solid #1E90FF;
            border-radius: 4px;
        }
        .device-list {
            margin-left: 15px;
            padding-left: 10px;
            border-left: 2px solid #1E90FF;
        }
        .device {
            margin: 4px 0;
            padding: 4px;
            font-size: 14px;
            color: #2C3E50;
        }
        .update {
            color: #27AE60;
        }
        .success-message {
            text-align: center;
            margin: 40px 0;
            padding: 20px;
            background-color: #E8F6EF;
            border-radius: 10px;
            border: 2px solid #27AE60;
        }
        .success-message h2 {
            color: #27AE60;
            font-size: 26px;
            margin: 0;
            background: none;
            padding: 0;
        }
        .success-message h2::before {
            content: "🎉";
            font-size: 30px;
        }
        .success-message p {
            color: #34495E;
            font-size: 18px;
            margin: 10px 0 0;
        }
    </style>
</head>
<body>
    <!-- Logo principal -->
    <img src="https://drive.google.com/uc?export=view&id=1v6uI_38OqosSeTBOWJW2M09ZD9JolvYn" alt="Logo Reporte" class="imagen-logo">
    
    <!-- Imagen de perfil del bot -->
    <img src="https://drive.google.com/uc?export=view&id=1afUUDLrFpaehiZGOB8sPLqomVzq6rSzb" alt="Perfil Bot" class="imagen-perfil">

    <h1>Reporte de auditoría de Configuración de PRTG V 1.0.2</h1>
   
    <h3>Fecha: ${new Date().toLocaleDateString()} | Dispositivos auditados: <span class="cantidad">${totalDevices}</span></h3>

    ${allGood ? `
    <div class="success-message">
        <h2>¡Auditoría Exitosa!</h2>
        <p>Todos los dispositivos de PRTG están correctamente bien identificados y hacen MATCH con UISP. ¡Excelente trabajo! 🎉</p>
    </div>
    ` : `
    <p class="subrayado-amarillo">Este es un reporte personalizado en NodeJS para mejorar el sistema autónomo de PRTG en términos de configuración y rendimiento.</p>
    <p class="subrayado-amarillo">Además, permite realizar configuraciones automáticas.</p>

    <p class="subrayado-amarillo">Entre las tareas que puedo realizar, se incluyen:</p>

    <ul>
        <li>Asegurar la coincidencia entre UISP y PRTG</li>   
        <li>Cambios automáticos de IP</li>
        <li>Reportes de configuración de PRTG</li>
    </ul>

    ${updatedSiteIDs.length ? `
    <h2>Dispositivos con ID de Sitio Actualizados <span class="cantidad">${updatedSiteIDs.length}</span></h2>
    <div class="group-list">${groupDevices(updatedSiteIDs, 'update')}</div>` : ''}


    ${updateIPPublic.length ? `
    <h2>Dispositivos con IP Pública Actualizada <span class="cantidad">${updateIPPublic.length}</span></h2>
    <div class="group-list">${groupDevices(updateIPPublic, 'update')}</div>` : ''}

    ${updateIDClient.length ? `
    <h2>Dispositivos con ID de Cliente Actualizado <span class="cantidad">${updateIDClient.length}</span></h2>
    <div class="group-list">${groupDevices(updateIDClient, 'update')}</div>` : ''}
    `}

    ${trueServicesEnd.length ? `
    <h2>Dispositivos Cancelados <span class="cantidad">${trueServicesEnd.length}</span></h2>
    <div class="group-list">${groupDevices(trueServicesEnd)}</div>` : ''}

    ${trueServicesSuspended.length ? `
    <h2>Dispositivos Suspendidos <span class="cantidad">${trueServicesSuspended.length}</span></h2>
    <div class="group-list">${groupDevices(trueServicesSuspended)}</div>` : ''}

    ${finalNotFoundServices.length ? `
    <h2>Dispositivos No Encontrados <span class="cantidad">${finalNotFoundServices.length}</span></h2>
    <div class="group-list">${groupDevices(finalNotFoundServices)}</div>` : ''}

    ${withoutIdsTags.length ? `
    <h2>Dispositivos sin Etiquetas <span class="cantidad">${withoutIdsTags.length}</span></h2>
    <div class="group-list">${groupDevices(withoutIdsTags)}</div>` : ''}

    ${switchDevices.length ? `
    <h2>Dispositivos SWITCH <span class="cantidad">${switchDevices.length}</span></h2>
    <div class="group-list">${groupDevices(switchDevices)}</div>` : ''}

    <!-- ${devicesWithoutSiteID.length ? `
    <h2>Dispositivos sin ID de Sitio <span class="cantidad">${devicesWithoutSiteID.length}</span></h2>
    <div class="group-list">${groupDevices(devicesWithoutSiteID)}</div>` : ''} -->

    ${askAboutDevicesWithoutSite.length ? `
    <h2>Dispositivos a Preguntar sobre ID de Sitio <span class="cantidad">${askAboutDevicesWithoutSite.length}</span></h2>
    <div class="group-list">${groupDevices(askAboutDevicesWithoutSite)}</div>` : ''}
    

    ${noIPPublica.length ? `
    <h2>Dispositivos sin IP Pública <span class="cantidad">${noIPPublica.length}</span></h2>
    <div class="group-list">${groupDevices(noIPPublica)}</div>` : ''};
</body>
</html>`;
}

module.exports = { generateReportHtml };