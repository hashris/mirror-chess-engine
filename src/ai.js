var Game        =   require('../src/game.js').Game;

class AI {

    constructor () {
        this.PIECE_VALUES           =   [100, 300, 300, 500, 900, 20000];
        this.PIECE_SQUARE_TABLES    =   [
            // pawn
            [
                0, 0, 0, 0, 0, 0, 0, 0,
                50, 50, 50, 50, 50, 50, 50, 50,
                10, 10, 20, 30, 30, 20, 10, 10,
                5, 5, 10, 25, 25, 10, 5, 5,
                0, 0, 0, 20, 20, 0, 0, 0,
                5, -5, -10, 0, 0, -10, -5, 5,
                5, 10, 10, -20, -20, 10, 10, 5,
                0, 0, 0, 0, 0, 0, 0, 0
            ],
            // knight
            [
                -50, -40, -30, -30, -30, -30, -40, -50,
                -40, -20, 0, 0, 0, 0, -20, -40,
                -30, 0, 10, 15, 15, 10, 0, -30,
                -30, 5, 15, 20, 20, 15, 5, -30,
                -30, 0, 15, 20, 20, 15, 0, -30,
                -30, 5, 10, 15, 15, 10, 5, -30,
                -40, -20, 0, 5, 5, 0, -20, -40,
                -50, -40, -30, -30, -30, -30, -40, -50
            ],
            // bishop
            [
                -20, -10, -10, -10, -10, -10, -10, -20,
                -10, 0, 0, 0, 0, 0, 0, -10,
                -10, 0, 5, 10, 10, 5, 0, -10,
                -10, 5, 5, 10, 10, 5, 5, -10,
                -10, 0, 10, 10, 10, 10, 0, -10,
                -10, 10, 10, 10, 10, 10, 10, -10,
                -10, 5, 0, 0, 0, 0, 5, -10,
                -20, -10, -10, -10, -10, -10, -10, -20
            ],
            // rook
            [
                0, 0, 0, 0, 0, 0, 0, 0,
                5, 10, 10, 10, 10, 10, 10, 5,
                -5, 0, 0, 0, 0, 0, 0, -5,
                -5, 0, 0, 0, 0, 0, 0, -5,
                -5, 0, 0, 0, 0, 0, 0, -5,
                -5, 0, 0, 0, 0, 0, 0, -5,
                -5, 0, 0, 0, 0, 0, 0, -5,
                0, 0, 0, 5, 5, 0, 0, 0
            ],
            // queen
            [
                -20, -10, -10, -5, -5, -10, -10, -20,
                -10, 0, 0, 0, 0, 0, 0, -10,
                -10, 0, 5, 5, 5, 5, 0, -10,
                -5, 0, 5, 5, 5, 5, 0, -5,
                0, 0, 5, 5, 5, 5, 0, -5,
                -10, 5, 5, 5, 5, 5, 0, -10,
                -10, 0, 5, 0, 0, 0, 0, -10,
                -20, -10, -10, -5, -5, -10, -10, -20
            ],
            // king
            [
                -30, -40, -40, -50, -50, -40, -40, -30,
                -30, -40, -40, -50, -50, -40, -40, -30,
                -30, -40, -40, -50, -50, -40, -40, -30,
                -30, -40, -40, -50, -50, -40, -40, -30,
                -20, -30, -30, -40, -40, -30, -30, -20,
                -10, -20, -20, -20, -20, -20, -20, -10,
                 20, 20, 0, 0, 0, 0, 20, 20,
                 20, 30, 10, 0, 0, 10, 30, 20
            ]
        ];
        this.BISHOP_PAIR_VALUE      =   this.PIECE_VALUES[Game.Piece.PAWN] / 2;
    }

