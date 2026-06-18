const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits } = require("discord.js");
const client = new Client({ 
    intents: [ 
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages 
    ],
    partials: [Partials.Channel]
});
const fs = require("fs");
const path = require("path");
const User = require("../model/user.js"); 

const log = require("../structs/log.js");

// Exportar funciones para usar desde oauth.js
module.exports = {
    sendBanNotification: async (discordId, reason) => {
        try {
            const user = await client.users.fetch(discordId);
            const banEmbed = new EmbedBuilder()
                .setTitle('🚫 Your account has been suspended')
                .setDescription(`You account has been suspended from **Leilos**.`)
                .setColor(0xFF0000)
                .addFields(
                    { name: '📝 Reason', value: `\`${reason || 'No specified'}\`` },
                    { name: '⚖️ Appeals', value: 'If you think this is an error, please appeal using the button below.' }
                )
                .setFooter({ text: 'Leilos - Crisutf' })
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('appeal_ban')
                        .setLabel('Appeal Ban')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('view_ban_details')
                        .setLabel('View Details')
                        .setStyle(ButtonStyle.Secondary)
                );

            await user.send({ embeds: [banEmbed], components: [row] });
            return true;
        } catch (e) {
            console.error(`[Discord] Failed to send DM to ${discordId}:`, e.message);
            return false;
        }
    },
    sendUnbanNotification: async (discordId) => {
        try {
            const user = await client.users.fetch(discordId);
            const unbanEmbed = new EmbedBuilder()
                .setTitle('✅ Account Reactivated')
                .setDescription(`Your account in **Leilos** has been unbanned. You can now play again!`)
                .setColor(0x00FF00)
                .setFooter({ text: 'Leilos - Crisutf' })
                .setTimestamp();

            await user.send({ embeds: [unbanEmbed] });
            return true;
        } catch (e) {
            console.error(`[Discord] Failed to send DM to ${discordId}:`, e.message);
            return false;
        }
    },
    sendAnnouncement: async (message, ping = false, imageUrl = null) => {
        try {
            const channelId = '1462232267681173607';
            const channel = await client.channels.fetch(channelId);
            if (!channel) return false;

            let finalContent = message;
            
            // Si el ping está activado, lo añadimos oculto al final
            if (ping) {
                const pingText = '||<@&1487223414963048488>||';
                if (!message.includes(pingText)) {
                    finalContent += `\n\n${pingText}`;
                }
            }

            // Preparamos las opciones del mensaje
            let messageOptions = { content: finalContent };

            // Si hay una imagen URL proporcionada y no está vacía, la adjuntamos
            if (imageUrl && imageUrl.trim() !== '') {
                try {
                    messageOptions.files = [imageUrl.trim()];
                } catch (imgError) {
                    const log = require("../structs/log.js");
                    log.error(`[Discord] Invalid image URL in announcement: ${imageUrl}`);
                }
            }

            // Enviar el mensaje con o sin imagen adjunta
            await channel.send(messageOptions);
            return true;
        } catch (e) {
            const log = require("../structs/log.js");
            log.error(`[Discord] Failed to send announcement:`, e.message);
            return false;
        }
    },
    sendDownloadLinks: async (message) => {
        try {
            const channelId = '1462244894818041856';
            const channel = await client.channels.fetch(channelId);
            if (!channel) return false;

            // Guardar el mensaje para que persista en el panel
            fs.writeFileSync(path.join(__dirname, "..", "Config", "downloads.json"), JSON.stringify({ message }, null, 2));

            // Limpiar mensajes anteriores del bot para mantener el canal ordenado
            try {
                const messages = await channel.messages.fetch({ limit: 50 });
                const botMessages = messages.filter(m => m.author.id === client.user.id);
                if (botMessages.size > 0) {
                    await channel.bulkDelete(botMessages);
                }
            } catch (e) {
                const log = require("../structs/log.js");
                log.bot("[Discord] Failed to delete old download messages (might be due to age limit).");
            }

            // Enviar como mensaje de texto plano para que los emojis y el markdown se vean naturales
            // Enviamos la imagen como archivo adjunto para que no se vea el link
            const imageUrl = 'https://cdn.crisu.qzz.io/services/leilos/discord/downloads.png';
            await channel.send({ 
                content: message,
                files: [imageUrl]
            });
            return true;
        } catch (e) {
            const log = require("../structs/log.js");
            log.error(`[Discord] Failed to send download links:`, e.message);
            return false;
        }
    }
};

