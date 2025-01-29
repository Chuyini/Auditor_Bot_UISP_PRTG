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
        }
        h1 {
            color: black; /* Título principal en negro */
        }
        h2, h3 {
            color: #1E90FF; /* Azul más fuerte */
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        table, th, td {
            border: 1px solid black;
        }
        th, td {
            padding: 10px;
            text-align: center;
        }
        .subrayado-amarillo {
            font-family: "Arial", sans-serif;
            font-size: 18px;
            font-style: italic;
            color: #333;
            display: inline;
            background-image: linear-gradient(to bottom, yellow 50%, transparent 50%);
            background-size: 100% 3px;
            background-repeat: no-repeat;
            background-position: 0 100%;
        }
        .imagen-logo {
            display: block;
            margin: 0 auto;
            border-radius: 15px; /* Bordes redondeados */
            width: 200px; /* Tamaño del logo */
        }
        .imagen-perfil {
            display: block;
            margin: 20px auto;
            border-radius: 50%; /* Imagen completamente redonda */
            width: 100px; /* Tamaño del perfil */
            height: 100px;
            object-fit: cover; /* Ajuste para mantener proporciones */
            border: 3px solid #333; /* Borde para destacar */
        }
        .device {
            color: black; /* Color por defecto para los dispositivos */
        }
        .update {
            color: green; /* Color verde para los dispositivos "update" */
        }
    </style>
</head>
<body>
    <!-- Logo principal -->
    <img src="https://drive.google.com/uc?export=view&id=1v6uI_38OqosSeTBOWJW2M09ZD9JolvYn" alt="Logo Reporte" class="imagen-logo">
    
    <!-- Imagen de perfil del bot -->
    <img src="https://drive.google.com/uc?export=view&id=1afUUDLrFpaehiZGOB8sPLqomVzq6rSzb" alt="Perfil Bot" class="imagen-perfil">

    <h1>Reporte de auditoría de Configuración de PRTG V 1.0.2 (${totalDevices} dispositivos auditados)</h1>
   
    <h3>Fecha: ${new Date().toLocaleDateString()}</h3>

    <p class="subrayado-amarillo">Este es un reporte personalizado en NodeJS para mejorar el sistema autónomo de PRTG en términos de configuración y rendimiento.</p>
    <p class="subrayado-amarillo">Además, permite realizar configuraciones automáticas.</p>

    <p class="subrayado-amarillo">Entre las tareas que puedo realizar, se incluyen:</p>

    <ul>
        <li style="font-size: 16px">Asegurar la coincidencia entre UISP y PRTG</li>   
        <li style="font-size: 16px">Cambios automáticos de IP</li>
        <li style="font-size: 16px">Reportes de configuración de PRTG</li>
    </ul>

    ${trueServicesEnd.length ? `
    <h2>Dispositivos Cancelados</h2>
    <p style="font-size: 18px;">Cantidad: ${trueServicesEnd.length}</p>
    <ul>${trueServicesEnd.map(device => `<li class="device">🛰️ ${device.name}</li>`).join('')}</ul>` : ''}

    ${trueServicesSuspended.length ? `
    <h2>Dispositivos Suspendidos</h2>
    <p style="font-size: 18px;">Cantidad: ${trueServicesSuspended.length}</p>
    <ul>${trueServicesSuspended.map(device => `<li class="device">🛰️ ${device.name}</li>`).join('')}</ul>` : ''}

    ${finalNotFoundServices.length ? `
    <h2>Dispositivos No Encontrados</h2>
    <p style="font-size: 18px;">Cantidad: ${finalNotFoundServices.length}</p>
    <ul>${finalNotFoundServices.map(device => `<li class="device">🛰️ ${device.name}</li>`).join('')}</ul>` : ''}

    ${withoutIdsTags.length ? `
    <h2>Dispositivos sin Etiquetas</h2>
    <p style="font-size: 18px;">Cantidad: ${withoutIdsTags.length}</p>
    <ul>${withoutIdsTags.map(device => `<li class="device">🛰️ ${device.name}</li>`).join('')}</ul>` : ''}

    ${switchDevices.length ? `
    <h2>Dispositivos SWITCH</h2>
    <p style="font-size: 18px;">Cantidad: ${switchDevices.length}</p>
    <ul>${switchDevices.map(device => `<li class="device">🛰️ ${device.name}</li>`).join('')}</ul>` : ''}

    ${devicesWithoutSiteID.length ? `
    <h2>Dispositivos sin ID de Sitio</h2>
    <p style="font-size: 18px;">Cantidad: ${devicesWithoutSiteID.length}</p>
    <ul>${devicesWithoutSiteID.map(device => `<li class="device">🛰️ ${device.name}</li>`).join('')}</ul>` : ''}

    ${askAboutDevicesWithoutSite.length ? `
    <h2>Dispositivos a Preguntar sobre ID de Sitio</h2>
    <p style="font-size: 18px;">Cantidad: ${askAboutDevicesWithoutSite.length}</p>
    <ul>${askAboutDevicesWithoutSite.map(device => `<li class="device">🛰️ ${device.name}</li>`).join('')}</ul>` : ''}

    ${updatedSiteIDs.length ? `
    <h2>Dispositivos Actualizados</h2>
    <p style="font-size: 18px;">Cantidad: ${updatedSiteIDs.length}</p>
    <ul>${updatedSiteIDs.map(device => `<li class="update">🛰️ ${device.name}</li>`).join('')}</ul>` : ''}

    ${noIPPublica.length ? `
    <h2>Dispositivos sin IP Pública</h2>
    <p style="font-size: 18px;">Cantidad: ${noIPPublica.length}</p>
    <ul>${noIPPublica.map(device => `<li class="device">🛰️ ${device.name}</li>`).join('')}</ul>` : ''}

    ${updateIPPublic.length ? `
    <h2>Dispositivos con IP Pública Actualizada</h2>
    <p style="font-size: 18px;">Cantidad: ${updateIPPublic.length}</p>
    <ul>${updateIPPublic.map(device => `<li class="update">🛰️ ${device.name}</li>`).join('')}</ul>` : ''}

    ${updateIDClient.length ? `
    <h2>Dispositivos con ID de Cliente Actualizado</h2>
    <p style="font-size: 18px;">Cantidad: ${updateIDClient.length}</p>
    <ul>${updateIDClient.map(device => `<li class="update">🛰️ ${device.name}</li>`).join('')}</ul>` : ''}

</body>
</html>`;
}



module.exports = { generateReportHtml };
