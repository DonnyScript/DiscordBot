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
const ytdl = require('ytdl-core');
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
const playlists = new Map();

client.once("ready", () => {
  console.log(`We have logged in as ${client.user.tag}!`)
});

client.on("messageCreate", async (message) => {
  const [command, ...args] = message.content.split(" ");

  if (command === '!playlist') {
    const subCommand = args[1];
    const playlistName = args[0];
    const youtubeURL = args.slice(2).join(' ');

    if (!subCommand || !playlistName) {
        message.reply('Invalid command! Usage:!playlist create <playlist_name> or !playlist <playlist_name> add <YouTube_URL> or !playlist <playlist_name> delete or !playlist <playlist_name> display');
        return;
    }

    if (subCommand === 'create') {
        if (!playlistName) {
            message.reply('Please provide a name for the playlist.');
            return;
        }
        createPlaylist(playlistName);
    } else if (subCommand === 'add') {
        if (!youtubeURL) {
            message.reply('Please provide the YouTube URL to add to the playlist.');
            return;
        }
        addLinkToPlaylist(playlistName, youtubeURL,message);
    } else if (subCommand === 'delete') {
    deleteFromPlaylist(playlistName, message);

    } else if (subCommand == 'display'){
      displayPlaylist(playlistName,message);
    } else {
        message.reply('Invalid sub-command!');
    }
  } 
  
  
  if (command === "!play") {
    const input = args.join(" ");
    const channel = message.member.voice.channel;

    if (!channel) return message.reply("Join a channel!");

    let serverQueue = queues.get(message.guild.id);

    try {
        let playlists = [];
        if (fs.existsSync("playlists.json")) {
            const playlistsContent = fs.readFileSync("playlists.json");
            playlists = JSON.parse(playlistsContent);
        }

        const playlist = playlists.find((p) => p.name === input);
        if (playlist) {
            console.log(`Input "${input}" matches a recognized playlist name.`);
            if (!serverQueue) {
                serverQueue = {
                    guildId: message.guild.id,
                    voiceChannel: channel,
                    textChannel: message.channel,
                    connection: null,
                    songs: [],
                };
                queues.set(message.guild.id, serverQueue);
            }
            const shuffledLinks = shuffleArray(playlist.links);
            shuffledLinks.forEach((link) => {
                serverQueue.songs.push(link.url);
            });

            if (!serverQueue.connection) {
                serverQueue.connection = joinVoiceChannel({
                    channelId: channel.id,
                    guildId: message.guild.id,
                    adapterCreator: message.guild.voiceAdapterCreator,
                });
                play(serverQueue);
            }

            return message.channel.send(
                `Playlist "${input}" has been added to the queue!`
            );
        }
    } catch (error) {
        console.error(`Error checking playlist: ${error}`);
        return message.reply("An error occurred while checking the playlist.");
    }
    try {
        if (!message.member.voice.channel) {
            return message.channel.send("Connect to a Voice Channel");
        }

        let serverQueue = queues.get(message.guild.id);
        const channel = message.member.voice.channel;

        let yt_info = await search.search(input, {
            limit: 1,
        });

        if (!yt_info || yt_info.length === 0) {
            throw new Error("No search results found.");
        }

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
    } catch (error) {
        console.error(`Error searching for the song: ${error}`);
        return message.reply("No search results found or an error occurred while searching for the song.");
    }
} 


else if (message.content.startsWith("!skip")) {
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
  } 
  
  
  else if (message.content.startsWith("!queue")) {
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
  } 
  
  
  else if (message.content.startsWith("!stop")) {
    const serverQueue = queues.get(message.guild.id);
    serverQueue.connection.disconnect();
    queues.delete(serverQueue.guildId);
    return;
  } 
  
  
  else if (message.content.startsWith("!seturl")) {
    const url = message.content.split(' ')[1];
    if (!url || !isValidURL(url)) {
      return message.reply('Please provide a valid YouTube URL!');
    }

    userURLs.set(message.author.id, url);
    fs.writeFileSync('userURLs.json', JSON.stringify([...userURLs]));

    return message.reply(`Your custom YouTube URL has been set to: ${url}`);

  } 
  
  
  else if (message.content.startsWith("!pause")) {
    const serverQueue = queues.get(message.guild.id);

    if(!serverQueue){
      return message.reply("There is no song to pause");
    }

    if (!serverQueue.connection) {
      return message.reply("There is no song playing to pause.");
    } 

    if(!serverQueue.connection.state.subscription.player.pause()){
      return message.reply("Song is already paused")
    }

    serverQueue.connection.state.subscription.player.pause();
    message.reply("The song has been paused.");

  } 
  
  
  else if (message.content.startsWith("!resume")) {
    const serverQueue = queues.get(message.guild.id);

    if(!serverQueue){
      return message.reply("There is no song to resume");
    }

    if (!serverQueue.connection) {
      return message.reply("There is no song paused to resume.");
    } 

    if(!serverQueue.connection.state.subscription.player.unpause()){
      return message.reply("Song is already playing")
    }

    serverQueue.connection.state.subscription.player.unpause();
    message.reply("Resuming playback.");
  } 
  
  
  else if (message.content.startsWith("Mazany lie detected. No cap.\nVote 🤥 to confirm the lie.\nVote 😇 to deny the lie.")) {

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

function createPlaylist(playlistName) {
  try {
      let playlists = [];

      if (fs.existsSync('playlists.json')) {
          const playlistsContent = fs.readFileSync('playlists.json');
          playlists = JSON.parse(playlistsContent);
      }

      if (playlists.find(playlist => playlist.name === playlistName)) {
          console.error(`Playlist "${playlistName}" already exists.`);
          return;
      }

      playlists.push({ name: playlistName, links: [] });

      fs.writeFileSync('playlists.json', JSON.stringify(playlists, null, 2));
      console.log(`Playlist "${playlistName}" created successfully.`);
  } catch (error) {
      console.error(`Error creating playlist "${playlistName}":`, error);
  }
}


async function addLinkToPlaylist(playlistName, youtubeURL, message) {
  try {
      let playlists = [];

      if (fs.existsSync('playlists.json')) {
          const playlistsContent = fs.readFileSync('playlists.json');
          playlists = JSON.parse(playlistsContent);
      }

      const playlist = playlists.find(p => p.name === playlistName);
      if (!playlist) {
          console.error(`Playlist "${playlistName}" not found.`);
          return;
      }

      const linkNumber = playlist.links.length + 1;

      playlist.links.push({ number: linkNumber, url: youtubeURL });

      fs.writeFileSync('playlists.json', JSON.stringify(playlists, null, 2));
      message.channel.send(`Added "${youtubeURL}" to "${playlistName}" playlist with number ${linkNumber}.`); // Use message parameter to send message
  } catch (error) {
      console.error(`Error adding link to "${playlistName}" playlist:`, error);
  }
}


async function deleteFromPlaylist(playlistName, message) {
  try {
      let playlists = [];

      if (fs.existsSync('playlists.json')) {
          const playlistsContent = fs.readFileSync('playlists.json');
          playlists = JSON.parse(playlistsContent);
      }

      if (!Array.isArray(playlists)) {
          console.error('Invalid playlists data.');
          return;
      }

      const playlistIndex = playlists.findIndex(p => p.name === playlistName);
      if (playlistIndex === -1) {
          console.error(`Playlist "${playlistName}" not found.`);
          message.channel.send(`Playlist "${playlistName}" not found.`);
          return;
      }

      const playlist = playlists[playlistIndex];
      const linksWithIndex = playlist.links.map((link, index) => `${index + 1}: ${link.url}`);

      await displayPlaylist(playlistName, message);

      const filter = response => {
          return !isNaN(response.content) && response.content >= -1 && response.content <= playlist.links.length;
      };
      message.channel.send('Enter the number of the link you want to delete, or type -1 to cancel:').then(() => {
          message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] })
              .then(async collected => {
                  const numberToDelete = parseInt(collected.first().content);
                  if (numberToDelete === -1) {
                      message.channel.send('Delete operation cancelled.');
                      return;
                  }

                  if (numberToDelete < 1 || numberToDelete > playlist.links.length) {
                      message.channel.send('Invalid input. Please enter a valid link number or -1 to cancel.');
                      return;
                  }

                  playlist.links.splice(numberToDelete - 1, 1);
                  fs.writeFileSync('playlists.json', JSON.stringify(playlists, null, 2));

                  const title = await getVideoTitle(deletedLink.url);
                  if (title) {
                      message.channel.send(`Deleted link number ${numberToDelete} (${title}) from playlist "${playlistName}".`);
                  } else {
                      message.channel.send(`Deleted link number ${numberToDelete} from playlist "${playlistName}".`);
                  }
              })
              .catch(collected => {
                  message.channel.send('No valid input received within 30 seconds, operation cancelled.');
              });
      });
  } catch (error) {
      console.error(`Error deleting link from "${playlistName}" playlist:`, error);
  }
}



