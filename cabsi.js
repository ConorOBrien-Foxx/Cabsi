const splitParams = params => {
    if(!params) {
        return [];
    }
    
    let i = 0;
    let split = [];
    let match, build = "";
    while(i < params.length) {
        if(match = params.slice(i).match(/^"(""|[^"])+?"/)) {
            build += match[0];
            i += match[0].length;
        }
        else {
            build += params[i];
            i++;
        }
        if(build.at(-1) === ",") {
            split.push(build.slice(0, -1));
            build = "";
        }
    }
    split.push(build);
    return split
        .map(segment => segment.trim())
        .filter(segment => !!segment);
};

const Instructions = {
    // stack population
    PUSH: 1,
    INPUT: 2,
    GETC: 3, // get character
    GETL: 4, // get line
    GETW: 5, // get word
    // stack manipulation
    ROT: 10, // A B C -> B C A
    DUP: 11, // A -> A A
    POP: 12, // A B -> A
    SWAP: 13, // A B -> B A
    OVER: 14, // A B -> A B A
    YEET: 15, // push to other stack
    YOINK: 16, // pop from other stack
    // control flow
    GOTO: 20,
    JP: 21, // jump positive
    JNP: 22, // jump not positive
    JN: 23, // jump negative
    JNN: 24, // jump not negative
    JZ: 25, // jump zero
    GOSUB: 26, // go to subroutine
    RETURN: 27, // return from subroutine
    JNL: 28, // jump if null
    // math
    INC: 30, // increment
    DEC: 31, // decrement
    ADD: 32,
    SUB: 33,
    MUL: 34,
    DIV: 35,
    MOD: 36,
    DIVMOD: 37,
    // type conversion
    MAKEI: 50, // make integer
    MAKEF: 51, // make float
    MAKES: 52, // make string
    ORD: 53, // char -> value
    CHR: 54, // value -> char
    // comparison
    EQ: 60, // equal
    LESS: 61, // less
    MORE: 62, // more
    // misc
    DEBUG: 90,
    EXIT: 91,
    PRINT: 92,
};

const tokenize = code => {
    let parsed = code.split(/\r?\n/)
        .map(line => line.match(/^\s*(\d+)\s*(.*?)(?:\s*REM .*)?$/))
        .filter(line => !!line);
    let result = {};
    for(let [ match, lineNumber, line ] of parsed) {
        if(line) {
            let [ , instruction, params ] = line.match(/(\w+)(?: (.*))?/);
            const id = Instructions[instruction];
            if(!id) {
                console.warn("Unknown instruction", instruction);
            }
            result[lineNumber] = {
                line,
                lineNumber: parseInt(lineNumber, 10),
                instruction,
                id,
                params: splitParams(params),
            };
            // console.log(result[lineNumber]);
        }
    }
    let linePairs = Object.entries(result);
    linePairs.sort((a, b) => a[0] - b[0]);
    return linePairs.map(pair => pair[1]);
};

class CabsiInterpreter {
    constructor(tokens) {
        this.tokens = tokens;
        this.iptr = 0;
        this.stack = [];
        this.callStack = [];
        this.registerStack = [];
        this.lineNumberToIndexMap = {};
        this.tokens.forEach((token, idx) => {
            this.lineNumberToIndexMap[token.lineNumber] = idx;
        });
        this.inputBuffer = [];
    }
    
    error(message) {
        console.error(`${this.token.instruction}@${this.token.lineNumber}: ${message}`);
    }
    
    hasStackSize(n) {
        if(this.stack.length < n) {
            this.error(`Expected ${n} entries on stack, got ${this.stack.length}`);
            this.kill();
            return false;
        }
        return true;
    }
    
    hasRegisterStackSize(n) {
        if(this.registerStack.length < n) {
            this.error(`Expected ${n} entries on register stack, got ${this.registerStack.length}`);
            this.kill();
            return false;
        }
        return true;
    }
    
    async step() {
        this.token = this.tokens[this.iptr];
        let fn = CabsiInterpreter.InstructionMap[this.token.id];
        if(fn) {
            await fn.call(this);
        }
        else {
            console.warn("Unimplemented instruction:", this.token.instruction);
        }
        this.iptr++;
        // console.log(this.token.line, this.stack);
    }
    
