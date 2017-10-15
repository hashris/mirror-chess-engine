"use strict";

var Long                    =   require("Long");

class BitBoard {

    constructor (low, high) {
        this.val            =   new Long(low, high, true);
    }

    getBinary () {
        return (pad(this.val.toString(2), 64));
    }

    printChessBoardInConsole () {
        var spacesBetween   =   1,
            fullLong        =   pad(this.val.toString(2), 64);

        for (var _i = 0; _i < 8; _i++) {
            var rowString   =   fullLong.slice( (_i * 8 * spacesBetween), (( (_i+1) * 8 * spacesBetween)) ),
                reversedRow =   rowString.split("").reverse().join("");
                reversedRow =   reversedRow.split("").join(" ");
            console.log(reversedRow);
        }
    }

    isEmpty () {
        return (this.val.isZero());
    }

    bitIsReset (index) {
        index >>>= 0;
        if (index < 32) {
            return !(this.val.low & (1 << index) );
        }
        else if (index >= 32 && index <64) {
            return !( this.val.high & (1 << (index - 32)) );
        }
    }

    bitIsSet (index) {
        index >>>= 0;
        return !this.bitIsReset(index);
    }

    setBit (index) {
        index >>>= 0;
        if (index < 32) {
            this.val.low    =   (this.val.low | (1 << index)) >>> 0;
        }
        else if (index >= 32 && index <64) {
            this.val.high   =   (this.val.high | (1 << (index - 32))) >>> 0;
        }
        return this;
    }

    resetBit (index) {
        index >>>= 0;

        if (index < 32) {
            this.val.low    =   (this.val.low & ~(1 << index)) >>> 0;
        }
        else if (index >= 32 && index <64) {
            this.val.high   =   (this.val.high & ~(1 << (index - 32))) >>> 0;
        }
        return this;
    }


    and (anotherBitBoard) {
        this.val.low        =   (this.val.low & anotherBitBoard.val.low) >>> 0;
        this.val.high       =   (this.val.high & anotherBitBoard.val.high) >>> 0;
        return this;
    }

    andNot (anotherBitBoard) {
        this.val.low        =   (this.val.low & ~anotherBitBoard.val.low) >>> 0;
        this.val.high       =   (this.val.high & ~anotherBitBoard.val.high) >>> 0;
        return this;
    }

    or (anotherBitBoard) {
        this.val.low        =   (this.val.low | anotherBitBoard.val.low) >>> 0;
        this.val.high       =   (this.val.high | anotherBitBoard.val.high) >>> 0;
        return this;
    }

    xor (anotherBitBoard) {
        this.val.low        =   (this.val.low ^ anotherBitBoard.val.low) >>> 0;
        this.val.high       =   (this.val.high ^ anotherBitBoard.val.high) >>> 0;
        return this;
    }

    not () {
        this.val.low        =   ~(this.val.low) >>> 0;
        this.val.high       =   ~(this.val.high) >>> 0;
        return this;
    }

    equals (anotherBitBoard) {
        return ( this.val.equals(anotherBitBoard.val) );
    }

    duplicate () {
        return new BitBoard(this.val.low, this.val.high);
    }

    resetAllBits () {
        this.val            =   new Long(0, 0, true);
        return this;
    }

    shiftLeft (nBits) {
        nBits >>>= 0;
        if (nBits >= 0 && nBits < 64) {
            this.val        =   this.val.shiftLeft(nBits);
            return this;
        }
    }

    shiftRight (nBits) {
        nBits >>>= 0;
        if (nBits >= 0 && nBits < 64) {
            if (nBits > 31) {
                this.val.low    =   this.val.high >>> (nBits - 32);
                this.val.high   =   0 >>> 0;
            }
            else if (nBits > 0) {
                this.val.low    =   (this.val.low >>> nBits) | (this.val.high << (32 - nBits)) >>> 0;
                this.val.high   >>>=    nBits;
            }
            return this;
        }
    }

    shift (v) {
        if (v > 63 || v < -63) {
            this.val.low = this.val.high = 0 >>> 0;
        } else if (v > 0) {
            this.shiftLeft(v);
        } else if (v < 0) {
            this.shiftRight(-v);
        }

        return this;
    };

    popcnt32 (v) {
        v >>>= 0;
        v                          -=  (v >>> 1) & 0x55555555;
        v                           =   (v & 0x33333333) + ((v >>> 2) & 0x33333333);
        return ((v + (v >>> 4) & 0xF0F0F0F) * 0x1010101) >>> 24;
    }

    popLowestBit32 (v) {
        v >>>= 0;
        return (v & (v - 1)) >>> 0;
    }

    getLowestBitPosition32 (v) {
        v >>>= 0;
        return this.popcnt32((v & -v) - 1);
    }

    popcnt () {
        return ( this.popcnt32(this.val.low) + this.popcnt32(this.val.high) );
    }

    popLowestBit () {
        if (this.val.low) {
            this.val.low            =   this.popLowestBit32(this.val.low);
        } else {
            this.val.high           =   this.popLowestBit32(this.val.high);
        }
        return this;
    }

    getLowestBitPosition () {
        if (this.val.low) {
            return this.getLowestBitPosition32(this.val.low);
        }
        return ( 32 + this.getLowestBitPosition32(this.val.high) );
    }

