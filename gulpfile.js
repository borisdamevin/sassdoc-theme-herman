'use strict';

var autoprefixer = require('gulp-autoprefixer');
var browserSync = require('browser-sync').create();
var chalk = require('chalk');
var copy = require('bluebird').promisify(require('fs-extra').copy);
var gulp = require('gulp');
var gutil = require('gulp-util');
var path = require('path');
var rename = require('gulp-rename');
var sass = require('gulp-sass');
var sassdoc = require('sassdoc');
var sasslint = require('gulp-sass-lint');
var sourcemaps = require('gulp-sourcemaps');


// Set your Sass project (the one you're generating docs for) path.
// Relative to this Gulpfile.
var projectPath = './';

// Project path helper.
var project = function () {
  var args = Array.prototype.slice.call(arguments);
  args.unshift(projectPath);
  return path.resolve.apply(path, args);
};

// Theme and project specific paths.
var paths = {
  SASS_DIR: 'scss/',
  CSS_DIR: 'assets/css/',
  IMG_DIR: 'assets/img/',
  SVG_DIR: 'assets/svg/',
  JS_DIR: 'assets/js/',
  SRC_SASS_DIR: project('scss'),
  DOCS_DIR: project('sassdoc'),
  TEMPLATES: 'views/**/*.j2',
  IGNORE: [
    '!**/.#*',
    '!**/flycheck_*'
  ],
  init: function () {
    this.SASS = [
      this.SASS_DIR + '**/*.scss'
    ].concat(this.IGNORE);
    this.JS = [
      this.JS_DIR + '**/*.js'
    ].concat(this.IGNORE);
    return this;
  }
}.init();

var onError = function (err) {
  gutil.log(chalk.red(err.message));
  gutil.beep();
  this.emit('end');
};

var sasslintTask = function (src, failOnError, log) {
  if (log) {
    gutil.log('Running', '\'' + chalk.cyan('sasslint ' + src) + '\'...');
  }
  var stream = gulp.src(src)
    .pipe(sasslint())
    .pipe(sasslint.format())
    .pipe(sasslint.failOnError());
  if (!failOnError) {
    stream.on('error', onError);
  }
  return stream;
};


gulp.task('sasslint', function () {
  return sasslintTask(paths.SASS, true);
});

gulp.task('sasslint-nofail', function () {
  return sasslintTask(paths.SASS);
});

gulp.task('sass', function () {
  return gulp.src(paths.SASS_DIR + '*.scss')
    .pipe(sourcemaps.init())
    .pipe(sass())
    .on('error', onError)
    .pipe(autoprefixer({
      browsers: ['last 2 versions'],
      cascade: false
    }))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(paths.CSS_DIR));
});

gulp.task('browser-sync', function (cb) {
  browserSync.init({
    server: {
      baseDir: paths.DOCS_DIR
    },
    logLevel: 'info',
    logPrefix: 'oddbird',
    notify: false,
    files: [paths.DOCS_DIR + '**/*']
  }, cb);
});

// SassDoc compilation.
// See: http://sassdoc.com/customising-the-view/
gulp.task('compile', function () {
  var config = {
    verbose: true,
    dest: paths.DOCS_DIR,
    theme: './',
    // Disable cache to enable live-reloading.
    // Usefull for some template engines (e.g. Swig).
    cache: false,
  };

  return gulp.src(path.join(paths.SRC_SASS_DIR, '**/*.scss'))
    .pipe(sassdoc(config));
});

// Dump JS files from theme into `docs/assets` whenever they get modified.
// Prevent requiring a full `compile`.
gulp.task('dumpJS', function () {
  var src = paths.JS_DIR;
  var dest = path.join(paths.DOCS_DIR, 'assets/js');

  return copy(src, dest).then(function () {
    gutil.log(src + ' copied to ' + path.relative(__dirname, dest));
  });
});

// Dump CSS files from theme into `docs/assets` whenever they get modified.
// Prevent requiring a full `compile`.
gulp.task('dumpCSS', ['sass'], function () {
  var src = paths.CSS_DIR;
  var dest = path.join(paths.DOCS_DIR, 'assets/css');

  return copy(src, dest).then(function () {
    gutil.log(src + ' copied to ' + path.relative(__dirname, dest));
  });
});


// Development task.
// While working on a theme.
gulp.task('develop', ['compile', 'sass', 'browser-sync'], function () {

  gulp.watch(paths.SASS, ['sass', 'dumpCSS'], function (ev) {
    if (ev.type === 'added' || ev.type === 'changed') {
      sasslintTask(ev.path, false, true);
    }
  });
  gulp.watch(paths.JS, ['dumpJS']);
  gulp.watch(paths.TEMPLATES, ['compile']);
  gulp.watch('**/.sass-lint.yml', ['sasslint-nofail']);
});


// gulp.task('svgmin', function () {
//   return gulp.src('assets/svg/*.svg')
//     .pipe(cache(
//       imagemin({
//         svgoPlugins: [{ removeViewBox: false }]
//       })
//     ))
//     .pipe(gulp.dest('assets/svg'));
// });


// gulp.task('imagemin', function () {
//   return gulp.src('assets/img/{,*/}*.{gif,jpeg,jpg,png}')
//     .pipe(cache(
//       imagemin({
//         progressive: true,
//         use: [pngcrush()]
//       })
//     ))
//     .pipe(gulp.dest('assets/img'));
// });


// // Pre release/deploy optimisation tasks.
// gulp.task('dist', [
//   'jsmin',
//   'svgmin',
//   'imagemin',
// ]);