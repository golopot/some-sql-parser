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
testPass(`SELECT /* comment */ 1;`);
testPass(`SELECT 1 -- comment;`);
testPass(`SELECT a FROM b WHERE m = 6;`);
testFail(`SELECT a, b,`);
testPass(`SELECT "1", '1', \`1\``);

testPass(`
SELECT
  a
`);

testPass(`SELECT a + b`);
testPass(`SELECT a + b * c`);
testPass(`SELECT a * b + c`);
testPass(`SELECT +-!~1`);
testPass(`SELECT NOT a`)
testPass(`SELECT !a`)
testPass(`SELECT + 1 - 2`);
testPass(`SELECT a || b`)
testPass(`SELECT a && b`)
testPass(`SELECT a OR b`)
testPass(`SELECT a XOR b`)
testPass(`SELECT a AND b`)
testPass(`SELECT a IS TRUE`)
testPass(`SELECT a IS NOT TRUE`)
testPass(`SELECT a IS FALSE`)
testPass(`SELECT a IS NULL`)
testPass(`SELECT a IS NOT NULL`)
testPass(`SELECT a < 0`)
testPass(`SELECT a <= 0`)
testPass(`SELECT a = 0`)
testPass(`SELECT a != 0`)
testPass(`SELECT a > 0`)
testPass(`SELECT a <= 0`)
testPass(`SELECT a <> 0`)
testPass(`SELECT a <=> 0`)
testPass(`SELECT a | 0`)
testPass(`SELECT a & 0`)
testPass(`SELECT a << 0`)
testPass(`SELECT a >> 0`)
testPass(`SELECT a DIV 0`)
testPass(`SELECT a MODE 0`)
testPass(`SELECT a % 0`)
testPass(`SELECT a ^ 0`)
testPass(`SELECT (a)`);
testPass(`SELECT 2 * (a % b)`);

testPass(`SELECT a.b`);
testPass(`SELECT a.b.c`);
testPass('SELECT `a`.`b`');
testPass('SELECT a.*');
testPass('SELECT - a.b');
testFail('SELECT a.b.c.d');
testFail('SELECT "a".b');
testFail('SELECT a."b"');
testFail('SELECT *.a');

testPass(`SELECT fn(), fn(a), fn(a, b)`);
testPass(`SELECT f(g(a))`);
testPass(`SELECT f.g()`);
testPass(`SELECT max()`);
testPass(`SELECT max ()`);
testPass(`SELECT CURRENT_DATE()`);
testPass('SELECT `foo`()');
testPass('SELECT `foo`.`bar`()');
testFail(`SELECT "foo"()`);
testFail(`SELECT f.g.h()`);
testFail(`SELECT f().g`);
testFail(`SELECT (f)()`);
testFail(`SELECT f()()`);

testPass(`SELECT a aa`);
testPass(`SELECT a "aa"`);
testPass(`SELECT a \`aa\``);
testPass(`SELECT t as tt`);

testPass(`SELECT null, true, current_timestamp FROM a`);
testFail(`SELECT not FROM a`);
testFail(`SELECT varchar FROM a`);
testFail(`SELECT by FROM foo;`);
testFail(`SELECT a b c d e`);

testPass(`SELECT * FROM foo`);
testPass(`SELECT a.* FROM foo`);

testPass(`SELECT (SELECT 1)`);

testPass(`SELECT * FROM (SELECT * FROM foo) alias`);
testFail(`SELECT * FROM (SELECT * FROM foo)`);

testPass(`SELECT * FROM foo WHERE a = (SELECT 42)`);

testPass(`SELECT * FROM foo as goo`);
testPass(`SELECT * FROM foo goo`);

testPass(`SELECT * FROM foo.goo`);
testPass('SELECT * FROM `foo`.`goo`');
testFail(`SELECT * FROM "foo"`);

testPass(`SELECT * FROM foo, goo`);
testFail(`SELECT * FROM f.g.h`);

testFail(`SELECT`);
// join
testPass(`SELECT * FROM foo JOIN goo`);
testPass(`SELECT * FROM foo JOIN goo ON f.a = g.a`);

