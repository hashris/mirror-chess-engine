"use strict";

const RANKS             =   8;
const FILES             =   8;
const FILE_CHARS        =   "abcdefgh";
const RANK_CHARS        =   "12345678";
const PIECE_NAMES       =   [ 'pawn', 'knight', 'bishop', 'rook', 'queen', 'king' ];
const PIECE_SHORT_NAMES =   ' NBRQK';
const PIECE_CHARS       =   '\u2659\u265F\u2658\u265E\u2657\u265D\u2656\u265C\u2655\u265B\u2654\u265A';
const Piece             =   {
    PAWN                :   0,
    KNIGHT              :   1,
    BISHOP              :   2,
    ROOK                :   3,
    QUEEN               :   4,
    KING                :   5
};
const PieceColor        =   {
    WHITE               :   0,
    BLACK               :   1
};



/**
 * Get rank of square with given index
 * @param  {number} index 0-63
 * @return {number} file 0-7
 */
function getRankFromIndex (squareIndex) {
    return squareIndex >>> 3;
}

/**
 * Get file of square with given index
 * @param  {number} index 0-63
 * @return {number} file 0-7
 */
function getFileFromIndex (squareIndex) {
    return squareIndex & 7;
}

/**
 * Check if rank or file is inside bitboard
 * @param  {rank} rank 0-7
 * @param  {file} file 0-7
 * @return {boolean} true if square is in board
 */
function squareIsInBoard (rank, file) {
    return !((rank | file) & ~7);
}

/**
 * Get square index (LITTLE ENDIAN RANK FILE mapping)
 * @param  {number} rank 0-7
 * @param  {number} file 0-7
 * @return {number} index 0-63
 */
function getIndex (rank, file) {
    return file + (rank * FILES);
}

/**
 * If index refers to light square
 * @param  {number} rank 0-7
 * @param  {number} file 0-7
 * @return {boolean} true if light square
 */
function isLight (rank, file) {
    return !!((rank + file) % 2);
}

/**
 * Algebraic chess notation, such as A1, C8
 * @param  {number} rank 0-7
 * @param  {number} file 0-7
 * @return {string} A1-H8
 */
function getAlgebraic (rank, file) {
    return FILE_CHARS[file] + RANK_CHARS[rank];
}

/**
 * @param  {number} index 0-63
 * @return {string} algebraic A1-H8
 */
function indexToAlgebraic (index) {
    return getAlgebraic(getRankFromIndex(index), getFileFromIndex(index));
}

/**
 * @param  {string} algebraic A1-H8
 * @return {number} index 0-63
 */
function algebraicToIndex (algebraic) {
    var file            =   FILE_CHARS.indexOf(algebraic[0]);
    var rank            =   RANK_CHARS.indexOf(algebraic[1]);
    return getIndex(file, rank);
}

/**
 * @param  {!Game.Piece} piece 0-5
 * @param  {!Game.PieceColor} color 0-1
 * @return {string} Unicode character for the piece
 */
function getPieceChar (piece, color) {
    return PIECE_CHARS.charAt( (piece*2) + color);
}

/**
 * Returns opposite colo
 * @param  {!Game.PieceColor} color 0 or 1
 * @return {!Game.PieceColor} color 0 or 1
 */
function getOtherPieceColor (color) {
    return (color ^ 1);
}

exports.Game            =   {

    "RANKS"             :   RANKS,
    "LAST_RANK"         :   RANKS - 1,

    "FILES"             :   FILES,
    "LAST_FILE"         :   FILES - 1,

    "FILE_CHARS"        :   FILE_CHARS,
    "RANK_CHARS"        :   RANK_CHARS,

    "Piece"             :   Piece,

    "PieceColor"        :   PieceColor,

    "PIECE_NAMES"       :   PIECE_NAMES,

    "PIECE_SHORT_NAMES" :   PIECE_SHORT_NAMES,

    "PIECE_CHARS"       :   PIECE_CHARS,



    "getRankFromIndex"  :   getRankFromIndex,

    "getFileFromIndex"  :   getFileFromIndex,

    "squareIsInBoard"   :   squareIsInBoard,

    "getIndex"          :   getIndex,

    "isLight"           :   isLight,

    "getAlgebraic"      :   getAlgebraic,

    "indexToAlgebraic"  :   indexToAlgebraic,

    "algebraicToIndex"  :   algebraicToIndex,

    "getPieceChar"      :   getPieceChar,

    "getOtherPieceColor":   getOtherPieceColor

};