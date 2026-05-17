# Configuración de Direcciones Reales

## Requisitos

Para usar direcciones reales en la aplicación, necesitas configurar una API Key de Google Maps con los siguientes servicios habilitados:

1. **Maps JavaScript API**
2. **Places API**
3. **Geocoding API**
4. **Directions API**

## Pasos de configuración

### 1. Obtener API Key de Google Maps

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita las APIs mencionadas arriba
4. Crea una API Key en "Credenciales"
5. Restringe la API Key para mayor seguridad:
   - Aplicaciones web
   - Dominios: `localhost` y tu dominio de producción

### 2. Configurar la API Key en el código

En el archivo `frontend/src/components/app.jsx`, reemplaza:

```javascript
<LoadScript googleMapsApiKey="YOUR_GOOGLE_MAPS_API_KEY" libraries={["places"]}>
```

Con tu API Key real:

```javascript
<LoadScript googleMapsApiKey="AIzaSyTU_API_KEY_AQUI" libraries={["places"]}>
```

### 3. Configurar restricciones de dominio

En Google Cloud Console, configura las restricciones de la API Key:

- **Aplicaciones web (sitios web)**: Agrega `localhost` y tu dominio
- **APIs habilitadas**: Maps JavaScript API, Places API, Geocoding API, Directions API

## Funcionalidades implementadas

### Campos de dirección con autocompletado
- Búsqueda inteligente de direcciones
- Sugerencias en tiempo real
- Geocodificación automática (dirección ↔ coordenadas)

### Ubicación actual
- Botón "Mi ubicación" para obtener coordenadas GPS
- Conversión automática a dirección legible

### Cálculo de rutas
- Rutas en tiempo real usando Google Directions API
- Visualización en el mapa
- Información de distancia y tiempo estimado

## Notas importantes

- La API Key debe mantenerse segura y no commitearse al repositorio
- Considera usar variables de entorno para la API Key en producción
- Monitorea el uso de la API para controlar costos
- Las APIs de Google Maps tienen límites de uso gratuitos

## Solución de problemas

### Error: "This API key is not authorized"
- Verifica que la API Key tenga las APIs correctas habilitadas
- Confirma las restricciones de dominio

### Error: "You have exceeded your request quota"
- Revisa los límites de uso en Google Cloud Console
- Considera actualizar el plan de facturación

### Autocompletado no funciona
- Asegúrate de que "Places API" esté habilitada
- Verifica que `libraries={["places"]}` esté incluido en LoadScript