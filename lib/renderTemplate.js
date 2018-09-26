const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const ejs = require('ejs');

const readFileAsync = promisify(fs.readFile);
module.exports = async data => {
  const templateString = await readFileAsync(path.resolve(__dirname, './mixinTemplate.ejs'), 'utf-8');
  data.glyphs = data.glyphs.map(glyph => ({
    name: glyph.name,
    codepoint: glyph.unicode[0].charCodeAt(0).toString(16).toUpperCase(),
  }));
  const renderedMixin = ejs.render(templateString, data);

  return renderedMixin;
};

