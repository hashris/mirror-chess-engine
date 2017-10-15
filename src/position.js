var BitBoard 	= 	require('../src/bitboard.js').BitBoard;
var Game		=	require('../src/game.js').Game;
var Hash		=	require('../src/hash.js').Hash;
var Move		=	require('../src/move.js').Move;


var ANY_WHITE						=	6;
var ANY_BLACK						=	7;
var ROOK_INDICES					=	[7, 63, 0, 56];
var SLIDING_MASKS					=	[BitBoard.createFileBoard(Game.LAST_FILE).not(), BitBoard.createOneBoard(), BitBoard.createFileBoard(0).not()];
var Status							=	{
	NORMAL							:	0,
	CHECKMATE						:	1,
	STALEMATE						:	2,
	FIFTY_MOVE_DRAW					:	3,
	THREEFOLD_REPETITION_DRAW		:	4,
	INSUFFICIENT_MATERIAL_DRAW		:	5
};


class Position {

	constructor () {
		this.hashkey				=	new Hash(0, 0);

		this.ANY_WHITE				=	ANY_WHITE;
		this.ANY_BLACK				=	ANY_BLACK;
		this.ROOK_INDICES			=	ROOK_INDICES;
		this.SLIDING_MASKS			=	SLIDING_MASKS;
		this.Status					=	Status;

		this.bitboards				=	[
			// Pawns [0]
			BitBoard.RANKS[1].duplicate().or(BitBoard.RANKS[6].duplicate()),
			// Knights [1]
			BitBoard.createIndexBoard(1).or(BitBoard.createIndexBoard(6)).or(BitBoard.createIndexBoard(57)).or(BitBoard.createIndexBoard(62)),
			// Bishops [2]
			BitBoard.createIndexBoard(2).or(BitBoard.createIndexBoard(5)).or(BitBoard.createIndexBoard(58)).or(BitBoard.createIndexBoard(61)),
			// Rooks [3]
			BitBoard.createIndexBoard(0).or(BitBoard.createIndexBoard(7)).or(BitBoard.createIndexBoard(56)).or(BitBoard.createIndexBoard(63)),
			// Queens [4]
			BitBoard.createIndexBoard(3).or(BitBoard.createIndexBoard(59)),
			// Kings [5]
			BitBoard.createIndexBoard(4).or(BitBoard.createIndexBoard(60)),
			// White pieces [6]
			BitBoard.RANKS[0].duplicate().or(BitBoard.RANKS[1].duplicate()),
			// Black pieces [7]
			BitBoard.RANKS[6].duplicate().or(BitBoard.RANKS[7].duplicate())
		];

		this.pieces					=	[];

		this.turn					=	Game.PieceColor.WHITE,

		// 4 bits - white kingside, black kingside, white queenside, black queenside (little endian order)
		this.castlePerm				=	15;

		this.enPassantSquare		=	-1;

		this.halfMoveClock			=	0;

		this.madeMoves				=	[];

		this.irreversibleHistory	=	[];

		this.fillPiecesFromBitboards();
		this.updateHashkey();

		this.hashHistory			=	[];
	}


	getTurnColor () {
		return this.turn;
	}

	getColorBitboard (color) {
		return this.bitboards[ANY_WHITE + color];
	}

	getPieceBitboard (piece) {
		return this.bitboards[piece];
	}

	getPieceColorBitboard (piece, color) {
		return this.bitboards[piece].duplicate().and(this.getColorBitboard(color));
	}

	getKingPosition (kingColor) {
		return this.getPieceColorBitboard(Game.Piece.KING, kingColor).getLowestBitPosition();
	}

	getOccupiedBitboard () {
		return this.bitboards[ANY_WHITE].duplicate().or(this.bitboards[ANY_BLACK]);
	}

	getEmptyBitboard () {
		return this.getOccupiedBitboard().not();
	}

	findPieceAt (squareIndex) {
		for (var piece = Game.Piece.PAWN; piece <= Game.Piece.KING; ++piece) {
			if (this.getPieceBitboard(piece).bitIsSet(squareIndex)) {
				return piece;
			}
		}
		return null;
	}

