
// Time formatting utilities
// Licensed under GPLv3+

var timeutils = {
	humanizeDuration: function (ms) {
		if (ms <= -129600000) return Math.floor((-ms + 43200000) / 86400000) + " days ago";
		else if (ms > -129600000 && ms <= -77400000) return "a day ago";
		else if (ms > -77400000 && ms <= -5400000) return Math.floor((-ms + 1800000) / 3600000) + " hours ago";
		else if (ms > -5400000 && ms <= -2670000) return "an hour ago";
		else if (ms > -2670000 && ms <= -90000) return Math.floor((-ms + 30000) / 60000) + " minutes ago";
		else if (ms > -90000 && ms <= -45000) return "a minute ago";
		else if (ms > -45000 && ms <= 0) return "a few seconds ago";
		else if (ms > 0 && ms <= 30000) return "in a few seconds";
		else if (ms > 30000 && ms <= 90000) return "in a minute";
		else if (ms > 90000 && ms <= 2670000) return "in " + Math.floor((ms + 30000) / 60000) + " minutes";
		else if (ms > 2670000 && ms < 5400000) return "in an hour";
		else if (ms >= 5400000 && ms < 77400000) return "in " + Math.floor((ms + 1800000) / 3600000) + " hours";
		else if (ms >= 77400000 && ms < 129600000) return "in a day";
		return "in " + Math.floor((ms + 43200000) / 86400000) + " days";
	},
	printf_02d: function (t) {
		t = String(Number(t));
		return t.length < 2 ? "0" + t : t;
	},
};

if (typeof module != "undefined" && module) module.exports = timeutils;
