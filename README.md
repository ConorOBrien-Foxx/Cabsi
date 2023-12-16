# Cabsi

## Stack-based BASIC analogue

(The name is a silly-sounding anagram of Basic.)

A stack-based language with BASIC-esque instruction numbering and control flow.

## Example

```basic
10  REM Fibonacci program
20  PUSH 0
30  PUSH 1
40  PUSH "Input N: "
50  INPUT
60  JNP 150
70  DEC      REM [3, 5, N-1]
80  ROT      REM [5, N, 3]
90  ROT      REM [N, 3, 5]
100 DUP      REM [N, 3, 5, 5]
110 ROT      REM [N, 5, 5, 3]
120 ADD      REM [N, 5, 8]
130 ROT      REM [5, 8, N]
140 GOTO 60
150 POP
160 POP
170 PRINT
180 EXIT
```

## Commands

- Separated by command types: Stack Population, Stack Manipulation, Control Flow, Miscellaneous.
- Any symbols which follow the command are expected to be given with the command
   - E.g. `GOTO lineNumber` expects a numeric word `lineNumber` following `GOTO`, like `GOTO 500`.
- The numbers in parentheses after the command denotes how many items on the stack are required for a successful execution, and how many items are left on the stack relative to that
   - E.g. `INPUT`(1 &rarr; 1) requires the stack to have at least item, and leaves the stack with 1 item, relatively speaking.
- A stack reference expression (`@N` or `$N`), when applicable, is an index situated at the top of the stack.
   - `@1` means top of stack, `@2` means second to top of stack, etc.
   - For a stack `[9 3 1 6]`, `@1` is `6`, `@2` is `1`, `@3` is `3`, and `@4` is `9`.
   - `$N` has the same indexing structure, but pops the relevant item

### Stack Population

#### `PUSH [x1, [x2, [...xN]]]`(0 &rarr; N)
Pushes 0 or more items to the stack in sequence.

#### `INPUT`(1 &rarr; 1)
Pops a prompt string `S` and asks the user for input with `S`. Pushes the corresponding literal onto the stack. Prompt string not displayed (but still required) when not reading from the user's keyboard.

#### `GETC`(0 &rarr; 1)
Reads a character from STDIN.

#### `GETL`(0 &rarr; 1)
Reads a line from STDIN.

#### `GETW`(0 &rarr; 1)
Reads a word from STDIN (works like C's `scanf(" %s", &buf)`, obviously without the buffer overflow exploit).

#### `SIZE`(0 &rarr; 1)
Pushes the size of the primary stack.

#### `RSIZE`(0 &rarr; 1)
Pushes the size of the secondary stack.

### Stack Manipulation

#### `ROT`(3 &rarr; 3)
Rotates the top three items on the stack, pulling the third item from the top of the stack to the top of the stack. `[A, B, C] -> [B, C, A]`.

#### `DUP`(1 &rarr; 2)
Duplicates the top item on the stack.

#### `POP`(1 &rarr; 0)
Removes the top item from the stack.

#### `SWAP`(2 &rarr; 2)
Swaps the positions of the top two items on the stack.

#### `OVER`(2 &rarr; 3)
Copies the second item from the top and pushes it onto the top of the stack.

#### `YEET`(1 &rarr; 0)
Pops an element from the current stack onto the register stack.

#### `YOINK`(0 &rarr; 1)
Pops an element from the register stack onto the current stack.

### Control Flow

`lineNumber` can also be a stack reference expression.

#### `GOTO lineNumber`(0 &rarr; 0)
Unconditionally jumps to the instruction at the specified `lineNumber`.

#### `JNL lineNumber`(1 &rarr; 1/0)
Jumps to the instruction at the specified `lineNumber` if the top item on the stack is `null`. If `null`, the `null` is popped.

#### `JP lineNumber`(0 &rarr; 0)
Jumps to the instruction at the specified `lineNumber` if the top item on the stack is positive.

#### `JNP lineNumber`(0 &rarr; 0)
Jumps to the instruction at the specified `lineNumber` if the top item on the stack is not positive.

#### `JN lineNumber`(0 &rarr; 0)
Jumps to the instruction at the specified `lineNumber` if the top item on the stack is negative.

#### `JNN lineNumber`(0 &rarr; 0)
Jumps to the instruction at the specified `lineNumber` if the top item on the stack is not negative.

#### `JZ lineNumber`(0 &rarr; 0)
Jumps to the instruction at the specified `lineNumber` if the top item on the stack is zero.

#### `GOSUB lineNumber`(0 &rarr; 0)
Calls a subroutine located at the specified `lineNumber`.

#### `RETURN`(0 &rarr; 0)
Returns from the current subroutine.

### Math

#### `INC`(1 &rarr; 1)
Increments the top item on the stack.

#### `DEC`(1 &rarr; 1)
Decrements the top item on the stack.

#### `ADD`(2 &rarr; 1)
Adds the top two items on the stack.

#### `SUB`(2 &rarr; 1)
Subtracts the top item on the stack from the second item.

#### `MUL`(2 &rarr; 1)
Multiplies the top two items on the stack.

#### `DIV`(2 &rarr; 1)
Divides the second item on the stack by the top item.

#### `MOD`(2 &rarr; 1)
Calculates the remainder of the division of the second item on the stack by the top item.

#### `DIVMOD`(2 &rarr; 2)
Calculates both the quotient and remainder of the division of the second item on the stack by the top item, pushing them sequentially

### Type Conversion

#### `MAKEI`(1 &rarr; 1)

Convers the top element on the stack to an integer.

#### `MAKEF`(1 &rarr; 1)

Convers the top element on the stack to a floating point number.

#### `MAKES`(1 &rarr; 1)

Convers the top element on the stack to a string.

### Comparison

#### `EQ`(2 &rarr; 1)

Compares the top two elements of the stack for equality.

#### `LESS`(2 &rarr; 1)

Compares if the element second from the top of the stack is less than the top of the stack.

#### `MORE`(2 &rarr; 1)

Compares if the element second from the top of the stack is more than the top of the stack.

#### `LESSEQ`(2 &rarr; 1)

Compares if the element second from the top of the stack is less than or equal to the top of the stack.

#### `MOREEQ`(2 &rarr; 1)

Compares if the element second from the top of the stack is more than or equal to the top of the stack.

### Miscellaneous

#### `PRINT`(1 &rarr; 0)
Prints the top item on the stack.

#### `DEBUG`(0 &rarr; 0)
Prints debugging information: Line number and stack information.

#### `EXIT`(0 &rarr; 0)
Exits the program.
