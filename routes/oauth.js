const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const User = require('../model/user.js');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const functions = require('../structs/functions.js');
const discordBot = require('../DiscordBot/index.js'); // Importar el bot

const router = express.Router();

const translations = {
  es: {
    dashboard_title: "Panel de Control",
    welcome: "BIENVENIDO A Snouwe",
    account_linked: "Cuenta vinculada correctamente.",
    confirm_and_enter: "CONFIRMAR Y ENTRAR",
    logout: "Cerrar Sesión",
    account_id: "ID de Cuenta",
    discord_id: "Discord ID",
    access_status: "Estado de Acceso",
    privileges: "Privilegios",
    last_ip: "Última IP Detectada",
    active_sessions: "Sesiones Activas",
    admin_panel: "Panel de Administración",
    manage_user: "Gestionar Usuario (ID o Nombre)",
    ban: "Ban",
    unban: "Unban",
    kick: "Kick",
    create_host: "Crear Cuenta Host",
    server_tools: "Herramientas del Servidor",
    manage_downloads: "Gestionar Descargas",
    send_announcement: "Enviar Anuncio Bot",
    account_config: "Configuración de Cuenta",
    change_name: "Cambiar Nombre",
    update: "Actualizar",
    connected: "CONECTADO",
    active: "ACTIVO",
    banned: "BANEADO",
    admin: "Administrador",
    user: "Usuario",
    devices: "dispositivo(s)",
    last_login: "Último Inicio de Sesión",
    not_registered: "No registrada",
    manage_user_placeholder: "Discord ID o Username",
    reason_placeholder: "Motivo del baneo (opcional)",
    host_name_placeholder: "Nombre del Host",
    password_placeholder: "Contraseña",
    write_links_placeholder: "Escribe aquí los enlaces...",
    write_announcement_placeholder: "Escribe el anuncio aquí...",
    image_url_placeholder: "URL de imagen (opcional)",
    mention_announcements: "MENCIONAR @ANNOUNCEMENTS",
    send_announcement_btn: "ENVIAR ANUNCIO",
    update_downloads: "Actualizar Descargas",
    new_name_placeholder: "Nuevo Nombre",
    change_id: "Cambiar ID de Correo",
    new_id_placeholder: "Nuevo ID (ej: mi_usuario)",
    success_name: "Nombre actualizado",
    success_id: "ID de correo actualizado",
    success_ban: "Usuario baneado",
    success_unban: "Usuario desbaneado",
    success_kick: "Usuario expulsado",
    success_announcement: "Anuncio enviado correctamente",
    success_downloads: "Enlaces de descarga actualizados",
    error_notfound: "Usuario no encontrado",
    error_exists: "Este ID ya está en uso",
    error_invalid_id: "ID inválido (solo letras, números, puntos y guiones)",
    error_noban: "Este usuario no puede ser baneado",
    error_toolong: "El mensaje es demasiado largo",
    error_missing: "Faltan datos obligatorios",
    error_server: "Error en el servidor",
    confirm_btn: "¡CONECTADO!",
    generating_code: "GENERANDO CÓDIGO...",
    confirm_instruction: "Pulsa el botón para que el Launcher detecte tu cuenta."
  },
  en: {
    dashboard_title: "Control Panel",
    welcome: "WELCOME TO Snouwe",
    account_linked: "Account linked successfully.",
    confirm_and_enter: "CONFIRM AND ENTER",
    logout: "Logout",
    account_id: "Account ID",
    discord_id: "Discord ID",
    access_status: "Access Status",
    privileges: "Privileges",
    last_ip: "Last Detected IP",
    active_sessions: "Active Sessions",
    admin_panel: "Admin Panel",
    manage_user: "Manage User (ID or Name)",
    ban: "Ban",
    unban: "Unban",
    kick: "Kick",
    create_host: "Create Host Account",
    server_tools: "Server Tools",
    manage_downloads: "Manage Downloads",
    send_announcement: "Send Bot Announcement",
    account_config: "Account Settings",
    change_name: "Change Name",
    update: "Update",
    connected: "CONNECTED",
    active: "ACTIVE",
    banned: "BANNED",
    admin: "Admin",
    user: "User",
    devices: "device(s)",
    last_login: "Last Login",
    not_registered: "Not registered",
    manage_user_placeholder: "Discord ID or Username",
    reason_placeholder: "Ban reason (optional)",
    host_name_placeholder: "Host Name",
    password_placeholder: "Password",
    write_links_placeholder: "Write links here...",
    write_announcement_placeholder: "Write announcement here...",
    image_url_placeholder: "Image URL (optional)",
    mention_announcements: "MENTION @ANNOUNCEMENTS",
    send_announcement_btn: "SEND ANNOUNCEMENT",
    update_downloads: "Update Downloads",
    new_name_placeholder: "New Name",
    change_id: "Change Email ID",
    new_id_placeholder: "New ID (e.g., my_user)",
    success_name: "Name updated",
    success_id: "Email ID updated",
    success_ban: "User banned",
    success_unban: "User unbanned",
    success_kick: "User kicked",
    success_announcement: "Announcement sent successfully",
    success_downloads: "Download links updated",
    error_notfound: "User not found",
    error_exists: "This ID is already in use",
    error_invalid_id: "Invalid ID (letters, numbers, dots, and dashes only)",
    error_noban: "This user cannot be banned",
    error_toolong: "Message is too long",
    error_missing: "Missing required data",
    error_server: "Server error",
    confirm_btn: "CONNECTED!",
    generating_code: "GENERATING CODE...",
    confirm_instruction: "Click the button for the Launcher to detect your account."
  }
};

// Ruta para cambiar idioma
router.get('/api/v2/set-lang', (req, res) => {
  const { lang } = req.query;
  if (['es', 'en'].includes(lang)) {
    res.cookie('leilos_lang', lang, { maxAge: 365 * 24 * 60 * 60 * 1000, path: '/' });
  }
  res.redirect('back');
});

// Almacén temporal de códigos para el launcher (en memoria)
if (!global.launcherCodes) global.launcherCodes = new Map();

// 1. Iniciar sesión con Discord
router.get('/api/v2/discord/login', (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.DISCORD_REDIRECT_URI);
  const state = req.query.state || 'web';
  const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20email&state=${state}`;
  res.redirect(url);
});

// 1.0 Login específico para el Launcher (Discord Direct)
router.get('/api/v2/discord/launcher', (req, res) => {
  const { port } = req.query;
  if (!port) return res.status(400).send('Falta el puerto del launcher.');
  
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.DISCORD_REDIRECT_URI);
  // Guardamos el puerto en el state para recuperarlo en el callback
  const state = `launcher_${port}`;
  const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20email&state=${state}`;
  res.redirect(url);
});

