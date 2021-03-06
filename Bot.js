//Loading in environment variables.
const dotenv = require('dotenv');
dotenv.config();

//Loading in external libraries.
const Discord = require("discord.js");

//Loading in constants.
const token = process.env.BOT_TOKEN;
const client = new Discord.Client();
const Constants = require("./utils/Constants.js");
const EventManager = require("./managers/EventManager.js");
const botConstants = Constants.getBotConstants();

//Configuring logger.
const log4js = require('log4js');
let date = new Date();
log4js.configure({
    appenders: { CheeseBotFile: { type: 'file', filename: 'logs/' + date.toDateString() + '-' + date.getHours() + '-' + date.getMinutes() + '-' + date.getSeconds() + '.log' }, CheeseBotConsole: {type: 'console'}},
    categories: { default: { appenders: ['CheeseBotFile','CheeseBotConsole'], level: 'info' } }
});
const logger = log4js.getLogger("CheeseBot");


//Loading in internal libraries.
const CommandManager = require("./managers/CommandManager.js");
CommandManager.load(logger);
const StreamManager = require("./managers/StreamManager.js");
logger.info("All libraries loaded.");

//Connect function, so it can be called later in-case of bot downtime.
function connect() {
    client.login(token).catch((err) => {
        if (err) {
            logger.error('error when connecting to bot testing:', err);
            setTimeout(connect, 2000);
        } else {
            logger.info("Something went majorly wrong...");
        }
    });
}

connect();
logger.info("Connecting...");
client.on('ready', () => {
    logger.info("Bot is ready!");
    EventManager.ready(client, CommandManager, logger);
    StreamManager.load(client, logger);
    CommandManager.getRoleManager().init(client, CommandManager.getPunishmentManager().getMySQLManager(), logger);
});

client.on('guildMemberAdd', (member) => {
    EventManager.join(member, client, CommandManager, logger);
});

client.on('guildMemberRemove', (member) => {
        client.guilds.cache.get(botConstants.guildId).channels.cache.get(botConstants.serverLoggingChannel).send(new Discord.MessageEmbed()
            .setTitle("User Leave")
            .setThumbnail(member.user.displayAvatarURL())
            .setDescription(member.user.tag + " has left the server.")
            .setTimestamp()
            .setColor('#AA0000'));


    }
);

client.on('guildMemberUpdate', (oldMember, newMember) => {
    if (oldMember.displayName !== newMember.displayName) {
        if (oldMember.user.bot) {
            return;
        }
        client.guilds.cache.get(botConstants.guildId).channels.cache.get(botConstants.serverLoggingChannel).send(new Discord.MessageEmbed()
            .setAuthor(newMember.user.tag, newMember.user.displayAvatarURL())
            .setDescription("<@" + newMember + "> has changed their nickname.")
            .addField("Old Name", oldMember.displayName)
            .addField("New Name", newMember.displayName)
            .setTimestamp()
            .setColor('#2980B9'));
    } else if (oldMember.roles.cache.size !== newMember.roles.cache.size) {
        if (oldMember.roles.cache.size > newMember.roles.cache.size) {
            let role;
            let roles = oldMember.roles.cache.keyArray();
            for (let i = 0; i < roles.length; i++) {
                if (!newMember.roles.cache.keyArray().includes(roles[i])) {
                    role = roles[i];
                    break;
                }
            }
            client.guilds.cache.get(botConstants.guildId).channels.cache.get(botConstants.serverLoggingChannel).send(new Discord.MessageEmbed()
                .setAuthor(newMember.user.tag, newMember.user.displayAvatarURL())
                .setTitle("Role Removed")
                .setDescription("<@" + newMember.user + "> was removed from the `" + oldMember.roles.cache.get(role).name + "` role.")
                .setColor('#2980B9'));
        } else {
            let role;
            let roles = newMember.roles.cache.keyArray();
            for (let i = 0; i < roles.length; i++) {
                if (!oldMember.roles.cache.keyArray().includes(roles[i])) {
                    role = roles[i];
                    break;
                }
            }

            if (role === botConstants.memberRole) {
                return;
            }
            client.guilds.cache.get(botConstants.guildId).channels.cache.get(botConstants.serverLoggingChannel).send(new Discord.MessageEmbed()
                .setAuthor(newMember.user.tag, newMember.user.displayAvatarURL())
                .setTitle("Role Added")
                .setDescription("<@" + newMember.user + "> was given the `" + newMember.roles.cache.get(role).name + "` role.")
                .setColor('#2980B9'));
        }
    }
});

