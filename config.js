

var config = module.exports = {
	// irc config
	room: '#priyom',
	server: 'irc.libera.chat',
	botName: 'IvoSchwarz',
	userName: 'ivo',
	realName: 'Ivo Schwarz',
	password: '',
	port: 6697,
	tls: true,
	color: true,

	// Google Calendar API parameters (now obsolete)
	apiKey: '',
	calendarId: '',

	// announce before ...
	announceEarly: 1 * 60000, // ms

	// calendar limits
	maxResults: 300,
	minEvents: 150, // reload data when dropping below this

	// these options are for testing, by doing something like:
	//    calendard=dev node ./main.js
	dev: {
		room: '#priyom',
		server: 'irc.libera.chat',
		botName: 'jummyristle',
		userName: 'foo',
		realName: 'bar',
		password: '',
		port: 6697,
		tls: true
	}
};
