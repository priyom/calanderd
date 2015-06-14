// calanderd 0.2
// GNU GPL 3+
// Written for #priyom on freenode (priyom.org) by Tomáš Hetmer.
// With epicness by Your Man Dzen.

var config = require('./config');
var irc = require('irc');
var moment = require('moment');
var colors;
if (config.color) {
    colors = require('irc-colors');
}

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

function padString(input, char, len){
        if(input.length>len)return input;
        input=(new Array(len+1).join(char))+input;
        return input.substr(input.length-len,input.length);
}

var timestamp = function(){
        var d = new Date();
		return "("+padString(d.getUTCHours(),"0",2)+":"+padString(d.getUTCMinutes(),"0",2)+":"+padString(d.getUTCSeconds(),"0",2)+") | ";
};


client.connect(5, function (input) {
    console.log(timestamp()+"[i] calanderd on server");

    client.join(config.room, function (input) {
        hasRoom = true;

        console.log(timestamp()+'[i] room connection is ready');

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
        station = 'pol-fsk';
        break;
    case '200/1000':
        station = 'fsk-2001000';
        break;
    case '200/500':
        station = 'fsk-200500';
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
    case 'monolith':
        return milBase + 'russia/monolyth-messages-description';
    case 'alphabet':
        return milBase + 'russia/russian-phonetic-alphabet-and-numbers';
    case 'hfgcs':
        return milBase + 'united-states/' + station;
    case 'x06':
    case 'x06a':
    case 'x06b':
    case 'x06c':
        return diploBase + 'russia/' + station;
    case 'fsk-2001000':
    case 'fsk-200500':
    case 'dp01': // fo, e!
    case 'hm01':
    case 'xpa':
    case 'xpa2':
    case 'sk01':
    case 'xp':
    case 'pol-fsk':
        return numberBase + 'digital/' + station;
    case 'sked':
        return numberBase + 'station-schedule';
    }

    // the rest should be ok to do this way
    var languages = {
        'e': 'english',
        'g': 'german',
        's': 'slavic',
        'v': 'other',
        'm': 'morse',
    };
    var language = languages[station[0]];
    if (language) {
        return numberBase + language + '/' + station;
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
            console.log(timestamp()+'[i] received next command from ' + from);
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
            
            console.log(timestamp()+'[i] restarting');
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
    console.log(timestamp()+'[!] error: ', message);
});

function main() {
    console.log(timestamp()+'[i] Asking Google for data');

    var calanderUrl = "https://www.googleapis.com/calendar/v3/calendars/" + config.calendarId + "@group.calendar.google.com/events?orderBy=startTime&singleEvents=true&timeMin=" + new Date().toISOString() +
        "&fields=items(start%2Csummary)%2Csummary&key=" + config.apiKey + "&maxResults=" + config.maxResults;

    var https = require('https');

    https.get(calanderUrl, function (res) {
        console.log(timestamp()+"[i] got statusCode: ", res.statusCode);

        var data = '';

        res.on('data', function(chunk) {
            data += chunk;
        });

        res.on('end', function () {
            var obj = JSON.parse(data);
            onHttpReturn(obj);
        });

    }).on('error', function (e) {
        console.log(timestamp()+"[!] " + e.message);
        // it shouldn't cycle :>
        // yeah i know, it's stupid
        // why not fix it for me?
        main();
    });
}

function onHttpReturn(obj) {
    hasEvents = true;

    console.log(timestamp()+"[i] Number of events found: " + obj.items.length);
    console.log(timestamp()+"[i] Time of first event: " + obj.items[0].start.dateTime);

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
    console.log(timestamp()+'[i] both actions succeeded, starting main system');
    schedAnnounce = setTimeout(nextAnnouncement, 1);
}

function nextAnnouncement() {
    var next = getNextEvent(false);

    if (next === -1) {
        console.log(timestamp()+'[i] restarting');
        hasEvents = false;
        events = [];
        clearTimeout(schedNext);
        clearTimeout(schedAnnounce);
        main();
        return false;
    }

    var time = next.getTime() - (new Date()).getTime();
    schedNext = setTimeout(cmdNext, time - config.announceEarly);

    console.log(timestamp()+'[i] scheduler event cmdNext added for ' + next.toISOString());
}

function cmdNext(recursion) {
    recursion = typeof recursion !== 'undefined' ? recursion : true;
    var next = getNextEvent();

    if (next === -1) {
        console.log(timestamp()+'[i] restarting');
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

        console.log(timestamp()+'[i] scheduler event nextAnnouncement added for ' + next.toISOString());
    }
}

function extractFrequency(textToMatch) {
    var exp = new RegExp(/(\d+) ?kHz/i);
    var expResult = exp.exec(textToMatch);

    if (expResult !== null) {
      return expResult[1];
    }
}

var stationDigital = [ "FSK 200/500", "FSK 200/1000", "XPA", "XPA2", "POL FSK", "HM01" ];
var morseExp = new RegExp(/^M\d+[a-z]?$/);
var voiceExp = new RegExp(/^[EGSV]\d+[a-z]?$/);

function formatStation(match, name, rest) {
    if (! config.color) {
        return match;
    }

    var cname;

    if (stationDigital.indexOf(name) > 0)
        cname = colors.red(name);
    else if (morseExp.test(name))
        cname = colors.cyan(name);
    else if (voiceExp.test(name))
        cname = colors.green(name);
    else
        cname = colors.brown(name);

    return (cname + " " + rest);
}

function formatSearch(match, search) {
    return config.color ? (" " + colors.yellow(search) + " ") : match;
}

function formatFrequency(freq) {
    return config.color ? colors.olive(freq) : freq;
}

function formatEvent(title) {
    if (! config.color) {
        return title;
    }

    title = title.replace(/^([\w /]+?) (\d+ ?kHz|Search)/i, formatStation);
    title = title.replace(/ (Search) /i, formatSearch);
    title = title.replace(/\d+ ?[kK][hH][zZ]( [A-Z][A-Z/]+)?/g, formatFrequency);
    return title;
}

// Based on original events code written by foo (UTwente-Usability/events.js)
function getNextEvent(humanReadable) {
    humanReadable = typeof humanReadable !== 'undefined' ? humanReadable : true;

     var eventToCheck = events[0];
     while (eventToCheck != null && eventToCheck.eventDate < new Date()) {
        events.shift();
        eventToCheck = events[0];
     }

    if (events.length < 3) {
        return -1;
    }

    if (! humanReadable) {
        // here we assume that only date parsing is needed
        return events[0].eventDate;
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

    if (nextEvents.length == 0) {
        return "";
    }

    var first = moment(nextEvents[0].eventDate);
    var h = first.utc().format('H:mm');
    var header = (config.color ? colors.bold(h) : h) + " " + first.fromNow() + " ";
    var e = [];

    for (var eventId = 0; eventId < nextEvents.length; eventId++) {

        var returnVal = formatEvent(nextEvents[eventId].title);

        if (typeof nextEvents[eventId].frequency !== 'undefined' && nextEvents[eventId].frequency.length > 3) {
            returnVal += " http://freq.ml/" + nextEvents[eventId].frequency;
        }

        e.push(returnVal);
    }

    return (header + e.join(" • "));
}

main();
