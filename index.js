#!/usr/bin/env node

var npmi = require('npmi')
var path = require('path')
var colors = require('colors')

const packageLocation = (pkg, install_path) => {
  return path.resolve(install_path, 'node_modules', pkg)
}

const loadPackage = (moduleName, moduleAs, install_path) => {
  return new Promise((resolve, reject) => {
    try {
      const loadedPackage = require(packageLocation(moduleName, install_path))
      console.log(colors.blue(`'${moduleName}' was already installed since before!`))
      resolve({name: moduleName, package: loadedPackage, as: moduleAs})
    } catch (err) {
      console.log(colors.yellow(`Couldn't find '${moduleName}' locally, gonna download it now`))
      npmi({name: moduleName, path: install_path}, (err, result) => {
        if (err) {
          console.log(colors.red(err.message))
          if (err.statusCode === 404) {
            throw new Error(`Could not find package ${moduleName}`)
          }
          if (err.code === npmi.LOAD_ERR) {
            throw new Error('npm load error')
          }
          if (err.code === npmi.INSTALL_ERR) {
            throw new Error('npm install error')
          }
        }
        const loadedPackage = require(packageLocation(moduleName, install_path))
        resolve({name: moduleName, package: loadedPackage, as: moduleAs})
      })
    }
  })
}

module.exports = (packages_to_install, install_path) => {
  return new Promise((resolve, reject) => {
    const promises_for_installation = [];
    Object.keys(packages_to_install).forEach(moduleName => {
      const as = packages_to_install[moduleName]
      promises_for_installation.push(loadPackage(moduleName, as, install_path))
    })
      Promise.all(promises_for_installation).then(resolve).catch(reject)
  })
}
