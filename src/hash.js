"use strict";

var Long                        =   require('Long');
var Game                        =   require('../src/game.js').Game;

class Hash {

    /**
     * Create 64 bit hash value - stored in two 32 bit variables.
     * @param  {number} low  lower 32 bits
     * @param  {number} high higher 32 bits
     */
    constructor (low, high) {
        this.Counts             =   {
            "TURNS"                 :   2,
            "PIECE_COLOR_SQUARE"    :   6 * 2 * 64 * 2,
            "CASTLE_PERM"           :   16 * 2,
            "ENPASSANT_FILE"        :   8 * 2
        };

        this.Positions          =   {
            "TURNS"                 :   0,
            "PIECE_COLOR_SQUARE"    :   this.Counts.TURNS,
            "CASTLE_PERM"           :   this.Counts.TURNS + this.Counts.PIECE_COLOR_SQUARE,
            "ENPASSANT_FILE"        :   this.Counts.TURNS + this.Counts.PIECE_COLOR_SQUARE + this.Counts.CASTLE_PERM
        };

        this.RANDOM_VALUES      =   this.setRandomValues(this.Positions.ENPASSANT_FILE + this.Counts.ENPASSANT_FILE);

        this.val                =   new Long(low, high, true);
    }


    /**
     * creates nValues random numbers in an array (32 bit)
     * @param {number} nValues number of random no.s to generate
     */
    setRandomValues (nValues) {
        var randArray           =   [];
        for (var _i = 0; _i < nValues; _i++) {
            randArray.push( (1 + ( Math.random() * 0xFFFFFFFF )) >>> 0 );
        }
        return randArray;
    }

    /**
     * @return {!Hash} duplicate Hash instance of current
     */
    duplicate () {
        return new Hash(this.val.low, this.val.high);
    }


    /**
     * get 32 bit hash key for storage
     * @return {number} 32 bit key
     */
    getHashKey () {
        return (this.val.low ^ this.val.high);
    }


    /**
     * Check if two hashkeys are equal
     * @param  {!Hash} anotherHashKey for comparing
     * @return {boolean} true if both hashkeys same
     */
    equals (anotherHashKey) {
        return (this.val.equals(anotherHashKey.val));
    }


    /**
     * @param  {number} position
     * @return {!Hash} current hash instance
     */
    update (position) {
        this.val.low            =   (this.val.low ^ this.RANDOM_VALUES[position]) >>> 0;
        this.val.high           =   (this.val.high ^ this.RANDOM_VALUES[position + 1]) >>> 0;
        return this;
    }


    /**
     * @return {!Hash} current hash instance
     */
    updateTurn () {
        return this.update(this.Positions.TURN);
    }


    /**
     * Update hash key with current piece, color, square 0-63
     * @param  {!Game.Piece} piece       [description]
     * @param  {!Game.PieceColor} color       [description]
     * @param  {number} squareIndex 0-63
     * @return {!Hash} current hash instance
     */
    updatePieceColorSquare (piece, color, squareIndex) {
        return this.update(this.Positions.PIECE_COLOR_SQUARE + piece + (color * 6) + (squareIndex * 6 * 2) )
    }



    updatePieceColorBitboard (piece, color, bitboard) {
        var bitboard            =   bitboard.duplicate();
        while (!bitboard.isEmpty()) {
            this.updatePieceColorSquare(piece, color, bitboard.extractLowestBitPosition());
        }
    }

    updateCastlePerm (castlePerm) {
        return this.update(this.Positions.CASTLE_PERM + castlePerm);
    }

    updateEnPassantFile (enPassantFile) {
        return this.update(this.Positions.ENPASSANT_FILE + enPassantFile);
    }

    updateEnPassantSquare (enPassantSquare) {
        if (enPassantSquare >= 0) {
            return this.updateEnPassantFile(Game.getFileFromIndex(enPassantSquare));
        }
        return this;
    }

}


exports.Hash                    =   Hash;