	getPieceAt (squareIndex) {
		return this.pieces[squareIndex];
	}

	fillPiecesFromBitboards () {
		this.pieces.length			=	0;
		for (var index = 0; index < 64; ++index) {
			this.pieces.push(this.findPieceAt(index));
		}
	}

	isKingInCheck () {
		var currentColor			=	this.getTurnColor();
		return this.isAttacked( Game.getOtherPieceColor(currentColor), this.getKingPosition(currentColor) );
	}

	isMoveLegal (move) {
		this.updatePieces(move);
		var kingInCheck				=	this.isKingInCheck();
		this.revertPieces(move);
		return !kingInCheck;
	}

	getMoves (pseudoLegal, onlyCaptures) {
		var moves					=	this.generateMoves(!!onlyCaptures);
		if (pseudoLegal) {
			return moves;
		}
		else {
			return moves.filter(this.isMoveLegal, this);
		}
	}

	updateHashkey () {
		this.hashkey				=	new Hash(0, 0);

		for (var color = Game.PieceColor.WHITE; color <= Game.PieceColor.BLACK; ++color) {
			for (var piece = Game.Piece.PAWN; piece <= Game.Piece.KING; ++piece) {
				this.hashkey.updatePieceColorBitboard(piece, color, this.getPieceColorBitboard(piece, color));
			}
		}

		if (this.getTurnColor()) {
			this.hashkey.updateTurn();
		}

		this.hashkey.updateCastlePerm(this.castlePerm);
		this.hashkey.updateEnPassantSquare(this.enPassantSquare);
	}

	createPawnAttackMask (color, pawns) {
		var white					=	(color === Game.PieceColor.WHITE);
		var attacks1				=	pawns.duplicate().andNot(BitBoard.FILES[0]).shift(white ? 7 : -9);
		var attacks2				=	pawns.duplicate().andNot(BitBoard.FILES[Game.LAST_FILE]).shift(white ? 9 : -7);
		return (attacks1.or(attacks2));
	}

	createSlidingAttackMask (fromBitboard, occupied, rankDirection, fileDirection) {
		var bitboard				=	BitBoard.createZeroBoard();
		var direction				=	(rankDirection * Game.FILES) + fileDirection;
		var mask					=	this.SLIDING_MASKS[fileDirection + 1];

		for (fromBitboard.shift(direction); !fromBitboard.and(mask).isEmpty(); fromBitboard.andNot(occupied).shift(direction)) {
			bitboard.or(fromBitboard);
		}
		return bitboard;
	}

	createBishopAttackMask (fromBitboard, occupied) {
		return this.createSlidingAttackMask(fromBitboard.duplicate(), occupied, 1, 1).or(
			   this.createSlidingAttackMask(fromBitboard.duplicate(), occupied, 1, -1)).or(
			   this.createSlidingAttackMask(fromBitboard.duplicate(), occupied, -1, 1)).or(
			   this.createSlidingAttackMask(fromBitboard.duplicate(), occupied, -1, -1));
	}

	createRookAttackMask (fromBitboard, occupied) {
		return this.createSlidingAttackMask(fromBitboard.duplicate(), occupied, 0, 1).or(
			   this.createSlidingAttackMask(fromBitboard.duplicate(), occupied, 0, -1)).or(
			   this.createSlidingAttackMask(fromBitboard.duplicate(), occupied, 1, 0)).or(
			   this.createSlidingAttackMask(fromBitboard.duplicate(), occupied, -1, 0));
	}

