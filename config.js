var config = {}

// irc config
config.room = '#priyom';
config.server = 'kornbluth.freenode.net';
config.botName = 'IvoSchwarz';
config.userName = 'ivo',
config.realName = 'Kompot\'s Ivo',
config.password = '';
config.port = 7000;
config.tls = true;

// calendar settings
config.apiKey = '';
config.calendarId = 'ul6joarfkgroeho84vpieeaakk' // this is in your iCal, html, etc. URLs

// announce before ...
config.announceEarly = 1 * 60000; // milliseconds

// calendar limits
config.maxResults = 50; // at least 2

module.exports = config;
