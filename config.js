var config = {}

// irc config
config.room = '#priyom';
config.server = 'kornbluth.freenode.net';
config.botName = 'IvoSchwarz';
config.userName = 'OLX',
config.realName = 'Ivo Schwarz',
config.password = '';
config.port = 7000;
config.tls = true;

// calendar settings
config.calendarId = 'ul6joarfkgroeho84vpieeaakk' // this is in your iCal, html, etc. URLs

// announce before ...
config.announceEarly = 1 * 60000; // milliseconds

// calendar limits
config.maxResults = 5; // at least 2

module.exports = config;