    getMaterialValue (currPosition, color) {
        var value                   =   0;
        for (var piece = Game.Piece.PAWN; piece < Game.Piece.KING; ++piece) {
            value                   +=  currPosition.getPieceColorBitboard(piece, color).popcnt() * this.PIECE_VALUES[piece];
        }

        if (currPosition.getPieceColorBitboard(Game.Piece.BISHOP, color).popcnt() > 1) {
            value                   +=  this.BISHOP_PAIR_VALUE;
        }

        return value;
    }

    evaluateMaterial (currPosition) {
        return this.getMaterialValue(currPosition, Game.PieceColor.WHITE) - this.getMaterialValue(currPosition, Game.PieceColor.BLACK);
    }

    getPieceSquareValue (currPosition, color) {
        var value                   =   0;
        for (var piece = Game.Piece.PAWN; piece <= Game.Piece.KING; ++piece) {
            var pieces              =   currPosition.getPieceColorBitboard(piece, color).duplicate();
            while (!pieces.isEmpty()) {
                var sqIndex         =   pieces.extractLowestBitPosition();
                value               +=  this.PIECE_SQUARE_TABLES[piece][color ? sqIndex : (56 ^ sqIndex)];
            }
        }

        return value;
    }

    evaluateLocations (currPosition) {
        return (this.getPieceSquareValue(currPosition, Game.PieceColor.WHITE) - this.getPieceSquareValue(currPosition, Game.PieceColor.BLACK));
    }

    makePawnPositionalMask (color, pawns) {
        var empty                   =   BitBoard.createZeroBoard();
        var white                   =   (color === Game.PieceColor.WHITE);
        var positional              =   pawns.duplicate().shift(white ? 8 : -8).and(empty);
        var doublePush              =   pawns.duplicate().and(BitBoard.RANKS[white ? 1 : 6]).shift(white ? 16 : -16).and(empty).and(empty.duplicate().shift(white ? 8 : -8));

        return positional.or(doublePush);
    }

    getMobilityValue (currPosition, color) {
        var us                      =   currPosition.getColorBitboard(color);
        var them                    =   currPosition.getColorBitboard(Game.getOtherPieceColor(color));
        var occupiedBoard           =   currPosition.getOccupiedBitboard();
        var mobility                =   0;

        mobility                    +=  this.makePawnPositionalMask(color, currPosition.getPieceColorBitboard(Game.Piece.PAWN, color)).popcnt();
        mobility                    +=  currPosition.createPawnAttackMask(color, currPosition.getPieceColorBitboard(Game.Piece.PAWN, color)).and(them).popcnt();

        var knights                 =   currPosition.getPieceColorBitboard(Game.Piece.KNIGHT, color).duplicate();
        while (!knights.isEmpty()) {
            mobility                +=  BitBoard.KNIGHT_MOVEMENTS[knights.extractLowestBitPosition()].duplicate().andNot(us).popcnt();
        }

        mobility                    +=  BitBoard.KING_MOVEMENTS[currPosition.getKingPosition(color)].duplicate().andNot(us).popcnt();

        var queens                  =   currPosition.getPieceColorBitboard(Game.Piece.QUEEN, color);
        var bishopsQueens           =   currPosition.getPieceColorBitboard(Game.Piece.BISHOP, color).duplicate().or(queens);
        var rooksQueens             =   currPosition.getPieceColorBitboard(Game.Piece.ROOK, color).duplicate().or(queens);

        mobility                    +=  currPosition.createBishopAttackMask(bishopsQueens, occupiedBoard);
        mobility                    +=  currPosition.createRookAttackMask(rooksQueens, occupiedBoard);

        return (mobility * this.PIECE_VALUES[Game.Piece.PAWN] / 100);
    }


    evaluate (currPosition) {
        return (this.evaluateMaterial(currPosition) + this.evaluateLocations(currPosition));
    }

