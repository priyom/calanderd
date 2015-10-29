
/**
 * calendard 0.3.0
 * Licensed under GPLv3
 * Written for #priyom on freenode (priyom.org) by Tomáš Hetmer.
 * With additions by danix111, MilesPrower, linkfanel, L0j1k.
 */

var ivo = (function() {
	"use strict";

	// core
	var https = require('https');
	// local
	var config = require('./config.js');
	// third party
	var irc = require('irc');
	var moment = require('moment');
	var colors = config.color ? require('irc-colors') : null;

	// data storage object
	var $data = {
		data: (process.env.calendard_data === 'mock' ? 'mock' : 'google'),
		notify: 'Reporting for duty',
		dev: (process.env.calendard === 'dev'),
		events: [],
		regex: {
			digital: /^(XP[A-Z]*\d*|(F|HM)\d+)[a-z]?$/,
			morse: /^M\d+[a-z]?$/,
			voice: /^[EGSV]\d+[a-z]?$/
		},
		room: process.env.calendard === 'dev' ? config.dev.room : config.room,
		timers: {
			announce: null,
			pong: null
		},
		types: []
	};

	// log convenience function (console.log is so 2005)
	var $log = (function() {
		var debug = function( data ) {
			return console.log($func.util.time()+' [DBUG] '+data);
		};
		var error = function( data ) {
			throw new Error($func.util.time()+' [EROR] '+data);
		};
		var log = function( data ) {
			return console.log($func.util.time()+' [LOG ] '+data);
		};
		return {
			debug: debug,
			error: error,
			log: log
		};
	})();

	var $client = new irc.Client($data.dev ? config.dev.server : config.server, $data.dev ? config.dev.botName : config.botName, {
		userName: $data.dev ? config.dev.userName : config.userName,
		realName: $data.dev ? config.dev.realName : config.realName,
		port: $data.dev ? config.dev.port : config.port,
		password: $data.dev ? config.dev.password : config.password,
		sasl: true,
		showErrors: true,
		autoConnect: false,
		retryDelay: 4000,
		retryCount: 1000,
		secure: $data.dev ? config.dev.tls : config.tls
	});

	// function storage object
	var $func = {
		__dev: {
			getEvents: function( num, special ) {
				// this function generates random events for testing, simulating http fetchEvents()
				// special {boolean} will return array of events all having the same event date +60s, for testing event time collision handler
				function _getEvent( time ) {
					return {
						start: {
							dateTime: new Date(Math.floor(new Date().getTime()+time*1000))
						},
						summary: (['M12','HM01','S06'][Math.floor(Math.random()*3)])+' '+Math.floor(Math.random()*15000)+' kHz '+(['USB/AM','USB','LSB','AM','CW','MCW'][Math.floor(Math.random()*6)])
					};
				};
				function compare( a, b ) {
					if (a.startTime < b.startTime) return -1;
					if (a.startTime > b.startTime) return 1;
					return 0;
				};
				var num = $func.util.type(num) !== 'number' ? 6 : num;
				var special = $func.util.type(special) !== 'boolean' ? false : special;
				var events = [];
				for (var i=0,len=num; i<len; i++, events.push(_getEvent( (special ? 120 : (Math.floor(Math.random()*5)+2)*60) )));
				return events.sort(compare);
			}
		},
		announcements: {
			schedule: function() {
				// Find next event that isn't supposed to have already been announced
				var limit = (new Date()).getTime() + config.announceEarly;

				var next = $func.events.search(limit + 1000, null);
				if (next == null) return;

				clearTimeout($data.timers.announce); // Safety net against race conditions
				$data.timers.announce = setTimeout($func.announcements.announce, next.getTime() - limit);

				$log.debug('next announcement scheduled for event at ' + next.toISOString());
			},
			announce: function() {
				if ($func.events.sayNext(null)) $func.announcements.schedule();
			}
		},
		client: {
			fetchEvents: function() {
				$log.log('asking Google for data...');
				// set date for request
				$data.calendarUrl = "https://www.googleapis.com/calendar/v3/calendars/" +
					config.calendarId +
					"@group.calendar.google.com/events?orderBy=startTime&singleEvents=true&timeMin=" +
					new Date().toISOString() +
					"&fields=items(start%2Csummary)%2Csummary&key=" +
					config.apiKey +
					"&maxResults=" +
					config.maxResults;
				https.get($data.calendarUrl, function (res) {
					$log.log('  - http request got statusCode: ' + res.statusCode);

					var data = '';

					res.on('data', function(chunk) {
						data += chunk;
					});
					res.on('end', function () {
						var obj = $data.data === 'mock' ? {
							//
							// STUBS for development since we don't have the API key
							//
							// if you want events with the same trigger time, add boolean true parameter to getEvents()
							items: $func.__dev.getEvents(6)
						} : JSON.parse(data);
						if (typeof(obj) !== 'object' || $func.util.type(obj.items) !== 'array') $log.error('$func.client.fetchEvents(): improper return object. cannot proceed ['+JSON.stringify(obj)+']');
						$func.client.onHttpReturn(obj.items);
					});
				}).on('error', function (e) {
					$log.error('[!] HTTP CLIENT ERROR: '+e.message);
				});
			},
			onHttpReturn: function( events ) {
				$log.log('number of events found: ' + events.length);
				$log.log('time of first event: ' + events[0].start.dateTime);

				var ev = [];
				events.forEach(function(evt) {
					var info = $func.extract.info(evt.summary);
					var event = {
						eventDate: new Date(evt.start.dateTime),
						title: evt.summary,
						frequency: info[0],
						mode: info[1],
					};
					ev.push(event);
				});

				// Atomically swap new events in
				clearTimeout($data.timers.announce);
				$data.events = ev;

				var notify = $data.notify;
				if (notify != null) {
					$data.notify = null;
					$client.say($data.room, notify);
				}
				$log.log('system ready!');

				$func.announcements.schedule();
			}
		},
		events: {
			search: function( after, filter ) {
				// Remove past events
				var now = new Date();
				while ($data.events[0] != null && $data.events[0].eventDate < now) {
					$data.events.shift();
				}

				// Search future events
				for (var i = 0; i < $data.events.length; i++) {

					var date = $data.events[i].eventDate;
					if (date.getTime() < after)
						continue;

					if (filter != null) {
						var name = $data.events[i].title.match(/^([\w /]+?) (\d+ ?kHz|Search)/i);
						if (name == null)
							continue;
						if (! filter.test(name[1]))
							continue;
					}
					// Legacy check for running out of events
					else if ($data.events.length - i < 3)
						break;

					// Make sure we have all the events for that date
					for (var j = i + 1; j < $data.events.length; j++) {
						if ($data.events[j].eventDate > date) {
							return date;
						}
					}
					break;
				}

				// More events needed
				$func.client.fetchEvents();
				return null;
			},
			getByDate: function( date ) {
				var events = [];
				$data.events.every(function(evt) {
					if (evt.eventDate > date)
						return false;
					if (evt.eventDate.getTime() == date.getTime())
						events.push(evt);
					return true;
				});
				return events;
			},
			print: function( events ) {
				// Based on original events code written by foo (UTwente-Usability/events.js)
				var first = moment(events[0].eventDate);
				var time = first.utc().format('HH:mm');
				var header = (config.color ? colors.bold(time) : time) + " " + first.fromNow() + " ";

				var formattedEvents = [];

				events.forEach(function(evt) {
					var format = $func.format.event(evt.title);
					// Don't give a link for "Target", as "Target" implies that the TX can NOT be heard on UTwente. (most of the time at least)
					if (typeof(evt.frequency) !== 'undefined' && evt.frequency.length > 3 && evt.title.indexOf('Target') === -1) {
						var freq = evt.frequency;
						var mode = '';
						switch (evt.mode) {
							case 'RTTY':
							case 'RTTY/CW':
								// Give it as USB with the center frequency at +2 kHz
								freq = freq-2;
								break;

							case 'CW':
								// This makes the CW stations +1000Hz on USB.
								freq = freq-1;
							case 'LSB':
								// NOTE: we're falling through from LSB into AM!
							case 'AM':
								// Especially for M08a
								// For HM01 too... veryu
								mode = evt.mode.toLowerCase();
								break;
						}
						format += ' http://freq.ml/' + freq + mode;
					}
					formattedEvents.push(format);
				});
				return (header + formattedEvents.join(" • "));
			},
			sayNext: function( type ) {
				var filter = null;
				switch (type) {
					case 'digital':
						filter = $data.regex.digital;
						break;
					case 'morse':
						filter = $data.regex.morse;
						break;
					case 'voice':
						filter = $data.regex.voice;
						break;
				}

				var date = $func.events.search(-1, filter);
				if (date == null) return false;

				var events = $func.events.getByDate(date);
				if (events.length == 0) return false; // Just in case of concurrent modification

				$client.say($data.room, $func.events.print(events));
				return true;
			}
		},
		extract: {
			info: function( textToMatch ) {
				// Without this the frequency marked as "last used" is given as a link.
				// Which is misleading as fuck.
				if ($func.util.type(textToMatch) !== 'string') $log.error('$func.extract.frequency(): incorrect parameters!');
				if (textToMatch.indexOf(" Search ") > -1) return [ undefined, undefined ];
				var result = textToMatch.match(/(\d+) ?[kK][hH][zZ]((.*?[kK][hH][zZ])?? ([A-Z][A-Z/]+))?/);
				return result != null ? [ result[1], result[4] ] : [ undefined, undefined ];
			}
		},
		format: {
			station: function( match, name, rest ) {
				if (!config.color) return match;
				var cname;
				if ($data.regex.digital.test(name)) {
					cname = colors.red(name);
				} else if ($data.regex.morse.test(name)) {
					cname = colors.purple(name);
				} else if ($data.regex.voice.test(name)) {
					cname = colors.green(name);
				} else {
					cname = colors.brown(name);
				}

				return (cname + " " + rest);
			},
			search: function( match, search ) {
				return config.color ? (" " + colors.bold(search) + " ") : match;
			},
			frequency: function( freq ) {
				return config.color ? colors.olive(freq) : freq;
			},
			event: function( title ) {
				if (!config.color) return title;
				title = title.replace(/^([\w /]+?) (\d+ ?kHz|Search)/i, $func.format.station);
				title = title.replace(/ (Search) /i, $func.format.search);
				title = title.replace(/\d+ ?[kK][hH][zZ]( [A-Z][A-Z/]+)?/g, $func.format.frequency);
				return title;
			}
		},
		stations: {
			link: function( stn ) {
				// grab the first element from the given arguments list
				if (typeof(stn) !== 'string') return false;

				// avoid pissing people off, veryu
				var station = typeof(stn.toLowerCase) === 'function' && stn.toLowerCase();

				var milBase = 'http://priyom.org/military-stations/';
				var diploBase = 'http://priyom.org/diplomatic-stations/';
				var numberBase = 'http://priyom.org/number-stations/';

				// mil/diplo/digi aliases
				switch (station) {
					case 'katok65':
						station = 'katok-65';
						break;
					case 'plovets41':
						station = 'plovets-41';
						break;
					case 'hf-gcs':
						station = 'hfgcs';
						break;
					case 'mazielka':
						station = 'x06';
						break;
					case 'polfsk':
					case 'pol-fsk':
						station = 'f11';
						break;
					case '200/1000':
					case 'fsk-2001000':
						station = 'f06';
						break;
					case '200/500':
					case 'fsk-200500':
						station = 'f01';
						break;
				}

				// yep mil/diplo/digi stuff is special
				switch (station) {
					case 'buzzer':
					case 's28':
						return milBase + 'russia/the-buzzer';
					case 'pip':
					case 's30':
						return milBase + 'russia/the-pip';
					case 'wheel':
					case 's32':
						return milBase + 'russia/the-squeaky-wheel';
					case 's5292':
					case 's4790':
					case 's5426':
					case 'katok-65':
					case 'plovets-41':
					case 'm32':
						return milBase + 'russia/' + station;
					case 'mxi':
					case 'cluster':
						return milBase + 'russia/naval-markers';
					case 'monolith':
						return milBase + 'russia/monolyth-messages-description';
					case 'alphabet':
						return milBase + 'russia/russian-phonetic-alphabet-and-numbers';
					case 'hfgcs':
						return milBase + 'united-states/' + station;
					case 'vc01':
						return milBase + 'china/chinese-robot';
					case 'm51':
						return milBase + 'france/' + station;
					case 'xsl':
						return milBase + 'japan/slot-machine';
					case 'x06':
					case 'x06a':
					case 'x06b':
					case 'x06c':
						return diploBase + 'russia/' + station;
					case 'dp01': // fo, e!
					case 'hm01':
					case 'xpa':
					case 'xpa2':
					case 'sk01':
					case 'xp':
						return numberBase + 'digital/' + station;
					case 'sked':
						return numberBase + 'station-schedule';
				}

				// the rest should be ok to do this way
				var languages = {
					e: 'english',
					g: 'german',
					s: 'slavic',
					v: 'other',
					m: 'morse',
					f: 'digital',
				};
				var language = languages[station[0]];
				if (language) return numberBase + language + '/' + station;

				return 'u wot m8';
			}
		},
		util: {
			time: function() {
				return new Date().toJSON();
			},
			type: function( thing ) {
				if (thing == null) return thing + '';
				return typeof(thing) === 'object' || typeof(thing) === 'function' ? $data.types[Object.prototype.toString.call(thing)] || 'object' : typeof(thing);
			}
		}
	};

	var init = (function() {
		$log.log('initializing ivobot...');
		// populate granular types array for better type checking
		('Boolean Number String Function Array Date RegExp Object Error'.split(' ').forEach(function(name, i) {
			$data.types['[object ' + name + ']'] = name.toLowerCase();
		}));
		$log.log('running in state: ' + ($data.dev ? 'dev' : 'prod'));
		$log.log('using data of type: ' + $data.data);
	})();

	var main = function() {
		// connecting client to irc...
		$log.log('connecting to irc (channel '+$data.room+')...')
		$client.connect(5, function (input) {
			$log.log('calendard on server');

			$client.join($data.room, function (input) {
				$log.log('channel connection is ready!');

				$data.timers.pong = setInterval(function () {
					$client.send('PONG', 'empty');
				}, 2 * 60 * 1000);

				$func.client.fetchEvents();
			});
		});
		$client.addListener('message' + $data.room, function (from, to, message) {
			var args = message.args[1].split(' ');
			var cmd = args[0];
			switch(cmd) {
				case '!next':
				case '!n':
					$log.log('received next command from ' + from);
					if (! $func.events.sayNext(args[1])) {
						// Unlikely race condition: this should be passed before reloading was triggered, not after
						$data.notify = 'Not enough events available to find match; please try again now.';
					}
					break;
				case '!stream':
					$client.say($data.room, 'http://stream.priyom.org:8000/buzzer.ogg.m3u');
					break;
				case '!link':
					$log.log('received link command from ' + from);
					if (args.length > 1) $client.say($data.room, $func.stations.link(args[1]));
					break;
				case '!listen':
					$client.say($data.room, 'http://websdr.ewi.utwente.nl:8901/');
					break;
				case '!reload':
					$log.log('refreshing events list...');
					$data.notify = 'Done reloading events';
					$func.client.fetchEvents();
					break;
				case '!why':
					$client.say($data.room, 'The Buzzer is not audible at this time of the day due to HF propagation characteristics. Try again later in the local evening.');
					break;
				case '!new':
					$client.say($data.room, 'You can visit our site at http://priyom.org where we have a good read regarding any and all information about logged numbers stations.');
					break;
				case '!rules':
					$client.say($data.room, 'http://priyom.org/about/irc-rules');
					break;
				case '!rivet':
					$client.say($data.room, 'http://www.apul64.dsl.pipex.com/enigma2000/rivet/index.html');
					break;
				case '!utc':
					$client.say($data.room, (new Date()).toUTCString());
					break;
			}
		});
		$client.addListener('error', function (message) {
			$log.error('[!] IRC CLIENT ERROR: ', message);
		});
	};

	// if we're called with require(), it's test tiem! otherwise fire it up
	if (require.main === module) {
		return main();
	} else {
		return {
			__test: {
				func: $func
			}
		}
	}
})();
