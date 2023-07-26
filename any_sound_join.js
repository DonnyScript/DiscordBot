client.on('voiceStateUpdate', async (oldState, newState) => { //Any Join
  if (!oldState.channelId && newState.channelId) {
      const url = 'https://youtu.be/SZ3ECJtNO5Q'; 

      const connection = joinVoiceChannel({
          channelId: newState.channelId,
          guildId: newState.guild.id,
          adapterCreator: newState.guild.voiceAdapterCreator,
      });

      const streamResult = await streamDL(url, { quality: 0 });
      const resource = createAudioResource(streamResult.stream, { inputType: streamResult.type });
      const player = createAudioPlayer();

      player.play(resource);
      connection.subscribe(player);
  }
});


// WORKING JOIN FUNCTION
// client.on('voiceStateUpdate', async (oldState, newState) => {
//     if (!oldState.channelId && newState.channelId && newState.member.id === targetUserDon) {
//         const url = 'https://youtu.be/jRWR0Ob6mLI'; 

//         const connection = joinVoiceChannel({
//             channelId: newState.channelId,
//             guildId: newState.guild.id,
//             adapterCreator: newState.guild.voiceAdapterCreator,
//         });

//         const streamResult = await streamDL(url, { quality: 0 });
//         const resource = createAudioResource(streamResult.stream, { inputType: streamResult.type });
//         const player = createAudioPlayer();

//         player.play(resource);
//         connection.subscribe(player);
//     }
// });