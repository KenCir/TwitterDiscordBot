require('dotenv').config();
const { Client, Intents, MessageActionRow, MessageButton } = require('discord.js');
const Twitter = require('twitter');
const client = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_INTEGRATIONS],
    allowedMentions: {
        parse: [],
        repliedUser: false
    }
});

const twitter = new Twitter({
    consumer_key: process.env.TWITTER_KET,
    consumer_secret: process.env.TWITTER_SECRET,
    access_token_key: process.env.TWITTER_ACCESS_TOKEN,
    access_token_secret: process.env.TWITTER_ACCESS_SECRET
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    client.user.setActivity('Twitter-Discord');
    client.user.setStatus('idle');
});

twitter.stream('statuses/filter', { follow: '1287206636046581760' }, function (stream) {
    /*
    stream.on('data', function (event) {
        console.log(event);
        if (event.text.startsWith('@') || event.text.startsWith('RT')) return;
        client.channels.cache.get('880397683465007174').send(`${event.user.screen_name}の新規ツイートです\nhttps://twitter.com/${event.user.screen_name}/status/${event.id_str}`);
    });
    */

    // RTを通知する
    stream.on('data', async function (event) {
        if (!event.text.startsWith('RT')) return;
        const buttons = new MessageActionRow()
            .addComponents(
                [
                    new MessageButton()
                        .setCustomId('ok')
                        .setEmoji('880399424638025769')
                        .setStyle('SUCCESS'),
                    new MessageButton()
                        .setCustomId('no')
                        .setEmoji('880399424638025728')
                        .setStyle('DANGER')
                ]
            );
        const msg = await client.channels.cache.get('883387753587417099').send({
            content: `https://twitter.com/${event.user.screen_name}/status/${event.id_str}`,
            components: [buttons]
        });
        const filter = (interaction) => {
            return (interaction.customId === 'ok' || interaction.customId === 'no') && interaction.user.id === '714455926970777602';
        };
        const collector = msg.createMessageComponentCollector({ filter, componentType: 'BUTTON' });
        collector.on('collect', async (interaction) => {
            if (interaction.customId === 'ok') {
                await client.channels.cache.get('858642965961375774').send(msg.content);
                await interaction.message.delete();
            }
            else await interaction.message.delete();

            collector.stop();
        });
    });

    stream.on('error', function (error) {
        console.error(error);
    });
});

client.on('messageCreate', async message => {
    if (message.system || !message.guildId || message.author.id !== '714455926970777602' || message.channelId !== '880397683465007174') return;

    const buttons = new MessageActionRow()
        .addComponents(
            [
                new MessageButton()
                    .setCustomId('ok')
                    .setEmoji('880399424638025769')
                    .setStyle('PRIMARY'),
                new MessageButton()
                    .setCustomId('no')
                    .setEmoji('880399424638025728')
                    .setStyle('PRIMARY')
            ]
        );
    const msg = await message.reply({
        content: 'ツイートを送信します、よろしいですか？',
        components: [buttons]
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
                components: []
            });
        }
        else await interaction.update({
            content: 'ツイート送信をキャンセルしました',
            components: []
        });

        collector.stop();
    });
})

process.on('unhandledRejection', error => {
    console.error(error);
})

client.login();