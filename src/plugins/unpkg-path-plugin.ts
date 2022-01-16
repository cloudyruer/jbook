import * as esbuild from 'esbuild-wasm';
import axios from 'axios';
import localForage from 'localforage';

const fileCache = localForage.createInstance({ name: 'filecache' });

// (async () => {
//   await fileCache.setItem('color', 'red');
//   const color = await fileCache.getItem('color');
//   console.log(color);
// })();

export const unpkgPathPlugin = () => {
  return {
    name: 'unpkg-path-plugin', // for debugging purposes

    // the build argument represents the bundling process
    setup(build: esbuild.PluginBuild) {
      // figure out where the index.js file is stored --> onResolve step
      // will be called when esbuild is trying to figure out a path to a particular module
      build.onResolve({ filter: /.*/ }, async (args: any) => {
        console.log('onResolve', args);
        if (args.path === 'index.js') {
          return { path: args.path, namespace: 'a' };
        }

        console.log(args.path);

        if (args.path.includes('./') || args.path.includes('../')) {
          return {
            namespace: 'a',
            path: new URL(
              args.path,
              'https://unpkg.com' + args.resolveDir + '/'
            ).href,
          };
        }

        return {
          namespace: 'a',
          path: `https://unpkg.com/${args.path}`,
        };
      });

      // attempt to load up the index.js file --> onLoad step
      // then parse the index.js file, find any import/require/exports
      // if there is any  ---> back to Resolve + load step once again
      build.onLoad({ filter: /.*/ }, async (args: any) => {
        console.log('onLoad', args);

        if (args.path === 'index.js') {
          return {
            loader: 'jsx',
            contents: `
              import React from 'react';
              import ReactDOM from 'react-dom';
              console.log(React, ReactDOM);
            `,
          };
        }

        // Check to see if we have already fetched this file and if it is in the cache (indexedDB)
        const cachedResult = await fileCache.getItem<esbuild.OnLoadResult>(
          args.path
        );

        // if it is, return it immediately
        if (cachedResult) {
          return cachedResult;
        }

        const { data, request } = await axios.get(args.path);

        // console.log(request.responseURL);
        const result: esbuild.OnLoadResult = {
          loader: 'jsx',
          contents: data,
          resolveDir: new URL('./', request.responseURL).pathname,
        };

        // store response in cache
        await fileCache.setItem(args.path, result);

        return result;
      });
    },
  };
};