// 1.1 Iniciar sesión específico para el Launcher (Manual ID)
router.get('/api/launcher/login', (req, res) => {
  const lang = req.cookies?.leilos_lang || 'es';
  const t = translations[lang];
  res.send(`
    <html>
      <head>
        <title>Snouwe | Login</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;800&family=Rajdhani:wght@300;400;600;700&display=swap');
          :root {
            --primary: #D4AF37;
            --bg-dark: #050505;
            --bg-card: #0a0a0a;
            --text-main: #ffffff;
            --gold-gradient: linear-gradient(135deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C);
            --border: rgba(212, 175, 55, 0.2);
          }
          body { 
            font-family: 'Rajdhani', sans-serif; 
            background: var(--bg-dark); 
            color: var(--text-main); 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            height: 100vh; 
            margin: 0;
            text-align: center;
          }
          .card {
            background: var(--bg-card);
            padding: 3rem;
            border-radius: 12px;
            border: 1px solid var(--border);
            box-shadow: 0 0 30px rgba(0,0,0,0.5);
            position: relative;
            max-width: 400px;
            width: 90%;
          }
          .card:after {
            content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 2px;
            background: var(--gold-gradient);
          }
          h1 { font-family: 'Orbitron', sans-serif; font-size: 1.5rem; color: var(--primary); margin-bottom: 1.5rem; }
          .input-group { text-align: left; margin-bottom: 1.5rem; }
          input { 
            width: 100%; padding: 14px; border-radius: 4px; border: 1px solid var(--border); 
            background: #000; color: white; box-sizing: border-box; font-family: inherit; font-size: 1rem;
          }
          button { 
            width: 100%; padding: 16px; border: none; border-radius: 4px; 
            background: var(--gold-gradient); color: #000; font-family: 'Orbitron', sans-serif; 
            font-weight: 800; cursor: pointer; text-transform: uppercase;
          }
          .error { color: #ff4444; font-size: 0.9rem; margin-top: 10px; }
          .lang-selector { position: absolute; top: 20px; right: 20px; display: flex; gap: 10px; }
          .lang-btn { color: var(--text-muted); text-decoration: none; font-size: 0.7rem; font-family: 'Orbitron', sans-serif; }
          .lang-btn.active { color: var(--primary); }
        </style>
      </head>
      <body>
        <div class="lang-selector">
          <a href="/api/v2/set-lang?lang=es" class="lang-btn ${lang === 'es' ? 'active' : ''}">ES</a>
          <a href="/api/v2/set-lang?lang=en" class="lang-btn ${lang === 'en' ? 'active' : ''}">EN</a>
        </div>
        <div class="card">
          <h1>Snouwe | ${lang === 'es' ? 'ACCESO' : 'ACCESS'}</h1>
          <form action="/api/launcher/login" method="POST">
            <div class="input-group">
              <input type="text" name="discordId" placeholder="${lang === 'es' ? 'Introduce tu ID de Usuario' : 'Enter your User ID'}" required>
            </div>
            <button type="submit">${lang === 'es' ? 'ACCEDER' : 'ACCESS'}</button>
            ${req.query.error ? `<div class="error">${t.error_notfound}.</div>` : ''}
          </form>
        </div>
      </body>
    </html>
  `);
});

router.post('/api/launcher/login', async (req, res) => {
  const { discordId } = req.body;
  if (!discordId) return res.redirect('/api/launcher/login?error=1');

  const user = await User.findOne({ discordId });
  if (!user) return res.redirect('/api/launcher/login?error=1');

  // Si existe, lo mandamos a la página de confirmación como antes
  res.redirect(`/api/launcher/confirm-view?id=${user.discordId}`);
});

// Nueva vista de confirmación tras poner el ID manual
router.get('/api/launcher/confirm-view', async (req, res) => {
  const { id } = req.query;
  const lang = req.cookies?.leilos_lang || 'es';
  const t = translations[lang];
  const user = await User.findOne({ discordId: id });
  if (!user) return res.redirect('/api/launcher/login?error=1');

  const avatarUrl = user.avatar 
    ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png` 
    : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discordId) % 5}.png`;

  res.send(`
    <html>
      <head>
        <title>Snouwe  | Confirmar</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;800&family=Rajdhani:wght@300;400;600;700&display=swap');
          :root {
            --primary: #D4AF37;
            --bg-dark: #050505;
            --bg-card: #0a0a0a;
            --text-main: #ffffff;
            --gold-gradient: linear-gradient(135deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C);
            --border: rgba(212, 175, 55, 0.2);
          }
          body { 
            font-family: 'Rajdhani', sans-serif; 
            background: var(--bg-dark); 
            color: var(--text-main); 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            height: 100vh; 
            margin: 0;
            text-align: center;
          }
          .card {
            background: var(--bg-card);
            padding: 3rem;
            border-radius: 12px;
            border: 1px solid var(--border);
            box-shadow: 0 0 30px rgba(0,0,0,0.5);
            position: relative;
          }
          .card:after {
            content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 2px;
            background: var(--gold-gradient);
          }
          .avatar {
            width: 100px; height: 100px; border-radius: 50%;
            border: 3px solid var(--primary);
            margin-bottom: 1.5rem;
            box-shadow: 0 0 20px rgba(212, 175, 55, 0.3);
          }
          h1 { font-family: 'Orbitron', sans-serif; font-size: 1.5rem; color: var(--primary); margin-bottom: 0.5rem; }
          .user-id { 
            font-family: 'Orbitron', sans-serif; background: rgba(0,0,0,0.5); padding: 12px 24px; border-radius: 4px; 
            color: var(--primary); margin: 1.5rem 0; display: inline-block; border: 1px solid var(--border);
            font-size: 1.2rem; letter-spacing: 2px;
          }
          button {
            display: block; width: 100%; padding: 16px; margin-top: 1rem;
            background: var(--gold-gradient); color: #000;
            font-family: 'Orbitron', sans-serif; font-weight: 800; text-transform: uppercase;
            border: none; border-radius: 4px; cursor: pointer;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <img class="avatar" src="${avatarUrl}" />
          <h1>${t.welcome}, ${user.username.toUpperCase()}!</h1>
          <p>${t.account_linked}</p>
          <div class="user-id">${user.username}</div>
          <button onclick="confirmLogin()">${t.confirm_and_enter}</button>
        </div>
        <script>
          function confirmLogin() {
            // El launcher leerá el título para obtener el nombre
            document.title = "${user.username}";
            console.log("LOGIN_SUCCESS:${user.username}");
            
            const btn = document.querySelector('button');
            btn.innerText = "${t.confirm_btn}";
            btn.disabled = true;

            setTimeout(() => window.close(), 1500);
          }
        </script>
      </body>
    </html>
  `);
});

