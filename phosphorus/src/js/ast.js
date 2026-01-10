((text) => {
  let tokens = [];
  function tokenise(str) {
    tokens = [];
    
    const splitChars = [
      "(",")",
      "[","]",
      "{","}",
      ",",";",":","=",".","#",
      "+","-","*","/","%","^",
      "\\",
      "'","\"","`",
      " ","\n",
      "!","?"
    ];
    
    let buf = "";
    for (let i = 0; i < str.length; i ++) {
      const char = str[i];
      
      if (splitChars.includes(char)) {
        if (buf.length > 0) {
          tokens.push(buf);
        }
        tokens.push(char);
        buf = "";
      } else {
        buf += char;
      }
    }
  }
  
  // parser
  let pointer = 0;
  
  function parse() {
    pointer = 0;
    
    const ast = blockContent(true);
    
    if (!atEnd())
      throw `unexpected token ${peek()}`;
    
    return { elements: ast };
  }
  
  // utils
  const peek = (amount) =>
    tokens[pointer + (amount ?? 1) - 1];
  const consume = () =>
    tokens[pointer++];
  function consumeWhitespace() {
    while (true) {
      // whitespace
      if (/^\s$/.test(peek())) {
        consume();
        continue;
      }
      
      if (peek() === "/" && peek(2) === "/") {
        const comment = [pointer];
        consume();
        consume();
        while (peek() !== "\n" && !atEnd())
          consume();
        continue;
      }
      
      if (peek() === "/" && peek(2) === "*") {
        const comment = [pointer];
        consume();
        consume();
        while (!atEnd()) {
          if (peek() === "*" && peek(2) === "/") {
            consume();
            consume();
            break;
          }
          consume();
        }
        continue;
      }
      
      break;
    }
  }
  const atEnd = () =>
    pointer >= tokens.length;
  const expect = (...tkns) => {
    const tkn = consume();
    if (!tkns.includes(tkn)) {
      console.error(getPos());
      throw `expected ${tkns.map(t => `'${t}'`).join(" or ")} got ${tkn}`;
    }
    return tkn;
  };
  const expectText = () => {
    const tkn = consume();
    if (!/^[a-zA-Z_0-9]+$/.test(tkn)) {
      throw `identifier must consist of letters or _`;
    }
    return tkn;
  }
  
  const getPos = () => tokens
    .slice(0, pointer)
    .reduce((pos, tkn) => {
      pos.i ++;
      pos.col ++;
      pos.char += tkn.length;
      pos.colChar += tkn.length;
      pos.iChar += tkn.length;
      if (tkn == "\n") {
        pos.ln ++;
        pos.col = 0;
        pos.colChar = 0;
        pos.char = 0;
      }
      return pos;
    }, { ln: 1, col: 0, colChar: 0, char: 0, i: 0, iChar: 0 })
  
  // statement utils
  function blockContent(top) {
    const statements = [];
    
    while (peek() != "}" && !atEnd()) {
      const out = top ? topLevelStatement() : statement();
      
      if (out)
        statements.push(out);
      
      consumeWhitespace();
      while (peek() == ";")
        consume();
      consumeWhitespace();
      
      if (peek() == "}" || atEnd())
        break;
    }
    return statements;
  }
  
  // toplevel statements
  function topLevelStatement() {
    consumeWhitespace();
    
    if (peek() == "event")
      return event();
    
    // (global parsing)
    throw `unexpected token '${peek()}'`;
  }
  
  function event() {
    const start = getPos();
    expect("event");
    consumeWhitespace();
    expect("(");
    const target = eventTarget();
    expect(")");
    consumeWhitespace();
    const body = block();
    return {
      kind: "event",
      target,
      body,
      start, end: getPos()
    };
  }
  
  function eventTarget() {
    const start = getPos();
    
    const target = elementTarget();
    
    consumeWhitespace();
    
    if (peek() == ":") {
      consume();
      const eventName = expectText();
      
      return {
        kind: "property",
        target,
        eventName,
        start, end: getPos()
      };
    }
    
    pointer = start.i;
    
    return {
      kind: "global",
      target: expectText(),
      start, end: getPos()
    };
  }
  
  function elementTarget() {
    const start = getPos();
    
    if (peek() == "*") {
      consume();
      return {
        kind: "any"
      };
    }
    
    let kind = "element";
    
    if (peek() == "#") {
      consume()
      consumeWhitespace();
      kind = "id";
    }
    
    let name = expectText();
    
    return {
      kind,
      name,
      start, end: getPos()
    };
  }
  
  // statements
  function statement(noSemicolon) {
    consumeWhitespace();
    
    if (peek() == "if")
      return ifStatement();
    
    if (peek() == "while" || peek() == "until")
      return whileOrUntilStatement();
      
    if (peek() == "repeat")
      return repeatStatement();
      
    if (peek() == "for")
      return forStatement();
    
    // block
    if (peek() == "{") {
      const start = getPos();
      const body = block();
      
      return {
        kind: "block",
        body,
        start, end: getPos()
      };
    }
    
    // expression
    const start = getPos();
    const expr = expression();
    if (expr) {
      consumeWhitespace();
      if (!noSemicolon)
        expect(";");
      
      return {
        kind: "expression",
        expr,
        start, end: getPos()
      };
    }
    throw `unexpected token '${peek()}'`;
  }
  
  function ifStatement() {
    const start = getPos();
    expect("if");
    consumeWhitespace();
    expect("(");
    const cond = expression();
    expect(")");
    consumeWhitespace();
    const body = statement();
    
    const elifs = [];
    
    consumeWhitespace();
    while (peek() == "elif") {
      const start = getPos();
      consume();
      consumeWhitespace();
      expect("(");
      const cond = expression();
      expect(")");
      consumeWhitespace();
      const body = statement();
      
      elifs.push({
        cond,
        body,
        start, end: getPos()
      });
      consumeWhitespace();
    }
    
    let elseBody;
    
    consumeWhitespace();
    if (peek() == "else") {
      consume();
      consumeWhitespace();
      elseBody = statement();
    }
    
    return {
      kind: "branch",
      cond,
      body,
      elifs,
      elseBody,
      start, end: getPos()
    };
  }
  
  function whileOrUntilStatement() {
    const start = getPos();
    
    const kind = consume();
    consumeWhitespace();
    expect("(");
    const cond = expression();
    expect(")");
    consumeWhitespace();
    const body = statement();
    
    return {
      kind,
      cond,
      body,
      start, end: getPos()
    };
  }
  
  function repeatStatement() {
    const start = getPos();
    
    consume();
    consumeWhitespace();
    expect("(");
    const amount = expression();
    expect(")");
    consumeWhitespace();
    const body = statement();
    
    return {
      kind: "repeat",
      amount,
      body,
      start, end: getPos()
    };
  }
  
  function forStatement() {
    const start = getPos();
    
    consume();
    consumeWhitespace();
    expect("(");
    
    const varName = expectText();
    
    consumeWhitespace();
    expect(",");
    consumeWhitespace();
    
    const arr = expression();
    
    expect(")");
    consumeWhitespace();
    
    const body = statement();
    
    return {
      kind: "for",
      var: varName,
      arr,
      body,
      start, end: getPos()
    };
  }
  
  function block() {
    const start = getPos();
    
    expect("{");
    consumeWhitespace();
    const elements = blockContent();
    consumeWhitespace();
    expect("}");
    
    return {
      elements,
      start, end: getPos()
    };
  }
  
  // expression
  function expression() {
    return declare();
  }
  function declare() {
    if (/^[a-zA-Z_]\w*$/.test(peek())) {
      const start = getPos();
      
      const tar = consume();
      consumeWhitespace();
      if (peek() == ":" && peek(2) == "=") {
        consume();
        consume();
        consumeWhitespace();
        
        const val = expression();
        
        return {
          kind: "decl",
          tar,
          val,
          start, end: getPos()
        };
      }
      
      pointer = start.i;
    }
    
    return assignment();
  }
  function assignment() {
    const start = getPos();
    const expr = equality();
    consumeWhitespace();
    
    let op = null;
    
    if (peek() + peek(2) == "??" && peek(3) == "=") {
      op = peek() + peek(2);
    } else if (["+","-","*","/","%","^"].includes(peek()) && peek(2) == "=") {
      op = peek();
    }
    
    if (op != null || peek() == "=") {
      if (op != null) {
        for (let i = 0; i < op.length; i ++) {
          consume();
        }
      }
      
      consume();
      consumeWhitespace();
      
      const val = expression();
      
      return {
        kind: "asi",
        op,
        tar: expr,
        val,
        start, end: getPos()
      };
    }
    
    return expr;
  }
  function equality() {
    const start = getPos();
    
    let expr = comparison();
    consumeWhitespace()
    
    if (["==","!="].includes(peek() + peek(2))) {
      const op = consume() + consume();
      consumeWhitespace();
      const right = comparison();
      
      expr = {
        kind: "binary",
        op,
        left: expr,
        right,
        start, end: getPos()
      }
    }
    
    return expr;
  }
  function comparison() {
    const start = getPos();
    
    let expr = term();
    consumeWhitespace();
    
    if ([">","<"].includes(peek())) {
      let op = consume();
      if (peek() == "=")
        op += consume();
      consumeWhitespace();
      const right = term();
      
      expr = {
        kind: "binary",
        op,
        left: expr,
        right,
        start, end: getPos()
      }
    }
    
    return expr;
  }
  function term() {
    const start = getPos();
    
    let expr = factor();
    consumeWhitespace();
    
    while (["+","-"].includes(peek()) && peek(2) != "=" && !atEnd()) {
      const op = consume();
      const right = factor();
      
      expr = {
        kind: "binary",
        op,
        left: expr,
        right,
        start, end: getPos()
      };
      
      consumeWhitespace();
    }
    
    return expr;
  }
  function factor() {
    const start = getPos();
    
    let expr = otherBinary();
    consumeWhitespace();
    
    while (["*","/"].includes(peek()) && peek(2) != "=" && !atEnd()) {
      const op = consume();
      const right = otherBinary();
      
      expr = {
        kind: "binary",
        op,
        left: expr,
        right,
        start, end: getPos()
      };
      
      consumeWhitespace();
    }
    
    return expr;
  }
  function otherBinary() {
    const start = getPos();
    
    let expr = coalescence();
    consumeWhitespace();
    
    while (["%","^"].includes(peek()) && peek(2) != "=" && !atEnd()) {
      const op = consume() + consume();
      const right = coalescence();
      
      expr = {
        kind: "binary",
        op,
        left: expr,
        right,
        start, end: getPos()
      };
      
      consumeWhitespace();
    }
    
    return expr;
  }
  function coalescence() {
    const start = getPos();
    
    let expr = unary();
    consumeWhitespace();
    
    while (peek() + peek(2) == "??" && peek(3) != "=" && !atEnd()) {
      const op = consume() + consume();
      const right = unary();
      
      expr = {
        kind: "binary",
        op,
        left: expr,
        right,
        start, end: getPos()
      };
      
      consumeWhitespace();
    }
    
    return expr;
  }
  function unary() {
    const start = getPos();
    
    if (peek(2) != "=") {
      switch (peek()) {
        case "-": case "+": case "!": case "?":
          return {
            kind: "unary",
            type: consume(),
            expr: call(),
            start, end: getPos()
          };
      }
    }
    
    return call();
  }
  function call() {
    const start = getPos();
    
    if (peek() == "call" && peek(2) == "(") {
      consume();
      expect("(");
      const name = expectText();
      expect(")");
      return {
        kind: "call_event",
        name,
        start, end: getPos()
      };
    }
    
    let expr = func();
    
    consumeWhitespace();
    if (peek() == "(") {
      consume();
      
      const args = [];
      while (peek() != ")" && !atEnd()) {
        const out = expression();
        if (out != null)
          args.push(out);
        
        consumeWhitespace();
        
        if (peek() == ",")
          consume();
        else if (peek() != ")")
          expect(",", ")");
      }
      expect(")");
      
      expr = {
        kind: "call",
        func: expr,
        args,
        start, end: getPos()
      };
    }
    
    return expr;
  }
  function func() {
    const start = getPos();
    
    consumeWhitespace();
    
    let is = false;
    if (peek() == "(") {
      let depth = 0;
      while (!atEnd()) {
        const tkn = consume();
        if (tkn == "(")
          depth ++;
        if (tkn == ")")
          depth --;
        
        if (tkn == ")" && depth == 0) {
          is = true;
          break;
        }
      }
    }
    consumeWhitespace();
    if (is && peek() == "~") {
      pointer = start.i;
      consumeWhitespace();
      
      const args = [];
      
      consume();
      consumeWhitespace();
      
      while (peek() != ")" && !atEnd()) {
        const tkn = expectText();
        args.push({
          name: tkn
        });
        
        consumeWhitespace();
        
        if (peek() == ",")
          consume();
        else if (peek() != ")")
          expect(",", ")");
          
        consumeWhitespace();
      }
      
      expect(")");
      consumeWhitespace();
      expect("~");
      consumeWhitespace();
      
      const body = statement(true);
      
      return {
        kind: "func",
        args,
        body,
        start, end: getPos()
      }
    }
    
    pointer = start.i;
    
    return property();
  }
  function property() {
    const start = getPos();
    
    let expr = primary();
    consumeWhitespace();
    
    while (peek() == "[" || peek() == "." && !atEnd()) {
      let key;
      
      if (peek() == "[") {
        consume();
        key = expression();
        expect("]");
      } else if (peek() == ".") {
        consume();
        key = expectText();
      } else
        throw `unexpected token '${peek()}'`;
      
      expr = {
        kind: "prop",
        obj: expr,
        key,
        start, end: getPos()
      };
      
      consumeWhitespace();
      
      while (peek() == "(") {
        consume();
        
        const args = [];
        while (peek() != ")" && !atEnd()) {
          const out = expression();
          if (out != null)
            args.push(out);
          
          consumeWhitespace();
          
          if (peek() == ",")
            consume();
          else if (peek() != ")")
            expect(",", ")");
        }
        expect(")");
        
        expr = {
          kind: "call",
          func: expr,
          args,
          start, end: getPos()
        };
      }
      
      consumeWhitespace();
    }
    
    return expr;
  }
  
  function primary() {
    consumeWhitespace();
    
    if (peek() == "(") {
      consume();
      const expr = expression();
      expect(")");
      return expr;
    }
    
    if (["'", "\"", "`"].includes(peek()))
      return str();
    
    if (/^[0-9]+$/.test(peek()))
      return num();
    
    if (peek() == "#")
      return color();
    
    if (peek() == "[")
      return arr();
    
    if (peek() == "{")
      return obj();
    
    if (/^[a-zA-Z_\$][\w\s\$]*$/.test(peek())) {
      const start = getPos();
      return {
        kind: "var",
        name: consume(),
        start, end: getPos()
      };
    }
    
    console.error(getPos());
    throw `unexpected token '${peek()}'`;
  }
  
  // values
  function str() {
    const start = getPos();
    
    const quote = expect("'", "\"", "`");
    
    let content = "";
    
    while (!atEnd()) {
      const tkn = peek();
      
      if (tkn == "\\") {
        consume();
        const tkn = consume();
        // text tokens are combined,
        // which means that things like
        // wow\nhi im text
        // would be
        // ["wow","\\","nhi",...]
        //              ^- so i split it
        //                 and grab the first char
        let char = tkn[0];
        
        const charMap = {
          "n": "\n"
        };
        char = charMap[char] ?? char;
        
        content += char;
        continue;
      }
      
      if (tkn == quote)
        break;
      else
        content += consume();
    }
    expect(quote);
    
    return {
      kind: "str",
      val: content,
      start, end: getPos()
    };
  }
  function num() {
    if (!/^[0-9]+$/.test(peek()))
      throw `unexpected token '${peek()}'`;
    
    const start = getPos();
    let val = consume();
    
    if (peek() == ".") {
      val += consume();
      if (!/^[0-9]+$/.test(peek()))
        throw `unexpected token '${peek()}'`;
      val += consume();
    }
    
    let kind = "num";
    if (peek() == "%") {
      consume();
      kind = "percentage";
    }
    
    val = Number(val);
    
    return {
      kind,
      val,
      start, end: getPos()
    };
  }
  function color() {
    const start = getPos();
    
    let val = expect("#");
    const code = consume();
    if (!/^[0123456789abcdef]{3,}$/.test(code))
      throw "hex must consist of 3 to 6 characters of 0-f";
    if (![3,6].includes(code.length))
      throw "hex code must be 3 or 6 characters long";
    val += code;
    
    return {
      kind: "color",
      val,
      start, end: getPos()
    };
  }
  function arr() {
    const start = getPos();
    
    expect("[");
    consumeWhitespace();
    
    const elems = [];
    
    while (peek() != "]" && !atEnd()) {
      elems.push(expression());
      
      consumeWhitespace();
      if (peek() == ",")
        consume();
      else if (peek() != "]")
        expect(",", "]");
    }
    
    expect("]");
    
    return {
      kind: "arr",
      elems,
      start, end: getPos()
    }
  }
  function obj() {
    const start = getPos();
    
    expect("{");
    consumeWhitespace();
    
    const pairs = [];
    
    while (peek() != "}" && !atEnd()) {
      consumeWhitespace();
      const name = expectText();
      
      consumeWhitespace();
      expect(":");
      
      consumeWhitespace();
      const value = expression();
      
      pairs.push({ name, value });
      
      consumeWhitespace();
      if (peek() == ",")
        consume();
      else if (peek() != "}")
        expect(",", "}");
    }
    expect("}")
    
    return {
      kind: "obj",
      pairs,
      start, end: getPos()
    };
  }
  
  try {
    tokenise(text);
    
    return parse();
  } catch (e) {
    console.error(e);
  }
  return {}
})