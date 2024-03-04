const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  getVoiceConnection,
  StreamType,
  demuxProbe,
  NoSubscriberBehavior,
} = require("@discordjs/voice");
const fs = require('fs');
const { stream: streamDL } = require("play-dl");
const search = require("play-dl");
require("events").EventEmitter.defaultMaxListeners = 100;
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: ["CHANNEL", "MESSAGE"],
});
const queues = new Map();
//process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

client.once("ready", () => {
  console.log(`We have logged in as ${client.user.tag}!`)
});

client.on("messageCreate", async (message) => {

  if (message.content.startsWith("!play")) {
    const url = message.content.split(" ")[1];

    if (!url || !isValidURL(url)) {
      return message.reply("Please provide a valid URL!");
    }

    const channel = message.member.voice.channel;
    if (!channel)
      return message.reply("Join a channel!");

    let serverQueue = queues.get(message.guild.id);

    if (!serverQueue) {
      const queueConstructor = {
        guildId: message.guild.id,
        voiceChannel: channel,
        textChannel: message.channel,
        connection: null,
        songs: [],
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
  } else if (message.content.startsWith("!search")) {
    if (!message.member.voice?.channel){
      return message.channel.send("Connect to a Voice Channel");
    }

    let serverQueue = queues.get(message.guild.id);
    const channel = message.member.voice.channel;

    let args = message.content.split("search")[1];
    let yt_info = await search.search(args, {
      limit: 1,
    });

    if (!serverQueue) {
      const queueConstructor = {
        guildId: message.guild.id,
        voiceChannel: channel,
        textChannel: message.channel,
        connection: null,
        songs: [],
      };

      queueConstructor.connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });

      let stream = await search.stream(yt_info[0].url);

      let resource = createAudioResource(stream.stream, {
        inputType: stream.type,
      });

      let player = createAudioPlayer({
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Play,
        },
      });

      queueConstructor.songs.push(yt_info[0].url);
      queues.set(message.guild.id, queueConstructor);
      serverQueue = queues.get(message.guild.id);
      play(serverQueue);
    } else {
      serverQueue.songs.push(yt_info[0].url);
      return message.channel.send(
        `**${yt_info[0].url}** has been added to the queue!`
      );
    }
  } else if (message.content.startsWith("!skip")) {
    const serverQueue = queues.get(message.guild.id);

    if (!serverQueue) {
      message.reply("There is no queue to skip!");
      return;
    }

    if (serverQueue.songs.length === 0) {
      message.reply("There are no songs to skip!");
      return;
    }

    try {
      if (serverQueue.songs.length === 1) {
        message.reply("Skipping last song");
        const connection = getVoiceConnection(serverQueue.guildId);
        const player = connection?.state.subscription?.player;

        player?.stop();

        serverQueue.songs.shift();
        play(serverQueue);
      } else {
        serverQueue.songs.shift();
        play(serverQueue);
      }
    } catch (error) {
      console.error("Error occurred while skipping song:", error);
      message.channel.send("An error occurred while trying to skip the song.");
    }
  } else if (message.content.startsWith("!queue")) {
    const serverQueue = queues.get(message.guild.id);

    if (!serverQueue || serverQueue.songs.length == 0) {
      return message.channel.send("The queue is currently empty!");
    } else {
      let text = "Current queue:\n";
      serverQueue.songs.forEach((url, i) => {
        text += `${i + 1}: ${url}\n`;
      });
      return message.channel.send(text);
    }
  } else if (message.content.startsWith("!stop")) {
    const serverQueue = queues.get(message.guild.id);
    serverQueue.connection.disconnect();
    queues.delete(serverQueue.guildId);
    return;
  } else if (message.content.startsWith("!seturl")) {
    const url = message.content.split(' ')[1];
    if (!url || !isValidURL(url)) {
      return message.reply('Please provide a valid YouTube URL!');
    }

    userURLs.set(message.author.id, url);
    fs.writeFileSync('userURLs.json', JSON.stringify([...userURLs]));

    return message.reply(`Your custom YouTube URL has been set to: ${url}`);
  } else if (message.content.startsWith("Mazany lie detected. No cap.\nVote 🤥 to confirm the lie.\nVote 😇 to deny the lie.")) {

    return message.react('😇');

  } else if (message.content.includes('The Mazanys were fount to NOT be capping,')) {

    return message.reply('Thought so LOL 🇮🇱, always 0 in my book 😤');

  } else if (message.content.includes('The Mazanys were fount to be capping.')) {

    return message.reply('Bullshit BULLSHIT 😤');
  }
});


