'use strict';

const htmlparser = require('htmlparser2');
const md = require('markdown-it')({
  html: true
});

const _ = require('lodash');

const cheerio = require('cheerio');
cheerio.prototype.options.xmlMode = true; // Enable xml mode for self-closing tag

const utils = require('./utils');

const fs = require('fs');
const path = require('path');
const url = require('url');

/*
 * Utils
 */
function isText(element) {
  return element.type === 'text';
}

function Parser(options) {
  this._options = options || {};
  this._fileCache = {};
}

Parser.prototype.preprocess = function (element, context) {
  let self = this;
  if (element.name === 'include') {
    let includeSrc = url.parse(element.attribs.src);
    let includeSrcPath = includeSrc.path;
    let filePath = path.resolve(path.dirname(context.cwf), includeSrcPath);
    let isInline = _.hasIn(element.attribs, 'inline');
    self._fileCache[filePath] = self._fileCache[filePath] ?
      self._fileCache[filePath] : fs.readFileSync(filePath, 'utf8');
    element.name = isInline ? 'span' : 'div';
    let fileContent = self._fileCache[filePath]; // cache the file contents to save some I/O
    delete element.attribs.src;
    delete element.attribs.inline;
    if (includeSrc.hash) {
      // directly get segment from the src
      let segmentSrc = cheerio.parseHTML(fileContent);
      let $ = cheerio.load(segmentSrc);
      let htmlContent = $(includeSrc.hash).html();
      let actualContent = context.mode === 'include' ?
        (isInline ? utils.wrapContent(htmlContent) : utils.wrapContent(htmlContent, '\n\n', '\n'))
        : md.render(htmlContent);
      element.children = cheerio.parseHTML(actualContent); // the needed content;
    } else {
      element.children = cheerio.parseHTML(context.mode === 'include' ?
        (isInline ? utils.wrapContent(fileContent) : utils.wrapContent(fileContent, '\n\n', '\n'))
        : md.render(fileContent));
    }

    // The element's children are in the new context
    // Process with new context
    let childContext = _.cloneDeep(context);
    childContext.cwf = filePath;
    if (element.children && element.children.length > 0) {
      element.children = element.children.map((e) => {
        return self.preprocess(e, childContext);
      });
    }
  } else {
    if (element.children && element.children.length > 0) {
      element.children = element.children.map((e) => {
        return self.preprocess(e, context);
      });
    }
  }

  return element;
};

Parser.prototype.parse = function (element, context) {
  let self = this;
  if (_.isArray(element)) {
    return element.map((el) => {
      return self.parse(el, context);
    });
  }

  if (isText(element)) {
    return element;
  } else {
    if (element.name) {
      element.name = element.name.toLowerCase();
    }

    switch (element.name) {
      default:
        if (element.children) {
          element.children.forEach(child => {
            self.parse(child, context);
          });
        }
        return element;
    }
  }
};

Parser.prototype.trimNodes = function (node) {
  let self = this;
  if (node.children) {
    for (let n = 0; n < node.children.length; n++) {
      let child = node.children[n];
      if (
        child.type === 'comment' ||
        (child.type === 'text' && !/\S/.test(child.data))
      ) {
        node.children.splice(n, 1);
        n--;
      } else if (child.type === 'tag') {
        self.trimNodes(child);
      }
    }
  }
};

Parser.prototype.fileInclude = function (file, cb) {
  let self = this;
  let context = {};
  context.cwf = path.resolve(process.cwd(), file); // current working file
  context.mode = 'include';
  let handler = new htmlparser.DomHandler(function (error, dom) {
    if (error) {
      return cb(error);
    }
    let nodes = dom.map(d => {
      return self.preprocess(d, context);
    });
    nodes.forEach(d => {
      self.trimNodes(d);
    });
    cb(null, cheerio.html(dom));
  });

  let parser = new htmlparser.Parser(handler, {
    xmlMode: true
  });

  // Read files
  fs.readFile(file, (err, data) => {
    if (err) {
      cb(err);
      return;
    }
    if (utils.getExtName(file) === 'md') {
      context.source = 'md';
      parser.parseComplete(data.toString());
    } else if (utils.getExtName(file) === 'html') {
      context.source = 'html';
      parser.parseComplete(data);
    }
  });
};

Parser.prototype.renderFile = function (inputFile, cb) {
  let self = this;
  let context = {};
  context.cwf = path.resolve(process.cwd(), inputFile); // current working file
  context.mode = 'render';
  let handler = new htmlparser.DomHandler(function (error, dom) {
    if (error) {
      return cb(error);
    }
    let nodes = dom.map(d => {
      return self.parse(d, context);
    });
    cb(null, cheerio.html(nodes));
  });

  let parser = new htmlparser.Parser(handler, {
    xmlMode: true
  });

  // Read files
  fs.readFile(inputFile, (err, data) => {
    if (err) {
      cb(err);
      return;
    }
    let inputData = data;
    if (utils.getExtName(inputFile) === 'md') {
      inputData = md.render(inputData.toString());
      context.source = 'md';
      parser.parseComplete(inputData);
    }
    if (utils.getExtName(inputFile) === 'html') {
      context.source = 'html';
      parser.parseComplete(data);
    }
  });
};

Parser.prototype.parseFile = function (inputFile, cb) {
  let self = this;
  let context = {};
  context.cwf = path.resolve(process.cwd(), inputFile); // current working file
  context.mode = 'parse';
  let handler = new htmlparser.DomHandler(function (error, dom) {
    if (error) {
      return cb(error);
    }
    let nodes = dom.map(d => {
      return self.preprocess(d, context);
    });
    nodes.forEach(d => {
      self.trimNodes(d);
    });
    nodes = nodes.map(d => {
      return self.parse(d, context);
    });
    cb(null, cheerio.html(nodes));
  });

  let parser = new htmlparser.Parser(handler, {
    xmlMode: true
  });

  // Read files
  fs.readFile(inputFile, (err, data) => {
    if (err) {
      cb(err);
      return;
    }
    let inputData = data;
    if (utils.getExtName(inputFile) === 'md') {
      inputData = md.render(inputData.toString());
      context.source = 'md';
      parser.parseComplete(inputData);
    }
    if (utils.getExtName(inputFile) === 'html') {
      context.source = 'html';
      parser.parseComplete(data);
    }
  });
};

module.exports = Parser;
