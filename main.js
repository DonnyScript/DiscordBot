const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus,VoiceConnectionStatus, getVoiceConnection } = require('@discordjs/voice');
const {stream: streamDL} = require('play-dl');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent,GatewayIntentBits.GuildVoiceStates] });
const queues = new Map();


client.once('ready', () =>{
    console.log('Good luck idiot!');
});

client.on('messageCreate', async (message) => {
    if (message.content.startsWith('!play')) {
      const url = message.content.split(' ')[1]; // Assumes the URL comes directly after the command
      if (!url) return message.reply(`There's this thing called a URL its kind of important`);
  
      const channel = message.member.voice.channel;
      if (!channel) return message.reply('Join a channel my VERY VERY high IQ enemy!');
  
      let serverQueue = queues.get(message.guild.id);
  
      if (!serverQueue) {
        const queueConstructor = {
          guildId: message.guild.id,
          voiceChannel: channel,
          textChannel: message.channel,
          connection: null,
          songs: []
        };
    
        queueConstructor.connection = joinVoiceChannel({
          channelId: channel.id,
          guildId: message.guild.id,
          adapterCreator: message.guild.voiceAdapterCreator,
        });
    
        queueConstructor.songs.push(url);
    
        queues.set(message.guild.id, queueConstructor);
    
        serverQueue = queues.get(message.guild.id);
    
        play(serverQueue);
      } else {
        serverQueue.songs.push(url);
        return message.channel.send(`**${url}** has been added to the queue!`);
      }
    } else if (message.content.startsWith('!skip')) {
      const serverQueue = queues.get(message.guild.id);
  
      if (!serverQueue || serverQueue.songs.length == 0) {
        if (serverQueue && serverQueue.connection) { //Remove this in future to prevent leaving channel 
          serverQueue.connection.disconnect();
        }
        queues.delete(serverQueue.guildId);
        return message.reply('There is no song to skip!');
      } else {
        serverQueue.songs.shift();
        play(serverQueue);
      }
    } else if (message.content.startsWith('!queue')) {
        const serverQueue = queues.get(message.guild.id);
      
        if (!serverQueue || serverQueue.songs.length == 0) {
          return message.channel.send("The queue is currently empty!");
        } else {
          let text = 'Current queue:\n';
          serverQueue.songs.forEach((url, i) => {
            text += `${i + 1}: ${url}\n`;
          });
          return message.channel.send(text);
        }
      } else if(message.content.startsWith('!stop')) {
        const serverQueue = queues.get(message.guild.id);
        serverQueue.connection.disconnect();
        queues.delete(serverQueue.guildId);
        return;
      } 
  });
  async function play(serverQueue) {
    const url = serverQueue.songs[0];
  
    if (!url) {
      queues.delete(serverQueue.guildId);
      return;
    }
  
    const stream = await streamDL(url, { quality: 0 });
    const resource = createAudioResource(stream.stream, { inputType: stream.type });
    const player = createAudioPlayer();
  
    player.on('error', error => {
      console.error(`Error: ${error.message}`);
    });
  
    player.on(AudioPlayerStatus.Idle, () => {
      serverQueue.songs.shift();
      play(serverQueue);
    });
  
    player.play(resource);
    serverQueue.connection.subscribe(player);
    
  }
  

const targetUserDon = '418235415665836033'; //Don join

client.on('voiceStateUpdate', async (oldState, newState) => {
    if (!oldState.channelId && newState.channelId && newState.member.id === targetUserDon) {
        const url = 'https://youtu.be/jRWR0Ob6mLI'; 

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

client.on('voiceStateUpdate', async (oldState, newState) => {
    if (oldState.channelId && !newState.channelId && newState.member.id === targetUserDon) {
        const url = 'https://youtu.be/igSHbtv52G4'; 

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

const targetUserAlex = '187361060045586434'; //Alex join

client.on('voiceStateUpdate', async (oldState, newState) => {
    if (!oldState.channelId && newState.channelId && newState.member.id === targetUserAlex) {
        const url = 'https://youtu.be/0fwGZFp3eFs'; 
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

const targetUserJack = '187317666569125889'; //Jack join
client.on('voiceStateUpdate', async (oldState, newState) => {
    if (!oldState.channelId && newState.channelId && newState.member.id === targetUserJack) {
        const url = 'https://youtu.be/nHc288IPFzk'; 

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

const targetUserAidan = '683092346635943987'; //Aidan join
client.on('voiceStateUpdate', async (oldState, newState) => {
    if (!oldState.channelId && newState.channelId && newState.member.id === targetUserAidan) {
        const url = 'https://youtu.be/LrLcRCLwE7c'; 

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

//Last line
client.login('MTEzMzQ2NDAwNjE1NDI3Mjg5OQ.GiFp7R.XSmUS7vcLuIzsZXqKnirGbQ2vDUGtf05BlXVok');