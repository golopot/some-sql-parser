// eslint-disable-next-line import/no-extraneous-dependencies
const prettier = require('prettier');
const parser = require('./parser');

// eslint-disable-next-line no-unused-vars
const b = prettier.doc.builders;

const {concat, line, join, group, indent} = prettier.doc.builders;

function printExpression(node) {
  if (!node) {
    return '';
  }
  switch (node.type) {
    case 'Identifier': {
      return node.name;
    }
    case 'AliasExpression': {
      return concat([
        printExpression(node.expression),
        ' ',
        printExpression(node.alias),
      ]);
    }
    case 'BinaryExpression': {
      return concat([
        printExpression(node.left),
        line,
        node.operator,
        line,
        printExpression(node.right),
      ]);
    }
    case 'NumberLiteral': {
      return node.value;
    }
    case 'TupleExpression': {
      // eslint-disable-next-line no-use-before-define
      return concat(['(', printExpressions(node.expressions), ')']);
    }
    default:
  }

  if (node.type === undefined) {
    console.error(node);
    throw new Error('Dont know how to print this.');
  }

  return node.type;
}

function printWhereClause(node) {
  if (!node) {
    return '';
  }

  return concat([
    'WHERE',
    indent(concat([line, printExpression(node.expression)])),
  ]);
}

function printFromClause(node) {
  if (!node) {
    return '';
  }
  return concat(['FROM', indent(concat([line, node.table.table.table.name]))]);
}

function printTable(node) {
  switch (node.type) {
    case 'Identifier':
      return node.name;
    case 'TableReference':
      return node.type;
    default:
  }

  throw new Error(`Unrecognized table type ${node.type}`);
}

function printSelectStatment(node) {
  return group(
    concat([
      'SELECT',
      indent(
        concat([
          line,
          join(
            concat([',', line]),
            node.expressions.map((expr) => printExpression(expr))
          ),
        ])
      ),
      line,
      printFromClause(node.from),
      line,
      printWhereClause(node.where),
    ])
  );
}

function printExpressions(nodes) {
  return join(concat([',', line]), nodes.map((expr) => printExpression(expr)));
}

function printUpdateStatement(node) {
  return group(
    concat([
      'UPDATE',
      indent(
        concat([
          line,
          node.table.table.table.name,
          line,
          'SET',
          line,
          join(
            concat([',', line]),
            node.set.expressions.map((expr) => printExpression(expr))
          ),
        ])
      ),
      line,
      printWhereClause(node.where),
    ])
  );
}

function printInsertStatement(node) {
  return group(
    concat([
      'INSERT INTO',
      indent(
        concat([
          line,
          printTable(node.table),
          line,

          node.values
            ? concat(['VALUES', printExpressions(node.values.expressions)])
            : '',
        ])
      ),
      line,
      printWhereClause(node.where),
    ])
  );
}

function printStatement(node) {
  switch (node.type) {
    case 'SelectStatement':
      return printSelectStatment(node);
    case 'UpdateStatement':
      return printUpdateStatement(node);
    case 'InsertStatement':
      return printInsertStatement(node);
    default:
  }

  throw new Error(`Unrecognized statement type ${node.type}`);
}

/**
 * @param {string} code
 * @returns {string}
 */
function print(code) {
  const ast = parser.parse(code);

  const doc = printStatement(ast);

  return prettier.doc.printer.printDocToString(doc, {
    printWidth: 60,
    tabWidth: 2,
    useTabs: false,
  }).formatted;
}

exports.print = print;

function main() {
  function inspect(thing) {
    // eslint-disable-next-line global-require
    require('util').inspect(thing, {depth: null, colors: true});
  }

  const code = `    INSERT into foo values (1, 2)
  `;

  inspect(parser.parse(code));
  console.log(print(code));
}

if (require.main === module) {
  main();
}
