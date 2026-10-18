# Anarch Chess Rulebook

**Rulebook v1.1**

Anarch Chess is normal chess with four new freedoms and one hard rule: pieces
can borrow each other's moves, jump or trample their own army, and the King can
only fall to an honest, standard move.

## Contents

1. [The goal: capture the King](#1-the-goal-capture-the-king)
2. [Emulation: borrow another piece's moves](#2-emulation-borrow-another-pieces-moves)
3. [Friendly jump: fly over your own piece](#3-friendly-jump-fly-over-your-own-piece)
4. [Pawn anarchy: diagonal step and trample](#4-pawn-anarchy-diagonal-step-and-trample)
5. [The King is protected](#5-the-king-is-protected)
6. [Legal moves, forced King moves and stalemate](#6-legal-moves-forced-king-moves-and-stalemate)
7. [Castling, en passant and promotion](#7-castling-en-passant-and-promotion)
8. [Draws](#8-draws)
9. [Reading the board](#9-reading-the-board)

## 1. The goal: capture the King

Anarch Chess uses a normal 8x8 board and the normal starting position. White
moves first, and each player makes one move per turn.

You win by **actually capturing** the enemy King. The game ends the moment that
happens. There is no checkmate.

You're allowed to **ignore check**. If your King is attacked you can make some
other move, but your opponent can then take your King and win. One limit: you
can never make your King's danger **worse** (see [Legal moves](#6-legal-moves-forced-king-moves-and-stalemate)).

## 2. Emulation: borrow another piece's moves

Any piece except a pawn can move **like a different piece**, if two conditions
are met:

- **Rank:** it can only copy a piece worth the same or less:
  Queen (9) >= Rook (5) >= Bishop (3) = Knight (3) >= Pawn (1).
- **Living ally:** you need at least one piece of that type still on the board.
  Lose your last Bishop and nothing can move like a Bishop until you promote a
  new one.

| Piece | Can also move like |
| --- | --- |
| Queen | Knight, Pawn (she already has Rook and Bishop moves) |
| Rook | Bishop, Knight, Pawn - never a Queen |
| Bishop | Knight, Pawn |
| Knight | Bishop, Pawn |
| King | Rook, Bishop, Knight, Pawn - only onto empty squares, never capturing |
| Pawn | Nothing |

**One move, one style.** A move uses exactly one movement pattern: one straight
line, one knight jump, or one pawn step. You can't mix them.

**Copying a pawn** (non-pawn pieces only) means one square forward onto an empty
square, one square diagonally forward onto an empty square, or one square
diagonally forward to capture an enemy piece other than the King. A piece
copying a pawn gets no double step, no en passant and no promotion.

> **Example:** A Rook on d4 can slide diagonally to f6 as long as one of your
> Bishops is still alive.

## 3. Friendly jump: fly over your own piece

A piece moving in a line (Rook, Bishop or Queen, including when emulating) may
**jump over exactly one of your own pieces**. The jumped piece is **destroyed**
(friendly fire). All of these must be true:

- It lands on an **empty** square. A jump can never capture.
- Only one friendly piece is on the path, and it isn't your King. The King
  can't jump either.
- The jump must not put the enemy King in a **new check**.

You can **never** jump an enemy piece. A slider can't pass an enemy at all.

> **Example:** With a Rook on a1 and your own pawn on a3, the rook can jump to
> a4, a5, a6 or a7 (the pawn disappears). It can't go to a8 if that would give
> check.

## 4. Pawn anarchy: diagonal step and trample

Pawns keep all their normal moves (forward, double step, diagonal capture, en
passant, promotion) and gain two more:

- **Diagonal step:** one square diagonally forward onto an **empty** square.
- **Trample:** one square straight forward onto **your own** piece (not the
  King). That piece is destroyed and the pawn takes its square.

Neither move captures, and neither may give check. Pawns can't emulate other
pieces.

> **Example:** Your pawn on e4 tramples your own Knight on e5. If that was your
> last Knight, none of your pieces can move like a Knight any more.

## 5. The King is protected

Emulation, jumps, diagonal steps and tramples are called **Anarch moves**.
Normal moves are called **standard moves**.

- Only a **standard** move can capture the King.
- An Anarch move can never **create a new check**, including a discovered check
  or a check from a promoted piece.
- Anarch moves can capture any other piece. Only the King is protected.
- "Check" only counts standard attacks. Emulation never gives check.

> **Example:** A Rook emulating a Bishop can slide from a1 to g7, but it can
> never take a King on h8.

## 6. Legal moves, forced King moves and stalemate

**Don't make it worse.** If your King moves, it can't move onto an attacked
square. If your King stays put, your move can't add any *new* attacker on it.
You can leave an existing check unanswered.

**Forced King move.** If you're in check and have no legal move, you still have
to move. Your King must take a normal one-square step (no castling), even into
attack. Usually it gets captured next turn.

**Stalemate.** If you have no legal move and you're **not** in check, the game
is a draw. It's also a draw if a forced King has nowhere at all to step.

## 7. Castling, en passant and promotion

**Castling** works as in normal chess: the King and Rook haven't moved, the
squares between are empty, and the King isn't in check, doesn't pass through an
attacked square and doesn't land on one. You lose castling rights if anything
moves from or to a Rook's starting square, including a piece destroyed there
by a jump or trample.

**En passant** is normal. Only a real pawn double step allows it.

**Promotion** happens when a pawn reaches the last rank by any pawn move
(normal, diagonal step or trample). You choose Queen, Rook, Bishop or Knight.
The new piece counts as a living ally straight away. If an Anarch move would
give check by promoting, it's illegal.

## 8. Draws

- **Stalemate:** see [section 6](#6-legal-moves-forced-king-moves-and-stalemate).
- **Threefold repetition:** the same position, same side to move, same
  castling rights and en passant square, three times.
- **50-move rule:** 100 moves in a row (50 each) with no pawn move, no capture
  and no friendly-fire destruction.
- **Dead position:** only the Kings are left, or the Kings plus a single Bishop
  or Knight.

## 9. Reading the board

Tap a piece and its moves light up in four colors:

- A **dot** means a move to an empty square.
- A **ring** means a capture or a trample.

After a game, step through the review: each move gets a badge:

- `★ Best`
- `✓ Good`
- `?! Inaccuracy`
- `? Mistake`
- `?? Blunder`
