else if (message.content.startsWith('!byebyebtb')){
    const serverQueue = queues.get(message.guild.id);
    let targetUser = await message.guild.members.fetch('265667476509949969');
    if (message.member.voice.channel) {
        const connection = joinVoiceChannel({
          channelId: message.member.voice.channel.id,
          guildId: message.guild.id,
          adapterCreator: message.guild.voiceAdapterCreator,
        });
        message.channel.send(`${targetUser} BTB BIO-BOMB ACTIVATE`);
        const url = 'https://youtu.be/phI_X8fwJx4'; 
        const stream = ytdl(url, { filter: 'audioonly' });
        const resource = createAudioResource(stream);
        const player = createAudioPlayer();
        player.play(resource);
        player.on(AudioPlayerStatus.Idle, () => {
            targetUser.voice.disconnect();
        });
        connection.subscribe(player);
        
      } else {
        message.reply('Join a voice channel first!');
      }
  }