testPass(`SELECT * FROM foo LEFT JOIN goo ON foo.a = goo.a`);
testPass(`SELECT * FROM foo f LEFT JOIN goo g ON f.a = g.a`);
testPass(`SELECT * FROM foo LEFT JOIN goo ON 1 LEFT JOIN hoo ON 1`);
testFail(`SELECT * FROM foo LEFT JOIN goo`);

testPass(`SELECT * FROM foo GROUP BY a HAVING b=5`);

testPass(`SELECT * ORDER BY a`);
testPass(`SELECT * ORDER BY a, b`);
testPass(`SELECT * ORDER BY a ASC`);
testPass(`SELECT * ORDER BY a DESC`);

testPass(`SELECT * LIMIT 50, 10`);
testPass(`SELECT * LIMIT 10 OFFSET 50`);

testPass(`SELECT 1 UNION SELECT 2`);
testPass(`SELECT 1 UNION SELECT 2 UNION SELECT 3`);

testPass(`SELECT ALL *`);
testPass(`SELECT DISTINCT *`);
testPass(`SELECT DISTINCTROW *`);
testPass(`SELECT HIGH_PRIORITY *`);
testPass(`SELECT STRAIGHT_JOIN *`);
testPass(`SELECT SQL_SMALL_RESULT *`);
testPass(`SELECT SQL_BIG_RESULT *`);
testPass(`SELECT SQL_BUFFER_RESULT *`);
testPass(`SELECT SQL_NO_CACHE *`);
testPass(`SELECT SQL_CALC_FOUND_ROWS *`);

testPass(`INSERT foo VALUES (1)`);
testPass(`INSERT LOW_PRIORITY foo VALUES (1)`);
testPass(`INSERT HIGH_PRIORITY foo VALUES (1)`);
testPass(`INSERT IGNORE foo VALUES (1)`);
testPass(`INSERT INTO foo VALUES (1)`);
testFail(`INSERT DELAYED foo VALUES (1)`);

testPass(`INSERT foo VALUES (1)`);
testPass(`INSERT foo VALUES (1, 2)`);
testPass(`INSERT foo (a, b) VALUES (1, 2), (3, 4);`);
testPass(`INSERT foo SET a = 1, b = 2;`);
testPass(`INSERT foo (a, b) SELECT c, d FROM bar;`);
testPass(`INSERT foo VALUES (1) ON DUPLICATE KEY UPDATE a = 1;`);
testPass(`INSERT foo VALUES (1) ON DUPLICATE KEY UPDATE a = 1, b = 2;`);
testFail(`INSERT foo VALUES (1) ON DUPLICATE KEY UPDATE a;`);

