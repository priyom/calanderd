
// Please make sure to contact the operator of a small WebSDR before
// adding it here, and keep in mind load and bandwidth constraints.

var websdrs = module.exports = [

	{ // utwente, Netherlands
		//url: 'http://websdr.ewi.utwente.nl:8901/?tune=',
		url: 'http://t.svita.cz/', // URL shortener
		target: null,
		min: 0,
		max: 29160,
	},
	{ // argonn's, Poland
		url: 'http://websdr.printf.cc:8901/?tune=',
		target: 'Eastern Europe',
		min: 0,
		max: 8048,
	},
];
