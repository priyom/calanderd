
// Configuration of linked WebSDRs
// Licensed under GPLv3+

// Please make sure to contact the operator of a small WebSDR before
// adding it here, and keep in mind load and bandwidth constraints.

var websdrs = [

	{ // utwente, Netherlands
		url: 'http://websdr.ewi.utwente.nl:8901/?tune=',
		target: null,
		min: 0,
		max: 29160,
		fixCW: false,
	},
	{ // argonn's, Poland
		url: 'http://websdr.printf.cc:8901/?tune=',
		target: 'Eastern Europe',
		min: 0,
		max: 8048,
		fixCW: true,
	},
	{ // Pavlova KiwiSDR dispatcher, North America
		url: 'http://s.printf.cc/#n/',
		target: 'North America',
		min: 0,
		max: 30000,
	},
	{ // Pavlova KiwiSDR dispatcher, Pacific
		url: 'http://s.printf.cc/#p/',
		target: 'Pacific',
		min: 0,
		max: 30000,
	},
	{ // Pavlova KiwiSDR dispatcher, Asia
		url: 'http://s.printf.cc/#a/',
		target: 'East Asia',
		min: 0,
		max: 30000,
	},
	{ // Pavlova KiwiSDR dispatcher, Mediterranean / Middle East
		url: 'http://s.printf.cc/#m/',
		target: 'Middle East',
		min: 0,
		max: 30000,
	},
];

if (typeof module != "undefined" && module) module.exports = websdrs;
