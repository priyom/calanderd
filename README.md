calanderd
=========

Calander daemon (c). This will get all the upcoming Google Calander events and spam them into IRC as time comes.


This uses https://github.com/martynsmith/node-irc (so npm install irc).

Purpose
----
At #priyom (http://priyom.org) we needed a real-time way to announce upcoming foreign intelligence shortwave broadcasts.

This solves the problem by grabbing our Google Calendar and announcing each transmission with the use of repeated setTimeouts and the node IRC client library. On demand commands are also implemented.

It could be modified to serve multiple uses, you could it as a base for your simple irc bot, etc.
Patches are accepted as long it follows the core purpose of this bot, the Calendar announcements.

---
name invented by Web_weasel
