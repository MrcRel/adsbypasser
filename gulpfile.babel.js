import child_process from 'child_process';
import fs from 'fs';
import path from 'path';

import _ from 'lodash';
import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import webpack from 'webpack';
import wintersmith from 'wintersmith';

const packageJSON = parsePackageJSON();
const plugins = gulpLoadPlugins({
  overridePattern: false,
  pattern: [
    'webpack-stream',
  ],
  rename: {
    'webpack-stream': 'webpack',
  },
});
const output = {
  toString () {
    return path.resolve(__dirname, './build');
  },
  to (path_) {
    return path.resolve(this.toString(), path_);
  },
};
const buildOptions = {
  supportImage: [true, false],
  supportLegacy: [false, true],
};


gulp.task('default', ['userscript']);

{
  const subTasks = [];
  for (const [supportImage, supportLagacy] of allBuildOptions()) {
    const subTaskName = createUserScriptTask(supportImage, supportLagacy);
    subTasks.push(subTaskName);
  }
  gulp.task('userscript', subTasks);
}
for (const [supportImage, supportLagacy] of allBuildOptions()) {
  createMetadataTask(supportImage, supportLagacy);
  createBodyTask(supportImage, supportLagacy);
}
for (const [supportImage] of imageBuildOptions()) {
  createNamespaceTask(supportImage);
  createHandlersTask(supportImage);
}

gulp.task('test', ['test:lint', 'test:mocha']);

gulp.task('clean', () => {
  return gulp.src(output.toString())
    .pipe(plugins.clean());
});

gulp.task('test:lint', () => {
  return gulp.src([
    'src/**/*.js',
  ])
    .pipe(plugins.eslint())
    .pipe(plugins.eslint.format())
    .pipe(plugins.eslint.failAfterError());
});

gulp.task('test:mocha', ['test:mocha:core'], () => {
  return gulp.src(output.to('tests/core.js'))
    .pipe(plugins.mocha({
      reporter: 'spec',
    }));
});

gulp.task('test:mocha:core', () => {
  return gulp.src('tests/core.js')
    .pipe(plugins.webpack({
      resolve: {
        modules: [
          path.resolve(__dirname, 'src'),
          'node_modules',
        ],
      },
    }, webpack))
    .pipe(plugins.rename(`core.js`))
    .pipe(gulp.dest(output.to('tests')));
});

gulp.task('check', ['check:git']);

// to be sure there is no experimental code
gulp.task('check:git', () => {
  return new Promise((resolve, reject) => {
    const git = child_process.spawn('git', ['status', '--porcelain']);
    git.stdout.on('data', (data) => {
      let uncleanFiles = data.toString('utf8');
      uncleanFiles = uncleanFiles.trim();
      uncleanFiles = uncleanFiles.split('\n');
      if (uncleanFiles.length > 0) {
        reject(new Error('work tree is dirty'));
        return;
      }
      resolve();
    });
    git.on('error', (error) => {
      reject(error);
    });
  });
});


function createUserScriptTask (supportImage, supportLagacy) {
  const featureName = supportImage ? 'full' : 'lite';
  const ecmaName = supportLagacy ? 'es5' : 'es7';
  const taskName = `userscript:${featureName}:${ecmaName}`;

  gulp.task(taskName, [
    `userscript:metadata:${featureName}:${ecmaName}`,
    `userscript:body:${featureName}:${ecmaName}`,
  ], () => {
    return gulp.src([
      output.to(`adsbypasser.${featureName}.${ecmaName}.meta.js`),
      output.to(`body/${featureName}.${ecmaName}.js`),
    ])
      .pipe(plugins.concat(`adsbypasser.${featureName}.${ecmaName}.user.js`))
      .pipe(gulp.dest(output.toString()));;
  });

  return taskName;
}


function createMetadataTask (supportImage, supportLagacy) {
  const featureName = supportImage ? 'full' : 'lite';
  const ecmaName = supportLagacy ? 'es5' : 'es7';

  gulp.task(`userscript:metadata:${featureName}:${ecmaName}`, () => {
    return gulp.src('infra/userscript/metadata.template.js')
      .pipe(plugins.change(_.partial(finalizeMetadata, supportImage, supportLagacy)))
      .pipe(plugins.rename(`adsbypasser.${featureName}.${ecmaName}.meta.js`))
      .pipe(plugins.removeEmptyLines())
      .pipe(gulp.dest(output.toString()));
  });
}


function createBodyTask (supportImage, supportLagacy) {
  const featureName = supportImage ? 'full' : 'lite';
  const ecmaName = supportLagacy ? 'es5' : 'es7';
  const taskName = `userscript:body:${featureName}:${ecmaName}`;
  const namespacePath = output.to(`namespace/${featureName}.js`);
  const handlersPath = output.to(`handlers/${featureName}.js`);
  const compileRules = [];
  const buildPlugins = [];

  if (supportLagacy) {
    compileRules.push({
      test: /\.js$/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['env'],
        },
      },
    });

    buildPlugins.push(new webpack.ProvidePlugin({
      Promise: ['util/polyfill', 'Promise_'],
    }));
  }

  gulp.task(taskName, [
    `userscript:body:namespace:${featureName}`,
    `userscript:body:handlers:${featureName}`,
  ], () => {
    return gulp.src('./src/util/main.js')
      .pipe(plugins.webpack({
        resolve: {
          alias: {
            '__ADSBYPASSER_NAMESPACE__': namespacePath,
            '__ADSBYPASSER_HANDLERS__': handlersPath,
          },
          modules: [
            path.resolve(__dirname, 'src'),
            'node_modules',
          ],
        },
        module: {
          rules: compileRules,
        },
        plugins: buildPlugins,
      }, webpack))
      .pipe(plugins.stripComments())
      .pipe(plugins.removeEmptyLines())
      .pipe(plugins.rename(`${featureName}.${ecmaName}.js`))
      .pipe(gulp.dest(output.to('body')));
  });
}


