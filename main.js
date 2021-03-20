
/**
 * calendard 0.3.0
 * Licensed under GPLv3+
 * Written for #priyom on freenode (priyom.org) by Tomáš Hetmer.
 * With additions by danix111, MilesPrower, linkfanel, L0j1k.
 */

var ivo = (function() {
	"use strict";

	// core
	var https = require('https');
	// local config
	var config = require('./config.js');
	var website = require('./website.js');
	var stations = require('./stations.js');
	var websdrs = require('./websdrs.js');
	// local code
	var TX = require('./tx.js');
	var Events = require('./events.js');
	var timeutils = require('./timeutils.js');
	// third party
	var irc = require('irc');
	var colors = config.color ? require('irc-colors') : null;

	// Helper variable for declaring classes, see below
	var C;

	// data storage object
	var $data = {
		data: (process.env.calendard_data === 'mock' ? 'mock' : 'live'),
		notify: {
			msg: 'Reporting for duty',
			rcpt: process.env.calendard === 'dev' ? config.dev.room : config.room,
		},
		dev: (process.env.calendard === 'dev'),
		events: new Events(),
		room: process.env.calendard === 'dev' ? config.dev.room : config.room,
		timers: {
			announce: null,
			pong: null
		},
		stations: {
			alias: {},
			tx: [],
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

				var next = $data.events.search([ (new $func.filter.After(limit + 1000)) ]);
				if (next == null || $data.events.count() < config.minEvents) {
					$func.client.fetchEvents();
					return;
				}

				clearTimeout($data.timers.announce); // Safety net against race conditions
				$data.timers.announce = setTimeout($func.announcements.announce, next.getTime() - limit);

				$log.debug('next announcement scheduled for event at ' + next.toISOString());
			},
			announce: function() {
				var next = $data.events.getNext(null);
				if (next) $client.say($data.room, $func.events.print(next));
				$func.announcements.schedule();
			}
		},
		client: {
			fetchEvents: function() {
				$log.log('asking web API for data...');
				// set date for request
				var calendarUrl = "https://calendar.priyom.org/events" +
					"?timeMin=" + new Date().toISOString() +
					"&maxResults=" + config.maxResults;
				https.get(calendarUrl, function (res) {
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
					if ($func.util.type(evt.summary) !== 'string') $log.error('$func.extract.frequency(): incorrect parameters!');
					return new TX(evt.summary, new Date(evt.start.dateTime), websdrs, $func.format);
				});

				// Atomically swap new events in
				clearTimeout($data.timers.announce);
				$data.events.load(ev);

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
						return (event.eventDate != null && event.eventDate.getTime() >= this.after);
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
							(this.min > 0 && ((! freq) || freq < this.min)) ||
							((this.max || this.max == 0) && ((! freq) || this.max < freq))
						));
					},
				},
			C),
			Search: (
				C = function() {
				},
				C.prototype = {
					match: function( event ) {
						return (! event.frequency);
					},
				},
			C),
			Target: (
				C = function( target ) {
					this.target = $func.util.comparable(target);
				},
				C.prototype = {
					match: function( event ) {
						return (this.target == $func.util.comparable(event.target));
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
			print: function( events ) {
				var header = '';
				var next = events[0].eventDate;
				if (next != null) {
					var time = timeutils.printf_02d(next.getUTCHours()) +
						":" + timeutils.printf_02d(next.getUTCMinutes());
					var delay = timeutils.humanizeDuration(next - new Date());
					header = ($func.format != null ? $func.format.time(time) : time) + " " + delay + " ";
				}

				var formattedEvents = events.map(function(evt) {
					var format = evt.format();
					var link = evt.link();
					if (link) format += ' ' + link;
					return format;
				});
				return (header + formattedEvents.join(" • "));
			},
		},
		format: colors ? {
			time: colors.bold,
			station: function( name ) {
				if (stations.regex.type.digital.test(name)) return colors.red(name);
				else if (stations.regex.type.morse.test(name)) return colors.purple(name);
				else if (stations.regex.type.voice.test(name)) return colors.green(name);
				else return colors.brown(name);
			},
			search: colors.bold,
			frequency: colors.olive,
		} : null,
		stations: {
			init: function() {
				$log.log('loading station data...');

				// Populate alias mapping
				for (var station in stations.alias) {
					stations.alias[station].forEach(function(alias) {
						$data.stations.alias[$func.util.comparable(alias)] = station;
					});
				}
				$log.log('loaded ' + Object.keys($data.stations.alias).length + ' station aliases');

				// Populate static TX database
				$data.stations.tx = stations.tx.map(function(tx) {
					return new TX(tx, null, websdrs, $func.format);
				});
				$log.log('loaded ' + $data.stations.tx.length + ' static station transmissions');
			},
			search: function( filters ) {
				if (! filters) return $data.stations.tx;
				var txs = $data.stations.tx.filter(function(tx) {
					return filters.every(function(ftr) {
						return ftr.match(tx);
					});
				});
				if (txs.length == 0) return null;
				return txs;
			},
			alias: function( station ) {
				// mil/diplo/digi aliases
				var alias = $data.stations.alias[$func.util.comparable(station)];
				station = alias ? alias :
					// Fix case for matching
					station.replace(/^[a-z]+/, function(ltr) {
						return ltr.toUpperCase();
					});
				return station;
			},
			matchLink: function( station ) {
				// Extra (non-station) info pages
				var extra = website.extra[station.toLowerCase()];
				if (extra) return extra.slice(); // Return a copy of the array, so it can be modified

				// Stations sorted by country
				var types = [ 'military', 'diplomatic' ];
				for (var i = 0; i < types.length; i++) {
					var type = types[i];
					var regexes = stations.regex[type];
					for (var country in regexes) {
						if (regexes[country].test(station)) {
							var cty = (country == 'USA') ? 'united-states' : country.toLowerCase();
							return [ type, cty, station.toLowerCase() ];
						}
					}
				}

				// Check for digital stations with special prefixes
				var language = stations.regex.type.digital.test(station) ? 'digital' :
					// Generic numbers stations
					website.language[station[0]];

				if (language) return [ 'number', language, station.toLowerCase() ];

				return null;
			},
			link: function( station, append, logs ) {
				// avoid pissing people off, veryu
				station = $func.stations.alias(station);

				var segments = $func.stations.matchLink(station);
				if (segments == null) return 'u wot m8';

				segments[0] = 'http://priyom.org/' + segments[0] + '-stations';

				// Handle irregular page names
				var page = website.irregular[station];
				if (page) segments[segments.length - 1] = page;

				// Extra sub-pages
				if (append) segments = segments.concat(append);
				if (logs) {
					var today = new Date();
					segments.push(today.getFullYear());
					if (website.logs.monthly.indexOf(station) > -1) segments.push(website.logs.month[today.getMonth()]);
				}

				return segments.join('/');
			}
		},
		util: {
			comparable: function( target ) {
				if (target == null) target = '';
				return target.replace(/[ _-]/g, '').toLowerCase();
			},
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
					var min, max;
					switch (result[2]) {
						case undefined:
							// Single frequency: loosen match to +/- 2 kHz range
							min = Number(result[1]) - 2;
							max = Number(result[1]) + 2;
							break;
						case '':
							// Lower bound only
							min = Number(result[1]);
							max = NaN;
							break;
						default:
							// Range
							min = Number(result[1]);
							max = Number(result[2]);
							break;
					}

					filter = new $func.filter.Band(min, max);

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
				} else if (arg[0] == '>') {
					filter = new $func.filter.Target(arg.slice(1));
				} else if (arg[0] == '+') {
					// TODO: more sophisticated duration parsing
					// For now always assume minutes
					var delay = Number(arg.slice(1)) * 60000;
					filter = new $func.filter.After((new Date()).getTime() + delay);
				} else if (arg.toLowerCase() == 'search') {
					filter = new $func.filter.Search();
				} else {
					var regex = stations.regex.type[arg];
					if (! regex) regex = stations.regex.family[arg];
					if (! regex) regex = stations.regex.family[arg.toUpperCase()];
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

				var events = $data.events.getNext(filters);
				// Only if no event found, give a chance to static transmissions
				if (events == null) events = $func.stations.search(filters);
				if (events == null) return null;

				return $func.events.print(events);
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
					'!stream': 'http://streams.printf.cc:8000/buzzer.ogg',
					'!why': 'The Buzzer is not audible at this time of the day due to HF propagation characteristics. Try again later in the local evening.',
					'!rivet': 'http://www.signalshed.com/rivet/',
					'!help': 'Available commands: !n | !n [freq|freq-|freq1-freq2|station|E|G|S|V|M|F|XP|HM|SVR|GRU|DGI|poland|ukraine|>target|+minutes] (negation supported) | !link station | !utc',
					'!fake': 'Fake messages are messages on some E06, G06, and M14 schedules that are believed to contain no real content whatsoever due to long-period repeats (months, years) and non-random groups: http://priyom.org/number-stations/operators/russian-6/fake-traffic-network'
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
					case '!N':
						// Dummy-proof this
						if (message.trim() == '!n - next station')
							args = [];

						var next = $func.irc.next(args);
						if (next) $client.say(replyTo, next);
						else $client.say(replyTo, 'No scheduled matching station found within available events.');
						break;

					case '!logs':
					case '!log':
						var logs = true; // Yes this gives valid javascript, cf. variable scoping/hoisting
					case '!link':
					case '!l':
					case '!L':
						$client.say(replyTo, $func.stations.link(args[0] ? args[0] : 'ns', args.slice(1), logs));
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
					case '!gmt':
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
		$func.stations.init();
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
