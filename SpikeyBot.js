const Discord = require('discord.js');
const fs = require('fs');
const common = require('./common.js');
const client = new Discord.Client();

let subModuleNames = ['./main.js', './hungryGames.js', './music.js'];
let subModules = [];
for (let i in subModuleNames) {
  try {
    subModules[i] = require(subModuleNames[i]);
  } catch (err) {
    console.log(err);
  }
}

const isDev = process.argv[2] === 'dev';
const prefix = isDev ? '~' : '?';

let reactToAnthony = true;

common.begin(false, !isDev);

// Password for changing the game the bot is playing. This doesn't need to be
// secure, and I could probably just remove it.
const password = 'password';
const spikeyId = '124733888177111041';
const trustedIds = [
  spikeyId, // Me
  '126464376059330562', // Rohan
];

const introduction = '\nHello! My name is SpikeyBot.\n' +
    'I was created by SpikeyRobot#9836, so if you wish to add any features, feel free to PM him! (Tip: Use **' +
    prefix + 'pmspikey**)\n' +
    '\nIf you\'d like to know what I can do, type **' + prefix +
    'help** in a PM to me and I\'ll let you know!';
const helpmessagereply = 'I sent you a DM with commands!';
const blockedmessage =
    'I couldn\'t send you a message, you probably blocked me :(';
const onlyservermessage = 'This command only works in servers, sorry!';
const disabledcommandmessage =
    'This command has been disabled in this channel.';

// Command event management.
function Command() {
  let cmds = {};
  let blacklist = {};
  this.trigger = function(cmd, msg) {
    if (cmd.startsWith(prefix)) cmd = cmd.replace(prefix, '');
    if (cmds[cmd]) {
      if (cmds[cmd].validOnlyOnServer && msg.guild === null) {
        reply(msg, onlyservermessage);
        return true;
      } else if (
          blacklist[cmd] && blacklist[cmd].lastIndexOf(msg.channel.id) > -1) {
        reply(msg, disabledcommandmessage);
        return true;
      }
      try {
        cmds[cmd](msg);
      } catch (err) {
        common.ERROR(cmd + ': FAILED');
        console.log(err);
        reply(msg, 'An error occurred! Oh noes!');
      }
      return true;
    } else {
      return false;
    }
  };
  this.on = function(cmd, cb, onlyserver) {
    if (typeof cb !== 'function') throw ('Event callback must be a function.');
    cb.validOnlyOnServer = onlyserver || false;
    if (typeof cmd === 'string') {
      if (cmds[cmd]) {
        common.ERROR(
            'Attempted to register a second handler for event that already exists! (' +
            cmd + ')');
      } else {
        cmds[cmd] = cb;
      }
    } else if (Array.isArray(cmd)) {
      for (let i = 0; i < cmd.length; i++) cmds[cmd[i]] = cb;
    } else {
      throw ('Event must be string or array of strings');
    }
  };
  this.deleteEvent = function(cmd) {
    if (typeof cmd === 'string') {
      if (cmds[cmd]) {
        delete cmds[cmd];
        delete blacklist[cmd];
      } else {
        common.ERROR(
            'Requested deletion of event handler for event that was never registered! (' +
            cmd + ')');
      }
    } else if (Array.isArray(cmd)) {
      for (let i = 0; i < cmd.length; i++) {
        if (cmds[cmd[i]]) {
          delete cmds[cmd[i]];
          delete blacklist[cmd[i]];
        } else {
          common.ERROR(
              'Requested deletion of event handler for event that was never registered! (' +
              cmd[i] + ')');
        }
      }
    } else {
      throw ('Event must be string or array of strings');
    }
  };
  this.disable = function(cmd, channel) {
    if (cmds[cmd]) {
      if (!blacklist[cmd] || blacklist[cmd].lastIndexOf(channel) == -1) {
        if (!blacklist[cmd]) blacklist[cmd] = [channel];
        else blacklist[cmd].push(channel);
      }
    } else {
      common.ERROR(
          'Requested disable for event that was never registered! (' + cmd +
          ')');
    }
  };
  this.enable = function(cmd, channel) {
    if (blacklist[cmd]) {
      let index = blacklist[cmd].lastIndexOf(channel);
      if (index > -1) {
        blacklist[cmd].splice(index, 1);
      } else {
        common.ERROR(
            'Requested enable of event that is enabled! (' + cmd + ')');
      }
    } else {
      common.ERROR(
          'Requested enable for event that is not disabled! (' + cmd + ')');
    }
  };
}
let command = new Command();

