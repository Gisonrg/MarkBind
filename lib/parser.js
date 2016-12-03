'use strict';

const htmlparser = require("htmlparser2");
const md = require('markdown-it')({
    html: true
});

const _ = require('lodash');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const url = require('url');

/*
 * Utils
 */
function isText(element) {
    return element.type === 'text';
}

function getExtName(file) {
    let ext = file.split('.').pop();
    if (!ext || ext == file) {
        return '';
    }
    return ext;
}

function Parser(options) {
    this._options = options || {};
    this._fileCache = {};
}

Parser.prototype.preprocess = function(element, context) {
    var self = this;

    if (element.name === 'include') {
        let includeSrc = url.parse(element.attribs.src);
        let includeSrcPath = includeSrc.path;
        let filePath = path.resolve(path.dirname(context.cwf), includeSrcPath);
        self._fileCache[filePath] = self._fileCache[filePath] ? self._fileCache[filePath] : fs.readFileSync(filePath, 'utf8');
        let fileContent = self._fileCache[filePath]; // cache the file contents to save some I/O
        if (_.hasIn(element.attribs, 'inline')) {
            element.name = 'span';
            element.attribs.src = '';
        } else {
            element.name = 'p';
            element.attribs.src = '';
        }
        if (includeSrc.hash) {
            // directly get segment from the src
            let segmentSrc = cheerio.parseHTML(fileContent);
            let $ = cheerio.load(segmentSrc);
            let renderedContent = md.render($(includeSrc.hash).html());
            let content = cheerio.parseHTML(renderedContent); // the needed content
            element.children = content;
        } else {
            let contentSrc = cheerio.parseHTML(md.render(fileContent));
            element.children = contentSrc;
        }
    }

    if (element.children && element.children.length > 0) {
        element.children = element.children.map((e) => {
            return self.preprocess(e, context);
        });
    }

    return element;
};

Parser.prototype.parse = function(element, context) {
    let self = this;
    if (_.isArray(element)) {
        return element.map((el) => {
            return self.parse(el, context);
        })
    }

    if (isText(element)) {
        // console.log(cheerio.parseHTML('<div>' + md.render(element.data) + '</div>')[0]);
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

Parser.prototype.parseFile = function(inputFile, cb) {
    let self = this;
    let context = {};
    context.cwf = path.resolve(process.cwd(), inputFile); // current working file
    let handler = new htmlparser.DomHandler(function(error, dom) {
        if (error) return cb(error);
        let nodes = dom.map(d => {
            return self.preprocess(d, context);
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
        if (err) cb(err);
        let inputData = data;
        if (getExtName(inputFile) === 'md') {
            inputData = md.render(inputData.toString());
            parser.parseComplete(inputData);
        }
        if (getExtName(inputFile) === 'html') {
            parser.parseComplete(data);
        }
    });
}

module.exports = Parser;
