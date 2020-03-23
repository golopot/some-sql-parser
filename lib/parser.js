// [] error when order of clauses is wrong, like SELECT a LIMIT 1 WHERE ...
// [x] function call expression
// [x] parenthesis expression
// [x] member expression
// [x] alias expression
// [x] wildcard star expression
// [] SELECT DISTINCT
// [] Tuple expression
// [] subquery
// [x] parse left join as one keyword
// [x] parameterized types
// [] lexer
// [] not operator
// [] operators
// [] comments
// [] multiple statements

const reservedWords = require('./reservedWords');
const Token = require('./token');

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
 * @param {ParserState} parser
 * @param {RegExp} regExp
 * @param {string} [message]
 * @returns {string}
 */
function consumeRegExp(parser, regExp, message) {
  const match = regExp.exec(parser.source.slice(parser.pos));
  if (!match) {
    if (message) {
      throw new ParseError(message, parser);
    } else {
      throw new ParseError('Invalid syntax.', parser);
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
 * @returns {void}
 */
function consumeSpaces(parser) {
  consumeRegExp(parser, /^[ \t\r\n]*/);
}

/**
 * @param {string | undefined} word
 * @returns {boolean}
 */
function isReservedWord(word) {
  return word !== undefined && reservedWords.has(word.toUpperCase());
}

/**
 * @param {string|undefined} text
 * @returns {boolean}
 */
function isStatementKeyword(text) {
  if (text === undefined) {
    return false;
  }
  switch (text) {
    case 'SELECT':
    case 'UPDATE':
    case 'INSERT':
    case 'DELETE':
    case 'CREATE':
    case 'DROP':
    case 'ALTER':
      return true;
    default:
      return false;
  }
}

const precedenceMap = new Map([
  ['.', 20],
  ['*', 11],
  ['+', 10],
  ['-', 10],
  ['/', 9],
  ['=', 8],
  ['%', 8],
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
    throw new ParseError('Invalid syntax', parser);
  }
  return word;
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
 * @returns {void}
 */
function nextToken(parser) {
  /* eslint-disable no-param-reassign */
  consumeSpaces(parser);
  const word = consumeRegExp(parser, /^\w*/);

  const uppercaseWord = word.toUpperCase();

  if (isStatementKeyword(uppercaseWord)) {
    parser.token = Token.StatementKeyword;
  } else if (reservedWords.has(uppercaseWord)) {
    parser.token = Token.ReservedWord;
  } else {
    parser.token = Token.Identifier;
  }
  parser.tokenValue = word;
}

/**
 * @param {ParserState} parser
 */
function peekToken(parser) {
  /* eslint-disable no-param-reassign */
  const start = parser.pos;
  nextToken(parser);
  const {token, tokenValue} = parser;
  parser.pos = start;
  return {
    token,
    tokenValue,
  };
}

/**
 * @param {ParserState} parser
 */
function parseIdentifierOpt(parser) {
  consumeSpaces(parser);
  const start = parser.pos;
  const text = consumeRegExpOpt(parser, /^\w+/);
  if (isReservedWord(text)) {
    setPos(parser, start);
    return undefined;
  }
  return text;
}

/**
 * @param {ParserState} parser
 */
function parseIdentifier(parser) {
  const identifier = parseIdentifierOpt(parser);
  if (identifier === undefined) {
    throw new ParseError(`Unexpected token.`, parser);
  }
  return identifier;
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
function parseLiteralOpt(parser) {
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
function parseParenthesisExpression(parser) {
  advanceOne(parser);
  // eslint-disable-next-line no-use-before-define
  const expressions = parseExpressions(parser);
  if (expressions.length === 0) {
    throw new ParseError('Invalid syntax', parser);
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
      node = parseLiteralOpt(parser);
      break;
    case '*':
      advanceOne(parser);
      return {
        type: 'WildcardExpression',
      };
    case '(':
      node = parseParenthesisExpression(parser);
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
    default:
      node = parseIdentifierOpt(parser);
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

  return node;
}

/**
 * @param {ParserState} parser
 */
function parseSelectExpression(parser) {
  consumeSpaces(parser);

  const expression = parseExpression(parser, 0);

  consumeSpaces(parser);

  const word = getWord(parser);

  if (word && word.toUpperCase() === 'AS') {
    consumeWord(parser);
    const alias = parseIdentifier(parser);

    return {
      type: 'AliasExpression',
      expression,
      alias,
      hasAsKeyword: true,
    };
  }

  if (!word || isReservedWord(word)) {
    return expression;
  }

  const alias = parseIdentifier(parser);

  return {
    type: 'AliasExpression',
    expression,
    alias,
    hasAsKeyword: false,
  };
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
 * @param {string} keyword
 * @returns {void}
 */
function expectKeyword(parser, keyword) {
  consumeSpaces(parser);
  const word = consumeRegExpOpt(parser, /^\w+/);
  if (!word || word.toUpperCase() !== keyword) {
    throw new ParseError(`Expecting keyword ${keyword}.`, parser);
  }
}

/**
 * @param {ParserState} parser
 * @param {string[]} keywords
 * @returns {string}
 */
function expectOneOfKeywords(parser, keywords) {
  consumeSpaces(parser);
  const word = consumeRegExpOpt(parser, /^\w+/);

  if (!word) {
    throw new ParseError('Invalid syntax.', parser);
  }

  const WORD = word.toUpperCase();
  for (const keyword of keywords) {
    if (keyword === WORD) {
      return WORD;
    }
  }
  throw new ParseError('Invalid syntax.', parser);
}

/**
 * @param {ParserState} parser
 * @returns {string}
 */
function parseClauseKeyword(parser) {
  consumeSpaces(parser);
  const keyword = consumeRegExpOpt(parser, /^\w+/);

  if (!keyword) {
    throw new ParseError('Clause expected.', parser);
  }

  switch (keyword.toUpperCase()) {
    case 'SELECT':
    case 'UPDATE':
    case 'DELETE':
    case 'FROM':
    case 'WHERE':
    case 'HAVING':
    case 'SET':
    case 'LIMIT':
    case 'INTO':
    case 'JOIN':
    case 'ON':
    case 'VALUES': {
      return keyword.toUpperCase();
    }
    case 'ALTER': {
      const word = expectOneOfKeywords(parser, ['TABLE', 'DATABASE']);
      return `ALTER ${word}`;
    }
    case 'CREATE': {
      const word = expectOneOfKeywords(parser, ['TABLE', 'DATABASE', 'INDEX']);
      return `CREATE ${word}`;
    }
    case 'DROP': {
      const word = expectOneOfKeywords(parser, ['TABLE', 'DATABASE', 'INDEX']);
      return `DROP ${word}`;
    }
    case 'LEFT': {
      expectKeyword(parser, 'JOIN');
      return 'LEFT JOIN';
    }
    case 'RIGHT': {
      expectKeyword(parser, 'JOIN');
      return 'RIGHT JOIN';
    }
    case 'GROUP': {
      expectKeyword(parser, 'BY');
      return 'GROUP BY';
    }
    case 'INSERT': {
      const word = getWord(parser);
      if (word && word.toUpperCase() === 'INTO') {
        consumeWord(parser);
        return 'INSERT INTO';
      }
      return 'INSERT';
    }
    default:
      break;
  }

  return keyword;
}

/**
 * @param {ParserState} parser
 * @returns {string}
 */
function parseNumberLiteral(parser) {
  consumeSpaces(parser);
  const word = consumeWord(parser);
  if (!/^[0-9]+$/.test(word)) {
    throw new ParseError('Invalid syntax.', parser);
  }
  return word;
}

/**
 * @param {ParserState} parser
 */
function parseType(parser) {
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

  throw new ParseError('Invalid type.', parser);
}

/**
 * @param {ParserState} parser
 */
function parseCreateDefinition(parser) {
  consumeSpaces(parser);
  const columnName = parseIdentifierOpt(parser);
  if (!columnName) {
    throw new ParseError('Invalid create table definition.', parser);
  }
  consumeSpaces(parser);
  const columnType = parseType(parser);
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
function parserIdentifierOrBacktickLiteral(parser) {
  consumeSpaces(parser);

  if (getChar(parser) === '`') {
    return parseLiteralOpt(parser);
  }

  return parseIdentifier(parser);
}

/**
 * @param {ParserState} parser
 */
function parseSubquery(parser) {
  consumeSpaces(parser);
  consumeChar(parser, '(');
  // eslint-disable-next-line no-use-before-define
  const statement = parseStatement(parser);
  console.log(statement);
  if (
    statement.clauses.length > 0 &&
    statement.clauses[0].type === 'SelectClause'
  ) {
    consumeChar(parser, ')');
    return statement;
  }

  throw new ParseError('Invalid subquery.', parser);
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
    return parseSubquery(parser);
  }

  return parseTableName(parser);
}

/**
 * @param {ParserState} parser
 */
function parseTableReference(parser) {
  consumeSpaces(parser);
  return parseTableFactor(parser);
}

/**
 * @param {ParserState} parser
 */
function parseClause(parser) {
  consumeSpaces(parser);
  const clauseName = parseClauseKeyword(parser);
  if (!clauseName) {
    throw new ParseError(`Unexpected token.`, parser);
  }
  consumeSpaces(parser);

  switch (clauseName) {
    case 'SELECT': {
      const expressions = parseSelectExpressions(parser);
      if (expressions.length === 0) {
        throw new ParseError('Invalid syntax.', parser);
      }
      return {
        type: 'SelectClause',
        expressions,
      };
    }
    case 'CREATE TABLE': {
      const tableName = parseTableName(parser);
      const definitions = parseCreateDefinitionList(parser);
      return {
        type: 'Clause',
        clauseName,
        tableName,
        definitions,
      };
    }
    case 'CREATE DATABASE': {
      const databaseName = parseIdentifier(parser);
      return {
        type: 'CreateDatabaseClause',
        databaseName,
      };
    }
    case 'DROP TABLE': {
      let hasIfExists = false;
      if (consumeKeywordOpt(parser, 'IF')) {
        expectKeyword(parser, 'EXISTS');
        hasIfExists = true;
      }
      const tableName = parseTableName(parser);
      return {
        type: 'DropTableClause',
        hasIfExists,
        tableName,
      };
    }
    case 'DROP DATABASE': {
      const databaseName = parseIdentifier(parser);
      return {
        type: 'DropDatabaseClause',
        databaseName,
      };
    }
    case 'DROP INDEX': {
      const indexName = parseIdentifier(parser);
      expectKeyword(parser, 'ON');
      const tableName = parseTableName(parser);
      return {
        type: 'DropIndexClause',
        indexName,
        tableName,
      };
    }
    case 'FROM': {
      const table = parseTableReference(parser);

      return {
        type: 'FromClause',
        table,
      };
    }
    case 'UPDATE': {
      const table = parseTableReference(parser);

      return {
        type: 'UpdateClause',
        table,
      };
    }
    case 'SET': {
      const expressions = parseExpressions(parser);
      return {
        type: 'SetClause',
        expressions,
      };
    }

    case 'WHERE': {
      const expression = parseExpression(parser, 0);
      return {
        type: 'WhereClause',
        expression,
      };
    }

    case 'INSERT':
    case 'INSERT INTO': {
      const table = parseTableName(parser);
      return {
        type: 'InsertClause',
        table,
      };
    }

    case 'ALTER TABLE': {
      const table = parseTableName(parser);
      expectKeyword(parser, 'ADD');
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
        type: 'AlterTableClause',
        variant: 'ADD COLUMN',
        table,
        columnName,
        columnType,
        first,
        after,
      };
    }

    case 'VALUES': {
      const expressions = parseExpressions(parser);
      return {
        type: 'ValuesClause',
        expressions,
      };
    }
    default:
  }

  throw new ParseError(`Invalid syntax.`, parser);
}

/**
 * @param {ParserState} parser
 */
function parseStatement(parser) {
  const {token} = peekToken(parser);

  if (token !== Token.StatementKeyword) {
    throw new ParseError('Expecting a statement.', parser);
  }

  const clauses = [];

  let clause;
  // eslint-disable-next-line no-cond-assign
  while ((clause = parseClause(parser))) {
    clauses.push(clause);
    const word = getWord(parser);
    if (!word) {
      break;
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
  if (getChar(parser) === ';') {
    advanceOne(parser);
  }
  consumeSpaces(parser);
  if (parser.pos !== parser.source.length) {
    throw new ParseError('Invalid syntax.', parser);
  }
  return statement;
}

exports.parse = parse;