async function displayPlaylist(playlistName, message) {
  try {
      let playlists = [];

      if (fs.existsSync('playlists.json')) {
          const playlistsContent = fs.readFileSync('playlists.json');
          playlists = JSON.parse(playlistsContent);
      }

      if (!Array.isArray(playlists)) {
          console.error('Invalid playlists data.');
          return;
      }

      const playlistIndex = playlists.findIndex(p => p.name === playlistName);
      if (playlistIndex === -1) {
          console.error(`Playlist "${playlistName}" not found.`);
          message.channel.send(`Playlist "${playlistName}" not found.`);
          return;
      }

      const playlist = playlists[playlistIndex];
      let playlistString = `Playlist "${playlistName}":\n`;

      for (let i = 0; i < playlist.links.length; i++) {
          const link = playlist.links[i];
          const title = await getVideoTitle(link.url);
          if (title) {
              playlistString += `${i + 1}: ${title}\n`;
          } else {
              playlistString += `${i + 1}: ${link.url} (Title not available)\n`;
          }
      }

      message.channel.send(playlistString);
  } catch (error) {
      console.error(`Error displaying playlist "${playlistName}":`, error);
  }
}


async function getVideoTitle(url) {
  try {
    const info = await ytdl.getInfo(url);
    return info.videoDetails.title;
  } catch (error) {
    console.error('Error fetching video title:', error);
    return null;
  }
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
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