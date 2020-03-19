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
testParse(`SELECT f()()`);
testParse(`SELECT f.g()`);
testParse(`SELECT f.g.h()`);
testParse(`SELECT (f)()`);
testParse(`SELECT max()`);
testParse(`SELECT max ()`);
testParse(`SELECT a + b`);
testParse(`SELECT a + b - c`);
testParse(`SELECT a + b * c / d`);
testParse(`SELECT (a)`);
testParse(`SELECT 2 * (a % b)`);

testParse(`SELECT a as aa`);
testParse(`SELECT a aa`);
testParse(`SELECT a "aa"`);

testParse(`SELECT null, true, current_timestamp FROM a`);

testParse(`SELECT not FROM a`);
testParse(`SELECT varchar FROM a`);
testParse(`SELECT by FROM foo;`);
testParse(`SELECT a b c d e`);

testParse(`SELECT * FROM foo`);
testParse(`SELECT a.* FROM foo`);

testParse(`SELECT a."select" FROM foo`);

testParse(`SELECT * FROM (SELECT * FROM foo)`);

testParse(`SELECT * FROM foo WHERE a = (SELECT max(b) FROM foo)`);

testParse(`SELECT * FROM foo WHERE a = (SELECT max(b) FROM foo)`);

testParse(`SELECT * FROM foo.goo`);
testParse('SELECT * FROM `foo`.`goo`');
testParse(`SELECT * FROM "foo"`);

testParse(`SELECT * FROM foo, goo`);
testParse(`SELECT * FROM f.g.h`);

// join
testParse(`SELECT * FROM foo LEFT JOIN goo ON foo.a = goo.a`);
testParse(`SELECT * FROM foo f LEFT JOIN goo g ON f.a = g.a`);

// group by
testParse(`SELECT * FROM foo GROUP BY a HAVING b=5`);

testParse(`SELECT 1 UNION SELECT 2`);

testParse(`INSERT INTO foo VALUES (1, 2)`);
testParse(`INSERT foo VALUES (1, 2)`);
testParse(`INSERT INTO foo (a, b) VALUES (15, a * 2);`);
testParse(`INSERT INTO foo (a, b) VALUES (1, 2), (3, 4);`);
testParse(`INSERT INTO foo VALUE (1), (2);`);
testParse(`INSERT INTO foo (a, b) SELECT c, d FROM bar;`);

testParse(`CREATE TABLE Foo ( a int )`);
testParse(`CREATE TABLE Foo ( a int, b varchar(255) )`);
testParse(`CREATE TABLE Foo ( a int primary key )`);
testParse(`CREATE TABLE Foo ( key (id) )`);
testParse(`CREATE TABLE "Foo" ( a int )`);
testParse(`CREATE TABLE Foo ()`);

testParse(`CREATE DATABASE db_name`);

testParse(`CREATE INDEX idx ON t1 (col1, col2)`);

testParse(`UPDATE Foo SET a = 5`);
testParse(`UPDATE Foo SET a = 5, b = 6`);
testParse(`UPDATE Foo SET a = 1 WHERE b = 2 ORDER BY c LIMIT 4`);
testParse(`UPDATE Foo SET f(a) = 5`);
testParse(`UPDATE Foo SET a = 6 b`);
testParse(`UPDATE Foo SET a = 6 as b`);

testParse(`ALTER TABLE tbl_name ADD a int`);
testParse(`ALTER TABLE tbl_name ADD COLUMN a int`);
testParse(`ALTER TABLE tbl_name ADD a int FIRST`);
testParse(`ALTER TABLE tbl_name ADD a int AFTER b`);

testParse(`SSSSS foo FROM b`);
testParse(`SELECT 1 SELECT 2`);
testParse(`SELECT 1 UPDATE foo SET a = 5`);

testParse(`CREATE DATABASE db_name`);

testParse(`DROP TABLE table_name`);
testParse(`DROP TABLE IF EXISTS table_name`);

testParse(`DROP DATABASE db_name`);
testParse(`DROP DATABASE IF EXISTS db_name`);
