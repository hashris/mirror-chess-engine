var BitBoard 	= 	require('./src/bitboard.js').BitBoard;
var Game		=	require('./src/game.js').Game;
var Hash		=	require('./src/hash.js').Hash;
var Move        =   require('./src/move.js').Move;
var Position	=	require('./src/position.js').Position;
var AI          =   require('./src/ai.js').AI;

var express		=	require("express");
var app			=	express();
var fs			=	require("fs");

app.use(express.static(__dirname + '/public'));

// var ai = new AI();
// var p = new Position();
// var move;

// move = ai.search(p);
// p.makeMove(move);
// move = ai.search(p);
// p.makeMove(move);
// move = ai.search(p);
// p.makeMove(move);
// move = ai.search(p);
// p.makeMove(move);
// move = ai.search(p);
// p.makeMove(move);
// move = ai.search(p);
// p.makeMove(move);

// p.getOccupiedBitboard().printChessBoardInConsole();