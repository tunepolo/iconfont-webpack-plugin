const { writeFile } = require('fs');
const { promisify } = require('util');
const globby = require('globby');
const { filterAsync } = require('node-filter-async');
const chokidar = require('chokidar');
const debounce = require('lodash.debounce');
const generateSvgFont = require('./generateSvgFont');
const generateFontFromSvgFont = require('./generateFontFromSvgFont');
const defaultRenderTemplate = require('./renderTemplate');
const {
  fetchIsEmptyFile,
  resolveWithContext,
  generateFontFilePath,
  generateCssFilePath,
  generateFormattedError,
  sendToPast,
  log,
} = require('./utility');

const writeFileAsync = promisify(writeFile);

const tap = (compiler, v3Name, v4Name, fn) => {
  if (compiler.hooks && compiler.hooks[v4Name]) {
    compiler.hooks[v4Name].tapAsync('iconfont-plugin', fn);
  } else {
    compiler.plugin(v3Name, fn);
  }
};

class IconfontWebpackPlugin {
  constructor({
    paths,
    ...configuredOptions
  }) {
    this.errors = [];

    if (!paths) {
      this.errors.push(generateFormattedError('path options are required.'));
    }
    const requiredPathOptions = ['svgs', 'fonts', 'css'];
    requiredPathOptions.forEach(required => {
      if (!paths[required]) {
        this.errors.push(generateFormattedError(`path.${required} option is required.`));
      }
    });
    if (this.errors.length > 0) return;

    this.paths = paths;
    if (!Array.isArray(this.paths.svgs)) {
      this.paths.svgs = [this.paths.svgs];
    }

    this.options = {
      distPath: '/',
      fontName: 'iconfont',
      fontId: null,
      fontStyle: '',
      fontWeight: '',
      fixedWidth: false,
      centerHorizontally: false,
      normalize: true,
      fontHeight: 1000,
      round: 10e12,
      descent: 0,
      ascent: undefined,
      startUnicode: 0xEA01,
      prependUnicode: true,
      metadata: undefined,
      log: undefined,
      cssTemplate: defaultRenderTemplate,
      cssClass: 'iconfont',
      formats: ['ttf', 'eot', 'woff', 'woff2', 'svg'],
      fontTimestamp: undefined,
      fontCopyright: undefined,
      fontVersion: undefined,
      ...configuredOptions
    };
    this.lastGeneratedSvgFont = '';
    this.isInitial = true;

    this.options.distPath = this.options.distPath.replace(/\/$/, '');
  }

  apply(compiler) {
    this.resolvePaths(compiler.context);

    tap(compiler, 'emit', 'emit', this.emitError.bind(this));
    if (this.errors.length > 0) return;

    tap(compiler, 'run', 'run', (compilation, callback) => {
      this.compile();
      callback();
    });

    tap(compiler, 'watch-run', 'watchRun', async (compilation, callback) => {
      if (this.watcher) {
        callback();
        return;
      }

      await this.compile();

      this.watcher = chokidar.watch(
        this.paths.svgs,
        {
          persistent: true,
        },
      );
      const compile = debounce(() => { this.compile(); }, 200);
      const eventTriggers = ['add', 'unlink'];
      eventTriggers.forEach(trigger => {
        this.watcher.on(trigger, compile);
      });
      // work around of chokidar issue.
      // https://github.com/paulmillr/chokidar/issues/698
      this.watcher.on('raw', event => {
        if (event === 'modified') {
          compile();
        }
      });
      callback();
    });
  }

  async compile() {
    try {
      const glyphs = (await globby(this.paths.svgs));
      const filteredGlyphs = await filterAsync(
        glyphs,
        async glyph => !(await fetchIsEmptyFile(glyph)),
      );

      const {
        glyphsMetadata,
        result: svgFont,
      } = await generateSvgFont(filteredGlyphs, this.paths, this.options);
      if (this.lastGeneratedSvgFont === svgFont) {
        return;
      }
      this.lastGeneratedSvgFont = svgFont;

      const fonts = generateFontFromSvgFont(
        svgFont,
        this.options.formats,
        {
          copyright: this.options.fontCopyright,
          ts: this.options.fontTimestamp,
          version: this.options.fontVersion,
          metadata: this.options.metadata,
        },
      );
      const css = await this.options.cssTemplate({
        fontName: this.options.fontName,
        cssClass: this.options.cssClass,
        distPath: this.options.distPath,
        glyphs: glyphsMetadata,
      });

      await Promise.all([
        ...Object.entries(fonts).map(([extension, data]) => (
          writeFileAsync(generateFontFilePath(extension, this.paths, this.options), data)
            .then(async () => {
              // work around of webpack issue.
              // https://github.com/webpack/webpack/issues/5749
              if (this.isInitial) {
                await sendToPast(generateFontFilePath(extension, this.paths, this.options));
              }
            })
        )),
        writeFileAsync(generateCssFilePath(this.paths, this.options), css)
          .then(async () => {
            // work around of webpack issue.
            // https://github.com/webpack/webpack/issues/5749
            if (this.isInitial) await sendToPast(generateCssFilePath(this.paths, this.options));
          }),
      ]);
      this.isInitial = false;
    } catch (error) {
      const formattedError = generateFormattedError(error.toString());
      this.errors.push(formattedError);
    }
  }

  emitError(compilation, callback) {
    compilation.errors = [
      ...compilation.errors,
      ...this.errors,
    ];
    this.errors = [];
    callback();
  }

  resolvePaths(context) {
    this.paths.svgs = this.paths.svgs.map(svgPath => resolveWithContext(svgPath, context));
    this.paths.fonts = resolveWithContext(this.paths.fonts, context);
    this.paths.css = resolveWithContext(this.paths.css, context);
  }
}

module.exports = IconfontWebpackPlugin;
