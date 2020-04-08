const reservedWords = require('./reservedWords');
const specialValues = require('./specialValues');

/**
 * @typedef {import('./types').ParserState} ParserState
 */

/**
 * @param {ParserState} parser
 */
// eslint-disable-next-line no-unused-vars
function debug(parser) {
  console.log(parser.pos, parser.source.slice(parser.pos));
}

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

/**
 * @param {ParserState} parser
 * @returns {boolean}
 */
function isEOF(parser) {
  return parser.pos === parser.source.length;
}

class ParseError extends SyntaxError {
  /**
   * @param {ParserState} parser
   * @param {string} message
   * @param {number} [pos]
   */
  constructor(parser, message = 'Invalid syntax.', pos = parser.pos) {
    super(message);
    this.pos = pos;
  }
}

/**
 * @param {ParserState} parser
 * @param {RegExp} regExp
 * @param {string} [message]
 * @returns {string}
 */
function consumeRegExp(parser, regExp, message) {
  const match = regExp.exec(parser.source.slice(parser.pos));
  if (!match) {
    if (message) {
      throw new ParseError(parser, message);
    } else {
      throw new ParseError(parser);
    }
  }

  parser.pos += match[0].length; // eslint-disable-line no-param-reassign
  return match[0];
}

/**
 * @param {ParserState} parser
 * @param {string} char
 * @param {string} [message]
 * @returns {string}
 */