client.on('userUpdate', (oldUser, newUser) => {
    if (oldUser.username !== newUser.username) {
        client.guilds.cache.get(botConstants.guildId).channels.cache.get(botConstants.serverLoggingChannel).send(new Discord.MessageEmbed()
            .setAuthor(newUser.tag, newUser.displayAvatarURL())
            .setDescription("<@" + newUser + "> has changed their username.")
            .addField("Old Name", oldUser.username)
            .addField("New Name", newUser.username)
            .setTimestamp()
            .setColor('#2980B9'));
    }
});

client.on('guildBanAdd', (guild, user) => {
    client.guilds.cache.get(botConstants.guildId).channels.cache.get(botConstants.serverLoggingChannel).send(new Discord.MessageEmbed()
        .setAuthor(user.tag, user.displayAvatarURL())
        .setTitle("Manual Ban")
        .setDescription(user.tag + " was manually banned by an admin.")
        .setColor('#AA0000'));
});

client.on('messageDelete', (message) => {
    if (message.guild != null) {
        if (message.author.bot) {
            return;
        }

        if (message.attachments.size > 0) {
            let z = "A file by <@" + message.author + "> was deleted in <#" + message.channel + ">." + ((message.content.length === 0)?"":"\n**Message**: `" + message.content + "`") + "\n**File URLs**:";
            //This has an attachment.
            for (let x of message.attachments.values()) {
                z = z + "\n`" + x.proxyURL + "`"
            }
            client.guilds.cache.get(botConstants.guildId).channels.cache.get(botConstants.serverLoggingChannel).send(new Discord.MessageEmbed()
                .setTitle("Message Deleted")
                .setDescription(z)
                .setColor('#AA0000'));
            return;
        }
        client.guilds.cache.get(botConstants.guildId).channels.cache.get(botConstants.serverLoggingChannel).send(new Discord.MessageEmbed()
            .setTitle("Message Deleted")
            .setDescription("A message by <@" + message.author + "> was deleted in <#" + message.channel + ">.\n" +
                "**Message**: `" + message.content + "`")
            .setColor('#AA0000'));
    }
});

client.on('messageUpdate', (oldMessage, newMessage) => {
    if (newMessage.guild != null) {
        if (oldMessage.author.bot || oldMessage.content === newMessage.content) {
            return;
        }
        client.guilds.cache.get(botConstants.guildId).channels.cache.get(botConstants.serverLoggingChannel).send(new Discord.MessageEmbed()
            .setTitle("Message Edited")
            .setDescription("<@" + newMessage.author + "> edited a message in <#" + newMessage.channel + ">.\n" +
                "**Old**: `" + oldMessage.content + "`\n" +
                "**New**: `" + newMessage.content + "`")
            .setColor('#2980B9'));
    }
});

client.on('message', (msg) => {
    if (msg.content.startsWith(botConstants.commandPrefix)) {
        CommandManager.onCommand(msg, client, logger);
    } else if (msg.channel.type === 'news') {
        msg.crosspost();
    }
});

client.on('messageReactionAdd', (reaction, user) => {
        if (!user.bot) {
            CommandManager.getRoleManager().reactionAdded(reaction, user);
        }
    }
);

client.on('messageReactionRemove', (reaction, user) => {
        if (!user.bot) {
            CommandManager.getRoleManager().reactionRemoved(reaction, user);
        }
});

client.on('error', (error) => {
    logger.info("An error has occurred. Error: " + error);
    if (client.status === 5) {
        connect();
    } else if (client.status === 3 || client.status === 0) {
        client.guilds.cache.get(botConstants.guildId).channels.cache.get(botConstants.botLoggingChannel).send("A" + ((error.fatal)?" fatal ":"n ") +  "error has occured. Error: ```" + error.code + ": " + error.stack + "```")
    }

});

client.on('warn', (error) => {
    logger.warn("An error has occurred. Error: " + error);
});

//Catching the process exit in order to cleanly exit.
process.on('exit', () => {
   CommandManager.getConnectionManager().leave();
   try {
       client.destroy();
   } catch (ex) {

   }
   StreamManager.end();
});

//Catching any uncaught exceptions, then restart the process.
process.on('uncaughtException', function(err) {
    if (client.status === 3 || client.status === 0) {
        client.guilds.cache.get(botConstants.guildId).channels.cache.get(botConstants.botLoggingChannel).send("A" + ((err.fatal)?" fatal ":"n ") +  "error has occured and the bot is shutting down. Error: ```" + err.code + ": " + err.stack + "```").then(() => {
            logger.error('Caught an uncaught exception: ' + err + ": \n" +  err.stack);
            process.exit(1)
        })
    } else {
        logger.error('Caught an uncaught exception: ' + err + ": \n" +  err.stack);
        process.exit(1);
    }
});