// 1.2 Generar código de intercambio para el Launcher (Mantenemos por si el launcher lo prefiere)
router.get('/api/launcher/confirm', async (req, res) => {
  const { id } = req.query;
  const sessionUser = req.cookies?.leilos_session;

  if (!id || sessionUser !== id) return res.status(401).send('Sesión no válida.');

  const user = await User.findOne({ discordId: id });
  if (!user) return res.status(404).send('Usuario no encontrado.');

  // Generamos un código único de un solo uso
  const exchangeCode = uuidv4();
  
  // Guardamos el código asociado al nombre de usuario por 5 minutos
  global.launcherCodes.set(exchangeCode, {
    username: user.username,
    discordId: user.discordId,
    expires: Date.now() + (5 * 60 * 1000)
  });

  // Redirigimos a una URL final que el launcher puede interceptar fácilmente
  // Formato: https://api-leilos.crisu.qzz.io/api/launcher/success?code=UUID
  res.redirect(`/api/launcher/success?code=${exchangeCode}`);
});

// 1.3 Página final de éxito (donde llega el launcher)
router.get('/api/launcher/success', (req, res) => {
  const { code } = req.query;
  const lang = req.cookies?.leilos_lang || 'es';
  const t = translations[lang];
  res.send(`
    <html>
      <head>
        <title>LOGIN_SUCCESS:${code}</title>
        <style>
          body { background: #050505; color: white; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .msg { text-align: center; border: 1px solid #D4AF37; padding: 20px; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="msg">
          <h2 style="color: #D4AF37;">${t.connected}!</h2>
          <p>${lang === 'es' ? 'El launcher está procesando tu entrada...' : 'The launcher is processing your entry...'}</p>
          <code style="background: #000; padding: 5px;">${code}</code>
        </div>
        <script>
          // Mandamos el código por consola también
          console.log("EXCHANGE_CODE:${code}");
          // Cerramos en 3 segundos si no se ha cerrado antes
          setTimeout(() => window.close(), 3000);
        </script>
      </body>
    </html>
  `);
});

// 1.4 Endpoint que el launcher llama para canjear el código
router.get('/api/launcher/verify', (req, res) => {
  const { code } = req.query;
  
  if (!code || !global.launcherCodes.has(code)) {
    return res.status(400).json({ status: 'error', message: 'Código inválido o expirado.' });
  }

  const data = global.launcherCodes.get(code);
  
  // Verificar expiración
  if (Date.now() > data.expires) {
    global.launcherCodes.delete(code);
    return res.status(400).json({ status: 'error', message: 'El código ha expirado.' });
  }

  // Borramos el código para que sea de UN SOLO USO
  global.launcherCodes.delete(code);

  // Devolvemos el nombre de usuario que el launcher necesita
  res.json({
    status: 'success',
    username: data.username,
    discordId: data.discordId,
    email: `${data.username}@leilos.tf`
  });
});

