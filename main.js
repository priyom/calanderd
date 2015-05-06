// calanderd 0.2
// GNU GPL 3+
// Written for #priyom on freenode (priyom.org) by Tomáš Hetmer.
// With epicness by Your Man Dzen.

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

function stationPageLink(station) {
    // avoid pissing people off, veryu
    station = station.toLowerCase();

    // yep mil/diplo/digi stuff is special
    switch (station) {
    case 'buzzer':
    case 's28':
        return 'http://priyom.org/military-stations/russia/the-buzzer';
    case 'pip':
    case 's30':
        return 'http://priyom.org/military-stations/russia/the-pip';
    case 'wheel':
    case 's32':
        return 'http://priyom.org/military-stations/russia/the-squeaky-wheel';
    case 's5292':
        return 'http://priyom.org/military-stations/russia/s5292';
    case 's4790':
        return 'http://priyom.org/military-stations/russia/s4790';
    case 's5426':
        return 'http://priyom.org/military-statinos/russia/s5426';
    case 'katok65':
    case 'katok-65':
        return 'http://priyom.org/military-stations/russia/katok-65';
    case 'plovets41':
    case 'plovets-41':
        return 'http://priyom.org/military-stations/russia/plovets-41';
    case 'm32':
        return 'http://priyom.org/military-stations/russia/m32';
    case 'monolith':
        return 'http://priyom.org/military-stations/russia/monolyth-messages-description';
    case 'alphabet':
        return 'http://priyom.org/military-stations/russia/russian-phonetic-alphabet-and-numbers';
    case 'hfgcs':
    case 'hf-gcs':
        return 'http://priyom.org/military-stations/united-states/hfgcs';
    case 'x06':
    case 'mazielka':
        return 'http://priyom.org/diplomatic-stations/russia/x06';
    case 'x06a':
        return 'http://priyom.org/diplomatic-stations/russia/x06a';
    case 'x06b':
        return 'http://priyom.org/diplomatic-stations/russia/x06b';
    case 'x06c':
        return 'http://priyom.org/diplomatic-stations/russia/x06c';
    case '200/1000':
        return 'http://priyom.org/number-stations/digital/fsk-2001000';
    case '200/500':
        return 'http://priyom.org/number-stations/digital/fsk-200500';
    case 'dp01': // fo, e!
        return 'http://priyom.org/number-stations/digital/dp01';
    case 'hm01':
        return 'http://priyom.org/number-stations/digital/hm01';
    case 'polfsk':
        return 'http://priyom.org/number-stations/digital/pol-fsk';
    case 'xpa':
        return 'http://priyom.org/number-stations/digital/xpa';
    case 'xpa2':
        return 'http://priyom.org/number-stations/digital/xpa2';
    case 'sk01':
        return 'http://priyom.org/number-stations/digital/sk01';
    case 'xp':
        return 'http://priyom.org/number-stations/digital/xp';
    case 'sked':
        return 'http://priyom.org/number-stations/station-schedule';
    }

    // the rest should be ok to do this way
    if (station.indexOf('e') === 0) {
        return 'http://priyom.org/number-stations/english/' + station;
    }
    if (station.indexOf('g') === 0) {
        return 'http://priyom.org/number-stations/german/' + station;
    }
    if (station.indexOf('s') === 0) {
        return 'http://priyom.org/number-stations/slavic/' + station;
    }
    if (station.indexOf('v') === 0) {
        return 'http://priyom.org/number-stations/other/' + station;
    }
    if (station.indexOf('m') === 0) {
        return 'http://priyom.org/number-stations/morse/' + station;
    }

    return 'u wot m8';
}

client.addListener('message' + config.room, function (from, to, message) {
    if(message.args[1].indexOf("!link ") === 0) {
       var re = / (.*)/;
       var match = re.exec(message.args[1]);
       client.say(config.room, stationPageLink(match[0].trim()));
       return true;
    }

    switch(message.args[1]) {
        case '!next':
        case '!n':
            console.log('[i] received next command from ' + from);
            cmdNext(false);
            break;
        case '!stream':         
            client.say(config.room, 'http://stream.priyom.org:8000/buzzer.ogg.m3u');
            break;
        case '!listen':
            client.say(config.room, 'http://websdr.ewi.utwente.nl:8901/');
            break;
        case '!reload':
            client.say(config.room, 'Reloading...');
            
            console.log('[i] restarting');
            events = [];
            break;
        case '!why':
            client.say(config.room, 'The Buzzer is not audible at this time of the day in the Netherlands due to HF propagation characteristics. Try again later in the local evening.');
            break;
        case '!link':
            client.say(config.room, 'http://priyom.org');
        default:
            break;
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

        var data = '';

        res.on('data', function(chunk) {
            data += chunk;
        });

        res.on('end', function () {
            var obj = JSON.parse(data);
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

function cmdNext(recursion) {
    recursion = typeof recursion !== 'undefined' ? recursion : true;
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
    
    client.say(config.room, next);

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
                returnVal += " http://t.svita.cz/" + nextEvents[eventId].frequency;
            }
        }
    } else {
        // here we assume that only date parsing is needed
        returnVal = nextEvents[0].eventDate;
    }

    return returnVal;
}

main();
