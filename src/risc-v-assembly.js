
CodeMirror.defineMode("risc-v-assmebly", function(config, parserConfig) {
    const opcodes = [
        /addi/i, /add/i
    ]
    class Mode {
        constructor() {
            console.log("Mode has been initewd")
        }

        startState() {
            return {
                in_comment: 0,
                n_tokens: 0
            }
        }
        token(stream, state) {
            console.log(stream, state)
            if (state.in_comment) {
                stream.skipToEnd();
                state.in_comment = 0;
                return "comment";
            }
            let sol = stream.sol();

            if (stream.match(/(#|\/\/)/)) {
                state.in_comment = 1;
                return "comment"
            }

            if (stream.eol()) {
                stream.next()
            }
            stream.eatWhile(/\w/);
            let wd = stream.current();
            for (var i=0; i<opcodes.length; i+=1) {
                if (sol && opcodes[i].test(wd)) {
                    return "keyword";
                }
            }
            console.log(wd);
            //stream.eatWhile(/(\s|,)/);
            stream.next();
            return "string"
        }
    }

    return new Mode();
})