// 2. Callback de Discord
router.get('/api/v2/discord/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code) return res.status(400).send('No se recibió código de Discord.');

  try {
    const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: process.env.DISCORD_REDIRECT_URI,
    }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` }
    });

    const discordUser = userResponse.data;
    const avatarUrl = discordUser.avatar 
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` 
        : 'https://cdn.discordapp.com/embed/avatars/0.png';

    // Guardar sesión en cookie (seguridad mejorada)
    res.cookie('leilos_session', discordUser.id, { 
      maxAge: 15 * 60 * 1000, 
      httpOnly: true,
      secure: true, 
      sameSite: 'lax',
      path: '/'
    });

    // Verificar roles en el servidor de Discord
    let isHighRole = false;
    let isInServer = true;
    try {
      const guildId = '1461855344631484612';
      const adminRoleId = '1478069256930459731'; // ID del rol Admin proporcionado
      const guildMemberResponse = await axios.get(`https://discord.com/api/guilds/${guildId}/members/${discordUser.id}`, {
        headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }
      });
      
      const roles = guildMemberResponse.data.roles;
      if (roles.includes(adminRoleId)) isHighRole = true; 
    } catch (e) {
      const log = require("../structs/log.js");
      log.error('[Discord] El usuario no está en el servidor principal o el bot no tiene acceso.');
      isInServer = false;
    }

    if (!isInServer) {
        return res.send(`
        <html>
          <head>
            <title>Snouwe | Error</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;800&family=Rajdhani:wght@300;400;600;700&display=swap');
              :root {
                --primary: #D4AF37;
                --bg-dark: #050505;
                --bg-card: #0a0a0a;
                --text-main: #ffffff;
                --danger: #ff4444;
              }
              body { 
                font-family: 'Rajdhani', sans-serif; 
                background: var(--bg-dark); 
                color: var(--text-main); 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                height: 100vh; 
                margin: 0;
                text-align: center;
              }
              .card {
                background: var(--bg-card);
                padding: 3rem;
                border-radius: 12px;
                border: 1px solid rgba(255, 68, 68, 0.2);
                box-shadow: 0 8px 32px rgba(255, 68, 68, 0.1);
                max-width: 400px;
                width: 90%;
              }
              h1 { font-family: 'Orbitron', sans-serif; color: var(--danger); margin-bottom: 1rem; font-size: 1.5rem; }
              p { color: #b8b8b8; font-size: 1.1rem; line-height: 1.5; margin-bottom: 2rem; }
              .btn {
                background: rgba(255, 68, 68, 0.1);
                color: var(--danger);
                border: 1px solid var(--danger);
                padding: 12px 24px;
                border-radius: 6px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                text-decoration: none;
                display: inline-block;
                font-family: 'Orbitron', sans-serif;
              }
              .btn:hover {
                background: var(--danger);
                color: #fff;
                box-shadow: 0 0 15px rgba(255, 68, 68, 0.4);
              }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>❌ ACCESO DENEGADO</h1>
              <p>Para poder iniciar sesión y crear tu cuenta, debes estar dentro de nuestro servidor oficial de Discord.</p>
              <a href="https://mini.crisu.qzz.io/leilos_discord" class="btn">UNIRSE AL SERVIDOR</a>
            </div>
          </body>
        </html>
      `);
    }

    const email = `${discordUser.id}@leilos.tf`;

    // Buscar si el usuario ya existe y tiene los campos básicos
    let user = await User.findOne({ discordId: discordUser.id });

    if (!user || !user.username || !user.created) {
      // Si no existe, mostramos el formulario para elegir el ID
      const lang = req.cookies?.leilos_lang || 'es';
      const t = translations[lang];

      return res.send(`
        <html>
          <head>
            <title>Snouwe | Registro</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;800&family=Rajdhani:wght@300;400;600;700&display=swap');
              :root {
                --primary: #D4AF37;
                --bg-dark: #050505;
                --bg-card: #0a0a0a;
                --text-main: #ffffff;
                --gold-gradient: linear-gradient(135deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C);
              }
              body { 
                font-family: 'Rajdhani', sans-serif; 
                background: var(--bg-dark); 
                color: var(--text-main); 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                height: 100vh; 
                margin: 0;
                text-align: center;
              }
              .card {
                background: var(--bg-card);
                padding: 3rem;
                border-radius: 12px;
                border: 1px solid rgba(212, 175, 55, 0.2);
                box-shadow: 0 0 30px rgba(0,0,0,0.5);
                max-width: 450px;
                width: 90%;
              }
              h1 { font-family: 'Orbitron', sans-serif; font-size: 1.5rem; color: var(--primary); margin-bottom: 1.5rem; }
              p { color: #888; font-size: 1.1rem; margin-bottom: 2rem; }
              .form-group { margin-bottom: 1.5rem; text-align: left; }
              label { display: block; margin-bottom: 0.5rem; color: var(--primary); font-family: 'Orbitron', sans-serif; font-size: 0.8rem; }
              input {
                width: 100%;
                padding: 12px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(212, 175, 55, 0.3);
                border-radius: 4px;
                color: #fff;
                font-family: 'Rajdhani', sans-serif;
                font-size: 1.1rem;
                outline: none;
                transition: border-color 0.3s;
              }
              input:focus { border-color: var(--primary); }
              .btn-confirm {
                display: block; width: 100%; padding: 16px; margin-top: 1rem;
                background: var(--gold-gradient); color: #000;
                font-family: 'Orbitron', sans-serif; font-weight: 800; text-transform: uppercase;
                border: none; border-radius: 4px; cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
              }
              .btn-confirm:hover { transform: scale(1.02); box-shadow: 0 0 20px rgba(212, 175, 55, 0.4); }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>${t.welcome || 'Welcome'}, ${discordUser.username.toUpperCase()}!</h1>
              <p>Please choose your account ID before continuing.</p>
              
              <form action="/api/v2/discord/register" method="POST">
                <input type="hidden" name="discordId" value="${discordUser.id}">
                <input type="hidden" name="username" value="${discordUser.username}">
                <input type="hidden" name="avatar" value="${discordUser.avatar || ''}">
                <input type="hidden" name="state" value="${state || ''}">
                <input type="hidden" name="isHighRole" value="${isHighRole}">
                
                <div class="form-group">
                  <label>What ID would you like to have?</label>
                  <input type="text" name="customId" placeholder="Ej: mi_usuario" required minlength="3" pattern="[a-zA-Z0-9_.-]+">
                  <small style="color: #666; font-size: 0.8rem; margin-top: 5px; display: block;">
                    Tu correo será: ID@leilos.tf
                  </small>
                </div>

                <button type="submit" class="btn-confirm">CREAR CUENTA</button>
              </form>
            </div>
          </body>
        </html>
      `);
    } else {
      // Si el usuario existe, actualizar su avatar e IP
      await User.updateOne({ discordId: discordUser.id }, { 
        avatar: discordUser.avatar || '',
        isAdmin: user.isAdmin,
        lastIp: req.ip,
        lastLogin: new Date()
      });
    }

    // --- Lógica de Respuesta según el State ---
    if (state && state.startsWith('launcher')) {
      const port = state.split('_')[1] || '4080';
      const leilosId = user.email.split('@')[0]; // Parte antes de @leilos.tf

      // Redirigir al puerto local del launcher con la info
      return res.send(`
        <html>
          <head>
            <title>Snouwe | Autorizando Launcher</title>
            <style>
              body { background: #050505; color: white; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
              .loader { border: 4px solid #1a1a1a; border-top: 4px solid #D4AF37; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px; }
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
          </head>
          <body>
            <div>
              <div class="loader"></div>
              <h2 style="color: #D4AF37;">¡Autorizado!</h2>
              <p>Enviando datos al Launcher...</p>
            </div>
            <script>
              // Enviamos la petición al launcher y cerramos
              fetch("http://127.0.0.1:${port}/auth?id=${leilosId}")
                .then(() => {
                  setTimeout(() => window.close(), 1000);
                })
                .catch(() => {
                  // Si falla el fetch (ej: cors), intentamos redirección directa
                  window.location.href = "http://127.0.0.1:${port}/auth?id=${leilosId}";
                  setTimeout(() => window.close(), 2000);
                });
            </script>
          </body>
        </html>
      `);
    }

    if (state === 'manual_launcher') {
      const lang = req.cookies?.leilos_lang || 'es';
      const t = translations[lang];
      // Respuesta especial para el Launcher con estilos de Leilos
      return res.send(`
        <html>
          <head>
            <title>Snouwe | ${t.connected}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;800&family=Rajdhani:wght@300;400;600;700&display=swap');
              :root {
                --primary: #D4AF37;
                --bg-dark: #050505;
                --bg-card: #0a0a0a;
                --text-main: #ffffff;
                --gold-gradient: linear-gradient(135deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C);
              }
              body { 
                font-family: 'Rajdhani', sans-serif; 
                background: var(--bg-dark); 
                color: var(--text-main); 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                height: 100vh; 
                margin: 0;
                text-align: center;
              }
              .card {
                background: var(--bg-card);
                padding: 3rem;
                border-radius: 12px;
                border: 1px solid rgba(212, 175, 55, 0.2);
                box-shadow: 0 0 30px rgba(0,0,0,0.5);
                position: relative;
              }
              .card:after {
                content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 2px;
                background: var(--gold-gradient);
              }
              .avatar {
                width: 100px; height: 100px; border-radius: 50%;
                border: 3px solid var(--primary);
                margin-bottom: 1.5rem;
                box-shadow: 0 0 20px rgba(212, 175, 55, 0.3);
              }
              h1 { font-family: 'Orbitron', sans-serif; font-size: 1.5rem; color: var(--primary); margin-bottom: 0.5rem; }
              p { color: #888; font-size: 1.1rem; }
              .user-id { 
                font-family: 'Orbitron', sans-serif; background: rgba(0,0,0,0.5); padding: 12px 24px; border-radius: 4px; 
                color: var(--primary); margin: 1.5rem 0; display: inline-block; border: 1px solid var(--border);
                font-size: 1.2rem; letter-spacing: 2px;
              }
              .btn-confirm {
                display: block; width: 100%; padding: 16px; margin-top: 1rem;
                background: var(--gold-gradient); color: #000;
                font-family: 'Orbitron', sans-serif; font-weight: 800; text-transform: uppercase;
                border: none; border-radius: 4px; cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
              }
              .btn-confirm:hover { transform: scale(1.02); box-shadow: 0 0 20px rgba(212, 175, 55, 0.4); }
              .btn-confirm:active { transform: scale(0.98); }
            </style>
          </head>
          <body>
            <div class="card">
              <img class="avatar" src="${discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png'}" />
              <h1>${t.welcome}, ${user.username.toUpperCase()}!</h1>
              <p>${t.account_linked}</p>
              
              <div class="user-id" id="username-display">${user.username}</div>
              
              <button class="btn-confirm" onclick="confirmLogin()">${t.confirm_and_enter}</button>
              
              <p style="font-size: 0.8rem; margin-top: 20px; opacity: 0.5;">${t.confirm_instruction}</p>
            </div>
            <script>
              async function confirmLogin() {
                const btn = document.querySelector('.btn-confirm');
                btn.innerText = "${t.generating_code}";
                btn.disabled = true;

                try {
                  // Pedimos al backend un código de intercambio para este usuario
                  window.location.href = "/api/launcher/confirm?id=${user.discordId}";
                } catch (e) {
                  alert("Error al confirmar sesión.");
                  btn.innerText = "${t.confirm_and_enter}";
                  btn.disabled = false;
                }
              }
            </script>
          </body>
        </html>
      `);
    }

    // Si es web normal, redirigir al Dashboard
    res.redirect(`/api/v2/dashboard?id=${discordUser.id}`);

  } catch (error) {
    const log = require("../structs/log.js");
    log.error('OAuth Error:', error);
    res.status(500).send('Error en la autenticación.');
  }
});

