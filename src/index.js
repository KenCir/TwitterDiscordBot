require('dotenv').config();
const { WebhookClient } = require('discord.js');
const Twitter = require('twitter');
const config = require('../config.json');
/*
const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildIntegrations,
    ],
    allowedMentions: {
        parse: [],
        repliedUser: false,
    },
});
*/

const twitter = new Twitter({
    consumer_key: process.env.TWITTER_KET,
    consumer_secret: process.env.TWITTER_SECRET,
    access_token_key: process.env.TWITTER_ACCESS_TOKEN,
    access_token_secret: process.env.TWITTER_ACCESS_SECRET,
});

twitter.stream('statuses/filter', { follow: Object.keys(config.follows).join(',') }, function (stream) {
    stream.on('data', async function (event) {
        if ((!config.mention && event.text.startsWith('@')) || (!config.retweet && event.text.startsWith('RT')) || (config.retweet && !Object.keys(config.follows).includes(event.user.id_str)) || (!config.quotedreTweet && event.quoted_status_id_str) || config.blacklist.includes(event.user.id_str)) return;

        let id_str = event.id_str;
        let rt = false;
        if (event.text.startsWith('RT')) {
            id_str = event.retweeted_status.id_str;
            rt = true;
        }

        const webhook = new WebhookClient({ url: process.env.WEBHOOK_URL });
        await webhook.send(`${event.user.name}の新規${rt ? 'リ' : ''}ツイートです\nhttps://twitter.com/${event.user.screen_name}/status/${id_str}`);
        /*
        const msg = await client.channels.cache.get(process.env.DISCORD_CHANNELID).send({
            content: `${event.user.name}の新規${rt ? 'リ' : ''}ツイートです\nhttps://twitter.com/${event.user.screen_name}/status/${id_str}`,
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        [
                            new ButtonBuilder()
                                .setCustomId('ok')
                                .setEmoji('881574101041442887')
                                .setStyle(ButtonStyle.Primary),
                            new ButtonBuilder()
                                .setCustomId('no')
                                .setEmoji('881574101444083742')
                                .setStyle(ButtonStyle.Primary),
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
        */
    });

    stream.on('error', function (error) {
        console.error(error);
        process.exit();
    });
});

process.on('unhandledRejection', error => {
    console.error(error);
    process.exit();
});