    extractLowestBitPosition () {
        var index                   =   this.getLowestBitPosition();
        this.popLowestBit();
        return index;
    }

    static createBoard (low, high) {
        return new BitBoard(low, high);
    }

    static createZeroBoard () {
        return new BitBoard(0, 0);
    }

    static createOneBoard () {
        return new BitBoard(0xFFFFFFFF, 0xFFFFFFFF);
    }

    static createLightSquareBoard () {
        return new BitBoard(0x55AA55AA, 0x55AA55AA);
    }

    static createDarkSquareBoard () {
        return new BitBoard(0xAA55AA55, 0xAA55AA55);
    }

    static createFileBoard (file) {
        if (file >= 0 && file < 8) {
            return (this.createBoard(0x01010101, 0x01010101).shiftLeft(file));
        }
    }

    /**
     * @return {Array} [List of 8 bitboards, for files 0 to 7]
     */
    static createEachFileBoard () {
        var fileArray           =   [];
        for (var i = 0; i < 8; ++i) {
            fileArray.push(this.createFileBoard(i));
        }
        return fileArray;
    }

    static createRankBoard (rank) {
        if (rank >= 0 && rank < 8) {
            var b               =   new BitBoard(0xFF, 0);
            b.shiftLeft(rank * 8);
            return b;
        }
    }

    /**
     * @return {Array} [List of 8 bitboards, for ranks 0 to 7]
     */
    static createEachRankBoard () {
        var rankArray           =   [];
        for (var i = 0; i < 8; ++i) {
            rankArray.push(this.createRankBoard(i));
        }
        return rankArray;
    }

    static createIndexBoard (index) {
        if (index >= 0 && index < 64) {
            var b                   =   this.createZeroBoard();
            b.setBit(index);
            return b;
        }
    }

    static createKnightMovementBoard (squareIndex) {
        var bitboard                =   this.createZeroBoard().setBit(squareIndex);
        var l1                      =   bitboard.duplicate().shiftRight(1).andNot(this.createFileBoard(7));
        var l2                      =   bitboard.duplicate().shiftRight(2).andNot(this.createFileBoard(7)).andNot(this.createFileBoard(6));
        var r1                      =   bitboard.duplicate().shiftLeft(1).andNot(this.createFileBoard(0));
        var r2                      =   bitboard.duplicate().shiftLeft(2).andNot(this.createFileBoard(0)).andNot(this.createFileBoard(1));
        var v1                      =   l2.or(r2);
        var v2                      =   l1.or(r1);

        return v1.duplicate().shiftLeft(8).or(v1.shiftRight(8)).or(v2.duplicate().shiftLeft(16)).or(v2.shiftRight(16));
    }

    static createEachKnightMovementBoard () {
        var b                       =   [];
        for (var i = 0; i < 64; ++i) {
            b.push(this.createKnightMovementBoard(i));
        }
        return b;
    }

    static createDiagonalBoard (diagonal) {
        return ( this.createBoard(0x10204080, 0x001020408).and( this.createOneBoard().shift(diagonal * 8) ).shift(diagonal) );
    }

    static createEachDiagonalBoard () {
        var b                       =   [];
        for (var i = -7; i <= 7; ++i) {
            b.push(this.createDiagonalBoard(i));
        }
        return b;
    }

    static createAntiDiagonalBoard (antidiagonal) {
        return ( this.createBoard(0x08040201, 0x80402010).and( this.createOneBoard().shift(-antidiagonal * 8) ).shift(antidiagonal) );
    }

    static createEachAntiDiagonalBoard () {
        var b                       =   [];
        for (var i = -7; i <= 7; ++i) {
            b.push(this.createAntiDiagonalBoard(i));
        }
        return b;
    }

    static createKingMovementBoard (squareIndex) {
        var bitboard                =   this.createZeroBoard().setBit(squareIndex);
        var c                       =   bitboard.duplicate().shiftRight(1).andNot(this.FILES[7]).or(bitboard.duplicate().shiftLeft(1).andNot(this.FILES[0]));
        var u                       =   bitboard.duplicate().or(c).shiftRight(8);
        var d                       =   bitboard.duplicate().or(c).shiftLeft(8);
        return c.or(u).or(d);
    }

    static createEachKingMovementBoard () {
        var b                       =   [];
        for (var i = 0; i < 64; ++i) {
            b.push(this.createKingMovementBoard(i));
        }
        return b;
    }

}

function pad (n, width, z) {
    z   =   z || '0';
    n   =   n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

BitBoard.ZERO                       =   BitBoard.createZeroBoard();
BitBoard.ONE                        =   BitBoard.createOneBoard();
BitBoard.LIGHT_SQUARES              =   BitBoard.createLightSquareBoard();
BitBoard.DARK_SQUARES               =   BitBoard.createDarkSquareBoard();
BitBoard.FILES                      =   BitBoard.createEachFileBoard();
BitBoard.RANKS                      =   BitBoard.createEachRankBoard();
BitBoard.DIAGONALS                  =   BitBoard.createEachDiagonalBoard();
BitBoard.ANTIDIAGONALS              =   BitBoard.createEachAntiDiagonalBoard();
BitBoard.KNIGHT_MOVEMENTS           =   BitBoard.createEachKnightMovementBoard();
BitBoard.KING_MOVEMENTS             =   BitBoard.createEachKingMovementBoard();

exports.BitBoard = BitBoard;