testPass(`CREATE TABLE Foo ( a int )`);
testPass('CREATE TABLE `Foo` ( a int )');
testPass(`CREATE TABLE Foo ( a int, b varchar(255) )`);
testPass(`CREATE TABLE Foo ( a int primary key )`);
testPass(`CREATE TABLE Foo ( a int key )`);
testPass(`CREATE TABLE Foo ( a int UNIQUE KEY )`);
testPass(`CREATE TABLE Foo ( a int UNIQUE KEY KEY )`);
testPass(`CREATE TABLE Foo ( a int UNIQUE PRIMARY KEY )`);
testPass(`CREATE TABLE Foo ( a int COMMENT "cccc" )`);
testPass(`CREATE TABLE Foo ( a int COLLATE collation_name )`);
testPass(`CREATE TABLE Foo ( a int NULL )`);
testPass(`CREATE TABLE Foo ( a int NOT NULL )`);
testPass(`CREATE TABLE Foo ( a int DEFAULT 50 )`);
testPass(`CREATE TABLE Foo ( a int DEFAULT "zoo" )`);
testPass(`CREATE TABLE Foo ( a int DEFAULT (uuid()) )`);
testPass(`CREATE TABLE Foo ( a int REFERENCES Goo(a) )`);
testPass(`CREATE TABLE Foo ( a int REFERENCES Goo(a) ON DELETE CASCADE )`);
testPass(`CREATE TABLE Foo ( a int REFERENCES Goo(a) ON DELETE RESTRICT )`);
testPass(`CREATE TABLE Foo ( a int REFERENCES Goo(a) ON DELETE NO ACTION )`);
testPass(`CREATE TABLE Foo ( a int REFERENCES Goo(a) ON DELETE SET NULL )`);
testPass(`CREATE TABLE Foo ( a int REFERENCES Goo(a) ON DELETE SET DEFAULT )`);
testPass(`CREATE TABLE Foo ( a int REFERENCES Goo(a) ON UPDATE CASCADE )`);
testPass(
  `CREATE TABLE Foo ( a int REFERENCES Goo(a) ON DELETE CASCADE ON UPDATE CASCADE )`
);
testPass(`CREATE TABLE Foo ( KEY (id) )`);
testPass(`CREATE TABLE Foo ( INDEX (id) )`);
testPass(`CREATE TABLE Foo ( KEY index_name (id) )`);
testPass(`CREATE TABLE Foo ( KEY index_name (id) COMMENT 'some_comment' )`);
testPass(`CREATE TABLE Foo ( PRIMARY KEY (id) )`);
testPass(`CREATE TABLE Foo ( PRIMARY KEY (id) COMMENT 'some_comment' )`);
testPass(`CREATE TABLE Foo ( UNIQUE KEY (id) )`);
testPass(`CREATE TABLE Foo ( UNIQUE INDEX (id) )`);
testPass(`CREATE TABLE Foo ( UNIQUE (id) )`);
testPass(`CREATE TABLE Foo ( UNIQUE KEY index_name (id) )`);
testPass(`CREATE TABLE Foo ( UNIQUE KEY (id) COMMENT 'some_comment' )`);
testPass(`CREATE TABLE Foo ( FOREIGN KEY (a) REFERENCES Goo (a) )`);
testPass(
  `CREATE TABLE Foo ( FOREIGN KEY (a) REFERENCES Goo (a) ON DELETE CASCADE )`
);
testPass(`CREATE TABLE Foo ( a int ) `);
testPass(`CREATE TABLE Foo ( a int ) COMMENT "some_comment"`);
testPass(`CREATE TABLE Foo ( a int ) COMMENT = "some_comment"`);
testPass(`CREATE TABLE Foo ( a int ) CHARACTER SET charset_name`);
testPass(`CREATE TABLE Foo ( a int ) DEFAULT CHARACTER SET charset_name`);
testPass(`CREATE TABLE Foo ( a int ) COLLATE collation_name`);
testPass(`CREATE TABLE Foo ( a int ) DEFAULT COLLATE collation_name`);
testPass(`CREATE TABLE Foo ( a int ) ENGINE engine_name`);
testPass(`CREATE TABLE Foo ( a int ) ENGINE = engine_name`);
testPass(`CREATE TABLE Foo ( a int ) COMMENT "c" ENGINE = e`);
testPass(`CREATE TABLE Foo ( a int ) COMMENT "c", ENGINE = e`);
testFail(`CREATE TABLE "Foo" ( a int )`);
testFail(`CREATE TABLE Foo ()`);
testFail(`CREATE TABLE Foo ( a int DEFAULT uuid() )`);

testPass(`CREATE DATABASE db_name`);

testPass(`CREATE INDEX idx ON t1 (col1, col2)`);

testPass(`UPDATE Foo SET a = 5`);
testPass(`UPDATE Foo SET a = 5, b = 6`);
testPass(`UPDATE Foo SET f(a) = 5`);
testPass(`UPDATE Foo SET a = 1 WHERE b = 2 ORDER BY c LIMIT 4`);
testPass(`UPDATE Foo SET a = 1 LIMIT 1`);
testPass(`UPDATE Foo, Goo SET a = 1`);
testPass(`UPDATE Foo JOIN Goo SET a = 1`);
testPass(`UPDATE LOW_PRIORITY Foo SET a = 1`);
testPass(`UPDATE IGNORE Foo SET a = 1`);
testFail(`UPDATE Foo SET a = 6 b`);
testFail(`UPDATE Foo SET a = 6 as b`);
testFail(`UPDATE Foo SET a = 1 LIMIT 1, 1`);

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
