var parseRegister = function(reg_name) {
    switch(reg_name) {
    case 0:
    case "x0":
    case "zero":
        return 0;
    case "x1":
    case "ra":
        return 1;
    case "x2":
    case "sp":
        return 2;
    case "x3":
    case "gp":
        return 3;
    case "x4":
    case "tp":
        return 4;
    case "x5":
    case "t0":
        return 5;
    case "x6":
    case "t1":
        return 6;
    case "x7":
    case "t2":
        return 7;
    case "x8":
    case "s0":
    case "fp":
        return 8;
    case "x9":
    case "s1":
        return 9;
    case "x10":
    case "a0":
        return 10;
    case "x11":
    case "a1":
        return 11;
    case "x12":
    case "a2":
        return 12;
    case "x13":
    case "a3":
        return 13;
    case "x14":
    case "a4":
        return 14;
    case "x15":
    case "a5":
        return 15;
    case "x16":
    case "a6":
        return 16;
    case "x17":
    case "a7":
        return 17;
    case "x18":
    case "s2":
        return 18;
    case "x19":
    case "s3":
        return 19;
    case "x20":
    case "s4":
        return 20;
    case "x21":
    case "s5":
        return 21;
    case "x22":
    case "s6":
        return 22;
    case "x23":
    case "s7":
        return 23;
    case "x24":
    case "s8":
        return 24;
    case "x25":
    case "s9":
        return 25;
    case "x26":
    case "s10":
        return 26;
    case "x27":
    case "s11":
        return 27;
    case "x28":
    case "t3":
        return 28;
    case "x29":
    case "t4":
        return 29;
    case "x30":
    case "t5":
        return 30;
    case "x31":
    case "t6":
        return 31;
    }
    return -1;
}

var parseImm = function(imm, type) {
    let value;
    switch (type) {
    case "?":
        return 0xFFFFFFFF;
    case "R":
        return 0;
    case "I":
        value = parseInt(imm);
        if (value > 0x7FF || value < -0x800) {
            return 0xFFFFFFFE;
        }
        if (value < 0) {
            value = 0x1000 + value;
        }
        value = value << 20;
        return value;
    case "S":
        value = parseInt(imm);
        if (value > 0x7FF || value < -0x800) {
            return 0xFFFFFFFE;
        }
        if (value < 0) {
            value = 0x1000 + value;
        }
        value = ((value & 0b111111100000) << 25) | ((value & 0b11111) << 7);
        return value;
    case "SB":
        value = parseInt(imm);
        if (value > 0x7FF || value < -0x800) {
            return 0xFFFFFFFE;
        }
        if (value < 0) {
            value = 0x10000 + value;
        }
        value = ((value & 0b1000000000000) << 19) | ((value & 0b0011111100000) << 20)
                | ((value & 0b0000000011110) << 7) | ((value & 0b0100000000000) >> 4);
        return value;
    case "U":
        value = parseInt(imm);
        if (value > 0x7FFFFFFF || value < -0x80000000) {
            return 0xFFFFFFFE;
        }
        if (value < 0) {
            value = 0x100000000 + value;
        }
        value = value << 12;
        return value;
    case "UJ":
        value = parseInt(imm);
        if (value > 0x1FFFFF || value < -0x200000) {
            return 0xFFFFFFFE;
        }
        if (value < 0) {
            value = 0x200000 + value;
        }
        value = ((value & 0b100000000000000000000) << 11) | ((value & 0b000000000011111111110) << 20)
                | ((value & 0b000000000100000000000) << 9) | ((value & 0b011111111000000000000) << 0);
        
        return value;
    }
    return 0xFFFFFFFF;
}
/**
Two Pass Assembler Steps

1. remove comments & blank lines

2. create literal table and symbol table

3. pass 1   extract symbols, labels, literals

4. pass 2   combine literal table and symbol table

5. convert to binary program in form of object code

    */
