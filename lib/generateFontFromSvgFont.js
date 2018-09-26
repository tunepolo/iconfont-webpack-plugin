const svg2ttf = require('svg2ttf');
const ttf2eot = require('ttf2eot');
const ttf2woff = require('ttf2woff');
const ttf2woff2 = require('ttf2woff2');

const generateFontFromSvgFont = (
  svgFontString,
  extensions,
  {
    copyright,
    ts,
    version,
    metadata,
  },
) => {
  const result = {};
  const ttfFontBuffer = Buffer
    .from(svg2ttf(
      svgFontString,
      {
        copyright,
        ts,
        version,
      },
    ).buffer);

  if (extensions.includes('svg')) {
    result.svg = svgFontString;
  }

  if (extensions.includes('ttf')) {
    result.ttf = ttfFontBuffer;
  }

  if (extensions.includes('eot')) {
    result.eot = ttf2eot(ttfFontBuffer).buffer;
  }

  if (extensions.includes('woff')) {
    result.woff = ttf2woff(ttfFontBuffer, { metadata }).buffer;
  }

  if (extensions.includes('woff2')) {
    result.woff2 = ttf2woff2(ttfFontBuffer);
  }

  return result;
};

module.exports = generateFontFromSvgFont;