// 3. Registro final
router.post('/api/v2/discord/register', async (req, res) => {
  const { discordId, username, password, avatar, isHighRole, customId, state } = req.body;
  const moderators = JSON.parse(process.env.MODERATORS || "[]");

  try {
    const isAdmin = moderators.includes(discordId) || isHighRole === 'true'; 
    
    // Si ya existía uno incompleto o corrupto, lo eliminamos para crear el nuevo correctamente
    await User.deleteOne({ discordId });

    const resp = await functions.registerUser(discordId, username, undefined, password, customId);

    if (resp.status >= 400) {
      return res.status(resp.status).send(`
        <html>
          <body style="background: #050505; color: #ff4444; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh;">
            <div style="text-align: center;">
              <h1>Error de Registro</h1>
              <p>${resp.message}</p>
              <button onclick="window.history.back()" style="background: #D4AF37; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: bold;">VOLVER</button>
            </div>
          </body>
        </html>
      `);
    }

    // Actualizamos avatar e isAdmin si es necesario
    await User.updateOne({ discordId }, { 
      avatar: avatar || '', 
      isAdmin, 
      isWhitelisted: isAdmin,
      lastIp: req.ip,
      lastLogin: new Date()
    });

    if (state && state.startsWith('launcher')) {
      return res.redirect(`/api/v2/discord/launcher?port=${state.split('_')[1] || '4080'}`);
    } else {
      res.redirect(`/api/v2/dashboard?id=${discordId}`);
    }
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).send('Error al crear la cuenta.');
  }
});

