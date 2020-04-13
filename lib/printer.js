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
    case 'StringLiteral':
      return concat(['"', node.value, '"']);
    case 'BacktickLiteral':
      return concat(['`', node.value, '`']);
    case 'NumberLiteral':
      return node.value;
    case 'DataType':
      // TODO: parameterized types
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
    case 'BacktickLiteral':
      return concat(['`', node.value, '`']);
    case 'TableReference':
      return node.type;
    case 'TableReferenceList':
      return joinByComma(node.tables.map((x) => printTable(x)));
    case 'TableFactor':
      return concat([
        printTable(node.table),
        ...(node.alias ? [' AS ', printNode(node.alias)] : []),
      ]);
    default:
  }

  throw new Error(`Unrecognized type ${node.type}`);
}

function printKeyParts(nodes) {
  return concat(['(', joinByComma(nodes.map((x) => printNode(x))), ')']);
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
      node.ignore ? ' IGNORE' : '',
      indent(concat([line, printTable(node.table)])),
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
      return concat([
        'DROP COLUMN',
        indent(concat([line, printNode(node.columnName)])),
      ]);

    case 'AlterTableAddColumnSpecification':
      return concat([
        'ADD COLUMN',
        indent(
          concat([
            line,
            printNode(node.columnName),
            ' ',
            printNode(node.columnType),
            node.first ? ' FIRST' : '',
            node.after ? concat([' AFTER ', printNode(node.after)]) : '',
          ])
        ),
      ]);

    default:
  }

  throw new Error(`Unrecognized type ${node.type}`);
}

function printColumnDefault(node) {
  switch (node.type) {
    case 'StringLiteral':
    case 'NumberLiteral':
      return printNode(node);
    default:
      // Default expression must be enclosed by parens
      return concat(['(', printExpression(node), ')']);
  }
}

function printKeyReferences(node) {
  return concat([
    'REFERENCES ',
    printTable(node.table),
    printKeyParts(node.keyParts),
    node.onDelete ? ` ON DELETE ${node.onDelete}` : '',
    node.onUpdate ? ` ON UPDATE ${node.onUpdate}` : '',
  ]);
}

function printIndexOption(node) {
  return concat([node.name, ' ', printNode(node.value)]);
}

function printIndexOptions(nodes) {
  return join(' ', nodes.map((x) => printIndexOption(x)));
}

function printCreateDefinition(node) {
  switch (node.type) {
    case 'ColumnDefinition':
      return concat([
        printNode(node.columnName),
        ' ',
        printNode(node.columnType),
        node.isNotNull ? ' NOT NULL' : '',
        node.columnDefault
          ? concat([' DEFAULT ', printColumnDefault(node.columnDefault)])
          : '',
        node.isUniqueKey ? ' UNIQUE KEY' : '',
        node.isPrimaryKey ? ' PRIMARY KEY' : '',
        node.comment ? concat([' COMMENT ', printNode(node.comment)]) : '',
        node.collate ? concat([' COLLATE ', printNode(node.collate)]) : '',
        node.references
          ? concat([' ', printKeyReferences(node.references)])
          : '',
      ]);
    case 'ForeignKeyDefinition':
      return concat([
        'FOREIGN KEY ',
        node.indexName ? concat([printNode(node.indexName), ' ']) : '',
        printKeyParts(node.columns),
        ' ',
        printKeyReferences(node.references),
      ]);
    case 'UniqueKeyDefinition':
      return concat([
        'UNIQUE KEY ',
        node.indexName ? concat([printNode(node.indexName), ' ']) : '',
        printKeyParts(node.keyParts),
        node.indexOptions.length > 0
          ? concat([' ', printIndexOptions(node.indexOptions)])
          : '',
      ]);
    case 'PrimaryKeyDefinition':
      return concat([
        'PRIMARY KEY ',
        printKeyParts(node.keyParts),
        node.indexOptions.length > 0
          ? concat([' ', printIndexOptions(node.indexOptions)])
          : '',
      ]);
    case 'KeyDefinition':
      return concat([
        'KEY ',
        node.indexName ? concat([printNode(node.indexName), ' ']) : '',
        printKeyParts(node.keyParts),
        node.indexOptions.length > 0
          ? concat([' ', printIndexOptions(node.indexOptions)])
          : '',
      ]);

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

    case 'CreateIndexStatement':
      return group(
        concat([
          'CREATE INDEX',
          indent(concat([line, printNode(node.key)])),
          line,
          'ON',
          indent(concat([line, printKeyParts(node.keyParts)])),
        ])
      );
    case 'CreateTableStatement':
      return group(
        concat([
          'CREATE TABLE ',
          printNode(node.tableName),
          ' (',
          indent(
            concat([
              line,
              joinByComma(
                node.definitions.map((x) => printCreateDefinition(x))
              ),
            ])
          ),
          line,
          ')',
          node.tableOptions.length === 0
            ? ''
            : concat([
                line,
                join(
                  line,
                  node.tableOptions.map((x) =>
                    concat([x.name, ' ', printNode(x.value)])
                  )
                ),
              ]),
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
  const code = `    CREATE TABLE Foo ( a int unique)
  `;

  console.log(inspect(parser.parse(code)));
  console.log(print(code));
}

if (require.main === module) {
  main();
}
