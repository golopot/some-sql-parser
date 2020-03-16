// [] error when order of clauses is wrong, like SELECT a LIMIT 1 WHERE ...
// [] function call expression
// [] parenthesis expression
// [x] member expression
// [] alias expression
// [x] wildcard star expression
// [] SELECT DISTINCT
// [] subquery
// [x] parse left join as one keyword
// [] lexer

const reservedWords = require('./reservedWords');

/**
 * @typedef {import('./types').ParserState} ParserState
 */

/**
 * @param {ParserState} parser
 * @returns {string}
 */
function getChar(parser) {
  return parser.source[parser.pos];
}

/**
 * @param {ParserState} parser
 * @returns {void}
 */
function advanceOne(parser) {
  parser.pos += 1; // eslint-disable-line no-param-reassign
}

/**
 * @param {ParserState} parser
 * @param {number} pos
 * @returns {void}
 */
function setPos(parser, pos) {
  parser.pos = pos; // eslint-disable-line no-param-reassign
}

// /**
//  * @param {ParserState} parser
//  * @returns {boolean}
//  */
// function isEOF(parser) {
//   return parser.pos === parser.source.length;
// }

class ParseError extends SyntaxError {
  /**
   * @param {string} message
   * @param {ParserState} parser
   * @param {number} [pos]
   */
  constructor(message, parser, pos = parser.pos) {
    super(message);
    this.pos = pos;
  }
}

/**
 *
 * @param {ParserState} parser
 * @param {RegExp} regExp
 * @param {string} [message]
 * @returns {string}
 */
function consumeRegExp(parser, regExp, message) {
  const match = regExp.exec(parser.source.slice(parser.pos));
  if (!match) {
    throw SyntaxError(`${message} At ${parser.pos}.`);
  }

  parser.pos += match[0].length; // eslint-disable-line no-param-reassign
  return match[0];
}

/**
 *
 * @param {ParserState} parser
 * @param {string} char
 * @param {string} [message]
 * @returns {string}
 */
function consumeChar(parser, char, message) {
  if (parser.source[parser.pos] !== char) {
    throw new ParseError(message || `"${char}" expected.`, parser);
  }
  parser.pos += 1; // eslint-disable-line no-param-reassign
  return char;
}

/**
 * @param {ParserState} parser
 * @param {string} char
 * @returns {boolean}
 */
function consumeCharOpt(parser, char) {
  if (parser.source[parser.pos] !== char) {
    return false;
  }
  parser.pos += 1; // eslint-disable-line no-param-reassign
  return true;
}

/**
 *
 * @param {ParserState} parser
 * @param {RegExp} regExp
 * @returns {string|undefined}
 */
function consumeRegExpOpt(parser, regExp) {
  const match = regExp.exec(parser.source.slice(parser.pos));
  if (!match) {
    return undefined;
  }

  parser.pos += match[0].length; // eslint-disable-line no-param-reassign
  return match[0];
}

function consumeSpaces(parser) {
  consumeRegExp(parser, /^[ \t\r\n]*/);
}

/**
 * @param {string} word
 * @returns {boolean}
 */
function isReservedWord(word) {
  return reservedWords.has(word.toUpperCase());
}

/**
 * @param {string|undefined} text
 * @returns {boolean}
 */
function isClauseKeyword(text) {
  if (text === undefined) {
    return false;
  }
  switch (text.toUpperCase()) {
    case 'SELECT':
    case 'UPDATE':
    case 'INSERT':
    case 'DELETE':
    case 'CREATE':
    case 'FROM':
    case 'WHERE':
    case 'HAVING':
    case 'SET':
    case 'LIMIT':
    case 'INTO':
    case 'LEFT':
    case 'RIGHT':
    case 'JOIN':
    case 'ON':
    case 'GROUP':
    case 'BY':
      return true;
    default:
      return false;
  }
}

const precedenceMap = new Map([
  ['.', 20],
  ['+', 10],
  ['-', 10],
  ['*', 11],
  ['/', 9],
  ['=', 8],
  ['%', 8],
  ['AS', 0],
]);

/**
 * @param {string} token
 * @returns {number}
 */
function getPrecedence(token) {
  const precedence = precedenceMap.get(token);
  return precedence !== undefined ? precedence : -1;
}