var assemble = function(code) {

    var literal_table = {};
    var symbol_table = {};

    var getLabel = function(label) {
        if (symbol_table[label] != null) {
            return symbol_table[label];
        }
    }

    code = code.split(/\r*\n/);
    var pc_counter = 0;
    var tokenized = [];

    // 1st pass
    for (let i=0; i<code.length; i+=1) {
        let line = code[i];

        // remove the comments
        let comment_index = line.search("#");
        if (comment_index != -1)
            line = line.slice(0, comment_index);
        
        if (!(/\S/.test(line))) continue;     // continue if is blank line

        // test if this is a symbol
        if (/:/.test(line)) {
            line = line.replace(/\s+/g, "").replace(":", "");
            symbol_table[line] = pc_counter;
            continue;
        }


        // regularize the pattern, prepare for tokenization
        line = line.replace(/\(/g, " ").replace(/\)/g, " ").replace(/,/g, " ").replace(/\s+/g, " ");
        
        line = line.trim();                   // remove leading and trailing space

        // tokenization
        tokens = line.split(" ");


        tokenized.push({line_number: i, tokens: tokens});
        pc_counter += 4;
    }

    var line_count = pc_counter;

    console.log(symbol_table);
    console.log(tokenized);

    var binary_output = [];
    // 2nd pass
    for (let i=0; i<tokenized.length; i+=1) {
        let pc = i * 4;
        let tokens = tokenized[i].tokens;
        let line_number = tokenized[i].line_number;
        let inst = tokens[0];

        var inst_fmt = "?";
        var opcode = -1;
        var rd = 0;
        var funct3 = 0;
        var rs1 = 0;
        var rs2 = 0;
        var imm = 0;
        var funct7 = 0;

        switch (inst) {
            case "lb":
            inst_fmt = "I";
            opcode = 0x03;
            rd = tokens[1];
            funct3 = 0x0;
            rs1 = tokens[3];
            imm = tokens[2];
            break;
            case "lh":
            inst_fmt = "I";
            opcode = 0x03;
            rd = tokens[1];
            funct3 = 0x1;
            rs1 = tokens[3];
            imm = tokens[2];
            break;
            case "lw":
            inst_fmt = "I";
            opcode = 0x03;
            rd = tokens[1];
            funct3 = 0x2;
            rs1 = tokens[3];
            imm = tokens[2];
            break;
            case "ld":
            inst_fmt = "I";
            opcode = 0x03;
            rd = tokens[1];
            funct3 = 0x3;
            rs1 = tokens[3];
            imm = tokens[2];
            break;
            case "lbu":
            inst_fmt = "I";
            opcode = 0x03;
            rd = tokens[1];
            funct3 = 0x4;
            rs1 = tokens[3];
            imm = tokens[2];
            break;
            case "lhu":
            inst_fmt = "I";
            opcode = 0x03;
            rd = tokens[1];
            funct3 = 0x5;
            rs1 = tokens[3];
            imm = tokens[2];
            break;
            case "lwu":
            inst_fmt = "I";
            opcode = 0x03;
            rd = tokens[1];
            funct3 = 0x6;
            rs1 = tokens[3];
            imm = tokens[2];
            break;
            case "addi":
            inst_fmt = "I";
            opcode = 0x13;
            rd = tokens[1];
            funct3 = 0x0;
            rs1 = tokens[2];
            imm = tokens[3];
            break;
            case "slli":
            inst_fmt = "I";
            opcode = 0x13;
            rd = tokens[1];
            funct3 = 0x1;
            rs1 = tokens[2];
            imm = tokens[3];
            funct7 = 0x00;
            break;
            case "slti":
            inst_fmt = "I";
            opcode = 0x13;
            rd = tokens[1];
            funct3 = 0x2;
            rs1 = tokens[2];
            imm = tokens[3];
            break;
            case "sltiu":
            inst_fmt = "I";
            opcode = 0x13;
            rd = tokens[1];
            funct3 = 0x3;
            rs1 = tokens[2];
            imm = tokens[3];
            break;
            case "xori":
            inst_fmt = "I";
            opcode = 0x13;
            rd = tokens[1];
            funct3 = 0x4;
            rs1 = tokens[2];
            imm = tokens[3];
            break;
            case "srli":
            inst_fmt = "I";
            opcode = 0x13;
            rd = tokens[1];
            funct3 = 0x5;
            rs1 = tokens[2];
            imm = tokens[3];
            funct7 = 0x00;
            break;
            case "srai":
            inst_fmt = "I";
            opcode = 0x13;
            rd = tokens[1];
            funct3 = 0x5;
            rs1 = tokens[2];
            imm = tokens[3];
            funct7 = 0x20;
            break;
            case "ori":
            inst_fmt = "I";
            opcode = 0x13;
            rd = tokens[1];
            funct3 = 0x6;
            rs1 = tokens[2];
            imm = tokens[3];
            break;
            case "andi":
            inst_fmt = "I";
            opcode = 0x13;
            rd = tokens[1];
            funct3 = 0x7;
            rs1 = tokens[2];
            imm = tokens[3];
            break;
            case "auipc":
            inst_fmt = "U";
            opcode = 0x17;
            rd = tokens[1];
            imm = tokens[2];
            break;
            case "addiw":
            inst_fmt = "I";
            opcode = 0x1B;
            rd = tokens[1];
            funct3 = 0x0;
            rs1 = tokens[2];
            imm = tokens[3];
            break;
            case "slliw":
            inst_fmt = "I";
            opcode = 0x1B;
            rd = tokens[1];
            funct3 = 0x1;
            rs1 = tokens[2];
            imm = tokens[3];
            funct7 = 0x00;
            break;
            case "srliw":
            inst_fmt = "I";
            opcode = 0x1B;
            rd = tokens[1];
            funct3 = 0x5;
            rs1 = tokens[2];
            imm = tokens[3];
            funct7 = 0x00;
            break;
            case "sraiw":
            inst_fmt = "I";
            opcode = 0x1B;
            rd = tokens[1];
            funct3 = 0x5;
            rs1 = tokens[2];
            imm = tokens[3];
            funct7 = 0x20;
            break;
            case "sb":
            inst_fmt = "S";
            opcode = 0x23;
            funct3 = 0x0;
            rs1 = tokens[3];
            rs2 = tokens[1];
            imm = tokens[2];
            break;
            case "sh":
            inst_fmt = "S";
            opcode = 0x23;
            funct3 = 0x1;
            rs1 = tokens[3];
            rs2 = tokens[1];
            imm = tokens[2];
            break;
            case "sw":
            inst_fmt = "S";
            opcode = 0x23;
            funct3 = 0x2;
            rs1 = tokens[3];
            rs2 = tokens[1];
            imm = tokens[2];
            break;
            case "sd":
            inst_fmt = "S";
            opcode = 0x23;
            funct3 = 0x3;
            rs1 = tokens[3];
            rs2 = tokens[1];
            imm = tokens[2];
            break;
            case "add":
            inst_fmt = "R";
            opcode = 0x33;
            rd = tokens[1];
            funct3 = 0x0;
            rs1 = tokens[2];
            rs2 = tokens[3];
            funct7 = 0x00;
            break;
            case "sub":
            inst_fmt = "R";
            opcode = 0x33;
            rd = tokens[1];
            funct3 = 0x0;
            rs1 = tokens[2];
            rs2 = tokens[3];
            funct7 = 0x20;
            break;
            case "sll":
            inst_fmt = "R";
            opcode = 0x33;
            rd = tokens[1];
            funct3 = 0x1;
            rs1 = tokens[2];
            rs2 = tokens[3];
            funct7 = 0x00;
            break;
            case "slt":
            inst_fmt = "R";
            opcode = 0x33;
            rd = tokens[1];
            funct3 = 0x2;
            rs1 = tokens[2];
            rs2 = tokens[3];
            funct7 = 0x00;
            break;
            case "sltu":
            inst_fmt = "R";
            opcode = 0x33;
            rd = tokens[1];
            funct3 = 0x3;
            rs1 = tokens[2];
            rs2 = tokens[3];
            funct7 = 0x00;
            break;
            case "xor":
            inst_fmt = "R";
            opcode = 0x33;
            rd = tokens[1];
            funct3 = 0x4;
            rs1 = tokens[2];
            rs2 = tokens[3];
            funct7 = 0x00;
            break;
            case "srl":
            inst_fmt = "R";
            opcode = 0x33;
            rd = tokens[1];
            funct3 = 0x5;
            rs1 = tokens[2];
            rs2 = tokens[3];
            funct7 = 0x00;
            break;
            case "sra":
            inst_fmt = "R";
            opcode = 0x33;
            rd = tokens[1];
            funct3 = 0x5;
            rs1 = tokens[2];
            rs2 = tokens[3];
            funct7 = 0x20;
            break;
            case "or":
            inst_fmt = "R";
            opcode = 0x33;
            rd = tokens[1];
            funct3 = 0x6;
            rs1 = tokens[2];
            rs2 = tokens[3];
            funct7 = 0x00;
            break;
            case "and":
            inst_fmt = "R";
            opcode = 0x33;
            rd = tokens[1];
            funct3 = 0x7;
            rs1 = tokens[2];
            rs2 = tokens[3];
            funct7 = 0x00;
            break;
            case "lui":
            inst_fmt = "U";
            opcode = 0x37;
            rd = tokens[1];
            imm = tokens[2];
            break;
            case "addw":
            inst_fmt = "R";
            opcode = 0x3B;
            rd = tokens[1];
            funct3 = 0x0;
            rs1 = tokens[2];
            rs2 = tokens[3];
            funct7 = 0x00;
            break;
            case "subw":
            inst_fmt = "R";
            opcode = 0x3B;
            rd = tokens[1];
            funct3 = 0x0;
            rs1 = tokens[2];
            rs2 = tokens[3];
            funct7 = 0x20;
            break;
            case "sllw":
            inst_fmt = "R";
            opcode = 0x3B;
            rd = tokens[1];
            funct3 = 0x1;
            rs1 = tokens[2];
            rs2 = tokens[3];
            funct7 = 0x00;
            break;
            case "srlw":
            inst_fmt = "R";
            opcode = 0x3B;
            rd = tokens[1];
            funct3 = 0x5;
            rs1 = tokens[2];
            rs2 = tokens[3];
            funct7 = 0x00;
            break;
            case "sraw":
            inst_fmt = "R";
            opcode = 0x3B;
            rd = tokens[1];
            funct3 = 0x5;
            rs1 = tokens[2];
            rs2 = tokens[3];
            funct7 = 0x20;
            break;
            case "beq":
            inst_fmt = "SB";
            opcode = 0x63;
            funct3 = 0x0;
            rs1 = tokens[1];
            rs2 = tokens[2];
            label = tokens[3];
            imm = tokens[3];
            break;
            case "bne":
            inst_fmt = "SB";
            opcode = 0x63;
            funct3 = 0x1;
            rs1 = tokens[1];
            rs2 = tokens[2];
            imm = tokens[3];
            break;
            case "blt":
            inst_fmt = "SB";
            opcode = 0x63;
            funct3 = 0x4;
            rs1 = tokens[1];
            rs2 = tokens[2];
            imm = tokens[3];
            break;
            case "bge":
            inst_fmt = "SB";
            opcode = 0x63;
            funct3 = 0x5;
            rs1 = tokens[1];
            rs2 = tokens[2];
            imm = tokens[3];
            break;
            case "bltu":
            inst_fmt = "SB";
            opcode = 0x63;
            funct3 = 0x6;
            rs1 = tokens[1];
            rs2 = tokens[2];
            imm = tokens[3];
            break;
            case "bgeu":
            inst_fmt = "SB";
            opcode = 0x63;
            funct3 = 0x7;
            rs1 = tokens[1];
            rs2 = tokens[2];
            imm = tokens[3];
            break;
            case "jalr":
            inst_fmt = "I";
            opcode = 0x67;
            rd = tokens[1];
            funct3 = 0x0;
            rs1 = tokens[1];
            imm = tokens[2];
            break;
            case "jal":
            inst_fmt = "UJ";
            opcode = 0x6F;
            rd = tokens[1];
            imm = tokens[2];
            break;
            case "ecall":
            inst_fmt = "I";
            opcode = 0x73;
            rd = tokens[1];
            funct3 = 0x0;
            rs1 = tokens[1];
            funct7 = 0x000;
            imm = tokens[2];
            break;
            case "ebreak":
            inst_fmt = "I";
            opcode = 0x73;
            rd = tokens[1];
            funct3 = 0x0;
            rs1 = tokens[1];
            funct7 = 0x001;
            imm = tokens[2];
            break;
        }

        if (inst_fmt == "?") {
            //alert(`line: ${line_number}\nunknown instruction "${inst}"`);
            console_output_DOM.value += `line ${line_number}\nERROR: unknown instruction "${inst}"\n`;
            return "";
        }

        rd = parseRegister(rd);
        if (rd == -1) {
            //alert(`line: ${line_number}\nrd format error`);
            console_output_DOM.value += `line ${line_number}\nERROR: rd format error\n`;
            return "";
        }
            

        rs1 = parseRegister(rs1);
        if (rs1 == -1) {
            //alert(`line ${line_number}\nERROR: rs1 format error`);
            console_output_DOM.value += `line ${line_number}\nERROR: rs1 format error\n`;
            return "";
        }
        
        rs2 = parseRegister(rs2);
        if (rs2 == -1) {
            //alert(`line ${line_number}\nERROR: rs2 format error`);
            console_output_DOM.value += `line ${line_number}\nERROR: rs2 format error\n`;
            return "";
        }

        if (!/^0x[0-9A-Fa-f]+$/.test(imm) && !/^(-)?\d+$/.test(imm)) {
        //if (typeof(imm) == "string") {
            console.log("imm not a number");
            imm = symbol_table[imm] - pc;
        }

        imm = parseImm(imm, inst_fmt);
        

        if (imm == 0xFFFFFFFF) {
            //alert(`line: ${line_number}\nimmediate format error`);
            console_output_DOM.value += `line ${line_number}\nERROR: immediate format error\n`;
            return "";
        }
            
        if (imm == 0xFFFFFFFE) {
            //alert(`line ${line_number}\nERROR: immediate out of range`);
            console_output_DOM.value += `line ${line_number}\nERROR: immediate out of range\n`;
            return "";
        }
        

        console.log(`${opcode} ${rd} ${funct3} ${rs1} ${rs2} ${funct7} ${imm}`)
        
        let binary = 0;
        binary |= opcode;
        binary |= rd << 7;
        binary |= funct3 << 12;
        binary |= rs1 << 15;
        binary |= rs2 << 20;
        binary |= funct7 << 25;
        binary |= imm;

        //console.log(binary, (binary.toString(16)).padStart(8, "0").toUpperCase())

        binary_output.push(binary);
    }


    let output = "";
    for (let i=0; i<binary_output.length; i+=1) {
        let output_format = parseInt(assembly_output_format_DOM.value);
        if (output_format == 16) {
            output += (binary_output[i] >>> 0).toString(16).padStart(8, "0").toUpperCase() + "\n";
        }
        else if (output_format == 2) {
            output += (binary_output[i] >>> 0).toString(2).padStart(32, "0") + "\n";
        }
        else if (output_format == -2) {
            let text = (binary_output[i] >>> 0).toString(2).padStart(32, "0");
            output += `${text.slice(0, 4)} ${text.slice(4, 8)} ${text.slice(8, 12)} ${text.slice(12, 16)} ${text.slice(16, 20)} ${text.slice(20, 24)} ${text.slice(24, 28)} ${text.slice(28, 32)}\n`;
        }
    
    //console.log("0x", (binary_output[i].toString(16)).padStart(8, "0").toUpperCase())
    }
    return output;
}