require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    MessageFlags,
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

/* =========================================================
   CONFIG
========================================================= */

const {
    DISCORD_TOKEN,
    CLIENT_ID,
    GUILD_ID,

    MOD_ROLE_ID,
    ADMIN_ROLE_ID,
    HR_ROLE_ID,
    SHR_ROLE_ID,

    MOD_LOG_CHANNEL_ID
} = process.env;

/* =========================================================
   COMPONENTS V2 HELPERS
========================================================= */

const FOOTER_IMAGE =
    'https://discord-webhook.com/uploads/aff23f72431f12ef31de89094fddc1a4.png';

const USER_INFO_IMAGE =
    'https://discord-webhook.com/uploads/825924e90f80a4eecffb1ac37da30e2a.png';

const SERVER_INFO_IMAGE =
    'https://discord-webhook.com/uploads/1a38a7cf3827b5f42defca9c94a2c194.png';

const ROLE_INFO_IMAGE =
    'https://discord-webhook.com/uploads/6d64ad89a8e436cc54c14000ee502aa5.png';

const MOD_LOG_IMAGE =
    'https://discord-webhook.com/uploads/e69d8c3fb15fb1baf99e39d096c3ecc1.png';

function imageRow(url) {
    return {
        type: 12,
        items: [
            {
                media: {
                    url
                }
            }
        ]
    };
}

function text(content) {
    return {
        type: 10,
        content
    };
}

function container(components) {
    return {
        type: 17,
        components
    };
}

function panel(components) {
    return {
        flags: MessageFlags.IsComponentsV2,
        components: [
            container(components)
        ]
    };
}

function simpleResponse(title, content) {
    return panel([
        text(title),
        text(content),
        imageRow(FOOTER_IMAGE)
    ]);
}

/* =========================================================
   USER INFO PANEL
========================================================= */