/**
 * @param {ParserState} parser
 * @returns {string | undefined}
 */
function getWord(parser) {
  consumeSpaces(parser);
  const word = /^\w+/.exec(parser.source.slice(parser.pos));
  return word === null ? undefined : word[0];
}

/**
 * @param {ParserState} parser
 * @returns {string | undefined}
 */
function consumeWord(parser) {
  consumeSpaces(parser);
  return consumeRegExp(parser, /^\w+/);
}

/**
 * @param {ParserState} parser
 */
function parseIdentifier(parser) {
  consumeSpaces(parser);
  const start = parser.pos;
  const text = consumeRegExpOpt(parser, /^\w+/);
  if (isClauseKeyword(text)) {
    setPos(parser, start);
    return undefined;
  }
  return text;
}

/**
 * @param {ParserState} parser
 * @param {number} minPrecedence inclusive lower bound
 */
function parseOperator(parser, minPrecedence) {
  const start = parser.pos;
  consumeSpaces(parser);
  const operator = consumeRegExpOpt(parser, /^[.+\-*/=%]|^as/i);

  if (operator && getPrecedence(operator.toUpperCase()) >= minPrecedence) {
    return operator;
  }

  parser.pos = start; // eslint-disable-line no-param-reassign
  return undefined;
}

/**
 * @param {ParserState} parser
 * @param {object} callee
 */
function parseCallExpression(parser, callee) {
  consumeRegExpOpt(parser, /^\(/);
  const arguments_ = [];
  let argument;
  // eslint-disable-next-line no-cond-assign, no-use-before-define
  while ((argument = parseExpression(parser, 0))) {
    arguments_.push(argument);
    consumeRegExpOpt(parser, /^,/);
  }
  consumeRegExpOpt(parser, /^\)/);
  return {
    type: 'CallExpression',
    callee,
    arguments: arguments_,
  };
}

/**
 * @param {ParserState} parser
 */