function consumeChar(parser, char, message) {
  if (parser.source[parser.pos] !== char) {
    throw new ParseError(parser, message || `"${char}" expected.`);
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
 * @param {ParserState} parser
 * @param {RegExp} regExp
 * @returns {string | undefined}
 */
function consumeRegExpOpt(parser, regExp) {
  const match = regExp.exec(parser.source.slice(parser.pos));
  if (!match) {
    return undefined;
  }

  parser.pos += match[0].length; // eslint-disable-line no-param-reassign
  return match[0];
}

/**
 * @param {ParserState} parser
 * @returns {boolean}
 */
function consumeComment(parser) {
  /* eslint-disable no-param-reassign */
  const {source} = parser;
  if (source[parser.pos] === '/' && source[parser.pos + 1] === '*') {
    parser.pos += 2;

    while (parser.pos < parser.source.length) {
      if (source[parser.pos] === '*' && source[parser.pos + 1] === '/') {
        parser.pos += 2;
        return true;
      }
      parser.pos += 1;
    }

    throw new ParseError(parser, 'Unterminated comment.');
  }
  if (source[parser.pos] === '-' && source[parser.pos + 1] === '-') {
    parser.pos += 2;
    while (parser.pos < parser.source.length) {
      if (source[parser.pos] === '\n') {
        parser.pos += 1;
        break;
      }
      parser.pos += 1;
    }
    return true;
  }

  return false;
}

/**
 * @param {ParserState} parser
 * @returns {void}
 */
function consumeSpaces(parser) {
  consumeRegExp(parser, /^[ \t\r\n]*/);
  while (consumeComment(parser)) {
    consumeRegExp(parser, /^[ \t\r\n]*/);
  }
}

/**
 * @param {ParserState} parser
 * @param {string} token
 * @returns {boolean}
 */
function consumeTokenOpt(parser, token) {
  consumeSpaces(parser);
  if (parser.source.slice(parser.pos, parser.pos + token.length) !== token) {
    return false;
  }
  parser.pos += token.length; // eslint-disable-line no-param-reassign
  return true;
}

/**
 * @param {string | undefined} word
 * @returns {boolean}
 */
function isReservedWord(word) {
  return word !== undefined && reservedWords.has(word.toUpperCase());
}

const precedenceMap = new Map([
  ['*', 11],
  ['+', 10],
  ['-', 10],
  ['/', 9],
  ['=', 8],
  ['%', 8],
  ['AND', 7],
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
 * @returns {string}
 */
function consumeWord(parser) {
  consumeSpaces(parser);
  const word = consumeRegExp(parser, /^\w+/);
  if (!word) {
    throw new ParseError(parser);
  }
  return word;
}

/**
 * @param {ParserState} parser
 * @returns {string | undefined}
 */
function consumeWordOpt(parser) {
  consumeSpaces(parser);
  const word = consumeRegExpOpt(parser, /^\w+/);
  return word !== undefined ? word : undefined;
}

/**
 * @param {ParserState} parser
 * @param {string} keyword
 * @returns {void}
 */
function consumeKeyword(parser, keyword) {
  consumeSpaces(parser);
  const word = consumeRegExpOpt(parser, /^\w+/);
  if (!word || word.toUpperCase() !== keyword) {
    throw new ParseError(parser, `Expecting keyword ${keyword}.`);
  }
}

/**
 * @param {ParserState} parser
 * @param {string[]} keywords
 * @returns {string | undefined}
 */
function consumeOneOfKeywordsOpt(parser, keywords) {
  consumeSpaces(parser);
  const start = parser.pos;
  const word = consumeRegExpOpt(parser, /^\w+/);

  if (!word) {
    setPos(parser, start);
    return undefined;
  }

  const WORD = word.toUpperCase();
  for (const keyword of keywords) {
    if (keyword === WORD) {
      return WORD;
    }
  }

  setPos(parser, start);
  return undefined;
}

/**
 * @param {ParserState} parser
 * @param {string[]} keywords
 * @returns {string}
 */
function consumeOneOfKeywords(parser, keywords) {
  const keyword = consumeOneOfKeywordsOpt(parser, keywords);
  if (keyword === undefined) {
    throw new ParseError(parser);
  }
  return keyword;
}

/**
 * @param {ParserState} parser
 * @param {string} keyword Must be in uppercase.
 * @returns {string | undefined} The keyword in uppercase.
 */
function consumeKeywordOpt(parser, keyword) {
  consumeSpaces(parser);
  const word = getWord(parser);
  if (word === undefined) {
    return undefined;
  }
  const WORD = word.toUpperCase();
  if (WORD === keyword) {
    consumeWord(parser);
    return keyword;
  }
  return undefined;
}

/**
 * @param {ParserState} parser
 * @param {string} first
 * @param {string} second
 * @returns {boolean}
 */
function consumeConsecutiveKeywordsOpt(parser, first, second) {
  if (consumeKeywordOpt(parser, first)) {
    consumeKeyword(parser, second);
    return true;
  }

  return false;
}

/**
 * @param {ParserState} parser
 * @param {RegExp} regexp
 * @returns {string | undefined}
 */
function matchRegExp(parser, regexp) {
  const match = regexp.exec(parser.source.slice(parser.pos));
  return match === null ? undefined : match[0];
}

/**
 * @param {ParserState} parser
 * @param {string} keyword
 * @returns {boolean}
 */
function matchKeyword(parser, keyword) {
  consumeSpaces(parser);
  const word = matchRegExp(parser, /^\w+/);
  return !!word && word.toUpperCase() === keyword;
}

/**
 * @param {ParserState} parser
 */
function parseIdentifierOpt(parser) {
  consumeSpaces(parser);
  const start = parser.pos;
  const text = consumeRegExpOpt(parser, /^\w+/);
  if (!text || isReservedWord(text)) {
    setPos(parser, start);
    return undefined;
  }
  return {
    type: 'Identifier',
    name: text,
  };
}

/**
 * @param {ParserState} parser
 */
function parseIdentifier(parser) {
  const identifier = parseIdentifierOpt(parser);
  if (identifier === undefined) {
    throw new ParseError(parser, `Unexpected token.`);
  }
  return identifier;
}

/**
 * @param {ParserState} parser
 */
function parseSpecialValueOpt(parser) {
  consumeSpaces(parser);
  const start = parser.pos;
  const word = consumeWordOpt(parser);
  if (!word) {
    return undefined;
  }
  const WORD = word.toUpperCase();
  if (specialValues.has(WORD)) {
    return {
      type: 'SpecialValue',
      name: word,
    };
  }
  setPos(parser, start);
  return undefined;
}

/**
 * @param {ParserState} parser
 * @param {object} callee
 */
function parseCallExpression(parser, callee) {
  consumeChar(parser, '(');
  consumeSpaces(parser);
  const args = [];
  if (consumeCharOpt(parser, ')')) {
    return {
      type: 'CallExpression',
      callee,
      arguments: args,
    };
  }
  // eslint-disable-next-line no-use-before-define
  args.push(parseExpression(parser, 0));
  while (consumeCharOpt(parser, ',')) {
    // eslint-disable-next-line no-use-before-define
    args.push(parseExpression(parser, 0));
  }
  consumeChar(parser, ')');
  return {
    type: 'CallExpression',
    callee,
    arguments: args,
  };
}

/**
 * @param {ParserState} parser
 */
function parseNumberLiteralOpt(parser) {
  consumeSpaces(parser);
  const start = parser.pos;
  const word = consumeWord(parser);
  if (!/^[0-9]+$/.test(word)) {
    setPos(parser, start);
    return undefined;
  }
  return {
    type: 'NumberLiteral',
    value: word,
  };
}

/**
 * @param {ParserState} parser
 */
function parseNumberLiteral(parser) {
  consumeSpaces(parser);
  const word = consumeWord(parser);
  if (!/^[0-9]+$/.test(word)) {
    throw new ParseError(parser);
  }
  return {
    type: 'NumberLiteral',
    value: word,
  };
}

/**
 * @param {ParserState} parser
 */
function parseStringLiteralOpt(parser) {
  consumeSpaces(parser);
  let value;
  let type;
  switch (getChar(parser)) {
    case '"':
      advanceOne(parser);
      type = 'StringLiteral';
      value = consumeRegExpOpt(parser, /^[^"]*/);
      consumeChar(parser, '"');
      break;
    case `'`:
      advanceOne(parser);
      type = 'StringLiteral';
      value = consumeRegExpOpt(parser, /^[^']*/);
      consumeChar(parser, `'`);
      break;
    case '`':
      advanceOne(parser);
      type = 'BacktickStringLiteral';
      value = consumeRegExpOpt(parser, /^[^`]*/);
      consumeChar(parser, '`');
      break;
    default:
      return undefined;
  }
  return {
    type,
    value,
  };
}

/**
 * @param {ParserState} parser
 */
function parserIdentifierOrBacktickLiteral(parser) {
  consumeSpaces(parser);

  if (getChar(parser) === '`') {
    return parseStringLiteralOpt(parser);
  }

  return parseIdentifier(parser);
}

/**
 * @param {ParserState} parser
 */
function parseParenthesisExpression(parser) {
  advanceOne(parser);
  // eslint-disable-next-line no-use-before-define
  const expressions = parseExpressions(parser);
  if (expressions.length === 0) {
    throw new ParseError(parser);
  }

  consumeChar(parser, ')');

  if (expressions.length === 1) {
    return {
      type: 'ParenthesisExpression',
      expression: expressions[0],
    };
  }

  return {
    type: 'TupleExpression',
    expressions,
  };
}

/**
 * @param {ParserState} parser
 */
function parseHigherThanBinaryExpression(parser) {
  consumeSpaces(parser);

  let node;
  switch (getChar(parser)) {
    case '"':
    case `'`:
    case '`':
      node = parseStringLiteralOpt(parser);
      break;
    case '*':
      advanceOne(parser);
      return {
        type: 'WildcardExpression',
      };
    case '(':
      // eslint-disable-next-line no-use-before-define
      node = parseSubqueryOpt(parser) || parseParenthesisExpression(parser);
      break;
    case '+':
    case '-':
    case '~':
    case '!': {
      const operator = getChar(parser);
      advanceOne(parser);
      node = parseHigherThanBinaryExpression(parser);
      return {
        type: 'UnaryExpression',
        operator,
        operand: node,
      };
    }
    default: {
      node =
        parseNumberLiteralOpt(parser) ||
        parseIdentifierOpt(parser) ||
        parseSpecialValueOpt(parser);
    }
  }

  if (!node) {
    throw new ParseError(parser);
  }

  if (
    (node.type === 'BacktickStringLiteral' || node.type === 'Identifier') &&
    consumeCharOpt(parser, '.')
  ) {
    let right;
    consumeSpaces(parser);
    if (consumeCharOpt(parser, '*')) {
      right = {
        type: 'WildcardExpression',
      };
    } else {
      right = parserIdentifierOrBacktickLiteral(parser);
    }

    node = {
      type: 'MemberExpression',
      left: node,
      right,
    };
  }

  consumeSpaces(parser);

  if (
    getChar(parser) === '(' &&
    (node.type === 'BacktickStringLiteral' ||
      node.type === 'MemberExpression' ||
      node.type === 'Identifier' ||
      node.type === 'SpecialValue')
  ) {
    node = parseCallExpression(parser, node);
  }

  return node;
}

/**
 * @param {string} operator
 * @param {object} left
 * @param {object} right
 */
function createBinaryExpressionNode(operator, left, right) {
  return {
    type: 'BinaryExpression',
    operator,
    left,
    right,
  };
}

/**
 * @param {ParserState} parser
 * @param {number} minPrecedence Exclusive lower bound
 */
function parseOperator(parser, minPrecedence) {
  const start = parser.pos;
  consumeSpaces(parser);
  const operator = consumeRegExpOpt(parser, /^[.+\-*/=%]|^AND/i);

  if (operator && getPrecedence(operator.toUpperCase()) > minPrecedence) {
    return operator.toUpperCase();
  }

  parser.pos = start; // eslint-disable-line no-param-reassign
  return undefined;
}

/**
 * @param {ParserState} parser
 * @param {number} minPrecedence
 */
function parseExpression(parser, minPrecedence) {
  consumeSpaces(parser);

  /** @type {object} */
  let node = parseHigherThanBinaryExpression(parser);

  let operator;
  // eslint-disable-next-line no-cond-assign
  while ((operator = parseOperator(parser, minPrecedence))) {
    const right = parseExpression(parser, getPrecedence(operator));
    node = createBinaryExpressionNode(operator, node, right);
  }

  return node;
}

/**
 * @param {ParserState} parser
 * @returns {object[]}
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
function parseSelectExpression(parser) {
  consumeSpaces(parser);
  const expression = parseExpression(parser, 0);
  consumeSpaces(parser);

  if (consumeKeywordOpt(parser, 'AS')) {
    const alias = parseStringLiteralOpt(parser) || parseIdentifier(parser);

    return {
      type: 'AliasExpression',
      expression,
      alias,
      hasAsKeyword: true,
    };
  }

  const alias = parseStringLiteralOpt(parser) || parseIdentifierOpt(parser);

  if (alias) {
    return {
      type: 'AliasExpression',
      expression,
      alias,
      hasAsKeyword: false,
    };
  }

  return expression;
}

/**
 * @param {ParserState} parser
 */
function parseSelectExpressions(parser) {
  const expressions = [];

  let expression;
  // eslint-disable-next-line no-cond-assign
  while ((expression = parseSelectExpression(parser))) {
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
function parseType(parser) {
  consumeSpaces(parser);
  const word = consumeWord(parser);
  const WORD = word.toUpperCase();

  switch (WORD) {
    case 'TINYINT':
    case 'SMALLINT':
    case 'MEDIUMINT':
    case 'INT':
    case 'BIGINT':
    case 'DECIMAL':
    case 'FLOAT':
    case 'DOUBLE':
    case 'CHAR':
    case 'VARCHAR':
    case 'TEXT': {
      consumeSpaces(parser);

      if (consumeCharOpt(parser, '(')) {
        const args = [];
        let arg;
        // eslint-disable-next-line no-cond-assign
        while ((arg = parseNumberLiteral(parser))) {
          args.push(arg);
          consumeSpaces(parser);
          if (consumeCharOpt(parser, ')')) {
            break;
          }
          consumeRegExpOpt(parser, /^,/);
        }

        return {
          type: 'DataType',
          name: WORD,
          arguments: args,
        };
      }

      return {
        type: 'DataType',
        name: WORD,
        arguments: undefined,
      };
    }
    default:
  }

  throw new ParseError(parser, 'Invalid type.');
}

/**
 * @param {ParserState} parser
 */
function parseKeyParts(parser) {
  consumeSpaces(parser);
  consumeChar(parser, '(');

  const keyParts = [];
  let keyPart;
  // eslint-disable-next-line no-cond-assign
  while ((keyPart = parseIdentifier(parser))) {
    keyParts.push(keyPart);
    consumeSpaces(parser);
    if (!consumeCharOpt(parser, ',')) {
      break;
    }
  }
  consumeChar(parser, ')');

  return keyParts;
}

/**
 * @param {ParserState} parser
 */
function parseReferenceOption(parser) {
  if (consumeKeywordOpt(parser, 'RESTRICT')) {
    return 'RESTRICT';
  }

  if (consumeKeywordOpt(parser, 'CASCADE')) {
    return 'CASCADE';
  }

  if (consumeConsecutiveKeywordsOpt(parser, 'NO', 'ACTION')) {
    return 'NO ACTION';
  }

  if (consumeKeywordOpt(parser, 'SET')) {
    if (consumeKeywordOpt(parser, 'NULL')) {
      return 'NO NULL';
    }
    if (consumeKeywordOpt(parser, 'DEFAULT')) {
      return 'NO DEFAULT';
    }
  }

  throw new ParseError(parser);
}

/**
 * @param {ParserState} parser
 */
function parseCreateDefinition(parser) {
  consumeSpaces(parser);

  if (consumeConsecutiveKeywordsOpt(parser, 'FOREIGN', 'KEY')) {
    /* eslint-disable no-use-before-define */
    const indexName = parseIdentifierOpt(parser);
    consumeSpaces(parser);
    consumeChar(parser, '(');
    const columns = [parseColumnName(parser)];
    consumeSpaces(parser);
    while (consumeCharOpt(parser, ',')) {
      columns.push(parseColumnName(parser));
      consumeSpaces(parser);
    }
    consumeChar(parser, ')');
    consumeKeyword(parser, 'REFERENCES');
    const table = parseTableName(parser);
    const keyParts = parseKeyParts(parser);
    let onDelete;
    const {pos} = parser;
    if (consumeKeywordOpt(parser, 'ON')) {
      if (consumeKeywordOpt(parser, 'DELETE')) {
        onDelete = parseReferenceOption(parser);
      } else {
        setPos(parser, pos);
      }
    }

    let onUpdate;
    if (consumeConsecutiveKeywordsOpt(parser, 'ON', 'UPDATE')) {
      onUpdate = parseReferenceOption(parser);
    }

    return {
      type: 'ForeignKeyDefinition',
      indexName,
      table,
      keyParts,
      onDelete,
      onUpdate,
    };
  }

  const columnName = parseIdentifierOpt(parser);
  if (!columnName) {
    throw new ParseError(parser, 'Invalid create table definition.');
  }
  const columnType = parseType(parser);

  const isPrimaryKey = !!(
    consumeConsecutiveKeywordsOpt(parser, 'PRIMARY', 'KEY') ||
    consumeKeywordOpt(parser, 'KEY')
  );

  return {
    type: 'CreateDefinition',
    columnName,
    columnType,
    isPrimaryKey,
  };
}

/**
 * @param {ParserState} parser
 */
function parseTableOption(parser) {
  consumeSpaces(parser);
  if (consumeKeywordOpt(parser, 'ENGINE')) {
    consumeSpaces(parser);
    consumeCharOpt(parser, '=');
    const engine = parseIdentifier(parser);
    return {
      type: 'TableOption',
      name: 'ENGINE',
      value: engine,
    };
  }

  if (consumeKeywordOpt(parser, 'COMMENT')) {
    consumeSpaces(parser);
    consumeCharOpt(parser, '=');
    const value = parseStringLiteralOpt(parser);
    if (!value) {
      throw new ParseError(parser);
    }
    return {
      type: 'TableOption',
      name: 'COMMENT',
      value,
    };
  }

  consumeKeywordOpt(parser, 'DEFAULT');

  if (consumeKeywordOpt(parser, 'COLLATE')) {
    consumeSpaces(parser);
    consumeCharOpt(parser, '=');
    const value = parseIdentifier(parser);
    if (!value) {
      throw new ParseError(parser);
    }
    return {
      type: 'TableOption',
      name: 'COLLATE',
      value,
    };
  }

  if (consumeConsecutiveKeywordsOpt(parser, 'CHARACTER', 'SET')) {
    consumeSpaces(parser);
    consumeCharOpt(parser, '=');
    const value = parseIdentifier(parser);
    if (!value) {
      throw new ParseError(parser);
    }
    return {
      type: 'TableOption',
      name: 'CHARACTER SET',
      value,
    };
  }

  throw new ParseError(parser);
}

/**
 * @param {ParserState} parser
 */
function parseCreateDefinitionList(parser) {
  consumeSpaces(parser);
  consumeChar(parser, '(');
  consumeSpaces(parser);
  const createDefinitionList = [];
  let createDefinition;
  // eslint-disable-next-line no-cond-assign
  while ((createDefinition = parseCreateDefinition(parser))) {
    createDefinitionList.push(createDefinition);
    consumeSpaces(parser);
    consumeRegExpOpt(parser, /^,/);
    consumeSpaces(parser);
    if (getChar(parser) === ')') {
      break;
    }
  }
  consumeSpaces(parser);
  consumeChar(parser, ')');
  return createDefinitionList;
}

/**
 * @param {ParserState} parser
 */
function parseSubqueryOpt(parser) {
  consumeSpaces(parser);
  const start = parser.pos;
  if (!consumeCharOpt(parser, '(') || !matchKeyword(parser, 'SELECT')) {
    setPos(parser, start);
    return undefined;
  }
  // eslint-disable-next-line no-use-before-define
  const statement = parseStatement(parser);
  consumeChar(parser, ')');
  return statement;
}

/**
 * @param {ParserState} parser
 */
function parseSubquery(parser) {
  const subquery = parseSubqueryOpt(parser);
  if (!subquery) {
    throw new ParseError(parser, 'Invalid subquery.');
  }
  return subquery;
}

/**
 * @param {ParserState} parser
 */
function parseColumnName(parser) {
  consumeSpaces(parser);
  return parseIdentifier(parser);
}

/**
 * Valid cases:
 *   foo
 *   foo.bar
 *   `foo`.bar
 *
 * @param {ParserState} parser
 */
function parseTableName(parser) {
  consumeSpaces(parser);

  const name = parserIdentifierOrBacktickLiteral(parser);
  consumeSpaces(parser);

  if (getChar(parser) === '.') {
    advanceOne(parser);
    const nextName = parserIdentifierOrBacktickLiteral(parser);

    return {
      type: 'MemberExpression',
      left: name,
      right: nextName,
    };
  }

  return name;
}

/**
 * @param {ParserState} parser
 */
function parseTableFactor(parser) {
  consumeSpaces(parser);

  if (getChar(parser) === '(') {
    const subquery = parseSubquery(parser);
    consumeKeywordOpt(parser, 'AS');
    const alias = parseIdentifierOpt(parser);
    if (!alias) {
      throw new ParseError(parser, 'Missing alias for subquery.');
    }
    return {
      type: 'TableFactor',
      table: subquery,
      alias,
    };
  }

  const table = parseTableName(parser);
  let alias;
  if (consumeKeywordOpt(parser, 'AS')) {
    alias = parseIdentifier(parser);
  } else {
    alias = parseIdentifierOpt(parser);
  }

  return {
    type: 'TableFactor',
    table,
    alias,
  };
}

/**
 * @param {ParserState} parser
 */
function parseTableReference(parser) {
  consumeSpaces(parser);
  const table = parseTableFactor(parser);

  const joins = [];
  // eslint-disable-next-line no-cond-assign
  while (true) {
    let joinType;
    if (consumeKeywordOpt(parser, 'JOIN')) {
      joinType = 'inner';
    } else if (consumeConsecutiveKeywordsOpt(parser, 'LEFT', 'JOIN')) {
      joinType = 'left';
    } else if (consumeConsecutiveKeywordsOpt(parser, 'RIGHT', 'JOIN')) {
      joinType = 'right';
    }

    if (!joinType) {
      break;
    }

    const anotherTableFactor = parseTableFactor(parser);

    let on;
    if (consumeKeywordOpt(parser, 'ON')) {
      const expression = parseExpression(parser, 0);
      on = {
        type: 'OnClause',
        expression,
      };
    }

    if (on === undefined && joinType !== 'inner') {
      throw new ParseError(parser);
    }

    joins.push({
      type: 'JoinClause',
      joinType,
      table: anotherTableFactor,
      on,
    });
  }

  return {
    type: 'TableReference',
    table,
    joins,
  };
}
/**
 * @param {ParserState} parser
 */
function parseTableReferences(parser) {
  consumeSpaces(parser);
  const first = parseTableReference(parser);
  const rest = [];

  while (consumeCharOpt(parser, ',')) {
    rest.push(parseTableReference(parser));
  }

  if (rest.length === 0) {
    return first;
  }

  return {
    type: 'TableReferenceList',
    tables: [first, ...rest],
  };
}

/**
 * @param {ParserState} parser
 */
function parseAssignment(parser) {
  consumeSpaces(parser);
  const left = parseIdentifier(parser);
  consumeSpaces(parser);
  consumeChar(parser, '=');
  const right = parseExpression(parser, 0);
  return {
    type: 'AssignmentExpression',
    left,
    right,
  };
}

/**
 * @param {ParserState} parser
 */
function parseAssignmentList(parser) {
  const first = parseAssignment(parser);
  const rest = [];
  while (consumeCharOpt(parser, ',')) {
    const assignment = parseAssignment(parser);
    rest.push(assignment);
    consumeSpaces(parser);
  }
  if (rest.length === 0) {
    return first;
  }
  return {
    type: 'AssignmentList',
    asignments: [first, ...rest],
  };
}

/**
 * @param {ParserState} parser
 */
function parseFromClauseOpt(parser) {
  consumeSpaces(parser);
  const keyword = consumeKeywordOpt(parser, 'FROM');
  if (!keyword) {
    return undefined;
  }

  const table = parseTableReferences(parser);
  return {
    type: 'FromClause',
    table,
  };
}

/**
 * @param {ParserState} parser
 */
function parseWhereClauseOpt(parser) {
  consumeSpaces(parser);
  const keyword = consumeKeywordOpt(parser, 'WHERE');
  if (!keyword) {
    return undefined;
  }
  const expression = parseExpression(parser, 0);
  return {
    type: 'WhereClause',
    expression,
  };
}

/**
 * @param {ParserState} parser
 */
function parseGroupByClauseOpt(parser) {
  consumeSpaces(parser);
  if (!consumeConsecutiveKeywordsOpt(parser, 'GROUP', 'BY')) {
    return undefined;
  }
  const expressions = parseExpressions(parser);
  return {
    type: 'GroupByClause',
    expressions,
  };
}

/**
 * @param {ParserState} parser
 */
function parseHavingClauseOpt(parser) {
  consumeSpaces(parser);
  if (!consumeKeywordOpt(parser, 'HAVING')) {
    return undefined;
  }
  const expression = parseExpression(parser, 0);
  return {
    type: 'HavingClause',
    expression,
  };
}

/**
 * @param {ParserState} parser
 * @param {boolean} canHaveOffset
 */
function parseLimitClauseOpt(parser, canHaveOffset) {
  consumeSpaces(parser);
  if (consumeKeywordOpt(parser, 'LIMIT') === undefined) {
    return undefined;
  }
  const num1 = parseNumberLiteral(parser);

  if (canHaveOffset) {
    consumeSpaces(parser);
    if (consumeCharOpt(parser, ',')) {
      const num2 = parseNumberLiteral(parser);
      return {
        type: 'LimitClause',
        count: num2,
        offset: num1,
      };
    }

    if (consumeKeywordOpt(parser, 'OFFSET')) {
      const offset = parseNumberLiteral(parser);
      return {
        type: 'LimitClause',
        count: num1,
        offset,
      };
    }
  }

  return {
    type: 'LimitClause',
    count: num1,
    offset: undefined,
  };
}

/**
 * @param {ParserState} parser
 */
function parseOrderByClauseOpt(parser) {
  consumeSpaces(parser);
  if (!consumeConsecutiveKeywordsOpt(parser, 'ORDER', 'BY')) {
    return undefined;
  }
  const columnNames = [parseIdentifier(parser)];
  consumeSpaces(parser);
  while (consumeCharOpt(parser, ',')) {
    columnNames.push(parseIdentifier(parser));
    consumeSpaces(parser);
  }
  const desc = consumeOneOfKeywordsOpt(parser, ['ASC', 'DESC']) === 'DESC';
  return {
    type: 'OrderByClause',
    columnNames,
    desc,
  };
}

/**
 * @param {ParserState} parser
 */
function parseSetClause(parser) {
  consumeSpaces(parser);
  consumeKeyword(parser, 'SET');
  const expressions = parseExpressions(parser);
  return {
    type: 'SetClause',
    expressions,
  };
}

/**
 * @param {ParserState} parser
 */
function parseValuesClauseOpt(parser) {
  consumeSpaces(parser);
  if (!consumeKeywordOpt(parser, 'VALUES')) {
    return undefined;
  }

  const expressions = parseExpressions(parser);
  return {
    type: 'ValuesClause',
    expressions,
  };
}

/**
 * @param {ParserState} parser
 */
function parseAlterTableSpecification(parser) {
  consumeSpaces(parser);
  const keyword = consumeOneOfKeywords(parser, ['ADD', 'DROP', 'RENAME']);

  switch (keyword) {
    case 'ADD': {
      consumeKeywordOpt(parser, 'COLUMN');
      const columnName = parseIdentifier(parser);
      const columnType = parseType(parser);

      let after;
      let first = false;
      if (consumeKeywordOpt(parser, 'AFTER')) {
        after = parseIdentifier(parser);
      } else if (consumeKeywordOpt(parser, 'FIRST')) {
        first = true;
      }

      return {
        type: 'AlterTableAddColumnSpecification',
        columnName,
        columnType,
        first,
        after,
      };
    }
    case 'DROP': {
      if (consumeConsecutiveKeywordsOpt(parser, 'FOREIGN', 'KEY')) {
        const key = parseIdentifier(parser);
        return {
          type: 'DropForeignKeySpecification',
          key,
        };
      }

      if (consumeConsecutiveKeywordsOpt(parser, 'PRIMARY', 'KEY')) {
        return {
          type: 'DropPrimaryKeySpecification',
        };
      }

      if (
        consumeKeywordOpt(parser, 'KEY') ||
        consumeKeywordOpt(parser, 'INDEX')
      ) {
        const key = parseIdentifier(parser);

        return {
          type: 'DropKeySpecification',
          key,
        };
      }

      consumeKeywordOpt(parser, 'COLUMN');
      const columnName = parseColumnName(parser);
      return {
        type: 'DropColumnSpecification',
        columnName,
      };
    }
    case 'RENAME': {
      if (consumeKeywordOpt(parser, 'COLUMN')) {
        const sourceColumnName = parseColumnName(parser);
        consumeKeywordOpt(parser, 'TO');
        const targetColumnName = parseColumnName(parser);

        return {
          type: 'AlterTableRenameColumnSpecification',
          sourceColumnName,
          targetColumnName,
        };
      }

      if (
        consumeKeywordOpt(parser, 'KEY') ||
        consumeKeywordOpt(parser, 'INDEX')
      ) {
        const sourceKey = parseIdentifier(parser);
        consumeKeyword(parser, 'TO');
        const targetKey = parseIdentifier(parser);
        return {
          type: 'AlterTableRenameKeySpecification',
          sourceKey,
          targetKey,
        };
      }

      // ALTER TABLE table RENAME TO new_table_name
      const to = consumeKeywordOpt(parser, 'TO');
      if (!to) {
        consumeKeywordOpt(parser, 'AS');
      }

      const tableName = parseTableName(parser);

      return {
        type: 'AlterTableRenameTableSpecification',
        tableName,
      };
    }

    default:
  }

  const expressions = parseExpressions(parser);
  return {
    type: 'ValuesClause',
    expressions,
  };
}

/**
 * @param {ParserState} parser
 */
function parseSelectStatementOpt(parser) {
  if (!matchKeyword(parser, 'SELECT')) {
    return undefined;
  }

  // eslint-disable-next-line no-use-before-define
  return parseStatement(parser);
}

/**
 * @param {ParserState} parser
 */
function parseUnionClauseOpt(parser) {
  if (!consumeKeywordOpt(parser, 'UNION')) {
    return undefined;
  }
  const statement = parseSelectStatementOpt(parser);
  if (!statement) {
    throw new ParseError(parser);
  }
  return statement;
}

/**
 * @param {ParserState} parser
 * @returns {string}
 */
function parseStatementKeyword(parser) {
  consumeSpaces(parser);
  const keyword = consumeRegExpOpt(parser, /^\w+/);

  if (!keyword) {
    throw new ParseError(parser);
  }

  switch (keyword.toUpperCase()) {
    case 'SELECT':
    case 'UPDATE':
    case 'DELETE':
    case 'INSERT':
      return keyword.toUpperCase();
    case 'ALTER': {
      const word = consumeOneOfKeywords(parser, ['TABLE', 'DATABASE']);
      return `ALTER ${word}`;
    }
    case 'CREATE': {
      const word = consumeOneOfKeywords(parser, ['TABLE', 'DATABASE', 'INDEX']);
      return `CREATE ${word}`;
    }
    case 'DROP': {
      const word = consumeOneOfKeywords(parser, ['TABLE', 'DATABASE', 'INDEX']);
      return `DROP ${word}`;
    }
    default:
  }
  throw new ParseError(parser);
}

/**
 * @param {ParserState} parser
 */
function parseStatement(parser) {
  const keyword = parseStatementKeyword(parser);

  switch (keyword) {
    case 'SELECT': {
      const distinctKeyword = consumeOneOfKeywordsOpt(parser, [
        'ALL',
        'DISTINCT',
        'DISTINCTROW',
      ]);
      const distinct =
        distinctKeyword === 'DISTINCT' || distinctKeyword === 'DISTINCTROW';

      const highPriority = consumeKeywordOpt(parser, 'HIGH_PRIORITY');
      const straightJoin = consumeKeywordOpt(parser, 'STRAIGHT_JOIN');
      const sqlSmallResult = consumeKeywordOpt(parser, 'SQL_SMALL_RESULT');
      const sqlBigResult = consumeKeywordOpt(parser, 'SQL_BIG_RESULT');
      const sqlBufferResult = consumeKeywordOpt(parser, 'SQL_BUFFER_RESULT');
      const sqlNoCache = consumeKeywordOpt(parser, 'SQL_NO_CACHE');
      const sqlCalcFoundRows = consumeKeywordOpt(parser, 'SQL_CALC_FOUND_ROWS');

      const expressions = parseSelectExpressions(parser);
      if (expressions.length === 0) {
        throw new ParseError(parser);
      }
      const from = parseFromClauseOpt(parser);
      const where = parseWhereClauseOpt(parser);
      const orderBy = parseOrderByClauseOpt(parser);
      const groupBy = parseGroupByClauseOpt(parser);
      const having = parseHavingClauseOpt(parser);
      const limit = parseLimitClauseOpt(parser, true);
      const union = parseUnionClauseOpt(parser);
      return {
        type: 'SelectStatement',
        distinct,
        highPriority,
        straightJoin,
        sqlSmallResult,
        sqlBigResult,
        sqlBufferResult,
        sqlNoCache,
        sqlCalcFoundRows,
        expressions,
        from,
        where,
        orderBy,
        groupBy,
        having,
        limit,
        union,
      };
    }

    case 'CREATE TABLE': {
      const tableName = parseTableName(parser);
      const definitions = parseCreateDefinitionList(parser);
      const tableOptions = [];
      consumeSpaces(parser);
      while (getChar(parser) !== ';' && !isEOF(parser)) {
        tableOptions.push(parseTableOption(parser));
        consumeSpaces(parser);
        consumeCharOpt(parser, ',');
        consumeSpaces(parser);
      }
      return {
        type: 'CreateTableStatement',
        tableName,
        definitions,
        tableOptions,
      };
    }

    case 'CREATE DATABASE': {
      const databaseName = parseIdentifier(parser);
      return {
        type: 'CreateDatabaseStatement',
        databaseName,
      };
    }

    case 'CREATE INDEX': {
      const key = parseIdentifier(parser);
      consumeKeyword(parser, 'ON');
      const tableName = parseTableName(parser);
      const keyParts = parseKeyParts(parser);

      return {
        type: 'CreateIndexStatement',
        key,
        keyParts,
        tableName,
      };
    }

    case 'DROP TABLE': {
      const hasIfExists = consumeConsecutiveKeywordsOpt(parser, 'IF', 'EXISTS');
      const tableName = parseTableName(parser);
      return {
        type: 'DropTableStatement',
        hasIfExists,
        tableName,
      };
    }
    case 'DROP DATABASE': {
      const hasIfExists = consumeConsecutiveKeywordsOpt(parser, 'IF', 'EXISTS');
      const databaseName = parseIdentifier(parser);
      return {
        type: 'DropDatabaseStatement',
        hasIfExists,
        databaseName,
      };
    }
    case 'DROP INDEX': {
      const indexName = parseIdentifier(parser);
      consumeKeyword(parser, 'ON');
      const tableName = parseTableName(parser);
      return {
        type: 'DropIndexStatement',
        indexName,
        tableName,
      };
    }

    case 'UPDATE': {
      const lowPriority = consumeKeywordOpt(parser, 'LOW_PRIORITY');
      const ignore = consumeKeywordOpt(parser, 'IGNORE');
      const table = parseTableReferences(parser);
      const set = parseSetClause(parser);
      const where = parseWhereClauseOpt(parser);
      const orderBy = parseOrderByClauseOpt(parser);
      const limit = parseLimitClauseOpt(parser, false);
      return {
        type: 'UpdateStatement',
        lowPriority,
        ignore,
        table,
        set,
        where,
        orderBy,
        limit,
      };
    }

    case 'DELETE': {
      consumeKeyword(parser, 'FROM');
      const tableName = parseTableName(parser);
      const where = parseWhereClauseOpt(parser);
      const orderBy = parseOrderByClauseOpt(parser);
      const limit = parseLimitClauseOpt(parser, false);
      return {
        type: 'DeleteStatement',
        tableName,
        where,
        orderBy,
        limit,
      };
    }

    case 'INSERT': {
      const priority = consumeOneOfKeywordsOpt(parser, [
        'LOW_PRIORITY',
        'HIGH_PRIORITY',
      ]);
      const ignore = consumeKeywordOpt(parser, 'IGNORE');
      consumeKeywordOpt(parser, 'INTO');
      const table = parseTableName(parser);
      consumeSpaces(parser);

      let columnNames;
      if (consumeCharOpt(parser, '(')) {
        columnNames = [];
        columnNames.push(parseColumnName(parser));
        while (consumeCharOpt(parser, ',')) {
          columnNames.push(parseColumnName(parser));
          consumeSpaces(parser);
        }
        consumeSpaces(parser);
        consumeChar(parser, ')');
      }
      const values = parseValuesClauseOpt(parser);
      let set;
      let select;

      if (values) {
      } else if (consumeKeywordOpt(parser, 'SET')) {
        set = parseAssignmentList(parser);
      } else if (matchKeyword(parser, 'SELECT')) {
        select = parseStatement(parser);
      }

      let onDuplicateKeyUpdate;
      if (consumeKeywordOpt(parser, 'ON')) {
        consumeKeyword(parser, 'DUPLICATE');
        consumeKeyword(parser, 'KEY');
        consumeKeyword(parser, 'UPDATE');
        onDuplicateKeyUpdate = parseAssignmentList(parser);
      }

      return {
        type: 'InsertStatement',
        priority,
        ignore,
        table,
        columnNames,
        values,
        set,
        select,
        onDuplicateKeyUpdate,
      };
    }

    case 'ALTER TABLE': {
      const table = parseTableName(parser);

      let spec;
      const specifications = [];
      // eslint-disable-next-line no-cond-assign
      while ((spec = parseAlterTableSpecification(parser))) {
        specifications.push(spec);
        if (!consumeTokenOpt(parser, ',')) {
          break;
        }
      }

      return {
        type: 'AlterTableStatement',
        table,
        specifications,
      };
    }

    default:
  }
  throw new ParseError(parser);
}

/**
 * @param {string} source
 * @returns {ParserState}
 */
function createParser(source) {
  return {
    source,
    pos: 0,
    token: -1,
    tokenValue: '',
  };
}

/**
 * @param {string} code
 */
function parse(code) {
  const parser = createParser(code);
  const statement = parseStatement(parser);
  consumeSpaces(parser);
  consumeCharOpt(parser, ';');
  consumeSpaces(parser);
  if (parser.pos !== parser.source.length) {
    throw new ParseError(parser);
  }
  return statement;
}

exports.parse = parse;
