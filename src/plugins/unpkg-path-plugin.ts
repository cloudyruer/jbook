import * as esbuild from 'esbuild-wasm';

export const unpkgPathPlugin = () => {
  return {
    name: 'unpkg-path-plugin', // for debugging purposes

    // the build argument represents the bundling process
    setup(build: esbuild.PluginBuild) {
      // figure out where the index.js file is stored --> onResolve step
      // will be called when esbuild is trying to figure out a path to a particular module

      // Handle root entry file of 'index.js'
      build.onResolve({ filter: /^index\.js$/ }, () => {
        return { path: 'index.js', namespace: 'a' };
      });

      // Handle relative paths in a module
      build.onResolve({ filter: /^\.+\// }, (args: any) => {
        return {
          namespace: 'a',
          path: new URL(args.path, 'https://unpkg.com' + args.resolveDir + '/')
            .href,
        };
      });

      // Handle main file of a module
      build.onResolve({ filter: /.*/ }, async (args: any) => {
        return {
          namespace: 'a',
          path: `https://unpkg.com/${args.path}`,
        };
      });
    },
  };
};
