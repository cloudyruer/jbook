import * as esbuild from 'esbuild-wasm';
import axios from 'axios';
import localForage from 'localforage';

const fileCache = localForage.createInstance({ name: 'filecache' });

// (async () => {
//   await fileCache.setItem('color', 'red');
//   const color = await fileCache.getItem('color');
//   console.log(color);
// })();

export const fetchPlugin = (inputCode: string) => {
  return {
    name: 'fetch-plugin',
    setup(build: esbuild.PluginBuild) {
      // attempt to load up the index.js file --> onLoad step
      // then parse the index.js file, find any import/require/exports
      // if there is any  ---> back to Resolve + load step once again
      build.onLoad({ filter: /.*/ }, async (args: any) => {
        if (args.path === 'index.js') {
          return {
            loader: 'jsx',
            contents: inputCode,
            // contents: `
            //   import React from 'react';
            //   import ReactDOM from 'react-dom';
            //   console.log(React, ReactDOM);
            // `,
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
