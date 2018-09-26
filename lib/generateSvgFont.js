const fs = require('fs');
const SVGIcons2SVGFontStream = require('svgicons2svgfont');
const defaultMetadataProvider = require('svgicons2svgfont/src/metadata');
const fileSorter = require('svgicons2svgfont/src/filesorter');


const getGlyphsMetadata = async (files, options) => {
  const metadataProvider =
    options.metadataProvider
    || defaultMetadataProvider({
      prependUnicode: options.prependUnicode,
      startUnicode: options.startUnicode,
    });

  const sortedFiles = files.sort((a, b) => fileSorter(a, b));
  const glyphsMetadata = await Promise
    .all(sortedFiles.map(file => (
      new Promise((resolve, reject) => {
        metadataProvider(file, (err, metadata) => {
          if (err) { reject(err); }
          resolve(metadata);
        });
      })
    )));
  return glyphsMetadata;
};

const generateSvgFont = async (glyphs, paths, options) => {
  const glyphsMetadata = await getGlyphsMetadata(glyphs, options);

  return new Promise((resolve, reject) => {
    let result = '';

    const fontStream = new SVGIcons2SVGFontStream({
      fontName: options.fontName,
      fontId: options.fontId,
      fontStyle: options.fontStyle,
      fontWeight: options.fontWeight,
      fixedWidth: options.fixedWidth,
      centerHorizontally: options.centerHorizontally,
      normalize: options.normalize,
      fontHeight: options.fontHeight,
      round: options.round,
      descent: options.descent,
      ascent: options.ascent,
      startUnicode: options.startUnicode,
      prependUnicode: options.prependUnicode,
      metadata: options.metadata,
      log: options.verbose ? console.log.bind(console) : () => {},
    })
      .on('data', chunk => {
        result += chunk;
      })
      .on('finish', () => resolve({
        glyphsMetadata,
        result,
      }))
      .on('error', reject);

    glyphsMetadata.forEach(glyphMetadata => {
      const glyphStream = fs.createReadStream(glyphMetadata.path);
      glyphStream.metadata = glyphMetadata;
      fontStream.write(glyphStream);
    });
    fontStream.end();
  });
};

module.exports = generateSvgFont;
