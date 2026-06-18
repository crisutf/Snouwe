# Snouwe Backend - Proyecto Leilos 🚀
> **Estado del Proyecto:** ⚠️ *En desarrollo (Beta) - Versión v29.00.*
> 
> **No esta terminado y como que tampoco voy a terminarlo por ahora :)**
> **Web Oficial:** [leilos.qzz.io](https://leilos.qzz.io)

Este backend es una versión personalizada y mejorada llamada **Snouwe**, desarrollada exclusivamente para el **Proyecto Leilos**.

---

## ✨ Características y Mejoras

### 🎮 Experiencia de Juego
- **Skins y Cosméticos:** Incluye soporte para todas las skins hasta la versión **v28.30**.
- **Guardado Automático:** Los cambios en tu locker se guardan instantáneamente en la base de datos de Proyecto Leilos.
- **Personalización:** Soporte para fondos de lobby personalizados (Lobby Backgrounds).
- **Interfaz Limpia:** Se han configurado los modos de juego (Solo, Arena) para una experiencia óptima.
- **Sistema de Ready:** Opción de marcar como "Listo" funcional con Matchmaking activo.

### 🤖 Integración con Discord
- **Bot de Snouwe:** Notificaciones automáticas y comandos integrados para el Proyecto Leilos.
- **Sistema de Apelaciones:** Los usuarios pueden apelar sus sanciones directamente desde Discord.
- **Comunicados:** Herramienta integrada para enviar anuncios oficiales al servidor de Discord.

### 🛠️ Administración y Seguridad
- **Panel de Control:** Dashboard visual para gestión de cuentas en [leilos.qzz.io](https://leilos.qzz.io).
- **Seguridad:** Implementación de JWT, validación de tokens y Rate Limiting.
- **Persistencia:** Base de datos **MongoDB** (leilos_data).

---

## 📣 Problemas detectados

- Los modos aparecen pero despues de elegir el modo no apaprece el nombre del modo
- Hay algunas skins que no aparecen aunque si se ponga el Athena a otro backend si aparecen todos
- No te consigue meter en partida

---

## 🚀 Instalación

1. **Preparar el entorno:**
   Asegúrate de tener Node.js y MongoDB instalados.

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configuración inicial:**
   Edita el archivo `.env` con tus credenciales.

4. **Iniciar el servidor:**
   Ejecuta:
   ```bash
   start.bat
   ```

---

## 🎮 Mackna Launcher
El backend Snouwe está optimizado para el launcher **Mackna**.
- **Repositorio:** [LeilosFN/Mackna](https://github.com/LeilosFN/Mackna)
- **Puerto de Autenticación:** 4080 (Localhost)
- **Flujo de Login:** El launcher abre `https://api-leilos.crisu.qzz.io/api/v2/discord/launcher?port=4080` para iniciar sesión.

---

## 📜 Licencia y Créditos

Este proyecto es una modificación llamada Snouwe.

**IMPORTANTE:**
- Este backend es mantenido por el equipo de Leilos.
- Está **ESTRICTAMENTE PROHIBIDO** vender este código.
- Su uso requiere mantener los créditos originales.

---

## 📞 Contacto

¡Gracias por apoyar a Leilos!

