# MarkBind
MarkBind is a tool for composing Markdown and HTML documents from reusable fragments. It provides functionality to 
support including markdown fragment files and markdown segments.
 
## Installation
1. Clone the repo.
2. `npm install` (or `yarn install` if you have Yarn installed) to install dependent packages.
3. `npm link` to make `markbind` a command supported in your commandline.

## Usage
```
  Usage: markbind [options] [command] <file>
  
  Commands:

    include <file>  process all the include in the given file
    render <file>   render the given file

  Options:

    -h, --help           output usage information
    -V, --version        output the version number
    -o, --output <path>  output file path (default: where you run the command)
```
