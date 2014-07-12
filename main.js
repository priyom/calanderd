// calanderd 0.1
// GNU GPL 3+
// Written for #priyom on freenode (priyom.org) by Tomáš Hetmer.

var config = require('./config');
var irc = require('irc');
var moment = require('moment');

var hasRoom = false;
var hasEvents = false;
var events = [];

var schedNext;
var schedAnnounce;

var client = new irc.Client(config.server, config.botName, {
    userName: config.userName,
    realName: config.realName,
    port: config.port,
    password: config.password,
    sasl: true,
    showErrors: true,
    autoConnect: false,
    retryDelay: 4000,
    retryCount: 1000,
    secure: config.tls,
});

client.connect(5, function (input) {
    console.log("[i] calanderd on server");

    client.join(config.room, function (input) {
        hasRoom = true;

        console.log('[i] room connection is ready');

        setInterval(function () {
            client.send('PONG', 'empty');
        }, 2 * 60 * 1000);

        if (hasRoom && hasEvents) {
            onReady();
        }
    });

});

client.addListener('message' + config.room, function (from, to, message) {
    
    // console.log(from + ": " + message.args[1]);

	switch(message.args[1]) {
	    case '!next':
	        console.log('[i] received next command from ' + from);
	        cmdNext(false);
	        break;
	    case '!stream':			
	        client.say(config.room, 'To listen to the Buzzer/UZB-76 stream, click here http://priyom.hetmer.cz:8000/buzzer.ogg.m3u');
		break;
	    case '!help':
	        client.say(config.room, 'Available commands: !listen !escuchar !next !stream !faq !primer !dossier !schedule !signals !propagation !eam !hfgcs !ndb !oth');
	        break;
	    case '!faq':
	        client.say(config.room, 'You can find our Buzzer FAQ here: http://priyom.org/number-stations/slavic/s28/faq.aspx - don\'t forget to also check out !dossier');
	        break;
	    case '!primer':
	        client.say(config.room, 'You can find our introductory buzzer tutorial here: http://www.priyom.org/media/57653/the_buzzer_primer.pdf');
	        break;
	    case '!dossier':
	        client.say(config.room, 'You can find our Pip dossier here: http://priyom.org/media/56944/the_pip_dossier.pdf');
	        break;
	    case '!propagation':
	        client.say(config.room, 'You can learn about shortwave propagation here: http://short-wave.info/index.php?feature=propagation');
	        break;
	    case '!schedule':
	        client.say(config.room, 'Number station schedule: http://priyom.org/number-stations/number-station-schedule.aspx');
	        break;
	    case '!eam':
	        client.say(config.room, 'You can learn more about EAM here: http://en.wikipedia.org/wiki/Emergency_Action_Message');
	        break;
	    case '!hfgcs':
	        client.say(config.room, 'You can learn more about HF-GCS here: http://en.wikipedia.org/wiki/High_Frequency_Global_Communications_System');
	        break;
	    case '!ndb':
	        client.say(config.room, 'You can learn more about NDBs here: http://en.wikipedia.org/wiki/Non_Directional_Beaconh');
	        break;
	    case '!oth':
	        client.say(config.room, 'You can learn more about OTH radars here: http://en.wikipedia.org/wiki/Over-the-horizon_radar');
	        break;
	    case '!escuchar':
	        client.say(config.room, 'Para escuchar el Buzzer/UVB-76 tienes que abrir el enlace http://websdr.ewi.utwente.nl:8901/ y introducir la frecuencia de 4625 kHz');
	        break;
	    case '!listen':
	        client.say(config.room, 'To listen to the Buzzer/UVB-76 open the URL http://websdr.ewi.utwente.nl:8901/ and enter the 4625 kHz frequency');
	        break;
	    case '!signals':
	        client.say(config.room, 'Radio signal identification guide: http://www.rtl-sdr.com/signal-identification-guide/');
	        break;
	    default:
	        break;
	}

});

client.addListener('pm', function (from, to, message) {
    if (message.args[1] === '!next'){
        console.log('[i] received private next command from ' + from);
        cmdNext(false, from);
    }
});

client.addListener('error', function (message) {
    console.log('[!] error: ', message);
});