async function play(serverQueue) {
  const url = serverQueue.songs[0];

  if (!url) {
    queues.delete(serverQueue.guildId);
    return;
  }

  try {
    const stream = await streamDL(url, { quality: 0 });

    const resource = createAudioResource(stream.stream, {
      inputType: stream.type,
    });
    const player = createAudioPlayer();

    player.on("error", (error) => {
      console.error(`Error: ${error.message}`);
    });

    player.on(AudioPlayerStatus.Idle, () => {
      serverQueue.songs.shift();
      play(serverQueue);
    });

    player.play(resource);
    serverQueue.connection.subscribe(player);
  } catch (error) {
    if (error.message.includes("Sign in to confirm your age")) {
      serverQueue.textChannel.send("Sorry, I can't play age-restricted videos.");
    } else {
      console.error("Error playing song:", error);
      serverQueue.textChannel.send("An error occurred while trying to play the song.");
    }
    serverQueue.songs.shift();
    play(serverQueue);
  }
}



function isValidURL(str) {
  try {
    new URL(str);
    return true;
  } catch (e) {
    return false;
  }
}

let userURLs;
if (fs.existsSync('userURLs.json')) {
  const urlsFromFile = JSON.parse(fs.readFileSync('userURLs.json'));
  userURLs = new Map(urlsFromFile);
} else {
  userURLs = new Map([
    ["418235415665836033", "https://www.youtube.com/watch?v=ZlfWZEeVsIs"], // Don
    ["169243685681233921", "https://www.youtube.com/watch?v=bhw9dm6Aa7E"], // Adam
    ["187361060045586434", "https://youtu.be/0fwGZFp3eFs"], // Alex 
    ["187317666569125889", "https://www.youtube.com/watch?v=6N7VrwlJWHk"], // Jack
    ["169548589209485312", "https://youtu.be/sZNCyZ9MzFM"], // Ron
    ["683092346635943987", "https://youtu.be/6Tt3-pH_-uI"], // Aidan
    ["320763862213197824", "https://youtu.be/-I50RSN8H1I"], // Nate
    ["288487330224799754", "https://youtu.be/Az3MPCGZErw"], // Matthew
    ["286660053904392192", "https://youtu.be/Ntl3xYpcArk"], // Dale
    ["284460599356948481", "https://youtu.be/MifVMz_THmI"], // Nick
    ["145885178701676544", "https://youtu.be/JowcMqHitew"], // Matt
  ]);
}

client.on("voiceStateUpdate", async (oldState, newState) => {
  if (!oldState.channelId && newState.channelId) {
    const url = userURLs.get(newState.member.id);
    if (url) {
      let serverQueue = queues.get(newState.guild.id);

      if (serverQueue) {
        serverQueue.songs.push(url);
        console.log(`**${url}** has been added to the queue!`);
      } else {
        console.log(`No queue found for this guild.`);
        const connection = joinVoiceChannel({
          channelId: newState.channelId,
          guildId: newState.guild.id,
          adapterCreator: oldState.guild.voiceAdapterCreator,
        });
        const streamResult = await streamDL(url, { quality: 0 });
        const resource = createAudioResource(streamResult.stream, {
          inputType: streamResult.type,
        });
        const player = createAudioPlayer();

        player.play(resource);
        connection.subscribe(player);
      }
    }
  }
});


//Last line
client.login(
  "MTEzMzQ2NDAwNjE1NDI3Mjg5OQ.GiFp7R.XSmUS7vcLuIzsZXqKnirGbQ2vDUGtf05BlXVok"
);