    search (currPosition) {

        var evaluations             =   0;
        var _this                   =   this;

        function sortMoves (moves) {

            function scoreMove (move) {
                var score           =   move.isCapture() ? ((1 + move.getCapturedPiece()) / (1 + move.getPiece())) : 0;
                score               =   (6 * score) + move.getPiece();
                score               =   (16 * score) + move.getKind();
                score               =   (64 * score) + move.getTo();
                score               =   (64 * score) + move.getFrom();
                return score;
            }

            function compareMoves (move1, move2) {
                return ( scoreMove(move2) - scoreMove(move1) );
            }

            moves.sort(compareMoves);

            return moves;
        }


        function quiescenceSearch (currPosition, alpha, beta) {

            if (currPosition.isDraw()) {
                return 0;
            }

            var evalValue           =   _this.evaluate(currPosition);
            ++evaluations;

            var isWhite             =   (currPosition.getTurnColor() === Game.PieceColor.WHITE);

            if (isWhite) {
                if (evalValue >= beta) {
                    return beta;
                }
                alpha               =   (evalValue > alpha) ? evalValue : alpha;
            }
            else {
                if (evalValue <= alpha) {
                    return alpha;
                }
                beta                =   (evalValue < beta) ? evalValue : beta;
            }

            var moves               =   sortMoves(currPosition.getMoves(true, !currPosition.isKingInCheck()));

            for (var i = 0; i < moves.length; ++i) {
                if (currPosition.makeMove(moves[i])) {
                    var value       =   quiescenceSearch(currPosition, alpha, beta);
                    currPosition.unmakeMove();

                    if (isWhite) {
                        if (value >= beta) {
                            return beta;
                        }
                        alpha       =   (value > alpha) ? value : alpha;    // max player (white)
                    }
                    else {
                        if (value <= alpha) {
                            return alpha;
                        }
                        beta        =   (value < beta) ? value : beta;      //  min player (black)
                    }
                }
            }

            return (isWhite ? alpha : beta);

        }


        function alphaBeta (currPosition, depth, alpha, beta) {

            if (depth < 1) {
                return quiescenceSearch(currPosition, alpha, beta);
            }

            var moves               =   sortMoves(currPosition.getMoves(true, false));
            var isWhite             =   (currPosition.getTurnColor() === Game.PieceColor.WHITE);
            var legal               =   false;

            for (var i = 0; i < moves.length; ++i) {
                if (currPosition.makeMove(moves[i])) {
                    legal           =   true;

                    var value       =   alphaBeta(currPosition, depth - 1, alpha, beta);
                    currPosition.unmakeMove();

                    if (isWhite) {
                        alpha       =   (value > alpha) ? value : alpha;        // max player (white)
                    }
                    else {
                        beta        =   (value < beta) ? value : beta;          // min player (black)
                    }

                    if (beta <= alpha) {
                        break;
                    }
                }
            }

            if (!legal) {
                // No legal moves
                if (!currPosition.isKingInCheck()) {
                    // Stalemate or draw
                    return 0;
                }

                // Checkmate
                var mate            =   this.PIECE_VALUES[Game.Piece.KING];
                return (isWhite ? -mate : mate);
            }

            if (currPosition.isDraw()) {
                return 0;
            }


            return (isWhite ? alpha : beta);

        }

        var bestMove                =   null;
        var alpha                   =   -Infinity;
        var beta                    =   Infinity;
        var moves                   =   sortMoves(currPosition.getMoves(true));

        for (var i = 0; i < moves.length; ++i) {
            if (currPosition.makeMove(moves[i])) {
                var value           =   alphaBeta(currPosition, 3, alpha, beta);
                currPosition.unmakeMove();

                if (currPosition.getTurnColor() === Game.PieceColor.WHITE) {
                    // max player (white)
                    if (value > alpha) {
                        alpha       =   value;
                        bestMove    =   moves[i];
                    }
                }
                else {
                    // min player (black)
                    if (value < beta) {
                        beta        =   value;
                        bestMove    =   moves[i];
                    }
                }
            }
        }

        return bestMove;

    }

}

exports.AI      =   AI;