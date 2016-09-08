
// Please make sure to contact the operator of a small WebSDR before
// adding it here, and keep in mind load and bandwidth constraints.

var websdrs = module.exports = [

	{ // utwente, Netherlands
		//url: 'http://websdr.ewi.utwente.nl:8901/?tune=',
		url: 'http://t.svita.cz/', // URL shortener
		target: null,
		min: 0,
		max: 29160,
		fixCW: true,
	},
	{ // argonn's, Poland
		url: 'http://websdr.printf.cc:8901/?tune=',
		target: 'Eastern Europe',
		min: 0,
		max: 8048,
		fixCW: true,
	},
	{ // KD4HSO's KiwiSDR, Kansas, USA
		url: 'http://64.136.200.36:8073/?f=',
		target: 'North America',
		min: 0,
		max: 30000,
	},
	{ // VK5FO's KiwiSDR, South Australia
		url: 'http://kiwisdr.vk5fo.com:8073/?f=',
		target: 'Pacific',
		min: 0,
		max: 30000,
	},
];