	isAttacked (color, squareIndex) {
		var pawnsBoard				=	this.getPieceColorBitboard(Game.Piece.PAWN, color);
		if (this.createPawnAttackMask(color, pawnsBoard).bitIsSet(squareIndex)) {
			return true;
		}

		var knightsBoard			=	this.getPieceColorBitboard(Game.Piece.KNIGHT, color);
		if (!BitBoard.KNIGHT_MOVEMENTS[squareIndex].duplicate().and(knightsBoard).isEmpty()) {
			return true;
		}

		var kingBoard				=	this.getPieceColorBitboard(Game.Piece.KING, color);
		if (!BitBoard.KING_MOVEMENTS[squareIndex].duplicate().and(kingBoard).isEmpty()) {
			return true;
		}

		var occupiedBoard			=	this.getOccupiedBitboard();
		var queensBoard				=	this.getPieceColorBitboard(Game.Piece.QUEEN, color);

		var bishopQueenBoard		=	this.getPieceColorBitboard(Game.Piece.BISHOP, color).duplicate().or(queensBoard);
		if (this.createBishopAttackMask(bishopQueenBoard, occupiedBoard).bitIsSet(squareIndex)) {
			return true;
		}

		var rookQueenBoard 			=	this.getPieceColorBitboard(Game.Piece.ROOK, color).duplicate().or(queensBoard);
		if (this.createRookAttackMask(rookQueenBoard, occupiedBoard).bitIsSet(squareIndex)) {
			return true;
		}

		return false;
	}

	getCastlingIndex (color, kingside) {
		return ( color + (kingside ? 0 : 2) );
	}

	getCastlingRookSquare (color, kingside) {
		return this.ROOK_INDICES[this.getCastlingIndex(color, kingside)];
	}

	hasCastlingRight (color, kingside) {
		return ( ( this.castlePerm & (1 << this.getCastlingIndex(color, kingside)) ) !== 0);
	}

	clearCastlePerm (color, kingside) {
		this.castlePerm				&=	-(1 << this.getCastlingIndex(color, kingside));
		this.hashkey.updateCastlePerm(this.castlePerm);
		this.hashkey.updateCastlePerm(this.castlePerm);
	}

	canCastle (color, kingside, onlyLegal) {
		if (!this.hasCastlingRight(color, kingside)) {
			return false;
		}

		var direction 				=	kingside ? 1 : -1;
		var kingPosition 			=	(color === Game.PieceColor.WHITE) ? 4 : 60;
		var occupiedBoard 			=	this.getOccupiedBitboard();

		if (occupiedBoard.bitIsSet(kingPosition + direction) || (occupiedBoard.bitIsSet(kingPosition + 2*direction))) {
			return false;
		}

		if (!kingside && occupiedBoard.bitIsSet(kingPosition + 3*direction)) {
			return false;
		}

		if (onlyLegal && !this.isCastlingLegal(color, kingside)) {
			return false;
		}

		return true;
	}

	isCastlingLegal (color, kingside) {
		var otherColor				=	Game.getOtherPieceColor(color);
		var direction				=	kingside ? 1 : -1;
		var kingPosition			=	(color === Game.PieceColor.WHITE) ? 4 : 60;

		return (!this.isAttacked(otherColor, kingPosition) && !this.isAttacked(otherColor, kingPosition + direction) && !this.isAttacked(otherColor, kingPosition + 2*direction));
	}

	canEnpassant () {
		return this.getEnpassantSquare() >= 0;
	}

	getEnpassantSquare () {
		return this.enPassantSquare;
	}

	isFiftyMoveRuleDraw () {
		return this.halfMoveClock >= 100;
	}

    isThreeFoldRepetitionDraw () {
        var currentHashkey          =   this.hashkey;
        return (
            this.hashHistory.reduce(
                function (previous, current, index, array) {return previous + (current.equals(currentHashkey) ? 1 : 0);}, 0) >= 3
        );
    }

