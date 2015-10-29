var __test = (function() {
	"use strict";

	var ivo = require(__dirname+'/../main.js');
	console.log('=====['+JSON.stringify(ivo)+']')
	var $ivo = ivo.__test;
	var func = $ivo.func;

	var expect = require('chai').expect;

	describe('ivo schwarz functions', function() {
		describe('# __dev.getEvents', function() {
			it('should return an array of six default objects', function() {
				expect(func.__dev.getEvents()).to.be.an('array').and.to.have.length(6);
			});
			it('should return an array containing six ob')
		});
	});
})();
