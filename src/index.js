require('dotenv').config();
const { Client, Intents, MessageActionRow, MessageButton } = require('discord.js');
const Twitter = require('twitter');
const config = require('../config.json');
const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_INTEGRATIONS,
    ],
    allowedMentions: {
        parse: [],
        repliedUser: false,
    },
});

const twitter = new Twitter({
    consumer_key: process.env.TWITTER_KET,
    consumer_secret: process.env.TWITTER_SECRET,
    access_token_key: process.env.TWITTER_ACCESS_TOKEN,
    access_token_secret: process.env.TWITTER_ACCESS_SECRET,
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    client.user.setActivity('Twitter');
    client.user.setStatus('idle');
});

twitter.stream('statuses/filter', { follow: Object.keys(config.follows).join(',') }, function (stream) {
    stream.on('data', async function (event) {
        if ((!config.mention && event.text.startsWith('@')) || (!config.retweet && event.text.startsWith('RT')) || (config.retweet && !Object.keys(config.follows).includes(event.user.id_str)) || (!config.quotedreTweet && event.quoted_status_id_str) || config.blacklist.includes(event.user.id_str)) return;

        let id_str = event.id_str;
        if (event.text.startsWith('RT')) {
            id_str = event.retweeted_status.id_str;
        }

        const msg = await client.channels.cache.get(process.env.DISCORD_CHANNELID).send({
            content: `${event.user.name}の新規ツイートです\nhttps://twitter.com/${event.user.screen_name}/status/${id_str}`,
            components: [
                new MessageActionRow()
                    .addComponents(
                        [
                            new MessageButton()
                                .setCustomId('ok')
                                .setEmoji('881574101041442887')
                                .setStyle('PRIMARY'),
                            new MessageButton()
                                .setCustomId('no')
                                .setEmoji('881574101444083742')
                                .setStyle('PRIMARY'),
                        ],
                    ),
            ],
        });
        const filter = (interaction) => {
            return (interaction.customId === 'ok' || interaction.customId === 'no') && interaction.user.id === process.env.DISCORD_USERID;
        };
        const collector = msg.createMessageComponentCollector({ filter, componentType: 'BUTTON' });
        collector.on('collect', async (interaction) => {
            if (interaction.customId === 'ok') {
                for (const follow in config.follows) {
                    if (event.user.id_str === follow) {
                        client.channels.cache.get(config.follows[follow]).send(`${event.user.name}の新規ツイートです\nhttps://twitter.com/${event.user.screen_name}/status/${id_str}`);
                        msg.delete();
                        return;
                    }
                }
            }
            else {
                msg.delete();
            }

            collector.stop();
        });
    });

    stream.on('error', function (error) {
        console.error(error);
    });
});

client.on('messageCreate', async message => {
    if (message.system || !message.guildId || message.author.id !== process.env.DISCORD_USERID || message.channelId !== process.env.DISCORD_CHANNELID) return;

    if (message.author.id === process.env.DISCORD_USERID || message.channelId === process.env.DISCORD_CHANNELID) {
        const buttons = new MessageActionRow()
            .addComponents(
                [
                    new MessageButton()
                        .setCustomId('ok')
                        .setEmoji('881574101041442887')
                        .setStyle('PRIMARY'),
                    new MessageButton()
                        .setCustomId('no')
                        .setEmoji('881574101444083742')
                        .setStyle('PRIMARY'),
                ],
            );

        const msg = await message.reply({
            content: 'ツイートを送信します、よろしいですか？',
            components: [buttons],
        });

        const filter = (interaction) => {
            return (interaction.customId === 'ok' || interaction.customId === 'no') && interaction.user.id === message.author.id;
        };

        const collector = msg.createMessageComponentCollector({ filter, componentType: 'BUTTON' });
        collector.on('collect', async (interaction) => {
            if (interaction.customId === 'ok') {
                const tweet = await twitter.post('statuses/update', { status: message.content });
                await interaction.update({
                    content: `ツイートを送信しました\nhttps://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`,
                    components: [],
                });
            }
            else {
                await interaction.update({
                    content: 'ツイート送信をキャンセルしました',
                    components: [],
                });
            }

            collector.stop();
        });
    }

    if (message.content.startsWith('?twrestart')) {
        process.exit();
    }
});

process.on('unhandledRejection', error => {
    console.error(error);
});

client.login();