function parseLiteral(parser) {
  let quoteContent;
  switch (getChar(parser)) {
    case '"':
      advanceOne(parser);
      quoteContent = consumeRegExpOpt(parser, /^[^"\n]*/);
      consumeChar(parser, '"');
      break;
    case `'`:
      advanceOne(parser);
      quoteContent = consumeRegExpOpt(parser, /^[^'\n]*/);
      consumeChar(parser, `'`);
      break;
    case '`':
      advanceOne(parser);
      quoteContent = consumeRegExpOpt(parser, /^[^`\n]*/);
      consumeChar(parser, '`');
      break;
    default:
  }
  if (!quoteContent) {
    return undefined;
  }
  return {
    type: 'LiteralToken',
    value: quoteContent,
  };
}

/**
 * @param {ParserState} parser
 */
function parseHigherThanBinaryExpression(parser) {
  let node;
  switch (getChar(parser)) {
    case '"':
    case `'`:
    case '`':
      node = parseLiteral(parser);
      break;
    case '*':
      advanceOne(parser);
      return {
        type: 'WildcardExpression',
      };
    default:
      node = parseIdentifier(parser);
  }

  consumeSpaces(parser);

  switch (getChar(parser)) {
    case '(':
      return parseCallExpression(parser, node);
    case '.':
    default:
      return node;
  }
}

/**
 * @param {string} operator
 * @param {object} left
 * @param {object} right
 */
function createBinaryExpressionNode(operator, left, right) {
  if (operator.toUpperCase() === 'AS') {
    return {
      type: 'AliasExpression',
      isExplicit: true,
      left,
      right,
    };
  }

  return {
    operator,
    left,
    right,
  };
}

/**
 * @param {ParserState} parser
 * @param {number} minPrecedence
 */
function parseExpression(parser, minPrecedence) {
  consumeSpaces(parser);

  /** @type {object} */
  let node = parseHigherThanBinaryExpression(parser);

  for (
    let operator = parseOperator(parser, minPrecedence);
    operator !== undefined;
    operator = parseOperator(parser, minPrecedence)
  ) {
    const right = parseExpression(parser, getPrecedence(operator));
    node = createBinaryExpressionNode(operator, node, right);
  }

  const word = getWord(parser);

  if (!word || isReservedWord(word)) {
    return node;
  }

  consumeWord(parser);

  return {
    type: 'AliasExpression',
    isExplicit: false,
    left: node,
    right: word,
  };
}

/**
 * @param {ParserState} parser
 */
function parseExpressions(parser) {
  const expressions = [];

  let expression;
  // eslint-disable-next-line no-cond-assign
  while ((expression = parseExpression(parser, 0))) {
    expressions.push(expression);
    consumeSpaces(parser);
    if (!consumeCharOpt(parser, ',')) {
      break;
    }
  }

  return expressions;
}

/**
 * @param {ParserState} parser
 */
function parseClauseKeyword(parser) {
  consumeSpaces(parser);
  const start = parser.pos;
  const keyword = consumeRegExpOpt(parser, /^\w+/);

  if (!keyword || !isClauseKeyword(keyword)) {
    setPos(parser, start);
    return undefined;
  }

  switch (keyword.toUpperCase()) {
    case 'LEFT': {
      consumeSpaces(parser);
      const word = consumeRegExpOpt(parser, /^\w+/);
      if (!word || word.toUpperCase() !== 'JOIN') {
        throw new ParseError('Expecting keyword JOIN.', parser);
      }
      return `${keyword} ${word}`;
    }
    case 'GROUP': {
      consumeSpaces(parser);
      const word = consumeRegExpOpt(parser, /^\w+/);
      if (!word || word.toUpperCase() !== 'BY') {
        throw new ParseError('Expecting keyword BY.', parser);
      }
      return `${keyword} ${word}`;
    }
    default:
      break;
  }

  return keyword;
}

/**
 * @param {ParserState} parser
 */
function parseType(parser) {
  return parseIdentifier(parser);
}

/**
 * @param {ParserState} parser
 */
function parseCreateDefinition(parser) {
  consumeSpaces(parser);
  const columnName = parseIdentifier(parser);
  if (!columnName) {
    return undefined;
  }
  const columnType = parseType(parser);
  if (!columnType) {
    return undefined;
  }
  return {
    type: 'CreateDefinition',
    columnName,
    columnType,
  };
}

/**
 * @param {ParserState} parser
 */
function parseCreateDefinitionList(parser) {
  consumeSpaces(parser);
  const createDefinitionList = [];
  let createDefinition;
  // eslint-disable-next-line no-cond-assign
  while ((createDefinition = parseCreateDefinition(parser))) {
    createDefinitionList.push(createDefinition);
    consumeSpaces(parser);
    consumeRegExpOpt(parser, /^,/);
  }
  return createDefinitionList;
}

/**
 * @param {ParserState} parser
 */
function parseClause(parser) {
  consumeSpaces(parser);
  const clauseName = parseClauseKeyword(parser);
  if (!clauseName) {
    return undefined;
  }
  consumeSpaces(parser);

  if (clauseName.toUpperCase() === 'CREATE') {
    const word = consumeRegExpOpt(parser, /^\w*/);
    if (word === undefined || word.toUpperCase() !== 'TABLE') {
      throw new ParseError('Keyword "TABLE" expected.', parser);
    }
    const tableName = parseIdentifier(parser);
    consumeSpaces(parser);
    consumeChar(parser, '(');
    const definitions = parseCreateDefinitionList(parser);
    return {
      type: 'Clause',
      clauseName,
      tableName,
      definitions,
    };
  }

  const expressions = parseExpressions(parser);
  return {
    clauseName,
    expressions,
  };
}

/**
 * @param {ParserState} parser
 */
function parseStatement(parser) {
  const clauses = [];

  let clause;
  // eslint-disable-next-line no-cond-assign
  while ((clause = parseClause(parser))) {
    clauses.push(clause);
    const word = getWord(parser);
    if (!word) {
      break;
    }
    if (!isClauseKeyword(word)) {
      throw new ParseError('Expecting a clause.', parser);
    }
  }
  return {
    type: 'Statement',
    clauses,
  };
}

/**
 * @param {string} source
 * @returns {ParserState}
 */
function createParser(source) {
  return {
    source,
    pos: 0,
  };
}

/**
 * @param {string} code
 */
function parse(code) {
  const parser = createParser(code);
  return parseStatement(parser);
}

exports.parse = parse;
