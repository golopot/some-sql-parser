// eslint-disable-next-line import/no-extraneous-dependencies
const prettier = require('prettier');
const parser = require('./parser');

// eslint-disable-next-line no-unused-vars
const b = prettier.doc.builders;

const {concat, line, join, group, indent} = prettier.doc.builders;

function printNode(node) {
  switch (node.type) {
    case 'Identifier':
      return node.name;
    default:
  }

  throw new Error(`Unrecognized type ${node.type}`);
}

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
    case 'WildcardExpression': {
      return '*';
    }

    default:
  }

  if (node.type === undefined) {
    console.error(node);
    throw new Error('Dont know how to print this.');
  }

  return node.type;
}

function joinByComma(nodes) {
  return join(concat([',', line]), nodes);
}

function printExpressions(nodes) {
  return join(concat([',', line]), nodes.map((expr) => printExpression(expr)));
}

function printWhereClause(node) {
  if (!node) {
    return '';
  }

  return concat([
    line,
    'WHERE',
    indent(concat([line, printExpression(node.expression)])),
  ]);
}

function printOrderByClause(node) {
  if (!node) {
    return '';
  }

  return concat([
    line,
    'ORDER BY',
    indent(concat([line, printExpressions(node.columnNames)])),
  ]);
}

function printLimitClause(node) {
  if (!node) {
    return '';
  }

  return concat([
    line,
    'LIMIT',
    indent(concat([line, printExpression(node.count)])),
  ]);
}

function printFromClause(node) {
  if (!node) {
    return '';
  }
  return concat([
    line,
    'FROM',
    indent(concat([line, node.table.table.table.name])),
  ]);
}

function printValuesClause(node) {
  if (!node) {
    return '';
  }
  return concat([
    line,
    'VALUES',
    indent(concat([line, printExpressions(node.expressions)])),
  ]);
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
      printFromClause(node.from),
      printWhereClause(node.where),
      printOrderByClause(node.orderBy),
      printLimitClause(node.limit),
    ])
  );
}

function printUpdateStatement(node) {
  return group(
    concat([
      'UPDATE',
      indent(concat([line, node.table.table.table.name])),
      line,
      'SET',
      indent(
        concat([
          line,
          join(
            concat([',', line]),
            node.set.expressions.map((expr) => printExpression(expr))
          ),
        ])
      ),
      printWhereClause(node.where),
    ])
  );
}

function printInsertStatement(node) {
  return group(
    concat([
      'INSERT INTO',
      indent(concat([line, printTable(node.table)])),
      printValuesClause(node.values),
      printWhereClause(node.where),
    ])
  );
}

function printSpecification(node) {
  switch (node.type) {
    case 'AlterTableRenameTableSpecification':
      return concat([
        'RENAME',
        indent(concat([line, printTable(node.tableName)])),
      ]);
    case 'AlterTableRenameKeySpecification':
      return concat([
        'RENAME INDEX',
        indent(
          concat([
            line,
            printNode(node.sourceKey),
            ' TO ',
            printNode(node.targetKey),
          ])
        ),
      ]);

    case 'AlterTableRenameColumnSpecification':
      return concat([
        'RENAME COLUMN',
        indent(
          concat([
            line,
            printNode(node.sourceColumnName),
            ' TO ',
            printNode(node.targetColumnName),
          ])
        ),
      ]);

    case 'DropForeignKeySpecification':
      return concat([
        'DROP FOREIGN KEY',
        indent(concat([line, printNode(node.key)])),
      ]);

    case 'DropPrimaryKeySpecification':
      return concat(['DROP PRIMARY KEY']);

    case 'DropKeySpecification':
      return concat(['DROP KEY', indent(concat([line, printNode(node.key)]))]);

    case 'DropColumnSpecification':
      return concat(['DROP COLUMN', indent(concat([line, printNode(node.columnName)]))]);

    default:
  }

  throw new Error(`Unrecognized type ${node.type}`);
}

function printStatement(node) {
  switch (node.type) {
    case 'SelectStatement':
      return printSelectStatment(node);
    case 'UpdateStatement':
      return printUpdateStatement(node);
    case 'InsertStatement':
      return printInsertStatement(node);
    case 'DropIndexStatement':
      return group(
        concat([
          'DROP INDEX',
          indent(concat([line, printNode(node.indexName)])),
          printWhereClause(node.where),
        ])
      );
    case 'DropDatabaseStatement':
      return group(
        concat([
          'DROP DATABASE',
          node.hasIfExists ? ' IF EXISTS' : '',
          indent(concat([line, printNode(node.databaseName)])),
          line,
        ])
      );

    case 'DropTableStatement':
      return group(
        concat([
          'DROP TABLE',
          node.hasIfExists ? ' IF EXISTS' : '',
          indent(concat([line, printNode(node.tableName)])),
        ])
      );

    case 'CreateDatabaseStatement':
      return group(
        concat([
          'CREATE DATABASE',
          indent(concat([line, printNode(node.databaseName)])),
        ])
      );

    case 'DeleteStatement':
      return group(
        concat([
          'DELETE FROM',
          indent(concat([line, printTable(node.tableName)])),
          printWhereClause(node.where),
          printOrderByClause(node.orderBy),
          printLimitClause(node.limit),
        ])
      );

    case 'AlterTableStatement':
      return group(
        concat([
          'ALTER TABLE',
          indent(concat([line, printTable(node.table)])),
          line,
          joinByComma(node.specifications.map((s) => printSpecification(s))),
        ])
      );

    default:
  }

  throw new Error(`Unrecognized statement type ${node.type}`);
}

function inspect(thing) {
  // eslint-disable-next-line global-require
  return require('util').inspect(thing, {depth: null, colors: true});
}

/**
 * @param {string} code
 * @returns {string}
 */
function print(code) {
  const ast = parser.parse(code);

  let doc;
  try {
    doc = printStatement(ast);
  } catch (e) {
    e.message += `\n${inspect(ast)}`;
    throw e;
  }

  return prettier.doc.printer.printDocToString(doc, {
    printWidth: 10,
    tabWidth: 2,
    useTabs: false,
  }).formatted;
}

exports.print = print;

function main() {
  const code = `    alter table qq drop key ewqewq
  `;

  console.log(inspect(parser.parse(code)));
  console.log(print(code));
}

if (require.main === module) {
  main();
}