    isInsufficientMaterialDraw () {
        if (!this.getPieceBitboard(Game.Piece.PAWN).isEmpty()) {
            return false;
        }
        if (!this.getPieceBitboard(Game.Piece.ROOK).isEmpty()) {
            return false;
        }
        if (!this.getPieceBitboard(Game.Piece.QUEEN).isEmpty()) {
            return false;
        }

        var whiteCount              =   this.getColorBitboard(Game.PieceColor.WHITE).popcnt();
        var blackCount              =   this.getColorBitboard(Game.PieceColor.BLACK).popcnt();

        if (whiteCount + blackCount < 4) {
            // King-King, King-King-Bishop, King-King-Knight
            return true;
        }

        if (!this.getPieceBitboard(Game.Piece.KNIGHT).isEmpty()) {
            return false;
        }

        var bishops                 =   this.getPieceBitboard(Game.Piece.BISHOP);
        // Same color bishops
        if (bishops.duplicate().and(BitBoard.LIGHT_SQUARES.duplicate()).equals(bishops) || bishops.duplicate().and(BitBoard.DARK_SQUARES.duplicate()).equals(bishops)) {
            return true;
        }

        return false;
    }

    isDraw () {
        return ( this.isFiftyMoveRuleDraw() || this.isThreeFoldRepetitionDraw() || this.isInsufficientMaterialDraw() );
    }

    getStatus () {
        if (!this.getMoves().length) {
            return ( this.isKingInCheck() ? this.Status.CHECKMATE : this.Status.STALEMATE );
        }

        if (this.isFiftyMoveRuleDraw()) {
            return (this.Status.FIFTY_MOVE_DRAW);
        }

        if (this.isThreeFoldRepetitionDraw()) {
            return (this.Status.THREEFOLD_REPETITION_DRAW);
        }

        if (this.isInsufficientMaterialDraw()) {
            return (this.Status.INSUFFICIENT_MATERIAL_DRAW);
        }

        return (this.Status.NORMAL);
    }