    // template function: can be replaced if implemented with equivalent behavior
    async getChar() {
        if(this.inputBuffer.length) {
            return this.inputBuffer.pop();
        }
        this.fs ??= require("fs");
        let buffer = Buffer.alloc(1);
        let bytesRead = this.fs.readSync(0, buffer, 0, 1);
        
        if(!bytesRead) {
            return null;
        }
        else {
            return buffer.toString("utf8");
        }
    }
    
    // used for unbuffering to replicate certain C utils
    async ungetChar(chr) {
        this.inputBuffer.push(chr);
    }
    
    // template function: can be replaced if implemented with equivalent behavior
    async readline() {
        let chr, line = "";
        while(chr !== "\n") {
            chr = await this.getChar();
            if(chr === null) {
                break;
            }
            line += chr;
        }
        return line;
    }
    
    // template function: can be replaced if implemented with equivalent behavior
    async write(arg) {
        return process.stdout.write(arg);
    }
    
    async getInput(prompt="> ") {
        if(typeof process !== "undefined" && !process.stdin.isTTY) {
            // do not show input prompt when reading from a pipe
            prompt = "";
        }
        await this.write(prompt);
        let answer = await this.readline();
        return this.parseLiteral(answer.trim());
    }
    
    async getWord() {
        let chr, word = "";
        while(/\s/.test(chr = await this.getChar())) {
            // skip leading whitespace, if any
        }
        if(!chr) {
            return null;
        }
        word += chr;
        while((chr = await this.getChar()) !== null && !/\s/.test(chr)) {
            word += chr;
        }
        if(chr) {
            await this.ungetChar(chr);
        }
        return word;
    }
    
    parseLiteral(raw) {
        return raw === "NULL" ? null : JSON.parse(raw);
    }
    
    push(...args) {
        this.stack.push(...args);
    }
    
    async run() {
        while(this.iptr < this.tokens.length) {
            await this.step();
        }
    }
    
    parseReferenceExpression(expression) {
        let pops;
        if(expression.startsWith("@")) {
            pops = false;
        }
        else if(expression.startsWith("$")) {
            pops = true;
        }
        else {
            return expression;
        }
        const index = parseInt(expression.slice(1), 10);
        if(Number.isNaN(index) || index <= 0 || index > this.stack.length) {
            return;
        }
        return pops
            ? this.stack.splice(-index, 1)[0]
            : this.stack.at(-index);
    }
    
    parseLineNumber(str) {
        let parsed = this.parseReferenceExpression(str);
        if(typeof parsed === "string") {
            parsed = parseInt(parsed, 10);
        }
        return parsed;
    }
    
    jumpToLine(lineNumber, decrement=true) {
        let resultIndex = null;
        if(Object.hasOwn(this.lineNumberToIndexMap, lineNumber)) {
            resultIndex = this.lineNumberToIndexMap[lineNumber] ?? null;
        }
        else {
            // binary search
            let left = 0;
            let right = this.tokens.length - 1;
            while(left <= right) {
                let middle = Math.floor((left + right) / 2);
                // console.log(middle, left, right);
                // console.log(this.tokens[middle].lineNumber, lineNumber, this.tokens[middle].lineNumber > lineNumber);
                if(this.tokens[middle].lineNumber > lineNumber) {
                    resultIndex = middle;
                    right = middle - 1;
                }
                else {
                    if(left === 0 && right === 0) {
                        resultIndex = 0;
                        break;
                    }
                    else if(left === this.tokens.length - 1 && right === left) {
                        resultIndex = this.tokens.length;
                    }
                    left = middle + 1;
                }
            }
        }
        
        if(resultIndex === null) {
            console.warn("Cannot jump to line", lineNumber);
            return this.tokens.length;
        }
        
        if(decrement) {
            // decrement to counteract auto pointer increment
            resultIndex--;
        }
        
        this.iptr = resultIndex;
    }
    
