const fs = require('fs');
const del = require('del');
const rollup = require("rollup");
const babel = require("rollup-plugin-babel");
const pkg = require('../package.json');

(async () => {
  await del(['dist/*']);

  for (const format of ['cjs', 'umd', 'esm']) {
    try {
      const bundle = await rollup.rollup({
        input: "src/index.js",
        external: Object.keys(pkg.dependencies),
        plugins: [
          babel({
            exclude: 'node_modules/**',
            runtimeHelpers: true
          })
        ]
      })

      const tmp = await bundle.write({
        output: {
          sourcemap: 'inline',
          file: `dist/${format === 'cjs' ? 'index' : `index.${format}`}.js`,
          format,
          moduleName: format === 'umd' ? pkg.name : undefined,
        }
      });
    } catch(err) {
      console.log(err, 'не удалось создать build')
    }
  }

  delete pkg.private;
  delete pkg.devDependencies;
  delete pkg.scripts;
  delete pkg.eslintConfig;
  delete pkg.babel;
  fs.writeFileSync('dist/package.json', JSON.stringify(pkg, null, '  '), 'utf-8');

})();