client.once("clientReady", () => {
    log.bot(`Logged in as ${client.user.tag}!`);
    log.bot("Commands are now managed via the Web Dashboard.");

    // Clear all existing commands
    client.application.commands.set([]);

    // Actualizar el estado del bot con el número de jugadores cada 10 segundos
    function updateBotStatus() {
        if (global.Clients && Array.isArray(global.Clients)) {
            client.user.setActivity(`${global.Clients.length} players`, { type: 3 }); // 3 = WATCHING
        }
    }

    updateBotStatus();
    setInterval(updateBotStatus, 10000);
});

client.on("interactionCreate", async interaction => {
    // Only handle Buttons and Modals (for appeals), but not chat commands
    if (interaction.isChatInputCommand()) {
        return interaction.reply({ 
            content: '❌ Chat commands have been disabled. Please use the Leilos web panel: https://leilos.qzz.io/api/v2/discord/login', 
            flags: [64] 
        });
    }

    // Manejar Botones
    if (interaction.isButton()) {
        if (interaction.customId === 'view_ban_details') {
            const user = await User.findOne({ discordId: interaction.user.id });
            if (!user) return interaction.reply({ content: 'No account found.', flags: [64] });
            
            await interaction.reply({ 
                content: `🔍 **Ban Details:**\n- **Account ID:** ${user.accountId}\n- **Reason:** ${user.banReason || 'No specified'}\n- **Date:** ${user.lastLogin ? user.lastLogin.toLocaleString() : 'N/A'}\n\nIf you think this is an error, please use the appeal button.`, 
                flags: [64] 
            });
        }

        if (interaction.customId === 'appeal_ban') {
            const modal = new ModalBuilder()
                .setCustomId('appeal_modal')
                .setTitle('Formulario de Apelación');

            const appealInput = new TextInputBuilder()
                .setCustomId('appeal_reason')
                .setLabel('¿Por qué deberíamos desbanearte?')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Explica tu situación aquí...')
                .setRequired(true)
                .setMinLength(10);

            const row = new ActionRowBuilder().addComponents(appealInput);
            modal.addComponents(row);

            await interaction.showModal(modal);
        }

        // Manejar Botones de Admin (Desbanear desde el canal de apelaciones)
        if (interaction.customId.startsWith('unban_')) {
            const discordId = interaction.customId.split('_')[1];
            const moderators = JSON.parse(process.env.MODERATORS || "[]");
            const isAdmin = moderators.includes(interaction.user.id) || 
                            interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

            if (!isAdmin) return interaction.reply({ content: 'No permission.', flags: [64] });

            const user = await User.findOneAndUpdate({ discordId }, { banned: false, banReason: '' });
            
            if (user) {
                await interaction.reply({ content: `✅ User **${user.username}** has been unbanned successfully.` });
                try {
                    const discordUser = await client.users.fetch(discordId);
                    await discordUser.send('✅ Your account has been unbanned successfully. **Leilos**!');
                } catch (e) {}
            }
        }

        if (interaction.customId.startsWith('deny_appeal_')) {
            const discordId = interaction.customId.split('_')[1];
            await interaction.reply({ content: `❌ Appeal denied for user <@${discordId}>.`, flags: [64] });
        }
    }

    // Manejar Modales (Apelaciones)
    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'appeal_modal') {
            const reason = interaction.fields.getTextInputValue('appeal_reason');
            const appealChannelId = '1482346680325247029';
            
            try {
                const channel = await client.channels.fetch(appealChannelId);
                if (channel && channel.isTextBased()) {
                    const user = await User.findOne({ discordId: interaction.user.id });
                    
                    const appealEmbed = new EmbedBuilder()
                        .setTitle('⚖️ Nueva Apelación de Baneo')
                        .setColor(0xFFFF00)
                        .setThumbnail(interaction.user.displayAvatarURL())
                        .addFields(
                            { name: '👤 Usuario', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
                            { name: '🆔 Account ID', value: `\`${user?.accountId || 'N/A'}\``, inline: true },
                            { name: '📝 Razón de Apelación', value: `\`\`\`${reason}\`\`\`` },
                            { name: '🚫 Motivo del Ban', value: `\`${user?.banReason || 'No especificado'}\`` }
                        )
                        .setFooter({ text: 'Leilos - Crisutf' })
                        .setTimestamp();

                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`unban_${interaction.user.id}`)
                                .setLabel('Aceptar (Desbanear)')
                                .setStyle(ButtonStyle.Success),
                            new ButtonBuilder()
                                .setCustomId(`deny_appeal_${interaction.user.id}`)
                                .setLabel('Rechazar Apelación')
                                .setStyle(ButtonStyle.Danger)
                        );

                    await channel.send({ embeds: [appealEmbed], components: [row] });
                }
            } catch (e) {
                console.error('[Discord] Error enviando apelación al canal:', e);
            }

                await interaction.reply({ 
                content: '✅ Your appeal has been sent to the admin channel. Please wait for a moderator to review it.', 
                flags: [64] 
            });
        }
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);