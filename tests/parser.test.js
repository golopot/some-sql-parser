/* eslint-disable quotes */
const Parser = require('../lib/parser');

function testPass(code) {
  it(code, () => {
    const ast = Parser.parse(code);
    expect(ast).toMatchSnapshot();
  });
}

function testFail(code) {
  it(code, () => {
    let didThrown = false;
    try {
      Parser.parse(code);
    } catch (e) {
      didThrown = true;
      expect(e).toMatchSnapshot();
    }

    if (!didThrown) {
      throw new Error('Expected a syntax error.');
    }
  });
}

testPass(`SELECT 1; SELECT 2;`);
testPass(`SELECT a FROM b WHERE m = 6;`);
testPass(`SELECT a, b,`);
testPass(`SELECT "1", '1', \`1\``);

testPass(`
SELECT
  a
`);

testPass(`SELECT fn(), fn(a), fn(a, b)`);
testPass(`SELECT f(g(a))`);
testPass(`SELECT f.g()`);
testFail(`SELECT f.g.h()`);
testPass(`SELECT max()`);
testPass(`SELECT max ()`);
testFail(`SELECT (f)()`);
testFail(`SELECT f()()`);

testPass(`SELECT a + b`);
testPass(`SELECT a + b - c`);
testPass(`SELECT a + b * c / d`);
testPass(`SELECT (a)`);
testPass(`SELECT 2 * (a % b)`);

testPass(`SELECT +-!~1`);
testPass(`SELECT + 1 - 2`);

testPass(`SELECT a aa`);
testPass(`SELECT a "aa"`);
testPass(`SELECT t as tt`);

testPass(`SELECT null, true, current_timestamp FROM a`);
testFail(`SELECT not FROM a`);
testFail(`SELECT varchar FROM a`);
testFail(`SELECT by FROM foo;`);
testFail(`SELECT a b c d e`);

testPass(`SELECT * FROM foo`);
testPass(`SELECT a.* FROM foo`);

testPass(`SELECT a."select" FROM foo`);

testPass(`SELECT (SELECT 1)`);

testPass(`SELECT * FROM (SELECT * FROM foo)`);

testPass(`SELECT * FROM foo WHERE a = (SELECT max(b) FROM foo)`);

testPass(`SELECT * FROM foo WHERE a = (SELECT max(b) FROM foo)`);

testPass(`SELECT * FROM foo.goo`);
testPass('SELECT * FROM `foo`.`goo`');
testPass(`SELECT * FROM "foo"`);

testPass(`SELECT * FROM foo, goo`);
testFail(`SELECT * FROM f.g.h`);

testFail(`SELECT`);
// join
testPass(`SELECT * FROM foo LEFT JOIN goo ON foo.a = goo.a`);
testPass(`SELECT * FROM foo f LEFT JOIN goo g ON f.a = g.a`);

// group by
testPass(`SELECT * FROM foo GROUP BY a HAVING b=5`);

testPass(`SELECT 1 UNION SELECT 2`);
testPass(`SELECT 1 UNION SELECT 2 UNION SELECT 3`);

testPass(`INSERT INTO foo VALUES (1, 2)`);
testPass(`INSERT foo VALUES (1, 2)`);
testPass(`INSERT INTO foo (a, b) VALUES (15, a * 2);`);
testPass(`INSERT INTO foo (a, b) VALUES (1, 2), (3, 4);`);
testPass(`INSERT INTO foo (a, b) SELECT c, d FROM bar;`);

testPass(`CREATE TABLE Foo ( a int )`);
testPass('CREATE TABLE `Foo` ( a int )');
testPass(`CREATE TABLE Foo ( a int, b varchar(255) )`);
testPass(`CREATE TABLE Foo ( a int primary key )`);
testPass(`CREATE TABLE Foo ( a int key )`);
testFail(`CREATE TABLE "Foo" ( a int )`);
testFail(`CREATE TABLE Foo ( key (id) )`);
testFail(`CREATE TABLE Foo ()`);

testPass(`CREATE DATABASE db_name`);

testPass(`CREATE INDEX idx ON t1 (col1, col2)`);

testPass(`UPDATE Foo SET a = 5`);
testPass(`UPDATE Foo SET a = 5, b = 6`);
testPass(`UPDATE Foo SET a = 1 WHERE b = 2 ORDER BY c LIMIT 4`);
testPass(`UPDATE Foo SET f(a) = 5`);
testFail(`UPDATE Foo SET a = 6 b`);
testFail(`UPDATE Foo SET a = 6 as b`);

testPass(`ALTER TABLE tbl_name ADD a int`);
testPass(`ALTER TABLE tbl_name ADD COLUMN a int`);
testPass(`ALTER TABLE tbl_name ADD a int FIRST`);
testPass(`ALTER TABLE tbl_name ADD a int AFTER b`);

testPass(`ALTER TABLE tbl_name ADD a int, ADD b int`);

testPass(`ALTER TABLE table_name DROP a`);
testPass(`ALTER TABLE table_name DROP COLUMN a`);
testPass(`ALTER TABLE table_name DROP INDEX index_name`);
testPass(`ALTER TABLE table_name DROP KEY index_name`);
testPass(`ALTER TABLE table_name DROP PRIMARY KEY`);
testPass(`ALTER TABLE table_name DROP FOREIGN KEY fk_symbol`);

testPass(`ALTER TABLE table_name RENAME COLUMN old_column TO new_column`);
testPass(`ALTER TABLE table_name RENAME KEY old_key TO new_key`);
testPass(`ALTER TABLE table_name RENAME INDEX old_key TO new_key`);
testPass(`ALTER TABLE table_name RENAME new_table_name`);
testPass(`ALTER TABLE table_name RENAME TO new_table_name`);
testPass(`ALTER TABLE table_name RENAME AS new_table_name`);

testPass(`DELETE FROM table_name WHERE a = 5 ORDER BY a LIMIT 3`);

testFail(`SSSSS foo FROM b`);
testFail(`SELECT 1 SELECT 2`);
testFail(`SELECT 1 UPDATE foo SET a = 5`);

testPass(`CREATE DATABASE db_name`);

testPass(`DROP TABLE table_name`);
testPass(`DROP TABLE IF EXISTS table_name`);

testPass(`DROP DATABASE db_name`);
testPass(`DROP DATABASE IF EXISTS db_name`);

testPass(`DROP INDEX index_name ON tbl_name`);