// Checks if given message is the given command.
function isCmd(msg, cmd) {
  return msg.content.startsWith(prefix + cmd);
}
// Changes the bot's status message.
function updategame(password_, game) {
  if (password_ == password) {
    client.user.setActivity(game, {name: game, type: 'WATCHING'});
    common.LOG('Changed game to "' + game + '"');
    return 0;
  } else {
    common.LOG('Didn\'t change game (' + password_ + ')');
    return 1;
  }
}
// Creates formatted string for mentioning the author of msg.
function mention(msg) {
  return `<@${msg.author.id}>`;
}
// Replies to the author and channel of msg with the given message.
function reply(msg, text, post) {
  post = post || '';
  return msg.channel.send(mention(msg) + '\n```\n' + text + '\n```' + post);
}

// BEGIN //
client.on('ready', (_) => {
  common.LOG(`Logged in as ${client.user.tag}!`);
  updategame(password, prefix + 'help for help');
  client.users.fetch(spikeyId).then(
      (user) => {
 user.send('I just rebooted (JS)');
});
  for (let i in subModules) {
    try {
      subModules[i].begin(prefix, Discord, client, command, common);
    } catch (err) {
      console.log(err);
      client.users.fetch(spikeyId).then((function(i) {
        return function(user) {
          user.send('Failed to initialize ' + subModuleNames[i]);
        };
      })(i));
    }
  }
  if (subModules.length != subModuleNames.length) {
    client.users.fetch(spikeyId).then((user) => {
      user.send(
          'Failed to compile a submodule. Check log for more info. Previous initialization errors may be incorrect.');
    });
  }
  fs.readFile('reboot.dat', function(err, file) {
    if (err) return;
    let msg = JSON.parse(file);
    let channel = client.channels.get(msg.channel.id);
    if (channel) {
channel.messages.fetch(msg.id)
          .then((msg_) => {
 msg_.edit('`Reboot complete.`');
})
          .catch((_) => {});
}

    if (msg.noReactToAnthony) reactToAnthony = false;
  });
});

client.on('message', (msg) => {
  if (msg.author.id == client.user.id) return;
  if (msg.content.endsWith(', I\'m Dad!')) {
    msg.channel.send('Hi Dad, I\'m Spikey!');
  }
  if (msg.author.bot) return;

  // If message is equation we can graph.
  const regexForm = new RegExp('^[yY]\\s*=');
  if (msg.content.match(regexForm)) {
    msg.content = '?graph ' + msg.content;
  }

  if (msg.guild === null && !msg.content.startsWith(prefix)) {
    msg.content = prefix + msg.content;
  }

  if (reactToAnthony && msg.author.id == '174030717846552576') msg.react('😮');

  if (isCmd(msg, '')) {
    if (msg.guild !== null) {
      common.LOG(
          msg.guild.name + '#' + msg.channel.name + '@' + msg.author.username +
          msg.content.replaceAll('\n', '\\n'));
    } else {
      common.LOG(
          'PM: @' + msg.author.username + msg.content.replaceAll('\n', '\\n'));
    }
    if (!command.trigger(msg.content.split(/ |\n/)[0], msg) &&
        msg.guild === null) {
      msg.channel.send(
          'Oops! I\'m not sure how to help with that! Type **help** for a list of commands I know how to respond to.');
    }
  }
});

client.on('guildCreate', (guild) => {
  common.LOG('ADDED TO NEW GUILD: ' + guild.id + ': ' + guild.name);
  let channel = '';
  let pos = -1;
  try {
    guild.channels.forEach(function(val, key) {
      if (val.type != 'voice' && val.type != 'category') {
        if (pos == -1 || val.position < pos) {
          pos = val.position;
          channel = val.id;
        }
      }
    });
    client.channels.get(channel).send(introduction);
  } catch (err) {
    common.ERROR('Failed to send welcome to guild:' + guild.id);
    console.log(err);
  }
});

