const targetUserDon = '418235415665836033'; //Donovan join

const players = new Map();

const connections = new Map();

client.on('voiceStateUpdate', async (oldState, newState) => {
    const targetUserJack = '187317666569125889'; // Jack join
    if (!oldState.channelId && newState.channelId && newState.member.id === targetUserDon) {
        const url = 'https://youtu.be/nHc288IPFzk';

        let connection = getVoiceConnection(newState.guild.id);
        if (!connection) {
            connection = joinVoiceChannel({
                channelId: newState.channelId,
                guildId: newState.guild.id,
                adapterCreator: newState.guild.voiceAdapterCreator,
            });
            connections.set(newState.guild.id, connection);
        }

        let player;
        if (!players.has(newState.guild.id)) {
            player = createAudioPlayer();
            players.set(newState.guild.id, player);
            connection.subscribe(player);
        } else {
            player = players.get(newState.guild.id);
        }

        if (player.state.status !== AudioPlayerStatus.Playing) {
            const streamResult = await streamDL(url);
            const resource = createAudioResource(streamResult.stream, { inputType: streamResult.type });
            player.play(resource);
        }
    }
});