	generateMoves (onlyCaptures) {
		var moves					=	[];

		var turnColor				=	this.getTurnColor();
		var opponentBitboard		=	this.getColorBitboard(Game.getOtherPieceColor(turnColor));
		var occupiedBoard			=	this.getOccupiedBitboard();
		var currPosition			=	this;

		// Pawn moves, double pawn pushes, positional moves, captures, promotions, enpassant
		function addPawnMoves (toMask, movement, kind) {
            while(!toMask.isEmpty()) {
                var sqIndex         =   toMask.extractLowestBitPosition();
                var possibleMove    =   new Move(sqIndex - movement, sqIndex, kind, Game.Piece.PAWN, currPosition.getPieceAt(sqIndex));

                moves.push(possibleMove);
            }
		}

        function addPawnPromotions (toMask, movement, capture) {
            addPawnMoves(toMask.duplicate(), movement, capture ? Move.Kind.QUEEN_PROMOTION_CAPTURE : Move.Kind.QUEEN_PROMOTION);
            addPawnMoves(toMask.duplicate(), movement, capture ? Move.Kind.ROOK_PROMOTION_CAPTURE : Move.Kind.ROOK_PROMOTION);
            addPawnMoves(toMask.duplicate(), movement, capture ? Move.Kind.BISHOP_PROMOTION_CAPTURE : Move.Kind.BISHOP_PROMOTION);
            addPawnMoves(toMask.duplicate(), movement, capture ? Move.Kind.KNIGHT_PROMOTION_CAPTURE : Move.Kind.KNIGHT_PROMOTION);
        }


        var fileDirection           =   1 - (2 * turnColor);
        var rankDirection           =   8 * fileDirection;
        var turnPawns               =   this.getPieceColorBitboard(Game.Piece.PAWN, turnColor);
        var lastRow                 =   BitBoard.RANKS[turnColor ? 0 : Game.LAST_RANK].duplicate();

        if (!onlyCaptures) {
            var doublePawnPushed    =   turnPawns.duplicate().and(BitBoard.RANKS[turnColor ? 6 : 1].duplicate()).shift(2 * rankDirection).andNot(occupiedBoard).andNot(occupiedBoard.duplicate().shift(rankDirection));
            addPawnMoves(doublePawnPushed, 2*rankDirection, Move.Kind.DOUBLE_PAWN_PUSH);

            var positionalPawnMoved =   turnPawns.duplicate().shift(rankDirection).andNot(occupiedBoard);
            addPawnMoves(positionalPawnMoved.duplicate().andNot(lastRow), rankDirection, Move.Kind.POSITIONAL);
            addPawnPromotions(positionalPawnMoved.duplicate().and(lastRow), rankDirection, false);
        }


        // Pawn Capture
        var leftFile                =   BitBoard.FILES[turnColor ? Game.LAST_FILE : 0];
        var leftCaptureMovement     =   rankDirection - fileDirection;
        var pawnLeftCaptured        =   turnPawns.duplicate().andNot(leftFile).shift(leftCaptureMovement).and(opponentBitboard);
        addPawnMoves(pawnLeftCaptured.duplicate().andNot(lastRow), leftCaptureMovement, Move.Kind.CAPTURE);
        addPawnPromotions(pawnLeftCaptured.duplicate().and(lastRow), leftCaptureMovement, true);

        var rightFile               =   BitBoard.FILES[turnColor ? 0 : Game.LAST_FILE];
        var rightCaptureMovement    =   rankDirection + fileDirection;
        var pawnRightCaptured       =   turnPawns.duplicate().andNot(rightFile).shift(rightCaptureMovement).and(opponentBitboard);
        addPawnMoves(pawnRightCaptured.duplicate().andNot(lastRow), rightCaptureMovement, Move.Kind.CAPTURE);
        addPawnPromotions(pawnRightCaptured.duplicate().and(lastRow), rightCaptureMovement, true);

        // Pawn En passant capture
        if (this.canEnpassant()) {
            var pawnLeftEnpassant   =   BitBoard.createIndexBoard(this.getEnpassantSquare() + fileDirection).and(turnPawns).andNot(leftFile).shift(leftCaptureMovement);
            var pawnRightEnpassant  =   BitBoard.createIndexBoard(this.getEnpassantSquare() - fileDirection).and(turnPawns).andNot(rightFile).shift(rightCaptureMovement);
            addPawnMoves(pawnLeftEnpassant, leftCaptureMovement, Move.Kind.EN_PASSANT_CAPTURE);
            addPawnMoves(pawnRightEnpassant, rightCaptureMovement, Move.Kind.EN_PASSANT_CAPTURE);
        }

        // Positional and capture moves for knight, bishop, rook, queen, king
        var turnBitboard            =   this.getColorBitboard(turnColor);

        function addNormalMoves (from, toMask, piece) {
            while (!toMask.isEmpty()) {
                var to              =   toMask.extractLowestBitPosition();
                if (turnBitboard.bitIsReset(to)) {
                    var possibleMove    =   new Move(from, to, opponentBitboard.bitIsSet(to) ? Move.Kind.CAPTURE : Move.Kind.POSITIONAL, piece, currPosition.getPieceAt(to));
                    moves.push(possibleMove);
                }
            }
        }

        var mask                    =   onlyCaptures ? opponentBitboard : BitBoard.ONE.duplicate();

        var turnKnights             =   this.getPieceColorBitboard(Game.Piece.KNIGHT, turnColor).duplicate();
        var turnQueens              =   this.getPieceColorBitboard(Game.Piece.QUEEN, turnColor).duplicate();
        var turnBishops             =   this.getPieceColorBitboard(Game.Piece.BISHOP, turnColor).duplicate();
        var turnRooks               =   this.getPieceColorBitboard(Game.Piece.ROOK, turnColor).duplicate();

        while (!turnKnights.isEmpty()) {
            var knightPosition      =   turnKnights.extractLowestBitPosition();
            addNormalMoves(knightPosition, BitBoard.KNIGHT_MOVEMENTS[knightPosition].duplicate().and(mask), Game.Piece.KNIGHT);
        }
        while (!turnQueens.isEmpty()) {
            var queenPosition       =   turnQueens.extractLowestBitPosition();
            addNormalMoves(queenPosition, this.createBishopAttackMask(BitBoard.createIndexBoard(queenPosition), occupiedBoard).or(this.createRookAttackMask(BitBoard.createIndexBoard(queenPosition), occupiedBoard)).and(mask), Game.Piece.QUEEN);
        }
        while (!turnBishops.isEmpty()) {
            var bishopPosition      =   turnBishops.extractLowestBitPosition();
            addNormalMoves(bishopPosition, this.createBishopAttackMask(BitBoard.createIndexBoard(bishopPosition), occupiedBoard).and(mask), Game.Piece.BISHOP);
        }
        while (!turnRooks.isEmpty()) {
            var rookPosition        =   turnRooks.extractLowestBitPosition();
            addNormalMoves(rookPosition, this.createRookAttackMask(BitBoard.createIndexBoard(rookPosition), occupiedBoard).and(mask), Game.Piece.ROOK);
        }


        var kingPosition            =   this.getKingPosition(turnColor);
        addNormalMoves(kingPosition, BitBoard.KING_MOVEMENTS[kingPosition].duplicate().and(mask), Game.Piece.KING);

        if (!onlyCaptures) {
            // King & queen side castle
            if (this.canCastle(turnColor, true, true)) {
                moves.push(new Move(kingPosition, kingPosition + 2, Move.Kind.KING_CASTLE, Game.Piece.KING, null));
            }

            if (this.canCastle(turnColor, false, true)) {
                moves.push(new Move(kingPosition, kingPosition - 2, Move.Kind.QUEEN_CASTLE, Game.Piece.KING, null));
            }
        }


        return moves;
	}