    static InstructionMap = {
        [Instructions.PUSH]() {
            for(let param of this.token.params) {
                this.push(this.parseLiteral(param));
            }
        },
        async [Instructions.INPUT]() {
            if(!this.hasStackSize(1)) {
                return;
            }
            const prompt = this.stack.pop();
            const input = await this.getInput(prompt);
            this.push(input);
        },
        async [Instructions.GETC]() {
            const chr = await this.getChar();
            this.push(chr);
        },
        async [Instructions.GETL]() {
            const line = await this.readline();
            this.push(line);
        },
        async [Instructions.GETW]() {
            const word = await this.getWord();
            this.push(word);
        },
        [Instructions.MAKEI]() {
            if(!this.hasStackSize(1)) {
                return;
            }
            let top = this.stack.pop();
            let result;
            if(typeof top === "string") {
                result = parseInt(top, 10);
            }
            else {
                result = Math.trunc(result);
            }
            this.push(result);
        },
        [Instructions.MAKEF]() {
            if(!this.hasStackSize(1)) {
                return;
            }
            let top = this.stack.pop();
            let result;
            if(typeof top === "string") {
                result = parseFloat(top);
            }
            else {
                // result = result * 1.0; // js doesn't care lol
            }
            this.push(result);
        },
        [Instructions.MAKES]() {
            if(!this.hasStackSize(1)) {
                return;
            }
            this.push(this.stack.pop().toString());
        },
        [Instructions.ORD]() {
            if(!this.hasStackSize(1)) {
                return;
            }
            this.push(this.stack.pop().codePointAt(0));
        },
        [Instructions.CHR]() {
            if(!this.hasStackSize(1)) {
                return;
            }
            this.push(String.fromCharCode(this.stack.pop()));
        },
        [Instructions.GOTO]() {
            const targetLine = this.parseLineNumber(this.token.params[0]);
            this.jumpToLine(targetLine);
        },
        [Instructions.GOSUB]() {
            const targetLine = this.parseLineNumber(this.token.params[0]);
            const myLine = this.token.lineNumber;
            this.callStack.push(myLine);
            this.jumpToLine(targetLine);
        },
        [Instructions.RETURN]() {
            const returnLine = this.callStack.pop();
            this.jumpToLine(returnLine + 1);
        },
        [Instructions.DEBUG]() {
            let { lineNumber, instruction } = this.token;
            console.log(`${lineNumber} ${instruction}`, this.stack, "/", this.registerStack);
            // console.log(`${lineNumber} ${instruction} @ [ ${this.stack.join(" ")} ]`);
        },
        [Instructions.SWAP]() {
            if(!this.hasStackSize(2)) {
                return;
            }
            let [ a, b ] = this.stack.splice(-2);
            this.push(b, a);
        },
        [Instructions.OVER]() {
            if(!this.hasStackSize(2)) {
                return;
            }
            this.push(this.stack.at(-2));
        },
        [Instructions.YEET]() {
            if(!this.hasStackSize(1)) {
                return;
            }
            this.registerStack.push(this.stack.pop());
        },
        [Instructions.YOINK]() {
            if(!this.hasRegisterStackSize(1)) {
                return;
            }
            this.push(this.registerStack.pop());
        },
        [Instructions.JNL]() {
            if(!this.hasStackSize(1)) {
                return;
            }
            const targetLine = this.parseLineNumber(this.token.params[0]);
            if(this.stack.at(-1) === null) {
                this.stack.pop();
                this.jumpToLine(targetLine);
            }
        },
        [Instructions.JP]() {
            if(!this.hasStackSize(1)) {
                return;
            }
            const targetLine = this.parseLineNumber(this.token.params[0]);
            if(this.stack.at(-1) > 0) {
                this.jumpToLine(targetLine);
            }
        },
        [Instructions.JNP]() {
            if(!this.hasStackSize(1)) {
                return;
            }
            const targetLine = this.parseLineNumber(this.token.params[0]);
            if(this.stack.at(-1) <= 0) {
                this.jumpToLine(targetLine);
            }
        },
        [Instructions.JN]() {
            if(!this.hasStackSize(1)) {
                return;
            }
            const targetLine = this.parseLineNumber(this.token.params[0]);
            if(this.stack.at(-1) < 0) {
                this.jumpToLine(targetLine);
            }
        },
        [Instructions.JNN]() {
            if(!this.hasStackSize(1)) {
                return;
            }
            const targetLine = this.parseLineNumber(this.token.params[0]);
            if(this.stack.at(-1) >= 0) {
                this.jumpToLine(targetLine);
            }
        },
        [Instructions.JZ]() {
            if(!this.hasStackSize(1)) {
                return;
            }
            const targetLine = this.parseLineNumber(this.token.params[0]);
            if(this.stack.at(-1) == 0) {
                this.jumpToLine(targetLine);
            }
        },
        [Instructions.POP]() {
            if(!this.hasStackSize(1)) {
                return;
            }
            this.stack.pop();
        },
        [Instructions.ROT]() {
            if(!this.hasStackSize(3)) {
                return;
            }
            let [ a, b, c ] = this.stack.splice(-3);
            this.stack.push(b, c, a);
        },
        [Instructions.DUP]() {
            if(!this.hasStackSize(1)) {
                return;
            }
            this.stack.push(this.stack.at(-1));
        },
        [Instructions.INC]() {
            if(!this.hasStackSize(1)) {
                return;
            }
            this.push(this.stack.pop() + 1);
        },
        [Instructions.DEC]() {
            if(!this.hasStackSize(1)) {
                return;
            }
            this.push(this.stack.pop() - 1);
        },
        [Instructions.ADD]() {
            if(!this.hasStackSize(2)) {
                return;
            }
            let [ a, b ] = this.stack.splice(-2);
            this.push(a + b);
        },
        [Instructions.SUB]() {
            if(!this.hasStackSize(2)) {
                return;
            }
            let [ a, b ] = this.stack.splice(-2);
            this.push(a - b);
        },
        [Instructions.MUL]() {
            if(!this.hasStackSize(2)) {
                return;
            }
            let [ a, b ] = this.stack.splice(-2);
            this.push(a * b);
        },
        [Instructions.DIV]() {
            if(!this.hasStackSize(2)) {
                return;
            }
            let [ a, b ] = this.stack.splice(-2);
            this.push(a / b);
        },
        [Instructions.MOD]() {
            if(!this.hasStackSize(2)) {
                return;
            }
            let [ a, b ] = this.stack.splice(-2);
            this.push(a % b);
        },
        [Instructions.DIVMOD]() {
            if(!this.hasStackSize(2)) {
                return;
            }
            let [ a, b ] = this.stack.splice(-2);
            this.push(a / b);
            this.push(a % b);
        },
        [Instructions.EQ]() {
            if(!this.hasStackSize(2)) {
                return;
            }
            let [ a, b ] = this.stack.splice(-2);
            this.push(+(a === b));
        },
        [Instructions.LESS]() {
            if(!this.hasStackSize(2)) {
                return;
            }
            let [ a, b ] = this.stack.splice(-2);
            this.push(+(a < b));
        },
        [Instructions.MORE]() {
            if(!this.hasStackSize(2)) {
                return;
            }
            let [ a, b ] = this.stack.splice(-2);
            this.push(+(a > b));
        },
        [Instructions.LESSEQ]() {
            if(!this.hasStackSize(2)) {
                return;
            }
            let [ a, b ] = this.stack.splice(-2);
            this.push(+(a <= b));
        },
        [Instructions.MOREEQ]() {
            if(!this.hasStackSize(2)) {
                return;
            }
            let [ a, b ] = this.stack.splice(-2);
            this.push(+(a >= b));
        },
        [Instructions.PRINT]() {
            if(!this.hasStackSize(1)) {
                return;
            }
            console.log(this.stack.pop());
        },
        [Instructions.EXIT]() {
            this.kill();
        },
    };
    
    kill() {
        this.iptr = this.tokens.length;
        this.rl?.close();
    }
    
    static fromString(code) {
        return new CabsiInterpreter(tokenize(code));
    }
    
    static async interpret(code) {
        let interpreter = CabsiInterpreter.fromString(code);
        await interpreter.run();
        // console.log(interpreter.stack);
        interpreter.kill();
    }
}

// TODO: Cabsi-written libraries
// TODO: JS-written extensions
// TODO: loading/executing other files? GOTO File.Line?
// TODO: GOTO top of stack? stack stored somewhere "in program"? GOTO -1 means TOS? dunno
if(typeof require !== "undefined") {
    const argv = require("minimist")(process.argv.slice(2), {
        alias: {
            help: "h",
        }
    });
    // TODO: help for when there's more command line arguments
    const fileName = argv._[0];
    const fs = require("fs");
    const program = fs.readFileSync(fileName).toString();
    CabsiInterpreter.interpret(program).then(() => {
        // stuff to do after interpretation
    });
}
