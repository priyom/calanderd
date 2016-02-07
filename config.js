

var config = module.exports = {
	// irc config
	room: '#priyom',
	server: 'chat.freenode.net',
	botName: 'IvoSchwarz',
	userName: 'ivo',
	realName: 'Ivo Schwarz',
	password: '',
	port: 7000,
	tls: true,
	color: true,

	// calendar settings
	apiKey: '',
	// this is in your iCal, html, etc. URLs
	calendarId: 'ul6joarfkgroeho84vpieeaakk',

	// announce before ...
	announceEarly: 1 * 60000, // ms

	// calendar limits
	maxResults: 150,
	minEvents: 50, // reload data when dropping below this

	// WebSDR / URL shortener root
	// websdrUrl: 'http://websdr.ewi.utwente.nl:8901/?tune=',
	websdrUrl: 'http://t.svita.cz/',

	// these options are for testing, by doing something like:
	//    calendard=dev node ./main.js
	dev: {
		room: '#priyom',
		server: 'chat.freenode.net',
		botName: 'jummyristle',
		userName: 'foo',
		realName: 'bar',
		password: '',
		port: 7000,
		tls: true
	}
};