    capturePiece (piece, color, squareIndex) {
        this.getPieceBitboard(piece).resetBit(squareIndex);
        this.getColorBitboard(color).resetBit(squareIndex);
        this.pieces[squareIndex]    =   null;
        this.hashkey.updatePieceColorSquare(piece, color, squareIndex);
    }

    unCapturePiece (piece, color, squareIndex) {
        this.getPieceBitboard(piece).setBit(squareIndex);
        this.getColorBitboard(color).setBit(squareIndex);
        this.pieces[squareIndex]    =   piece;
        this.hashkey.updatePieceColorSquare(piece, color, squareIndex);
    }

    movePiece (piece, color, from, to) {
        var fromToBitboard          =   BitBoard.createIndexBoard(from).or(BitBoard.createIndexBoard(to));
        this.getPieceBitboard(piece).xor(fromToBitboard);
        this.getColorBitboard(color).xor(fromToBitboard);
        this.pieces[from]           =   null;
        this.pieces[to]             =   piece;
        this.hashkey.updatePieceColorSquare(piece, color, from);
        this.hashkey.updatePieceColorSquare(piece, color, to);
    }

    castleRook (color, kingside) {
        var from                    =   this.getCastlingRookSquare(color, kingside);
        var to                      =   from + (kingside ? -2 : 3);
        this.movePiece(Game.Piece.ROOK, color, from, to);
    }

    unCastleRook (color, kingside) {
        var to                      =   this.getCastlingRookSquare(color, kingside);
        var from                    =   to + (kingside ? -2 : 3);
        this.movePiece(Game.Piece.ROOK, color, from, to);
    }

    promotePiece (oldPiece, newPiece, color, squareIndex) {
        this.getPieceBitboard(oldPiece).resetBit(squareIndex);
        this.getPieceBitboard(newPiece).setBit(squareIndex);
        this.pieces[squareIndex]    =   newPiece;
        this.hashkey.updatePieceColorSquare(oldPiece, color, squareIndex);
        this.hashkey.updatePieceColorSquare(newPiece, color, squareIndex);
    }


    updatePieces (move) {
        if (move.isCapture()) {
            this.capturePiece(move.getCapturedPiece(), Game.getOtherPieceColor(this.getTurnColor()), move.getCaptureSquare());
        }

        if (move.isCastle()) {
            this.castleRook(this.getTurnColor(), move.getKind() === Move.Kind.KING_CASTLE);
        }

        this.movePiece(move.getPiece(), this.getTurnColor(), move.getFrom(), move.getTo());

        if (move.isPromotion()) {
            this.promotePiece(Game.Piece.PAWN, move.getPromotedPiece(), this.getTurnColor(), move.getTo());
        }
    }