client.on('guildBanAdd', (guild, user) => {
  let channel = '';
  let pos = -1;
  try {
    guild.channels.forEach(function(val, key) {
      if (val.type != 'voice' && val.type != 'category') {
        if (pos == -1 || val.position < pos) {
          pos = val.position;
          channel = val.id;
        }
      }
    });
    guild.fetchAuditLogs({limit: 1})
        .then((logs) => {
          client.channels.get(channel).send(
              '`Poof! ' + logs.entries.first().executor.username +
              ' has ensured ' + user.username +
              ' will never be seen again...`');
        })
        .catch((err) => {
          client.channels.get(channel).send(
              '`Poof! ' + user.username + ' was never seen again...`');
          common.ERROR('Failed to find executor of ban.');
          console.log(err);
        });
  } catch (err) {
    common.ERROR('Failed to send ban from guild:' + guild.id);
    console.log(err);
  }
});


command.on('togglereact', (msg) => {
  reply(msg, 'Toggled reactions to Anthony to ' + !reactToAnthony + '. 😮');
  reactToAnthony = !reactToAnthony;
});
command.on('help', (msg) => {
  try {
    for (let i in subModules) {
      const mod = subModules[i];
      if (mod && mod.helpMessage) msg.author.send(mod.helpMessage);
    }
    if (msg.guild !== null) reply(msg, helpmessagereply, ':wink:');
  } catch (err) {
    reply(msg, blockedmessage);
  }
});
command.on('updategame', (msg) => {
  msg.delete();
  let command = msg.content.replace(prefix + 'updategame ', '');
  let password = command.split(' ')[0];
  let game = command.replace(password + ' ', '');
  if (updategame(password, game)) {
    reply(msg, 'I\'m sorry, but you are not allowed to do that. :(\n');
  } else {
    reply(msg, 'I changed my status to "' + game + '"!');
  }
});

command.on('reboot', (msg) => {
  if (trustedIds.includes(msg.author.id)) {
    reply(msg, 'Rebooting...').then((msg) => {
      const now = Date.now();
      let toSave = {
        id: msg.id,
        channel: {id: msg.channel.id},
        noReactToAnthony: !reactToAnthony,
      };
      try {
        fs.writeFileSync('reboot.dat', JSON.stringify(toSave));
      } catch (err) {
        common.ERROR('Failed to save reboot.dat');
        console.log(err);
      }
      process.exit(-1);
    });
  } else {
    reply(
        msg, 'LOL! Good try!',
        'It appears SpikeyRobot doesn\'t trust you enough with this command. Sorry!');
  }
});
command.on('reload', (msg) => {
  if (trustedIds.includes(msg.author.id)) {
    reply(msg, 'Reloading modules...').then((warnMessage) => {
      let error = false;
      for (let i in subModules) {
        try {
          try {
            if (subModules[i].save) {
              subModules[i].save();
            } else {
              common.ERROR(
                  'Submodule ' + subModuleNames[i] +
                  ' does not have a save() function.');
            }
            if (subModules[i].end) {
              subModules[i].end();
            } else {
              common.ERROR(
                  'Submodule ' + subModuleNames[i] +
                  ' does not have an end() function.');
            }
          } catch (err) {
            common.ERROR('Error on unloading ' + subModuleNames[i]);
            console.log(err);
          }
          delete require.cache[require.resolve(subModuleNames[i])];
          subModules[i] = require(subModuleNames[i]);
          subModules[i].begin(prefix, Discord, client, command, common);
        } catch (err) {
          error = true;
          common.ERROR('Failed to reload ' + subModuleNames[i]);
          console.log(err);
        }
      }
      if (error) {
        warnMessage.edit('`Reload completed with errors.`');
      } else {
        warnMessage.edit('`Reload complete.`');
      }
    });
  } else {
    reply(
        msg, 'LOL! Good try!',
        'It appears SpikeyRobot doesn\'t trust you enough with this command. Sorry!');
  }
});

// Dev: https://discordapp.com/oauth2/authorize?&client_id=422623712534200321&scope=bot
// Rel: https://discordapp.com/oauth2/authorize?&client_id=318552464356016131&scope=bot
if (isDev) {
  client.login('NDIyNjIzNzEyNTM0MjAwMzIx.DYeenA.K5pUxL8GGtVm1ml_Eb6SaZxSKnE');
} else {
  client.login('MzE4NTUyNDY0MzU2MDE2MTMx.DA0JAA.aNNIG_xR7ROtL4Ro_WZQjLiMLF0');
}
