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

/**
 * @param {string} code
 * @returns {string}
 */
function print(code) {
  const ast = parser.parse(code);

  // eslint-disable-next-line global-require
  console.log(require('util').inspect(ast, {depth: null, colors: true}));
  const doc = printSelectStatment(ast);

  return prettier.doc.printer.printDocToString(doc, {
    printWidth: 60,
    tabWidth: 2,
    useTabs: false,
  }).formatted;
}

function main() {
  console.log(
    print(`
    select a e ,b w from foo where a = 5
  `)
  );
}

main();
