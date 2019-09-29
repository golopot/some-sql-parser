const Parser = require('./parser');

function main() {
  const ast = Parser.parse(`
    SELECT 1;
  `);
  console.log(ast);
}

main();
