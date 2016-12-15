#! /usr/bin/env node

var repl = require('repl')
var nesh = require('nesh')
var path = require('path')
var os = require('os')
var colors = require('colors')
var replHistory = require('repl.history')
var exec = require('child_process').exec
var loadPackages = require('./index')

const TRYMODULE_PATH = process.env.TRYMODULE_PATH || path.resolve((os.homedir()), '.trymodule')
const TRYMODULE_HISTORY_PATH = process.env.TRYMODULE_HISTORY_PATH || path.resolve(TRYMODULE_PATH, 'repl_history')

const flags = [];
const packages = {}; // data looks like [moduleName, as]

const makeVariableFriendly = str => str.replace(/-|\./g, '_')

process.argv.slice(2).forEach(arg => {
  if(arg[0] === '-') { // matches '--clear', etc
    flags.push(arg)
  } else if(arg.indexOf('=') > -1) { // matches 'lodash=_', etc
    const i = arg.indexOf('=')
    const module = arg.slice(0, i) // 'lodash'
    const as = arg.slice(i + 1) // '_'
    packages[module] = makeVariableFriendly(as) // ['lodash', '_']
  } else {
    // assume it's just a regular module name: 'lodash', 'express', etc
    packages[arg] = makeVariableFriendly(arg) // call it the module's name
  }
})

if (!flags.length && !Object.keys(packages).length) {
  throw new Error('You need to provide some arguments!')
}

const logGreen = (msg) => console.log(colors.green(msg))

const hasFlag = (flag) => flags.indexOf(flag) > -1

const addPackageToObject = (obj, pkg) => {
  logGreen(`Package '${pkg.name}' was loaded and assigned to '${pkg.as}' in the current scope`)
  obj[pkg.as] = pkg.package
  return obj
}

if (hasFlag('--clear')) {
  console.log(`Removing folder ${TRYMODULE_PATH + '/node_modules'}`)
  exec('rm -r ' + TRYMODULE_PATH + '/node_modules', (err, stdout, stderr) => {
    if (!err) {
      logGreen('Cache successfully cleared!')
      process.exit(0)
    } else {
      throw new Error('Could not remove cache! Error ' + err)
    }
  })
} else {
  logGreen('Gonna start a REPL with packages installed and loaded for you')

  // Extract
  loadPackages(packages, TRYMODULE_PATH).then((packages) => {
    const context_packages = packages.reduce((context, pkg) => {
      return addPackageToObject(context, pkg)
    }, {})
    
    let targetLang = 'JavaScript';
    
    if (hasFlag('--coffee')) {
      nesh.loadLanguage('coffee');
      targetLang = 'CoffeeScript';
    
    } else if (hasFlag('--babel')) {
      nesh.loadLanguage('babel');
      targetLang = 'BabelJS';
    }
    console.log(`${targetLang} REPL started...`);

    if (!process.env.TRYMODULE_NONINTERACTIVE) {
      nesh.start({
        prompt: '> ',
        historyFile: TRYMODULE_HISTORY_PATH
      }, function(err, replServer){
        if (err) console.error(err);
        replServer.context = Object.assign(replServer.context, context_packages);
      });
    }
  })
}
