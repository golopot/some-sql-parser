/* eslint-disable quotes */
const Parser = require('../lib/parser');

function serializeParseError(error) {
  return {
    type: error.type,
    message: error.message,
    index: error.index,
    expected: error.expected,
  };
}

function testParse(code) {
  it(code, () => {
    let ast;
    try {
      ast = Parser.parse(code);
    } catch (err) {
      ast = serializeParseError(err);
    }
    expect(ast).toMatchSnapshot();
  });
}

testParse(`SELECT 1; SELECT 2;`);
testParse(`SELECT a FROM b WHERE m = 6;`);
testParse(`SELECT a, b,`);
testParse(`SELECT "1", '1', \`1\``);

testParse(`
SELECT
  a
`);

testParse(`SELECT fn(), fn(a), fn(a, b)`);
testParse(`SELECT f(g(a))`);
testParse(`SELECT a + b`);
testParse(`SELECT a + b - c`);
testParse(`SELECT a + b * c / d`);
testParse(`SELECT (a)`);
testParse(`SELECT 2 * (a % b)`);

testParse(`SELECT a + b as c`);

testParse(`SELECT a from A.B`);

testParse(`SELECT null, true, current_timestamp from a`);

testParse(`SELECT not from a`);
testParse(`SELECT varchar from a`);

testParse(`CREATE TABLE Foo ( a int )`);
testParse(`CREATE TABLE Foo ( a int, b varchar(255) )`);
testParse(`CREATE TABLE Foo ( a int primary key )`);
testParse(`CREATE TABLE Foo ( key (id) )`);
testParse(`CREATE TABLE "Foo" ( a int )`);
testParse(`CREATE TABLE Foo ()`);

testParse(`UPDATE Foo SET a = 5`);
testParse(`UPDATE Foo SET f(a) = 5`);

testParse(`DROP DATABASE db_name`);
testParse(`DROP DATABASE IF EXISTS db_name`);

testParse(`ALTER TABLE tbl_name ADD a int`);
testParse(`ALTER TABLE tbl_name ADD COLUMN a int`);
testParse(`ALTER TABLE tbl_name ADD a int FIRST`);
testParse(`ALTER TABLE tbl_name ADD a int AFTER b`);
