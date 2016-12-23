#!/usr/bin/env node
'use strict';

// Entry file for Markbind project
const chalk = require('chalk');
const clear = require('clear');
const figlet = require('figlet');
const fs = require('fs');
const path = require('path');
const program = require('commander');
const html = require('html');

const Parser = require('./lib/parser');

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
    console.log('Please first run include command, then run render command for the include result');
  });

program
  .command('include <file>')
  .description('process all the include in the given file')
  .action(function (file) {
    // TODO: need to check file existence
    let output = program.output || 'output';
    markbindParser.fileInclude(file, (error, result) => {
      if (error) {
        return console.log('Error processing file including.');
      }
      let parsedPath = path.parse(file);
      let outputPath = path.join(process.cwd(), parsedPath.name + '_out' + parsedPath.ext);
      console.log('Writting to ' + outputPath);
      fs.writeFileSync(outputPath, result);
    });
  });

program
  .command('render <file>')
  .description('render the given file')
  .action(function (file) {
    // TODO: need to check file existence
    let output = program.output || 'output';
    markbindParser.renderFile(file, (error, result) => {
      if (error) {
        return console.log('Error processing file rendering.');
      }
      result = html.prettyPrint(result, {indent_size: 2});
      let outputPath = path.join(process.cwd(), path.parse(file).name + '_rendered.html');
      console.log('Writting to ' + outputPath);
      fs.writeFileSync(outputPath, result);
    });
  });

if (typeof cmdValue === 'undefined') {
  // TODO: Handle illegal command
  // process.exit(1);
}

program.parse(process.argv);
