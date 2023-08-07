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
    if (!message.member.voice?.channel)
      return message.channel.send("Connect to a Voice Channel");
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

    if (!serverQueue || serverQueue.songs.length == 0) {
      queues.delete(serverQueue.guildId);
      return message.reply("There is no song to skip!");
    } else if (serverQueue.songs.length == 1) {
      message.reply("Skipping last song");
      const connection = getVoiceConnection(serverQueue.guildId);
      const player = connection?.state.subscription?.player;

      // Stop the current playback
      player?.stop();

      // Shift the song from the queue
      serverQueue.songs.shift();
      play(serverQueue);
    } else {
      serverQueue.songs.shift();
      play(serverQueue);
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
  }
});
async function play(serverQueue) {
  const url = serverQueue.songs[0];

  if (!url) {
    queues.delete(serverQueue.guildId);
    return;
  }

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
}

function isValidURL(str) {
  try {
    new URL(str);
    return true;
  } catch (e) {
    return false;
  }
}

const targetUserDon = "418235415665836033"; //Don join

client.on("voiceStateUpdate", async (oldState, newState) => {
  if (
    !oldState.channelId &&
    newState.channelId &&
    newState.member.id === targetUserDon
  ) {
    const url = "https://www.youtube.com/watch?v=ZlfWZEeVsIs";

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
});

const targetUserAdam = "169243685681233921"; //Adam join

client.on("voiceStateUpdate", async (oldState, newState) => {
  if (
    !oldState.channelId &&
    newState.channelId &&
    newState.member.id === targetUserAdam
  ) {
    const url = "https://www.youtube.com/watch?v=bhw9dm6Aa7E";

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
});

const targetUserAlex = "187361060045586434"; //Alex join

client.on("voiceStateUpdate", async (oldState, newState) => {
  if (
    !oldState.channelId &&
    newState.channelId &&
    newState.member.id === targetUserAlex
  ) {
    const url = "https://youtu.be/0fwGZFp3eFs";

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
});

const targetUserJack = "187317666569125889"; //Jack join

client.on("voiceStateUpdate", async (oldState, newState) => {
  if (
    !oldState.channelId &&
    newState.channelId &&
    newState.member.id === targetUserJack
  ) {
    const url = "https://youtu.be/nHc288IPFzk";

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
});

const targetUserRon = "169548589209485312"; //Ron join

client.on("voiceStateUpdate", async (oldState, newState) => {
  if (
    !oldState.channelId &&
    newState.channelId &&
    newState.member.id === targetUserRon
  ) {
    const url = "https://youtu.be/sZNCyZ9MzFM";

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
});

const targetUserAidan = "683092346635943987"; //Aidan join

client.on("voiceStateUpdate", async (oldState, newState) => {
  if (
    !oldState.channelId &&
    newState.channelId &&
    newState.member.id === targetUserAidan
  ) {
    const url = "https://youtu.be/6Tt3-pH_-uI";

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
});

const targetUserNate = "320763862213197824"; //Nate join

client.on("voiceStateUpdate", async (oldState, newState) => {
  if (
    !oldState.channelId &&
    newState.channelId &&
    newState.member.id === targetUserNate
  ) {
    const url = "https://youtu.be/-I50RSN8H1I";

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
});

const targetUserMatthew = "288487330224799754"; //Matthew join

client.on("voiceStateUpdate", async (oldState, newState) => {
  if (
    !oldState.channelId &&
    newState.channelId &&
    newState.member.id === targetUserMatthew
  ) {
    const url = "https://youtu.be/Az3MPCGZErw";

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
});

const targetUserDale = "286660053904392192"; //Dale join

client.on("voiceStateUpdate", async (oldState, newState) => {
  if (
    !oldState.channelId &&
    newState.channelId &&
    newState.member.id === targetUserDale
  ) {
    const url = "https://youtu.be/Ntl3xYpcArk";

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
});

const targetUserNick = "284460599356948481"; //Nick join

client.on("voiceStateUpdate", async (oldState, newState) => {
  if (
    !oldState.channelId &&
    newState.channelId &&
    newState.member.id === targetUserNick
  ) {
    const url = "https://youtu.be/MifVMz_THmI";

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
});

const targetUserMatt = "145885178701676544"; //Matt

client.on("voiceStateUpdate", async (oldState, newState) => {
  //Matt Join
  if (
    !oldState.channelId &&
    newState.channelId &&
    newState.member.id === targetUserMatt
  ) {
    const url = "https://youtu.be/JowcMqHitew";

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
});

client.on("voiceStateUpdate", async (oldState, newState) => {
  //Matt Leave
  if (
    oldState.channelId &&
    !newState.channelId &&
    newState.member.id === targetUserMatt
  ) {
    const url = "https://www.youtube.com/watch?v=RfVfkjXnB54";

    let serverQueue = queues.get(newState.guild.id);

    if (serverQueue) {
      serverQueue.songs.push(url);
      console.log(`**${url}** has been added to the queue!`);
    } else {
      console.log(`No queue found for this guild.`);
      const connection = joinVoiceChannel({
        channelId: oldState.channelId,
        guildId: oldState.guild.id,
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
});

//Last line
client.login(
  "MTEzMzQ2NDAwNjE1NDI3Mjg5OQ.GiFp7R.XSmUS7vcLuIzsZXqKnirGbQ2vDUGtf05BlXVok"
);