function userInfoPanel(user, member) {
    const highestRole =
        member.roles.highest?.name && member.roles.highest.name !== '@everyone'
            ? member.roles.highest.name
            : '@everyone';

    return panel([
        imageRow(USER_INFO_IMAGE),

        text('Detailed information about the selected user.'),

        text(
            `User\n${user}\n\n` +
            `Username\n${user.username}\n\n` +
            `User ID\n${user.id}\n\n` +
            `Account Created\n<t:${Math.floor(user.createdTimestamp / 1000)}:F>\n\n` +
            `Joined Server\n${
                member.joinedTimestamp
                    ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`
                    : 'Unknown'
            }\n\n` +
            `Highest Role\n${highestRole}`
        ),

        imageRow(FOOTER_IMAGE)
    ]);
}

/* =========================================================
   AVATAR PANEL
========================================================= */

function avatarPanel(user) {
    return panel([
        text(`Avatar for ${user}`),

        {
            type: 12,
            items: [
                {
                    media: {
                        url: user.displayAvatarURL({
                            extension: 'png',
                            size: 1024
                        })
                    }
                }
            ]
        }
    ]);
}

/* =========================================================
   SERVER INFO PANEL
========================================================= */

function serverInfoPanel(guild) {
    return panel([
        imageRow(SERVER_INFO_IMAGE),

        text('Server Information'),

        text(
            `Owner\n<@${guild.ownerId}>\n\n` +
            `Members\n${guild.memberCount}\n\n` +
            `Channels\n${guild.channels.cache.size}\n\n` +
            `Roles\n${guild.roles.cache.size}\n\n` +
            `Created\n<t:${Math.floor(guild.createdTimestamp / 1000)}:F>\n\n` +
            `Server ID\n${guild.id}`
        ),

        imageRow(FOOTER_IMAGE)
    ]);
}

/* =========================================================
   ROLE INFO PANEL
========================================================= */

function roleInfoPanel(role) {
    return panel([
        imageRow(ROLE_INFO_IMAGE),

        text('Role Information'),

        text(
            `Role ID\n${role.id}\n\n` +
            `Members\n${role.members.size}\n\n` +
            `Position\n${role.position}\n\n` +
            `Mentionable\n${role.mentionable ? 'Yes' : 'No'}`
        ),

        imageRow(FOOTER_IMAGE)
    ]);
}

/* =========================================================
   FUN PANEL
========================================================= */

function funPanel(user, game, outcome) {
    return panel([
        text(
            `Player\n${user}\n\n` +
            `Game\n${game}\n\n` +
            `Result\n${outcome}`
        ),

        imageRow(FOOTER_IMAGE)
    ]);
}

/* =========================================================
   MOD LOG PANEL
========================================================= */

async function sendModLog({
    action,
    user,
    moderator,
    reason,
    channel,
    extra = ''
}) {
    if (!MOD_LOG_CHANNEL_ID) {
        return;
    }

    const logChannel = await client.channels
        .fetch(MOD_LOG_CHANNEL_ID)
        .catch(() => null);

    if (!logChannel || !logChannel.isTextBased()) {
        return;
    }

    const content =
        `Action\n${action}\n\n` +
        `User\n${user}\n\n` +
        `Moderator\n${moderator}\n\n` +
        `Reason\n${reason}\n\n` +
        `Channel\n${channel}\n\n` +
        `Time\n<t:${Math.floor(Date.now() / 1000)}:F>` +
        (extra ? `\n\n${extra}` : '');

    await logChannel.send(
        panel([
            imageRow(MOD_LOG_IMAGE),
            text('Moderation Action'),
            text(content),
            imageRow(FOOTER_IMAGE)
        ])
    ).catch(error => {
        console.error('Failed to send moderation log:', error);
    });
}

/* =========================================================
   PERMISSION SYSTEM
========================================================= */

function getStaffLevel(member) {
    if (!member || !member.roles) {
        return 0;
    }

    if (SHR_ROLE_ID && member.roles.cache.has(SHR_ROLE_ID)) {
        return 4;
    }

    if (HR_ROLE_ID && member.roles.cache.has(HR_ROLE_ID)) {
        return 3;
    }

    if (ADMIN_ROLE_ID && member.roles.cache.has(ADMIN_ROLE_ID)) {
        return 2;
    }

    if (MOD_ROLE_ID && member.roles.cache.has(MOD_ROLE_ID)) {
        return 1;
    }

    return 0;
}

function hasLevel(member, requiredLevel) {
    return getStaffLevel(member) >= requiredLevel;
}

async function permissionDenied(interaction) {
    const response = simpleResponse(
        'Permission Denied',
        'You do not have permission to use this command.'
    );

    if (interaction.replied || interaction.deferred) {
        return interaction.followUp({
            ...response,
            ephemeral: true
        });
    }

    return interaction.reply({
        ...response,
        ephemeral: true
    });
}

/* =========================================================
   MODERATION HIERARCHY
========================================================= */

function canModerate(member, target) {
    if (!member || !target) {
        return false;
    }

    if (target.id === member.id) {
        return false;
    }

    if (target.id === target.guild.ownerId) {
        return false;
    }

    if (
        member.id !== target.guild.ownerId &&
        target.roles.highest.position >= member.roles.highest.position
    ) {
        return false;
    }

    return true;
}

async function hierarchyDenied(interaction) {
    const response = simpleResponse(
        'Action Blocked',
        'You cannot moderate a member with an equal or higher role than you.'
    );

    return interaction.reply({
        ...response,
        ephemeral: true
    });
}

/* =========================================================
   SLASH COMMANDS
========================================================= */

const commands = [

    /* USER / UTILITY */

    new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('View information about a user.')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user to view.')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('View a user avatar.')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user.')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('View server information.'),

    new SlashCommandBuilder()
        .setName('roleinfo')
        .setDescription('View information about a role.')
        .addRoleOption(option =>
            option
                .setName('role')
                .setDescription('The role to view.')
                .setRequired(true)
        ),

    /* MODERATION */

    new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a member.')
        .addUserOption(option =>
            option.setName('user').setDescription('Member to warn.').setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason').setDescription('Reason for the warning.').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mute a member using Discord timeout.')
        .addUserOption(option =>
            option.setName('user').setDescription('Member to mute.').setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason').setDescription('Reason for the mute.').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Remove a member timeout.')
        .addUserOption(option =>
            option.setName('user').setDescription('Member to unmute.').setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason').setDescription('Reason for the unmute.').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Timeout a member.')
        .addUserOption(option =>
            option.setName('user').setDescription('Member to timeout.').setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('minutes')
                .setDescription('Timeout duration in minutes.')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(40320)
        )
        .addStringOption(option =>
            option.setName('reason').setDescription('Reason.').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('untimeout')
        .setDescription('Remove a timeout.')
        .addUserOption(option =>
            option.setName('user').setDescription('Member to untimeout.').setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason').setDescription('Reason.').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a member.')
        .addUserOption(option =>
            option.setName('user').setDescription('Member to kick.').setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason').setDescription('Reason.').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a member.')
        .addUserOption(option =>
            option.setName('user').setDescription('Member to ban.').setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason').setDescription('Reason.').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('softban')
        .setDescription('Softban a member.')
        .addUserOption(option =>
            option.setName('user').setDescription('Member to softban.').setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason').setDescription('Reason.').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unban a user.')
        .addStringOption(option =>
            option.setName('user_id').setDescription('User ID.').setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason').setDescription('Reason.').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Delete messages.')
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription('Number of messages to delete.')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        )
        .addStringOption(option =>
            option.setName('reason').setDescription('Reason.').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Change channel slowmode.')
        .addIntegerOption(option =>
            option
                .setName('seconds')
                .setDescription('Slowmode seconds.')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(21600)
        )
        .addStringOption(option =>
            option.setName('reason').setDescription('Reason.').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Lock the current channel.')
        .addStringOption(option =>
            option.setName('reason').setDescription('Reason.').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Unlock the current channel.')
        .addStringOption(option =>
            option.setName('reason').setDescription('Reason.').setRequired(true)
        ),

    /* FUN */

    new SlashCommandBuilder()
        .setName('8ball')
        .setDescription('Ask the magic 8-ball a question.')
        .addStringOption(option =>
            option.setName('question').setDescription('Your question.').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Flip a coin.'),

    new SlashCommandBuilder()
        .setName('roll')
        .setDescription('Roll a number.')
        .addIntegerOption(option =>
            option
                .setName('sides')
                .setDescription('Number of sides.')
                .setRequired(false)
                .setMinValue(2)
                .setMaxValue(1000)
        ),

    new SlashCommandBuilder()
        .setName('dice')
        .setDescription('Roll two dice.'),

    new SlashCommandBuilder()
        .setName('ship')
        .setDescription('Ship two users.')
        .addUserOption(option =>
            option.setName('user1').setDescription('First user.').setRequired(true)
        )
        .addUserOption(option =>
            option.setName('user2').setDescription('Second user.').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('rps')
        .setDescription('Play rock paper scissors.')
        .addStringOption(option =>
            option
                .setName('choice')
                .setDescription('Your choice.')
                .setRequired(true)
                .addChoices(
                    { name: 'Rock', value: 'rock' },
                    { name: 'Paper', value: 'paper' },
                    { name: 'Scissors', value: 'scissors' }
                )
        )
].map(command => command.toJSON());

/* =========================================================
   READY
========================================================= */

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    try {
        const guild = await client.guilds.fetch(GUILD_ID);

        if (!guild) {
            throw new Error('Guild not found. Check GUILD_ID.');
        }

        await guild.commands.set(commands);

        console.log(`Registered ${commands.length} slash commands.`);
        console.log(`Connected to ${guild.name}.`);
        console.log('Frosty Studios Utilities is online.');
    } catch (error) {
        console.error('Failed to register commands:', error);
    }
});

/* =========================================================
   INTERACTIONS
========================================================= */

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) {
        return;
    }

    try {
        const { commandName } = interaction;

        /* ================================================
           USERINFO
        ================================================ */

        if (commandName === 'userinfo') {
            const user = interaction.options.getUser('user', true);
            const member = await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

            if (!member) {
                return interaction.reply({
                    ...simpleResponse(
                        'User Information',
                        'That user is not currently in this server.'
                    ),
                    ephemeral: true
                });
            }

            return interaction.reply({
                ...userInfoPanel(user, member),
                ephemeral: true
            });
        }

        /* ================================================
           AVATAR
        ================================================ */

        if (commandName === 'avatar') {
            const user = interaction.options.getUser('user', true);

            return interaction.reply({
                ...avatarPanel(user),
                ephemeral: true
            });
        }

        /* ================================================
           SERVERINFO
        ================================================ */

        if (commandName === 'serverinfo') {
            return interaction.reply({
                ...serverInfoPanel(interaction.guild),
                ephemeral: true
            });
        }

        /* ================================================
           ROLEINFO
        ================================================ */

        if (commandName === 'roleinfo') {
            const role = interaction.options.getRole('role', true);

            return interaction.reply({
                ...roleInfoPanel(role),
                ephemeral: true
            });
        }

        /* ================================================
           MODERATION PERMISSION LEVEL
        ================================================ */

        const modCommands = [
            'warn',
            'mute',
            'unmute',
            'timeout',
            'untimeout'
        ];

        const adminCommands = [
            'kick',
            'ban',
            'softban'
        ];

        const hrCommands = [
            'unban'
        ];

        const shrCommands = [
            'purge',
            'slowmode',
            'lock',
            'unlock'
        ];

        if (modCommands.includes(commandName) && !hasLevel(interaction.member, 1)) {
            return permissionDenied(interaction);
        }

        if (adminCommands.includes(commandName) && !hasLevel(interaction.member, 2)) {
            return permissionDenied(interaction);
        }

        if (hrCommands.includes(commandName) && !hasLevel(interaction.member, 3)) {
            return permissionDenied(interaction);
        }

        if (shrCommands.includes(commandName) && !hasLevel(interaction.member, 4)) {
            return permissionDenied(interaction);
        }

        /* ================================================
           MEMBER MODERATION
        ================================================ */

        if (
            [
                'warn',
                'mute',
                'unmute',
                'timeout',
                'untimeout',
                'kick',
                'ban',
                'softban'
            ].includes(commandName)
        ) {
            const user = interaction.options.getUser('user', true);

            const member = await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

            if (!member) {
                return interaction.reply({
                    ...simpleResponse(
                        'Action Failed',
                        'That user is not in this server.'
                    ),
                    ephemeral: true
                });
            }

            if (!canModerate(interaction.member, member)) {
                return hierarchyDenied(interaction);
            }

            const reason =
                interaction.options.getString('reason', true);

            /* WARN */

            if (commandName === 'warn') {
                await sendModLog({
                    action: 'Warning',
                    user: user.toString(),
                    moderator: interaction.user.toString(),
                    reason,
                    channel: interaction.channel.toString()
                });

                return interaction.reply({
                    ...simpleResponse(
                        'Member Warned',
                        `${user} has been warned.\n\nReason\n${reason}`
                    ),
                    ephemeral: true
                });
            }

            /* MUTE */

            if (commandName === 'mute') {
                await member.timeout(
                    28 * 24 * 60 * 60 * 1000,
                    reason
                );

                await sendModLog({
                    action: 'Mute',
                    user: user.toString(),
                    moderator: interaction.user.toString(),
                    reason,
                    channel: interaction.channel.toString()
                });

                return interaction.reply({
                    ...simpleResponse(
                        'Member Muted',
                        `${user} has been muted for up to 28 days.\n\nReason\n${reason}`
                    ),
                    ephemeral: true
                });
            }

            /* UNMUTE */

            if (commandName === 'unmute') {
                await member.timeout(null, reason);

                await sendModLog({
                    action: 'Unmute',
                    user: user.toString(),
                    moderator: interaction.user.toString(),
                    reason,
                    channel: interaction.channel.toString()
                });

                return interaction.reply({
                    ...simpleResponse(
                        'Member Unmuted',
                        `${user} has been unmuted.\n\nReason\n${reason}`
                    ),
                    ephemeral: true
                });
            }

            /* TIMEOUT */

            if (commandName === 'timeout') {
                const minutes =
                    interaction.options.getInteger('minutes', true);

                await member.timeout(
                    minutes * 60 * 1000,
                    reason
                );

                await sendModLog({
                    action: 'Timeout',
                    user: user.toString(),
                    moderator: interaction.user.toString(),
                    reason,
                    channel: interaction.channel.toString(),
                    extra: `Duration\n${minutes} minute(s)`
                });

                return interaction.reply({
                    ...simpleResponse(
                        'Member Timed Out',
                        `${user} has been timed out for ${minutes} minute(s).\n\nReason\n${reason}`
                    ),
                    ephemeral: true
                });
            }

            /* UNTIMEOUT */

            if (commandName === 'untimeout') {
                await member.timeout(null, reason);

                await sendModLog({
                    action: 'Untimeout',
                    user: user.toString(),
                    moderator: interaction.user.toString(),
                    reason,
                    channel: interaction.channel.toString()
                });

                return interaction.reply({
                    ...simpleResponse(
                        'Timeout Removed',
                        `${user} is no longer timed out.\n\nReason\n${reason}`
                    ),
                    ephemeral: true
                });
            }

            /* KICK */

            if (commandName === 'kick') {
                await member.kick(reason);

                await sendModLog({
                    action: 'Kick',
                    user: user.toString(),
                    moderator: interaction.user.toString(),
                    reason,
                    channel: interaction.channel.toString()
                });

                return interaction.reply({
                    ...simpleResponse(
                        'Member Kicked',
                        `${user} has been kicked.\n\nReason\n${reason}`
                    ),
                    ephemeral: true
                });
            }

            /* BAN */

            if (commandName === 'ban') {
                await member.ban({
                    reason
                });

                await sendModLog({
                    action: 'Ban',
                    user: user.toString(),
                    moderator: interaction.user.toString(),
                    reason,
                    channel: interaction.channel.toString()
                });

                return interaction.reply({
                    ...simpleResponse(
                        'Member Banned',
                        `${user} has been banned.\n\nReason\n${reason}`
                    ),
                    ephemeral: true
                });
            }

            /* SOFTBAN */

            if (commandName === 'softban') {
                await member.ban({
                    reason,
                    deleteMessageSeconds: 86400
                });

                await interaction.guild.members.unban(
                    user.id,
                    reason
                );

                await sendModLog({
                    action: 'Softban',
                    user: user.toString(),
                    moderator: interaction.user.toString(),
                    reason,
                    channel: interaction.channel.toString()
                });

                return interaction.reply({
                    ...simpleResponse(
                        'Member Softbanned',
                        `${user} has been softbanned.\n\nReason\n${reason}`
                    ),
                    ephemeral: true
                });
            }
        }

        /* ================================================
           UNBAN
        ================================================ */

        if (commandName === 'unban') {
            const userId =
                interaction.options.getString('user_id', true);

            const reason =
                interaction.options.getString('reason', true);

            await interaction.guild.members.unban(
                userId,
                reason
            );

            await sendModLog({
                action: 'Unban',
                user: userId,
                moderator: interaction.user.toString(),
                reason,
                channel: interaction.channel.toString()
            });

            return interaction.reply({
                ...simpleResponse(
                    'User Unbanned',
                    `User ID ${userId} has been unbanned.\n\nReason\n${reason}`
                ),
                ephemeral: true
            });
        }

        /* ================================================
           PURGE
        ================================================ */

        if (commandName === 'purge') {
            const amount =
                interaction.options.getInteger('amount', true);

            const reason =
                interaction.options.getString('reason', true);

            if (
                !interaction.channel ||
                !interaction.channel.isTextBased()
            ) {
                return interaction.reply({
                    ...simpleResponse(
                        'Purge Failed',
                        'This command cannot be used here.'
                    ),
                    ephemeral: true
                });
            }

            const deleted =
                await interaction.channel.bulkDelete(
                    amount,
                    true
                );

            await sendModLog({
                action: 'Purge',
                user: 'Channel',
                moderator: interaction.user.toString(),
                reason,
                channel: interaction.channel.toString(),
                extra: `Messages Deleted\n${deleted.size}`
            });

            return interaction.reply({
                ...simpleResponse(
                    'Messages Purged',
                    `Deleted ${deleted.size} message(s).\n\nReason\n${reason}`
                ),
                ephemeral: true
            });
        }

        /* ================================================
           SLOWMODE
        ================================================ */

        if (commandName === 'slowmode') {
            const seconds =
                interaction.options.getInteger('seconds', true);

            const reason =
                interaction.options.getString('reason', true);

            if (!interaction.channel) {
                return;
            }

            await interaction.channel.setRateLimitPerUser(
                seconds,
                reason
            );

            await sendModLog({
                action: 'Slowmode',
                user: 'Channel',
                moderator: interaction.user.toString(),
                reason,
                channel: interaction.channel.toString(),
                extra: `Slowmode\n${seconds} second(s)`
            });

            return interaction.reply({
                ...simpleResponse(
                    'Slowmode Updated',
                    `Slowmode is now set to ${seconds} second(s).\n\nReason\n${reason}`
                ),
                ephemeral: true
            });
        }

        /* ================================================
           LOCK
        ================================================ */

        if (commandName === 'lock') {
            const reason =
                interaction.options.getString('reason', true);

            await interaction.channel.permissionOverwrites.edit(
                interaction.guild.roles.everyone,
                {
                    SendMessages: false
                },
                {
                    reason
                }
            );

            await sendModLog({
                action: 'Channel Lock',
                user: 'Channel',
                moderator: interaction.user.toString(),
                reason,
                channel: interaction.channel.toString()
            });

            return interaction.reply({
                ...simpleResponse(
                    'Channel Locked',
                    `This channel has been locked.\n\nReason\n${reason}`
                ),
                ephemeral: true
            });
        }

        /* ================================================
           UNLOCK
        ================================================ */

        if (commandName === 'unlock') {
            const reason =
                interaction.options.getString('reason', true);

            await interaction.channel.permissionOverwrites.edit(
                interaction.guild.roles.everyone,
                {
                    SendMessages: null
                },
                {
                    reason
                }
            );

            await sendModLog({
                action: 'Channel Unlock',
                user: 'Channel',
                moderator: interaction.user.toString(),
                reason,
                channel: interaction.channel.toString()
            });

            return interaction.reply({
                ...simpleResponse(
                    'Channel Unlocked',
                    `This channel has been unlocked.\n\nReason\n${reason}`
                ),
                ephemeral: true
            });
        }

        /* ================================================
           8 BALL
        ================================================ */

        if (commandName === '8ball') {
            const question =
                interaction.options.getString('question', true);

            const answers = [
                'Yes.',
                'No.',
                'Definitely.',
                'Probably.',
                'Maybe.',
                'Ask again later.',
                'I would not count on it.',
                'Absolutely.'
            ];

            const answer =
                answers[Math.floor(Math.random() * answers.length)];

            return interaction.reply({
                ...funPanel(
                    interaction.user,
                    '8 Ball',
                    `${answer}\n\nQuestion\n${question}`
                ),
                ephemeral: true
            });
        }

        /* ================================================
           COINFLIP
        ================================================ */

        if (commandName === 'coinflip') {
            const result =
                Math.random() < 0.5
                    ? 'Heads'
                    : 'Tails';

            return interaction.reply({
                ...funPanel(
                    interaction.user,
                    'Coin Flip',
                    result
                ),
                ephemeral: true
            });
        }

        /* ================================================
           ROLL
        ================================================ */

        if (commandName === 'roll') {
            const sides =
                interaction.options.getInteger('sides') || 100;

            const result =
                Math.floor(Math.random() * sides) + 1;

            return interaction.reply({
                ...funPanel(
                    interaction.user,
                    'Roll',
                    `${result} / ${sides}`
                ),
                ephemeral: true
            });
        }

        /* ================================================
           DICE
        ================================================ */

        if (commandName === 'dice') {
            const first =
                Math.floor(Math.random() * 6) + 1;

            const second =
                Math.floor(Math.random() * 6) + 1;

            return interaction.reply({
                ...funPanel(
                    interaction.user,
                    'Dice',
                    `Dice 1: ${first}\nDice 2: ${second}\nTotal: ${first + second}`
                ),
                ephemeral: true
            });
        }

        /* ================================================
           SHIP
        ================================================ */

        if (commandName === 'ship') {
            const user1 =
                interaction.options.getUser('user1', true);

            const user2 =
                interaction.options.getUser('user2', true);

            const percentage =
                Math.floor(Math.random() * 101);

            return interaction.reply({
                ...funPanel(
                    interaction.user,
                    'Ship',
                    `${user1} + ${user2}\n\nCompatibility: ${percentage}%`
                ),
                ephemeral: true
            });
        }

        /* ================================================
           RPS
        ================================================ */

        if (commandName === 'rps') {
            const choice =
                interaction.options.getString('choice', true);

            const choices = [
                'rock',
                'paper',
                'scissors'
            ];

            const botChoice =
                choices[Math.floor(Math.random() * choices.length)];

            let outcome;

            if (choice === botChoice) {
                outcome = `Draw.\nYou chose ${choice}.\nBot chose ${botChoice}.`;
            } else if (
                (choice === 'rock' && botChoice === 'scissors') ||
                (choice === 'paper' && botChoice === 'rock') ||
                (choice === 'scissors' && botChoice === 'paper')
            ) {
                outcome = `You win.\nYou chose ${choice}.\nBot chose ${botChoice}.`;
            } else {
                outcome = `You lose.\nYou chose ${choice}.\nBot chose ${botChoice}.`;
            }

            return interaction.reply({
                ...funPanel(
                    interaction.user,
                    'Rock Paper Scissors',
                    outcome
                ),
                ephemeral: true
            });
        }

    } catch (error) {
        console.error(
            `Command error (${interaction.commandName}):`,
            error
        );

        const response = simpleResponse(
            'Something Went Wrong',
            'The command could not be completed. Check the bot console for the error.'
        );

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                ...response,
                ephemeral: true
            }).catch(() => {});
        } else {
            await interaction.reply({
                ...response,
                ephemeral: true
            }).catch(() => {});
        }
    }
});

/* =========================================================
   ERROR HANDLING
========================================================= */

client.on('error', error => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
});

/* =========================================================
   START BOT
========================================================= */

if (!DISCORD_TOKEN) {
    console.error('ERROR: DISCORD_TOKEN is missing from .env');
    process.exit(1);
}

if (!CLIENT_ID) {
    console.error('ERROR: CLIENT_ID is missing from .env');
    process.exit(1);
}

if (!GUILD_ID) {
    console.error('ERROR: GUILD_ID is missing from .env');
    process.exit(1);
}

client.login(DISCORD_TOKEN).catch(error => {
    console.error('Failed to log into Discord:', error);
});