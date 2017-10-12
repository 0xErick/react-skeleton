const gulp = require('gulp');

//调试服务器相关
const serve = require('serve')
let cache

//打包相关
const rollup = require('rollup');
const resolve = require('rollup-plugin-node-resolve')
const babel = require('rollup-plugin-babel')
const commonjs = require('rollup-plugin-commonjs')

//压缩
const uglify = require('rollup-plugin-uglify');
const minify = require('uglify-es').minify;
const del = require('del');
const htmlmin = require('gulp-htmlmin');

//图片处理
const image = require('rollup-plugin-img')
const replace = require('rollup-plugin-replace')

//js添加版本号
const rev = require("gulp-rev")
const revReplace = require("gulp-rev-replace")

gulp.task('default', function () {
  console.log("欢迎使用 gulp,请查看 gulpfile.js 了解使用");
});

//调试模式
gulp.task('start', ['bundle-dev'], function () {

  //打开调试服务器
  serve("public")
  gulp.watch("src/**/*.js", ['bundle-dev']);
});

//构建生产环境代码
gulp.task('build', ['js-version'], function () {

  serve("build")
  const manifest = gulp.src("build/rev-manifest.json");
  return gulp.src('src/index.html')
    .pipe(revReplace({manifest: manifest}))
    .pipe(htmlmin({
      collapseWhitespace: true,
      minifyJS: true,
      minifyCSS: true
    }))
    .pipe(gulp.dest("build"));

})
;


//开发环境打包
gulp.task('bundle-dev', async function () {
  await del(['./public/*'])
  const bundle = await rollup.rollup({
    entry: './src/index.js',
    cache: cache,
    plugins: [
      resolve(),
      babel({
        exclude: 'node_modules/**' // only transpile our source code
      }),
      commonjs({
        namedExports: {
          'node_modules/react/react.js': ['Children', 'Component', 'PropTypes', 'createElement'],
          'node_modules/react-dom/index.js': ['render'],
          'node_modules/prop-types/index.js': ['string', 'number', 'bool', 'func']
        }
      }),
      image({
        limit: 15360
      }),
      replace({
        'process.env.NODE_ENV': JSON.stringify('develop')
      }),
    ]
  });

  cache = bundle;
  await bundle.write({
    dest: './public/bundle.js',
    format: 'es',
    name: 'index',
    sourceMap: true,
    debug: true
  });

  gulp.src('src/index.html').pipe(gulp.dest("./public"))
});


//生产环境打包
gulp.task('bundle-production', async function () {
  await del(['./build/*'])
  const bundle = await rollup.rollup({
    entry: './src/index.js',
    plugins: [
      resolve(),
      babel({
        exclude: 'node_modules/**' // only transpile our source code
      }),
      commonjs({
        namedExports: {
          'node_modules/react/react.js': ['Children', 'Component', 'PropTypes', 'createElement'],
          'node_modules/react-dom/index.js': ['render','findDOMNode'],
          'node_modules/prop-types/index.js': ['string', 'number', 'bool', 'func']
        }
      }),
      image({
        limit: 15360
      }),
      replace({
        'process.env.NODE_ENV': JSON.stringify('production')
      }),
      uglify({}, minify)
    ]
  });

  await bundle.write({
    dest: './build/bundle.js',
    format: 'es',
    name: 'main',
  });
});

//js 文件添加版本号
gulp.task("js-version", ['bundle-production'], function () {
  return gulp.src(["./build/bundle.js"])
    .pipe(rev())
    .pipe(gulp.dest("build"))
    .pipe(rev.manifest())
    .pipe(gulp.dest("build"));
})