function main() {
    console.log('[i] Asking Google for data');

    var calanderUrl = "https://www.googleapis.com/calendar/v3/calendars/" + config.calendarId + "@group.calendar.google.com/events?orderBy=startTime&singleEvents=true&timeMin=" + new Date().toISOString() +
        "&fields=items(start%2Csummary)%2Csummary&key=" + config.apiKey + "&maxResults=" + config.maxResults;

    var https = require('https');

    https.get(calanderUrl, function (res) {
        console.log("[i] got statusCode: ", res.statusCode);

        res.on('data', function (d) {
            var obj = JSON.parse(d);
            onHttpReturn(obj);
        });

    }).on('error', function (e) {
        console.log("[!] " + e.message);
        // it shouldn't cycle :>
        // yeah i know, it's stupid
        // why not fix it for me?
        main();
    });
}

function onHttpReturn(obj) {
    hasEvents = true;

    console.log("[i] Number of events found: " + obj.items.length);
    console.log("[i] Time of first event: " + obj.items[0].start.dateTime);

    for (var i = 0; i < obj.items.length; i++) {
        var title = obj.items[i].summary;
        var time = obj.items[i].start.dateTime;
        var eventDate = new Date(time);
        var frequency = extractFrequency(title);
        var theEvent = {
            "eventDate": eventDate,
            "title": title,
            "frequency": frequency
        };
        events.push(theEvent);
    }

    if (hasRoom && hasEvents) {
        onReady();
    }
}


function onReady() {
    console.log('[i] both actions succeeded, starting main system');
    schedAnnounce = setTimeout(nextAnnouncement, 1);
}

function nextAnnouncement() {
    var next = getNextEvent(false);

    if (next === -1) {
        console.log('[i] restarting');
        hasEvents = false;
        events = [];
        clearTimeout(schedNext);
        clearTimeout(schedAnnounce);
        main();
        return false;
    }

    var time = next.getTime() - (new Date()).getTime();
    schedNext = setTimeout(cmdNext, time - config.announceEarly);

    console.log('[i] scheduler event cmdNext added for ' + next.toISOString());
}

function cmdNext(recursion, to) {
    recursion = typeof recursion !== 'undefined' ? recursion : true;
    to = typeof to !== 'undefined' ? to : false;

    var next = getNextEvent();

    if (next === -1) {
        console.log('[i] restarting');
        hasEvents = false;
        events = [];
        clearTimeout(schedNext);
        clearTimeout(schedAnnounce);
        main();
        return false;
    }

    if (to !== false) {
        client.say(to, next);
    } else {
        client.say(config.room, next);
    }

    if (recursion) {
        var next = getNextEvent(false);
        var time = next.getTime() - (new Date()).getTime();
        schedAnnounce = setTimeout(nextAnnouncement, time + 1 * 60000);

        console.log('[i] scheduler event nextAnnouncement added for ' + next.toISOString());
    }
}

function extractFrequency(textToMatch) {
    var digitsRe = '([0-9]*k|[0-9]* k)';
    var exp = new RegExp(digitsRe);
    var expResult = exp.exec(textToMatch);

    if (expResult !== null) {
      expResult = expResult[0].substring(0, expResult[0].length - 1);
      return expResult;
    }
}

// Based on original events code written by foo (UTwente-Usability/events.js)
function getNextEvent(humanReadable) {
    humanReadable = typeof humanReadable !== 'undefined' ? humanReadable : true;

     var eventToCheck = events[0];
     while (eventToCheck != null && eventToCheck.eventDate < new Date()) {
        events.shift();
        eventToCheck = events[0];
     }

    var nextEvents = [];
    var prevEvent;

    for (i = 0; i < events.length; i++) {
        var thisEvent = events[i];
        if (prevEvent == null) {
            prevEvent = thisEvent;
            nextEvents.push(prevEvent);
            continue;
        }

        if (prevEvent.eventDate.toISOString() == thisEvent.eventDate.toISOString()) {
            nextEvents.push(thisEvent);
        } else {
            break;
        }
    }

    if (events.length < 3) {
        return -1;
    }

    var returnVal = "";

    if (humanReadable) {
        for (var eventId = 0; eventId < nextEvents.length; eventId++) {

            if (eventId > 0) {
                returnVal += " • ";
            }

            var next = moment(nextEvents[eventId].eventDate);

            if (eventId == 0) {
                returnVal += next.utc().format('H:mm') + " " + next.fromNow() + " ";
            }

            returnVal += nextEvents[eventId].title;

            if (typeof nextEvents[eventId].frequency !== 'undefined' && nextEvents[eventId].frequency.length > 3) {
                returnVal += " http://" + nextEvents[eventId].frequency + ".t.hetmer.cz";
            }
        }
    } else {
        // here we assume that only date parsing is needed
        returnVal = nextEvents[0].eventDate;
    }

    return returnVal;
}

main();
