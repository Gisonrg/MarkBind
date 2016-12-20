#!/usr/bin/env node
'use strict';

// Entry file for Markbind project
const chalk = require('chalk');
const clear = require('clear');
const figlet = require('figlet');
const fs = require('fs');
const path = require('path');
const program = require('commander');

const Parser = require('./lib/parser');
const utils = require('./lib/utils');

let markbindParser = new Parser();

clear();
console.log(
    chalk.yellow(
        figlet.textSync('MarkBind', {horizontalLayout: 'full'})
    )
);

program
  .version('0.1.0')
  .option('-o, --output <path>', 'output file path')
  .arguments('<file>')
  .action(function (file) {
  });

program
  .command('include <file>')
  .description('process all the include in the given file')
  .action(function(file) {
    let output = program.output || 'output';
    markbindParser.fileInclude(file, (error, html) => {
      fs.writeFileSync(path.join(process.cwd(), path.parse(file).base), html);
    });
  });

program
  .command('render <file>')
  .description('render the given file')
  .action(function(file) {
    // check file existence
    let output = program.output || 'output';
    markbindParser.renderFile(file, (error, html) => {
      fs.writeFileSync(path.join(process.cwd(), path.parse(file).name + '.html'), html);
    });
  });

if (typeof cmdValue === 'undefined') {
  // Handle illegal stuff
  // process.exit(1);
}

program.parse(process.argv);

// let inputFile = '/Users/Gison/code/2016/FYP/markbind/src/index.html';

// markbindParser.parseFile(inputFile, (error, html) => {
//   console.log(html);
//   fs.writeFileSync('out.html', html);
// });