// 4. Dashboard (Panel de Control Mejorado)
router.get('/api/v2/dashboard', async (req, res) => {
  const { id } = req.query;
  const sessionUser = req.cookies?.leilos_session;
  const lang = req.cookies?.leilos_lang || 'es';
  const t = translations[lang];

  if (!sessionUser) return res.redirect('/api/v2/discord/login');
  if (!id) return res.redirect(`/api/v2/dashboard?id=${sessionUser}`);

  const adminCheck = await User.findOne({ discordId: sessionUser });
  if (sessionUser !== id && (!adminCheck || !adminCheck.isAdmin)) {
    return res.status(403).send('Acceso denegado.');
  }

  const user = await User.findOne({ discordId: id });
  if (!user) return res.status(404).send('Usuario no encontrado.');

  const avatarUrl = user.avatar 
    ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png` 
    : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discordId) % 5}.png`;

  const isConnected = (global.Clients || []).some(i => i.accountId == user.accountId);
  const activeSessions = (global.accessTokens || []).filter(i => i.accountId == user.accountId).length;

  // Cargar el último mensaje de descargas guardado
  let lastDownloadsMessage = "";
  try {
    const downloadsConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "Config", "downloads.json")).toString());
    lastDownloadsMessage = downloadsConfig.message || "";
  } catch (e) {}

  res.send(`
    <html>
      <head>
        <title>Snouwe Dashboard | ${user.username}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;800&family=Rajdhani:wght@300;400;600;700&display=swap');
          
          :root {
            --primary: #D4AF37;
            --primary-hover: #F5Edc3;
            --bg-dark: #050505;
            --bg-card: #0a0a0a;
            --text-main: #ffffff;
            --text-muted: #b8b8b8;
            --gold-gradient: linear-gradient(135deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C);
            --border: rgba(212, 175, 55, 0.1);
            --success: #00ff00;
            --danger: #ff0000;
          }

          * { scrollbar-width: thin; scrollbar-color: var(--primary) var(--bg-dark); }
          ::-webkit-scrollbar { width: 12px; }
          ::-webkit-scrollbar-track { background: var(--bg-dark); }
          ::-webkit-scrollbar-thumb { background-color: var(--primary); border-radius: 6px; border: 3px solid var(--bg-dark); }

          body { 
            font-family: 'Rajdhani', sans-serif; 
            background: var(--bg-dark); 
            color: var(--text-main); 
            margin: 0;
            padding: 2rem 1rem;
            display: flex;
            justify-content: center;
            min-height: 100vh;
            overflow-y: auto;
            overflow-x: hidden;
            position: relative;
          }

          body:before {
            content: "";
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4AF37' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
            pointer-events: none;
            z-index: -1;
          }

          .container { 
            max-width: 1200px; 
            width: 100%; 
            background: var(--bg-card); 
            border-radius: 12px; 
            border: 1px solid var(--border); 
            padding: 3.5rem;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(15px);
            position: relative;
            margin: auto;
            margin-bottom: 3rem;
          }

          .container:after {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 2px;
            background: var(--gold-gradient);
          }

          .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start; 
            margin-bottom: 3rem;
            padding-bottom: 2rem;
            border-bottom: 1px solid var(--border);
            flex-wrap: wrap;
            gap: 20px;
          }

          .user-profile { display: flex; align-items: center; gap: 1.5rem; }
          .avatar-img { 
            width: 80px; 
            height: 80px; 
            border-radius: 50%; 
            border: 2px solid var(--primary);
            box-shadow: 0 0 20px rgba(212, 175, 55, 0.2);
          }

          .status-badge { 
            padding: 6px 16px; 
            border-radius: 4px; 
            font-size: 0.7rem; 
            font-weight: 800;
            letter-spacing: 1px;
            text-transform: uppercase;
            font-family: 'Orbitron', sans-serif;
          }
          .online { background: rgba(0, 255, 0, 0.1); color: var(--success); border: 1px solid var(--success); }
          .offline { background: rgba(255, 0, 0, 0.1); color: var(--danger); border: 1px solid var(--danger); }
          
          .grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); 
            gap: 1.5rem; 
            margin-top: 1.5rem;
          }

          .card-stat { 
            background: rgba(255, 255, 255, 0.015);
            padding: 1.8rem; 
            border-radius: 12px; 
            border: 1px solid var(--border);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.3s ease, background 0.3s ease;
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }

          .card-stat:hover {
            transform: translateY(-4px);
            border-color: rgba(212, 175, 55, 0.3);
            background: rgba(255, 255, 255, 0.03);
          }

          .label { color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; margin-bottom: 0.5rem; font-weight: bold; letter-spacing: 1px; font-family: 'Orbitron', sans-serif; }
          .value { 
            font-size: 0.9rem; 
            font-weight: 600; 
            color: var(--text-main); 
            word-break: break-all;
            font-family: 'Consolas', monospace;
            background: rgba(0, 0, 0, 0.3);
            padding: 4px 8px;
            border-radius: 4px;
            display: block;
            margin-top: 5px;
            border: 1px solid rgba(255, 255, 255, 0.05);
          }
          
          .btn {
            background: transparent;
            color: var(--primary);
            border: 2px solid var(--primary);
            padding: 12px 24px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            text-decoration: none;
            display: inline-block;
            transition: 0.3s;
            font-size: 0.9rem;
            text-align: center;
            font-family: 'Orbitron', sans-serif;
            text-transform: uppercase;
            position: relative;
            overflow: hidden;
            z-index: 1;
          }
          .btn:before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            width: 0%;
            height: 100%;
            background: var(--primary);
            transition: width 0.3s ease;
            z-index: -1;
          }
          .btn:hover { color: var(--bg-dark); box-shadow: 0 0 15px rgba(212, 175, 55, 0.3); }
          .btn:hover:before { width: 100%; }

          .btn-danger { color: var(--danger); border-color: var(--danger); }
          .btn-danger:before { background: var(--danger); }
          .btn-danger:hover { color: white; box-shadow: 0 0 15px rgba(255, 0, 0, 0.3); }
          
          .form-group { margin-bottom: 1.5rem; text-align: left; }
          .form-group label { display: block; margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase; }
          .form-group input { 
            width: 100%; 
            padding: 14px; 
            background: #050505; 
            border: 1px solid var(--border); 
            border-radius: 4px; 
            color: white; 
            box-sizing: border-box;
            transition: 0.3s;
            font-family: 'Rajdhani', sans-serif;
            font-size: 1rem;
          }
          .form-group input:focus { border-color: var(--primary); outline: none; box-shadow: 0 0 10px rgba(212, 175, 55, 0.1); }
          
          .section-title { 
            font-family: 'Orbitron', sans-serif; 
            font-size: 1.3rem; 
            color: var(--primary); 
            margin: 3.5rem 0 1.5rem 0;
            display: flex;
            align-items: center;
            gap: 10px;
            text-transform: uppercase;
            letter-spacing: 2px;
          }

          .section-title:after {
            content: "";
            height: 1px;
            flex: 1;
            background: linear-gradient(90deg, var(--primary), transparent);
            opacity: 0.3;
          }

          .alert { padding: 15px; border-radius: 4px; margin-bottom: 1.5rem; font-size: 0.9rem; border: 1px solid transparent; }
          .alert-success { background: rgba(0, 255, 0, 0.05); color: var(--success); border-color: rgba(0, 255, 0, 0.2); }
          .alert-danger { background: rgba(255, 0, 0, 0.05); color: var(--danger); border-color: rgba(255, 0, 0, 0.2); }
          
          .lang-selector {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
          }
          .lang-btn {
            background: rgba(255,255,255,0.05);
            border: 1px solid var(--border);
            color: var(--text-muted);
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.7rem;
            font-family: 'Orbitron', sans-serif;
            text-decoration: none;
            transition: 0.3s;
          }
          .lang-btn.active {
            border-color: var(--primary);
            color: var(--primary);
            background: rgba(212, 175, 55, 0.1);
          }

          @media (max-width: 768px) {
            .container { padding: 1.5rem; }
            .header { justify-content: center; text-align: center; }
            .user-profile { flex-direction: column; }
            .grid { grid-template-columns: 1fr; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="user-profile">
              <img src="${avatarUrl}" class="avatar-img" />
              <div>
                <h1 style="margin: 0; font-size: 1.8rem; font-family: 'Orbitron', sans-serif; text-transform: uppercase;">${user.username}</h1>
                <p style="margin: 5px 0 0 0; color: var(--text-muted); font-weight: 600;">${user.email}</p>
              </div>
            </div>
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 10px;">
              <div class="lang-selector">
                <a href="/api/v2/set-lang?lang=es" class="lang-btn ${lang === 'es' ? 'active' : ''}">ES</a>
                <a href="/api/v2/set-lang?lang=en" class="lang-btn ${lang === 'en' ? 'active' : ''}">EN</a>
              </div>
              <a href="/api/v2/logout" class="btn btn-danger" style="padding: 6px 12px; font-size: 0.7rem;">${t.logout}</a>
            </div>
          </div>

          ${req.query.success ? `<div class="alert alert-success">✅ ${t['success_' + req.query.success] || t.update}.</div>` : ''}
          ${req.query.error ? `<div class="alert alert-danger">❌ ${t['error_' + req.query.error] || t.error_server}.</div>` : ''}

          <div class="grid">
            <div class="card-stat">
              <div class="label">${t.account_id}</div>
              <div class="value">${user.accountId}</div>
            </div>
            <div class="card-stat">
              <div class="label">${t.discord_id}</div>
              <div class="value">${user.discordId}</div>
            </div>
            <div class="card-stat">
              <div class="label">${t.access_status}</div>
              <div class="value" style="color: ${user.banned ? 'var(--danger)' : 'var(--success)'}">
                ${user.banned ? '⚠️ ' + t.banned : '✅ ' + t.active}
              </div>
            </div>
            <div class="card-stat">
              <div class="label">${t.privileges}</div>
              <div class="value">${user.isAdmin ? '⭐ ' + t.admin : '👤 ' + t.user}</div>
            </div>
            <div class="card-stat">
              <div class="label">${t.last_ip}</div>
              <div class="value">${user.lastIp || t.not_registered}</div>
            </div>
            <div class="card-stat">
              <div class="label">${t.active_sessions}</div>
              <div class="value">${activeSessions} ${t.devices}</div>
            </div>
          </div>

          ${adminCheck && adminCheck.isAdmin ? `
            <div class="section-title">🛡️ ${t.admin_panel}</div>
            <div class="grid" style="grid-template-columns: repeat(3, 1fr); gap: 1.5rem;">
              <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                <div class="card-stat">
                  <div class="label">${t.manage_user}</div>
                  <form action="/api/v2/admin/manage" method="POST">
                    <div class="form-group">
                      <input type="text" name="target" placeholder="${t.manage_user_placeholder}" required>
                    </div>
                    <div class="form-group" id="reason-container" style="display: none;">
                      <input type="text" name="reason" placeholder="${t.reason_placeholder}">
                    </div>
                    <div style="display: flex; gap: 8px;">
                      <button type="submit" name="action" value="ban" class="btn btn-danger" style="flex: 1; padding: 10px 5px; font-size: 0.8rem;" onclick="document.getElementById('reason-container').style.display='block'; if(this.dataset.clicked !== 'true') { this.dataset.clicked = 'true'; return false; }">${t.ban}</button>
                      <button type="submit" name="action" value="unban" class="btn" style="flex: 1; border-color: var(--success); color: var(--success); padding: 10px 5px; font-size: 0.8rem;">${t.unban}</button>
                      <button type="submit" name="action" value="kick" class="btn" style="flex: 1; border-color: #ff9900; color: #ff9900; padding: 10px 5px; font-size: 0.8rem;">${t.kick}</button>
                    </div>
                  </form>
                </div>

                <div class="card-stat">
                  <div class="label">${t.create_host}</div>
                  <form action="/api/v2/admin/manage" method="POST">
                    <div class="form-group">
                      <input type="text" name="username" placeholder="${t.host_name_placeholder}" required>
                    </div>
                    <div class="form-group">
                      <input type="password" name="password" placeholder="${t.password_placeholder}" required>
                    </div>
                    <button type="submit" name="action" value="create-host" class="btn" style="width: 100%; border-color: var(--primary); color: var(--primary); padding: 10px;">${t.create_host}</button>
                  </form>
                </div>

                <div class="card-stat">
                  <div class="label">${t.server_tools}</div>
                  <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
                    <a href="/logs" target="_blank" class="btn" style="text-align: center; padding: 10px;">Logs</a>
                    <a href="/status" target="_blank" class="btn" style="text-align: center; padding: 10px;">Status</a>
                  </div>
                </div>
              </div>

              <div style="display: flex; flex-direction: column;">
                <div class="card-stat" style="height: 100%; display: flex; flex-direction: column;">
                  <div class="label">📥 ${t.manage_downloads}</div>
                  <form action="/api/v2/admin/manage" method="POST" style="flex: 1; display: flex; flex-direction: column;">
                    <div class="form-group" style="flex: 1; display: flex; position: relative;">
                      <textarea name="message" id="downloads-text" maxlength="2000" placeholder="${t.write_links_placeholder}" required style="width: 100%; background: #000; color: white; border: 1px solid var(--border); padding: 1.2rem; border-radius: 8px; font-family: 'Rajdhani', sans-serif; font-size: 0.95rem; min-height: 250px; resize: none; line-height: 1.4; outline: none;">${lastDownloadsMessage}</textarea>
                      <div id="downloads-count" style="position: absolute; bottom: 10px; right: 15px; font-size: 0.75rem; color: var(--text-muted); font-family: 'Orbitron', sans-serif;">0 / 2000</div>
                    </div>
                    <button type="submit" name="action" value="downloads" class="btn" style="width: 100%; border-color: var(--primary); color: var(--primary); padding: 12px; margin-top: 1rem;">${t.update_downloads}</button>
                  </form>
                </div>
              </div>

              <div style="display: flex; flex-direction: column;">
                <div class="card-stat" style="height: 100%; display: flex; flex-direction: column;">
                  <div class="label">📢 ${t.send_announcement}</div>
                  <form action="/api/v2/admin/manage" method="POST" style="flex: 1; display: flex; flex-direction: column;">
                    <div class="form-group" style="flex: 1; display: flex; position: relative;">
                      <textarea name="message" id="announcement-text" maxlength="2000" placeholder="${t.write_announcement_placeholder}" required style="width: 100%; background: #000; color: white; border: 1px solid var(--border); padding: 1.2rem; border-radius: 8px; font-family: 'Rajdhani', sans-serif; font-size: 0.95rem; min-height: 250px; resize: none; line-height: 1.4; outline: none; margin-bottom: 10px;"></textarea>
                      <div id="announcement-count" style="position: absolute; bottom: 20px; right: 15px; font-size: 0.75rem; color: var(--text-muted); font-family: 'Orbitron', sans-serif;">0 / 2000</div>
                    </div>
                    <div class="form-group" style="margin-top: 5px; margin-bottom: 5px;">
                      <input type="text" name="imageUrl" placeholder="${t.image_url_placeholder}" style="width: 100%; background: #000; color: white; border: 1px solid var(--border); padding: 10px; border-radius: 4px; font-family: 'Rajdhani', sans-serif; font-size: 0.9rem; outline: none;">
                    </div>
                    <div style="margin-top: 1rem; background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 8px; border: 1px solid var(--border);">
                      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 0.8rem;">
                        <input type="checkbox" name="ping" id="ping-everyone" style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary);">
                        <label for="ping-everyone" style="font-size: 0.85rem; cursor: pointer; color: var(--text-main); font-weight: 600; font-family: 'Orbitron', sans-serif;">${t.mention_announcements}</label>
                      </div>
                      <button type="submit" name="action" value="announcement" class="btn" style="width: 100%; border-color: var(--primary); color: var(--primary); padding: 12px; font-size: 0.9rem; text-transform: uppercase; font-family: 'Orbitron', sans-serif;">${t.send_announcement_btn}</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            <script>
              const updateCount = (textareaId, countId) => {
                const textarea = document.getElementById(textareaId);
                const count = document.getElementById(countId);
                const update = () => {
                  const len = textarea.value.length;
                  count.innerText = len + ' / 2000';
                  if (len >= 1900) count.style.color = 'var(--danger)';
                  else if (len >= 1700) count.style.color = 'var(--primary)';
                  else count.style.color = 'var(--text-muted)';
                };
                textarea.addEventListener('input', update);
                update();
              };
              updateCount('downloads-text', 'downloads-count');
              updateCount('announcement-text', 'announcement-count');
            </script>
          ` : ''}

          <div class="section-title">${t.account_config}</div>
          <div class="grid">
            <div class="card-stat">
              <div class="label">${t.change_name}</div>
              <form action="/api/v2/user/update-name" method="POST">
                <div class="form-group">
                  <input type="text" name="newUsername" placeholder="${t.new_name_placeholder}" required minlength="3">
                </div>
                <button type="submit" class="btn">${t.update}</button>
              </form>
            </div>
            <div class="card-stat">
              <div class="label">${t.change_id}</div>
              <form action="/api/v2/user/update-id" method="POST">
                <div class="form-group">
                  <input type="text" name="newId" placeholder="${t.new_id_placeholder}" required minlength="3" pattern="[a-zA-Z0-9_.-]+">
                </div>
                <button type="submit" class="btn">${t.update}</button>
              </form>
            </div>
          </div>

          <div style="margin-top: 3rem; text-align: center; color: var(--text-muted); font-size: 0.8rem; font-family: 'Orbitron', sans-serif; letter-spacing: 1px;">
            PROJECT LEILOS 2026 | DESARROLLADO POR CRISUTF
          </div>
        </div>
      </body>
    </html>
  `);
});