function createHandlersTask (supportImage) {
  const featureName = supportImage ? 'full' : 'lite';
  const taskName = `userscript:body:handlers:${featureName}`;
  const namespaceScript = 'import { _, $ } from \'__ADSBYPASSER_NAMESPACE__\';\n';

  gulp.task(taskName, () => {
    const handlers = [
      'src/sites/file/*.js',
      'src/sites/link/*.js',
      'src/sites/paste/*.js',
    ];
    if (supportImage) {
      handlers.push('src/sites/image/*.js');
    }
    return gulp.src(handlers)
      .pipe(plugins.concat(`${featureName}.js`))
      .pipe(plugins.injectString.prepend(namespaceScript))
      .pipe(gulp.dest(output.to('handlers')));
  });
}


function createNamespaceTask (supportImage) {
  const featureName = supportImage ? 'full' : 'lite';
  const taskName = `userscript:body:namespace:${featureName}`;

  gulp.task(taskName, () => {
    return gulp.src('infra/userscript/namespace.template.js')
      .pipe(plugins.change(_.partial(finalizeNamespace, supportImage)))
      .pipe(plugins.rename(`${featureName}.js`))
      .pipe(gulp.dest(output.to('namespace')));
  });
}


function finalizeMetadata (supportImage, supportLagacy, content) {
  const featureName = supportImage ? 'full' : 'lite';
  const ecmaName = supportLagacy ? 'es5' : 'es7';
  let s = _.template(content);
  s = s({
    version: packageJSON.version,
    title: supportImage ? 'AdsBypasser' : 'AdsBypasserLite',
    supportImage,
    buildName: `${featureName}.${ecmaName}`,
  });
  s = [
    '// ==UserScript==\n',
    s,
    '// ==/UserScript==\n',
  ];
  return s.join('');
}


function finalizeNamespace (supportImage, content) {
  let s = _.template(content);
  s = s({
    supportImage,
  });
  return s;
}


function parsePackageJSON () {
  const pkg = fs.readFileSync('./package.json', {
    encoding: 'utf-8',
  });
  return JSON.parse(pkg);
}


function * cartesianProductOf (...args) {
  if (args.length < 1) {
    yield [];
    return;
  }

  const headSubList = args[0];
  for (const item of headSubList) {
    const tailLists = args.slice(1);
    for (const items of cartesianProductOf(...tailLists)) {
      yield [item].concat(items);
    }
  }
}


function * allBuildOptions () {
  yield * cartesianProductOf(buildOptions.supportImage, buildOptions.supportLegacy);
}


function * imageBuildOptions () {
  yield * cartesianProductOf(buildOptions.supportImage);
}


function __none__ () {

gulp.task('deploy', ['sanity', 'default', 'summary', 'clone', 'copy:summary', 'copy:compiled', 'wintersmith', 'clean:wintersmith']);

gulp.task('summary', ['clean'], (done) => {
  var p = child_process.spawn('python2', ['-m', 'mirrors.summary'], {
    cwd: 'deploy',
  });
  p.on('close', (code) => {
    if (code !== 0) {
      throw new Error('process error');
    }
    done();
  });
  p.on('error', (error) => {
    throw error;
  });
});

gulp.task('clone', (done) => {
  var data = require('./.deploy.json');
  var stats = fs.statSync('dest/adsbypasser');
  if (stats.isDirectory()) {
    done();
    return;
  }

  var p = child_process.spawn('git', ['clone', data.ghpages.REPO, '-b', 'master', 'dest/adsbypasser']);
  p.on('close', (code) => {
    if (code !== 0) {
      throw new Error('process error');
    }
    done();
  });
  p.on('error', (error) => {
    throw error;
  });
});

gulp.task('copy:summary', ['summary'], () => {
  return gulp.src('dest/summary.md')
    .pipe(gulp.dest('deploy/ghpages/contents'));
});

gulp.task('copy:compiled', ['default'], () => {
  return gulp.src([
    'dest/adsbypasser.user.js',
    'dest/adsbypasser.meta.js',
    'dest/adsbypasserlite.user.js',
    'dest/adsbypasserlite.meta.js',
  ])
    .pipe(gulp.dest('deploy/ghpages/contents/releases'));
});

gulp.task('wintersmith', ['copy:summary', 'copy:compiled'], (done) => {
  var options = {
    config: 'deploy/ghpages/config.json',
    summary: 'dest/deploy/summary.md',
    userjs: 'dest/adsbypasser.user.js',
    metajs: 'dest/adsbypasser.meta.js',
    lite_userjs: 'dest/adsbypasserlite.user.js',
    lite_metajs: 'dest/adsbypasserlite.meta.js',
  };
  var rootPath = 'deploy/ghpages/contents';
  var releasePath = path.join(rootPath, 'releases');
  var outPath = 'dest/adsbypasser';

  var env = wintersmith(options.config);
  env.build(outPath, (error) => {
    if (error) {
      throw error;
    }
    done();
  });
});

gulp.task('clean:wintersmith', ['wintersmith'], () => {
  return gulp.src([
    'deploy/ghpages/contents/summary.md',
    'deploy/ghpages/contents/releases',
  ], {
    read: false,
  })
    .pipe(plugins.clean());
});

gulp.task('mirror', ['sanity', 'default', 'summary'], (done) => {
  var p = child_process.spawn('python2', ['-m', 'mirrors'], {
    cwd: 'deploy',
  });
  p.on('close', (code) => {
    if (code !== 0) {
      throw new Error('process error');
    }
    done();
  });
  p.on('error', (error) => {
    throw error;
  });
});
}
