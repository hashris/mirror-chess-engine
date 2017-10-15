var BitBoard 	= 	require('../src/bitboard.js').BitBoard;
var Game		=	require('../src/game.js').Game;
var Hash		=	require('../src/hash.js').Hash;
var Position	=	require('../src/position.js').Position;
var expect		=	require('chai').expect;

describe("BitBoard Tests", function () {

	it("Create boards", function () {

		var b1	=	new BitBoard(0x00000000, 0x00000000);
		expect(b1.getBinary()).to.be.equal("0000000000000000000000000000000000000000000000000000000000000000");

		var b2	=	new BitBoard(0xFFFFFFFF, 0xFFFFFFFF);
		expect(b2.getBinary()).to.be.equal("1111111111111111111111111111111111111111111111111111111111111111");

	});

});