// Admin Actions
router.post('/api/v2/admin/manage', async (req, res) => {
  const sessionUser = req.cookies?.leilos_session;
  const { target, action, reason, newAccountType, message, username, discordId, password, ping } = req.body;

  const admin = await User.findOne({ discordId: sessionUser });
  if (!admin || !admin.isAdmin) return res.status(403).send('Acceso denegado.');

  // Acciones que no requieren un targetUser existente
  if (action === 'announcement') {
    if (!message) return res.redirect(`/api/v2/dashboard?id=${sessionUser}&error=missing`);
    if (message.length > 2000) return res.redirect(`/api/v2/dashboard?id=${sessionUser}&error=toolong`);
    const { imageUrl } = req.body;
    const success = await discordBot.sendAnnouncement(message, ping === 'on', imageUrl);
    return res.redirect(`/api/v2/dashboard?id=${sessionUser}&success=${success ? 'announcement' : 'error'}`);
  }

  if (action === 'downloads') {
    if (!message) return res.redirect(`/api/v2/dashboard?id=${sessionUser}&error=missing`);
    if (message.length > 2000) return res.redirect(`/api/v2/dashboard?id=${sessionUser}&error=toolong`);
    const success = await discordBot.sendDownloadLinks(message);
    return res.redirect(`/api/v2/dashboard?id=${sessionUser}&success=${success ? 'downloads' : 'error'}`);
  }

  if (action === 'create-host') {
    if (!username || !password) return res.redirect(`/api/v2/dashboard?id=${sessionUser}&error=missing`);
    
    // Generar Discord ID único automático para cuentas host
    const finalDiscordId = `host_${uuidv4().split('-')[0]}`;
    
    // Verificar si ya existe
    const existing = await User.findOne({ $or: [{ discordId: finalDiscordId }, { username_lower: username.toLowerCase() }] });
    if (existing) return res.redirect(`/api/v2/dashboard?id=${sessionUser}&error=exists`);

    const resp = await functions.registerUser(finalDiscordId, username, `${finalDiscordId}@leilos.tf`, password);
    if (resp.status >= 400) return res.redirect(`/api/v2/dashboard?id=${sessionUser}&error=create`);

    await User.updateOne({ discordId: finalDiscordId }, { accountType: 'SERVER', isWhitelisted: true });
    return res.redirect(`/api/v2/dashboard?id=${sessionUser}&success=createhost`);
  }

  const targetUser = await User.findOne({ 
    $or: [{ discordId: target }, { username: target }, { username_lower: target.toLowerCase() }] 
  });

  if (!targetUser) return res.redirect(`/api/v2/dashboard?id=${sessionUser}&error=notfound`);

  if (action === 'ban') {
    if (targetUser.accountType && targetUser.accountType.includes('SERVER')) {
      return res.redirect(`/api/v2/dashboard?id=${sessionUser}&error=noban`);
    }
    const banReason = reason || 'Baneado desde el Dashboard';
    await targetUser.updateOne({ banned: true, banReason: banReason });
    
    // Notificar al usuario por DM a través del bot
    await discordBot.sendBanNotification(targetUser.discordId, banReason);

    // Limpiar tokens
    let rt = (global.refreshTokens || []).findIndex(i => i.accountId == targetUser.accountId);
    if (rt != -1) global.refreshTokens.splice(rt, 1);
    let at = (global.accessTokens || []).findIndex(i => i.accountId == targetUser.accountId);
    if (at != -1) {
        global.accessTokens.splice(at, 1);
        let xmpp = (global.Clients || []).find(c => c.accountId == targetUser.accountId);
        if (xmpp) xmpp.client.close();
    }
    functions.UpdateTokens();
    res.redirect(`/api/v2/dashboard?id=${sessionUser}&success=ban`);
  } else if (action === 'unban') {
    await targetUser.updateOne({ banned: false, banReason: '' });
    // Notificar al usuario por DM a través del bot
    await discordBot.sendUnbanNotification(targetUser.discordId);
    res.redirect(`/api/v2/dashboard?id=${sessionUser}&success=unban`);
  } else if (action === 'kick') {
    let rt = (global.refreshTokens || []).findIndex(i => i.accountId == targetUser.accountId);
    if (rt != -1) global.refreshTokens.splice(rt, 1);
    let at = (global.accessTokens || []).findIndex(i => i.accountId == targetUser.accountId);
    if (at != -1) {
        global.accessTokens.splice(at, 1);
        let xmpp = (global.Clients || []).find(c => c.accountId == targetUser.accountId);
        if (xmpp) xmpp.client.close();
    }
    functions.UpdateTokens();
    res.redirect(`/api/v2/dashboard?id=${sessionUser}&success=kick`);
  }
});