    revertPieces (move) {
        if (move.isPromotion()) {
            this.promotePiece(move.getPromotedPiece(), Game.Piece.PAWN, move.getTo());
        }

        this.movePiece(move.getPiece(), this.getTurnColor(), move.getTo(), move.getFrom());

        if (move.isCastle()) {
            this.unCastleRook(this.getTurnColor(), move.getKind() === Move.Kind.KING_CASTLE);
        }

        if (move.isCapture()) {
            this.unCapturePiece(move.getCapturedPiece(), Game.getOtherPieceColor(this.getTurnColor()), move.getCaptureSquare());
        }
    }

    makeMove (move) {
        this.hashHistory.push(this.hashkey.duplicate());
        this.updatePieces(move);

        if (this.isKingInCheck()) {
            this.revertPieces(move);
            this.hashHistory.pop();
            return false;
        }

        this.madeMoves.push(move);
        this.irreversibleHistory.push(this.enPassantSquare);
        this.irreversibleHistory.push(this.castlePerm);
        this.irreversibleHistory.push(this.halfMoveClock);

        this.hashkey.updateEnPassantSquare(this.enPassantSquare);

        if (move.getKind() === Move.Kind.DOUBLE_PAWN_PUSH) {
            this.enPassantSquare    =   move.getTo();
        }
        else {
            this.enPassantSquare    =   -1;
        }
        this.hashkey.updateEnPassantSquare(this.enPassantSquare);

        var turnColor               =   this.getTurnColor();

        if (move.getPiece() === Game.Piece.KING) {
            this.clearCastlePerm(turnColor, true);
            this.clearCastlePerm(turnColor, false);
        }
        else if (move.getPiece() === Game.Piece.ROOK) {
            if (move.getFrom() === this.getCastlingRookSquare(turnColor, true)) {
                this.clearCastlePerm(turnColor, true);
            }
            else if (move.getFrom() === this.getCastlingRookSquare(turnColor, false)) {
                this.clearCastlePerm(turnColor, false);
            }
        }

        var otherColor              =   Game.getOtherPieceColor(turnColor);

        if (move.getCapturedPiece() === Game.Piece.ROOK) {
            if (move.getCaptureSquare() === this.getCastlingRookSquare(otherColor, true)) {
                this.clearCastlePerm(otherColor, true);
            }
            else if (move.getCaptureSquare() === this.getCastlingRookSquare(otherColor, false)) {
                this.clearCastlePerm(otherColor, false);
            }
        }


        if (move.isCapture() || move.getPiece() === Game.Piece.PAWN) {
            this.halfMoveClock      =   0;
        }
        else {
            ++this.halfMoveClock;
        }

        this.turn                   =   otherColor;
        this.hashkey.updateTurn();

        return true;
    }

    getMadeMoveCount () {
        return this.madeMoves.length;
    }

    canUndo () {
        return !!(this.getMadeMoveCount());
    }

    getLastMove () {
        if (!this.canUndo()) {
            return null;
        }
        return this.madeMoves[this.madeMoves.length - 1];
    }

    unmakeMove () {
        if (!this.canUndo()) {
            return null;
        }

        var move                    =   (this.madeMoves.pop());
        this.turn                   =   Game.getOtherPieceColor(this.getTurnColor());
        this.hashkey.updateTurn();
        this.revertPieces(move);
        this.halfMoveClock          =   (this.irreversibleHistory.pop());
        this.hashkey.updateCastlePerm(this.castlePerm);
        this.castlePerm             =   (this.irreversibleHistory.pop());
        this.hashkey.updateCastlePerm(this.castlePerm);
        this.hashkey.updateEnPassantSquare(this.enPassantSquare);
        this.enPassantSquare        =   (this.irreversibleHistory.pop());
        this.hashkey.updateEnPassantSquare(this.enPassantSquare);
        this.hashHistory.pop();

        return move;
    }

}

exports.Position					=	Position;