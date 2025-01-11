import gulp  from 'gulp';
import fileinclude from 'gulp-file-include';
import markdown from 'gulp-markdown';
import gulpSass from 'gulp-sass';
import * as dartSass from 'sass'
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import template from 'gulp-template';
import inject from 'gulp-inject-string';
import rename from 'gulp-rename';
import clean from 'gulp-clean';
import connect from 'gulp-connect';
import livereload from 'gulp-livereload';
import tap from 'gulp-tap';
import replace from 'gulp-replace';
import header from 'gulp-header';

const sass = gulpSass(dartSass);
const argv = yargs(hideBin(process.argv)).argv;

const toCopy = [
  'node_modules/highlight.js/build/highlight.pack.js',
];

const CATEGORY = {
  TOOLS: 'tools',
  FRAMEWORKS: 'frameworks',
  LANGUAGES: 'languages',
  COUNTRIES: 'countries',
};

let name = '';
let category = '';

const getColor = (category) => {
  switch (category) {
    case CATEGORY.FRAMEWORKS:
      return 'green';
    case CATEGORY.LANGUAGES:
      return 'orange';
    case CATEGORY.COUNTRIES:
      return 'grey';
    case CATEGORY.TOOLS:
    default:
      return 'blue';
  }
};

// Build tasks
const buildHTML = () => {
  return gulp
    .src(['./src/common/**/*.html', './src/**/*.html', '!./src/templates/**'], { base: './src/' })
    .pipe(
      tap((file) => {
        let projectFolder = file.relative.replace(/\\/g, '/');
        projectFolder = projectFolder.substr(0, projectFolder.indexOf('/'));
        return gulp
          .src(file.path, { base: file.base })
          .pipe(
            fileinclude({
              prefix: '@@',
              basepath: '@file',
              context: { folder: projectFolder.toLowerCase() },
            })
          )
          .pipe(gulp.dest('./docs/'));
      })
    );
};

const buildSass = () => {
  return gulp
    .src(['./src/**/*.scss', '!./src/templates/**/*'])
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest('./docs'));
};

const buildMarkdown = () => {
  return gulp
    .src(['./src/**/*.md'])
    .pipe(markdown())
    .pipe(header('\ufeff'))
    .pipe(gulp.dest('./docs'));
};

const copyAssets = () => {
  return gulp.src(toCopy).pipe(gulp.dest('docs/common/lib'));
};

const exportAssets = () => {
  return gulp.src('./assets/**/*').pipe(gulp.dest('./docs/assets'));
};

const exportJS = () => {
  return gulp.src('./src/**/*.js').pipe(gulp.dest('./docs/'));
};

// Server task
const serve = (done) => {
  connect.server({
    root: 'docs',
    port: process.env.PORT || 8080,
  });
  done();
};

// Watch task
const watchFiles = () => {
  livereload.listen();
  gulp.watch(['./src/**'], gulp.series(build));
};

// Task composition
const build = gulp.series(
  gulp.parallel(copyAssets, exportAssets, exportJS, buildMarkdown, buildSass),
  buildHTML
);

// Create new cheat sheet tasks
const moveTemplates = (done) => {
  name = argv.name;
  category = argv.category;

  if (!name || !category) {
    throw new Error('usage is "gulp create-new-cheat-sheet --name <name> --category <tools|frameworks|languages|countries>');
  }

  if (!Object.values(CATEGORY).includes(category)) {
    throw new Error('"category" must be one of: tools, frameworks, languages, countries');
  }

  return gulp
    .src('./src/templates/**/*')
    .pipe(template({ name, category }))
    .pipe(gulp.dest(`./src/${name}`));
};

const injectSources = () => {
  return gulp
    .src('./src/common/menu.html')
    .pipe(
      inject.before(
        '<!-- inject a new cheat sheet -->',
        `<li><a href="../../${name}/index.html">${name}</a></li>\n`
      )
    )
    .pipe(gulp.dest('./src/common/'));
};

const renameCSS = () => {
  return gulp
    .src(`./src/${name}/style.scss`)
    .pipe(replace('{{COLOR}}', getColor(category)))
    .pipe(rename(`${name}.scss`))
    .pipe(gulp.dest(`./src/${name}`));
};

const addItemToIndex = () => {
  const ITEM_INDEX_TEMPLATE = `<div class="item">
    <a href="./${name}/index.html">
      <div class="img-item">
        <img src="./assets/images/${name}.svg"/>
      </div>
      <div class="title">${name}</div>
    </a>
  </div>`;

  return gulp
    .src('./src/index.html')
    .pipe(
      inject.before(
        `<!-- inject a new cheat sheet ${category} -->`,
        ITEM_INDEX_TEMPLATE
      )
    )
    .pipe(gulp.dest('./src/'));
};

const cleanStyles = () => {
  console.log('Put the SVG logo in assets/images folder');
  console.log(
    `Put your commands or codes in src/${name}/first-side/column1.md, src/${name}/first-side/column2.md, src/${name}/reverse/column1.md, src/${name}/reverse/column2.md`
  );

  return gulp.src(`./src/${name}/style.scss`).pipe(clean());
};

const createNewCheatSheet = gulp.series(
  moveTemplates,
  gulp.parallel(injectSources, addItemToIndex),
  renameCSS,
  cleanStyles
);

// Task exports
gulp.task('build', build);
gulp.task('serve', gulp.series(build, serve));
gulp.task('watch', gulp.series(build, gulp.parallel(serve, watchFiles)));
gulp.task('create-new-cheat-sheet', createNewCheatSheet);