router.get('/api/v2/logout', (req, res) => {
  res.clearCookie('leilos_session');
  res.redirect('/api/v2/discord/login');
});

router.post('/api/v2/user/update-name', async (req, res) => {
  const sessionUser = req.cookies?.leilos_session;
  const { newUsername } = req.body;
  if (!sessionUser) return res.redirect('/api/v2/discord/login');
  
  await User.updateOne({ discordId: sessionUser }, { username: newUsername, username_lower: newUsername.toLowerCase() });
  res.redirect(`/api/v2/dashboard?id=${sessionUser}&success=name`);
});

router.post('/api/v2/user/update-id', async (req, res) => {
  const sessionUser = req.cookies?.leilos_session;
  const { newId } = req.body;
  if (!sessionUser) return res.redirect('/api/v2/discord/login');

  const allowedIdChars = /^[a-zA-Z0-9_.-]+$/;
  if (!allowedIdChars.test(newId)) {
    return res.redirect(`/api/v2/dashboard?id=${sessionUser}&error=invalid_id`);
  }

  const newEmail = `${newId}@leilos.tf`.toLowerCase();
  const existing = await User.findOne({ email: newEmail });
  if (existing) {
    return res.redirect(`/api/v2/dashboard?id=${sessionUser}&error=exists`);
  }
  
  await User.updateOne({ discordId: sessionUser }, { email: newEmail });
  res.redirect(`/api/v2/dashboard?id=${sessionUser}&success=id`);
});

router.post('/api/v2/user/update-password', async (req, res) => {
  const sessionUser = req.cookies?.leilos_session;
  const { newPassword } = req.body;
  if (!sessionUser) return res.redirect('/api/v2/discord/login');
  
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await User.updateOne({ discordId: sessionUser }, { password: hashedPassword });
  res.redirect(`/api/v2/dashboard?id=${sessionUser}&success=password`);
});

module.exports = router;
