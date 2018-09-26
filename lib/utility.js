const {
  stat,
  utimes,
} = require('fs');
const path = require('path');
const { promisify } = require('util');


const fileStat = promisify(stat);
module.exports.fetchIsEmptyFile = async filePath => ((await fileStat(filePath).size) === 0);

module.exports.resolveWithContext = (filePath, context) => {
  if (!context) { throw new Error('There is no context when resolve path.'); }
  if (!path.isAbsolute(filePath)) return path.resolve(context, filePath);
  return filePath;
};

module.exports.generateFontFilePath = (extension, paths, options) => {
  if (!extension) return undefined;

  return path
    .resolve(paths.fonts)
    .replace(/\[fontname\]/g, options.fontName)
    .replace(/\[ext\]/g, extension);
};

module.exports.generateCssFilePath = (paths, options) => (path
  .resolve(paths.css)
  .replace(/\[fontname\]/g, options.fontName)
);

module.exports.generateFormattedError = errorString => (new Error(`iconfont-plugin: ${errorString}`));

const fileUtimes = promisify(utimes);
module.exports.sendToPast = async filePath => {
  await fileUtimes(
    filePath,
    new Date(Date.now() - 10000),
    new Date(Date.now() - 10000),
  );
};

module.exports.log = (...logging) => {
  console.log('\n--------\n\n\n\n');
  console.log(...logging);
  console.log('\n\n\n\n--------\n');
};
