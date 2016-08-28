
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

	// Helper variable for declaring classes, see below
	var C;

	// data storage object
	var $data = {
		data: (process.env.calendard_data === 'mock' ? 'mock' : 'google'),
		notify: {
			msg: 'Reporting for duty',
			rcpt: process.env.calendard === 'dev' ? config.dev.room : config.room,
		},
		dev: (process.env.calendard === 'dev'),
		events: [],
		room: process.env.calendard === 'dev' ? config.dev.room : config.room,
		timers: {
			announce: null,
			pong: null
		},
		types: []
	};

	// station static data storage object
	var $stations = {
		regex: {
			type: {
				digital: /^(XP[A-Z]*\d*|(F|HM|DP|SK)\d+)[a-z]?$/,
				morse: /^M\d+[a-z]?$/,
				voice: /^[EGSV]\d+[a-z]?$/,
			},
			family: {
				GRU: /^(([EFGV]0?6|E20|S25|V23|M[12]4|F0?[126])[a-z]?|E17[a-y]?|S0?6[a-rt-z]?)$/,
				SVR: /^([EGSV]0?7|M12|DP0?1|XP[A-Z]*\d*)[a-z]?$/,
				poland: /^([EFGS]11|G10|S(12|26)|M(0?3|20))[a-z]?$/,
				ukraine: /^(E17z|S0?6s)$/,
				DGI: /^(V0?2|M0?8|HM0?1|SK0?1)[a-z]?$/,
			},
			military: {
				russia: /^(S(28|30|32|\d{4,})|[A-Za-z]+-\d{2}|M(32|XI))[a-z]?$/,
				USA: /^HFGCS$/,
				china: /^VC\d+[a-z]?$/,
				france: /^M51[a-z]?$/,
				japan: /^XSL$/,
			},
			diplomatic: {
				russia: /^X0?6[a-z]?$/,
			},
		},
		language: {
			E: 'english',
			G: 'german',
			S: 'slavic',
			V: 'other',
			M: 'morse',
			F: 'digital',
		},
		alias: {
			'buzzer': 'S28',
			'pip': 'S30',
			'wheel': 'S32',
			'katok65': 'Katok-65',
			'plovets41': 'Plovets-41',
			'cluster': 'MXI',
			'hf-gcs': 'HFGCS',
			'mazielka': 'X06',
			'polfsk': 'F11',
			'pol-fsk': 'F11',
			'200/1000': 'F06',
			'fsk-2001000': 'F06',
			'200/500': 'F01',
			'fsk-200500': 'F01',
		},
		link: {
			irregular: {
				'S28': 'the-buzzer',
				'S30': 'the-pip',
				'S32': 'the-squeaky-wheel',
				'MXI': 'naval-markers',
				'VC01': 'chinese-robot',
				'XSL': 'slot-machine',
			},
			extra: {
				'monolith': [ 'military', 'russia', 'monolyth-messages-description' ],
				'alphabet': [ 'military', 'russia', 'russian-phonetic-alphabet-and-numbers' ],
				'sked': [ 'number', 'station-schedule' ],
			},
		},
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

				var next = $func.events.search([ (new $func.filter.After(limit + 1000)) ]);
				if (next == null || $data.events.length < config.minEvents) {
					$func.client.fetchEvents();
					return;
				}

				clearTimeout($data.timers.announce); // Safety net against race conditions
				$data.timers.announce = setTimeout($func.announcements.announce, next.getTime() - limit);

				$log.debug('next announcement scheduled for event at ' + next.toISOString());
			},
			announce: function() {
				var next = $func.events.printNext(null);
				if (next) $client.say($data.room, next);
				$func.announcements.schedule();
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

				var ev = events.map(function(evt) {
					var info = $func.extract.info(evt.summary);
					var event = {
						eventDate: new Date(evt.start.dateTime),
						title: evt.summary,
						station: info[0],
						frequency: info[1],
						mode: info[2],
					};
					return event;
				});

				// Atomically swap new events in
				clearTimeout($data.timers.announce);
				$data.events = ev;

				var notify = $data.notify;
				if (notify != null) {
					$data.notify = null;
					$client.say(notify.rcpt, notify.msg);
				}
				$log.log('system ready!');

				$func.announcements.schedule();
			}
		},
		filter: {
			// Old-syntax classes implementing an event filter interface
			// We use a little trickery to declare them inline:
			// Class: (C = constructor, C.prototype = members, C),
			// This evaluates the first two statements and then returns C
			After: (
				C = function( after ) {
					this.after = after;
				},
				C.prototype = {
					match: function( event ) {
						return (event.eventDate.getTime() >= this.after);
					},
				},
			C),
			Regex: (
				C = function( regex ) {
					this.regex = regex;
				},
				C.prototype = {
					match: function( event ) {
						return this.regex.test(event.station);
					},
				},
			C),
			Band: (
				C = function( min, max ) {
					this.min = min;
					this.max = max;
				},
				C.prototype = {
					match: function( event ) {
						var freq = event.frequency;
						return (!(
							(this.min && ((! freq) || freq < this.min)) ||
							((this.max || this.max == 0) && ((! freq) || this.max < freq))
						));
					},
				},
			C),
			Search: (
				C = function( search ) {
					this.search = Boolean(search);
				},
				C.prototype = {
					match: function( event ) {
						return (this.search != Boolean(event.frequency));
					},
				},
			C),
			Not: (
				C = function( filter ) {
					this.filter = filter;
				},
				C.prototype = {
					match: function( event ) {
						return (! this.filter.match(event));
					},
				},
			C),
		},
		events: {
			search: function( filters ) {
				// Remove past events
				var now = new Date();
				while ($data.events[0] != null && $data.events[0].eventDate < now) {
					$data.events.shift();
				}

				// Search future events
				for (var i = 0; i < $data.events.length; i++) {

					if (filters) {
						var match = filters.every(function(ftr) {
							return ftr.match($data.events[i]);
						});
						if (! match) continue;
					}

					// Make sure we have all the events for that date
					var date = $data.events[i].eventDate;
					for (var j = i + 1; j < $data.events.length; j++) {
						if ($data.events[j].eventDate > date) {
							return date;
						}
					}
					break;
				}

				// More events needed
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

				var formattedEvents = events.map(function(evt) {
					var format = $func.format.event(evt.title);
					// Don't give a link for "Target", as "Target" implies that the TX can NOT be heard on UTwente. (most of the time at least)
					if (evt.frequency && evt.title.indexOf('Target') === -1) {
						var freq = evt.frequency;
						var mode = '';
						switch (evt.mode) {
							case 'RTTY':
							case 'RTTY/CW':
								// Give it as USB with the center frequency at +2 kHz
								freq = freq-2;
								break;

							case 'CW':
								// WebSDR software gratuitiously shifts CW tuning by +750 Hz, so we compensate for this.
								freq = freq - 0.75;
							case 'LSB':
							case 'AM':
								// Especially for M08a, and for HM01 too... veryu
								mode = evt.mode.toLowerCase();
								break;
						}
						format += ' ' + config.websdrUrl + freq + mode;
					}
					return format;
				});
				return (header + formattedEvents.join(" • "));
			},
			printNext: function( filters ) {
				var date = $func.events.search(filters);
				if (date == null) return null;

				var events = $func.events.getByDate(date);
				if (events.length == 0) return null; // Just in case of concurrent modification

				return $func.events.print(events);
			}
		},
		extract: {
			info: function( textToMatch ) {
				// Don't match a frequency marked as "last used", otherwise it is given as a link.
				// Which is misleading as fuck.
				if ($func.util.type(textToMatch) !== 'string') $log.error('$func.extract.frequency(): incorrect parameters!');
				var result = textToMatch.match(/^([\w /-]+?) (?:Search|(\d+) ?[kK][hH][zZ](?:(?:.*?[kK][hH][zZ])?? ([A-Z][A-Z/]+))?)/);
				return result != null ? [ result[1], Number(result[2]), result[3] ] : [ undefined, NaN, undefined ];
			}
		},
		format: {
			station: function( match, name, rest ) {
				if (!config.color) return match;
				var cname;
				if ($stations.regex.type.digital.test(name)) {
					cname = colors.red(name);
				} else if ($stations.regex.type.morse.test(name)) {
					cname = colors.purple(name);
				} else if ($stations.regex.type.voice.test(name)) {
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
				title = title.replace(/^([\w /-]+?) (\d+ ?kHz|Search)/i, $func.format.station);
				title = title.replace(/ (Search) /i, $func.format.search);
				title = title.replace(/\d+(-\d+)? ?[kKmM][hH][zZ]( [A-Z][A-Z/]+)?/g, $func.format.frequency);
				return title;
			}
		},
		stations: {
			alias: function( station ) {
				// mil/diplo/digi aliases
				var alias = $stations.alias[station.toLowerCase()];
				station = alias ? alias :
					// Fix case for matching
					station.replace(/^[a-z]+/, function(ltr) {
						return ltr.toUpperCase();
					});
				return station;
			},
			matchLink: function( station ) {
				// Extra (non-station) info pages
				var extra = $stations.link.extra[station.toLowerCase()];
				if (extra) return extra.slice(); // Return a copy of the array, so it can be modified

				// Stations sorted by country
				var types = [ 'military', 'diplomatic' ];
				for (var i = 0; i < types.length; i++) {
					var type = types[i];
					var regexes = $stations.regex[type];
					for (var country in regexes) {
						if (regexes[country].test(station)) {
							var cty = (country == 'USA') ? 'united-states' : country.toLowerCase();
							return [ type, cty, station.toLowerCase() ];
						}
					}
				}

				// Check for digital stations with special prefixes
				var language = $stations.regex.type.digital.test(station) ? 'digital' :
					// Generic numbers stations
					$stations.language[station[0]];

				if (language) return [ 'number', language, station.toLowerCase() ];

				return null;
			},
			link: function( station, append ) {
				// avoid pissing people off, veryu
				station = $func.stations.alias(station);

				var segments = $func.stations.matchLink(station);
				if (segments == null) return 'u wot m8';

				segments[0] = 'http://priyom.org/' + segments[0] + '-stations';

				// Handle irregular page names
				var page = $stations.link.irregular[station];
				if (page) segments[segments.length - 1] = page;

				if (append) segments = segments.concat(append);
				return segments.join('/');
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
		},
		irc: {
			parseFilter: function( arg ) {
				var filter;
				var result = arg.match(/^(\d+)(?:-(\d*))?$/);
				if (result != null) {
					var min = Number(result[1]);
					var max;
					switch (result[2]) {
						case undefined:
							// Single frequency
							max = min;
							break;
						case '':
							// Lower bound only
							max = NaN;
							break;
						default:
							// Range
							max = Number(result[2]);
							break;
					}

					filter = new $func.filter.Band(min, max);

				} else if (/^!?search$/i.test(arg)) {
					var search = (arg[0] != '!');
					filter = new $func.filter.Search(search);
				} else if (arg[0] == '!') {
					// Optimization and stack-overflow DoS protection
					while (arg.substr(0, 2) == '!!')
						arg = arg.slice(2);

					if (arg[0] != '!') {
						filter = $func.irc.parseFilter(arg);
					} else {

						var invert = $func.irc.parseFilter(arg.slice(1));
						if (invert == null) return null;

						filter = new $func.filter.Not(invert);
					}
				} else {
					var regex = $stations.regex.type[arg];
					if (! regex) regex = $stations.regex.family[arg];
					if (! regex) regex = $stations.regex.family[arg.toUpperCase()];
					if (! regex) {
						arg = $func.stations.alias(arg);
						if (! /^[\w /-]+$/.test(arg)) return null;
						regex = new RegExp('^' + arg);
					}

					filter = new $func.filter.Regex(regex);
				}
				return filter;
			},
			next: function( args ) {
				var filters = args.map($func.irc.parseFilter);
				if (filters.indexOf(null) > -1) return null;

				return $func.events.printNext(filters);
			},
			commands: function( from, replyTo, message ) {
				var args = message.split(/\s+/).filter(function(arg) {
					// Remove leading/trailing empty strings
					return arg;
				});
				var cmd = args.shift();
				if (cmd[0] != '!') return;

				$log.log('received ' + cmd + ' command from ' + from + (args.length > 0 ? ' (args: ' + args.join(' ') + ')' : ''));

				// Don't separate these commands too far from the others
				var staticInfo = {
					'!stream': 'http://stream.priyom.org:8000/buzzer.ogg',
					'!listen': 'http://websdr.ewi.utwente.nl:8901/',
					'!why': 'The Buzzer is not audible at this time of the day due to HF propagation characteristics. Try again later in the local evening.',
					'!new': 'You can visit our site at http://priyom.org where we have a good read regarding any and all information about logged numbers stations.',
					'!rules': 'http://priyom.org/about/irc-rules',
					'!rivet': 'http://www.apul64.dsl.pipex.com/enigma2000/rivet/index.html',
					'!twente': 'Priyom is not affiliated with the University of Twente, their WebSDR, and PA3FWM, and is not their helpdesk.',
					'!sdrhelp': 'http://sdrhelp.blogspot.com',
				};

				var info = staticInfo[cmd];
				if (info) {
					var nick = args[0];
					var reply = nick ? nick + ': ' + info : info;
					$client.say(replyTo, reply);
					return;
				}

				switch(cmd) {
					case '!next':
					case '!n':
						var next = $func.irc.next(args);
						if (next) $client.say(replyTo, next);
						else $client.say(replyTo, 'No scheduled matching station found within available events.');
						break;
					case '!link':
						if (args.length > 0) $client.say(replyTo, $func.stations.link(args[0], args.slice(1)));
						break;
					case '!logs':
					case '!log':
						if (args.length > 0) $client.say(replyTo, $func.stations.link(args[0], [ (new Date()).getFullYear() ]));
						break;
					case '!reload':
						$log.log('refreshing events list...');
						$data.notify = {
							msg: 'Done reloading events',
							rcpt: replyTo,
						};
						$func.client.fetchEvents();
						break;
					case '!utc':
						$client.say(replyTo, (new Date()).toUTCString());
						break;
				}
			},
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
		$client.addListener('message#', function (from, to, message) {
			// Skip parsing most channel messages
			if (message.indexOf('!') == -1) return;
			$func.irc.commands(from, to, message);
		});
		$client.addListener('pm', function (from, message) {
			$log.debug('received pm from ' + from + ': ' + message);
			$func.irc.commands(from, from, message);
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
