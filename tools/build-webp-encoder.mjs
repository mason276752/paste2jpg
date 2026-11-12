// Builds vendor/webp-enc.js: libwebp (via @jsquash/webp, non-SIMD) packed into one classic
// script that runs the encoder in a blob Web Worker with the WASM inlined. It is only loaded
// by browsers whose canvas can't encode WebP (Safari / every iOS browser), and works from
// file:// as well as http(s).
//
// Usage, from any directory that has the build deps installed:
//   npm i --no-save esbuild@0.24.2 @jsquash/webp@1.5.0
//   node /path/to/tools/build-webp-encoder.mjs /path/to/vendor/webp-enc.js
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const out = process.argv[2];
if (!out) throw new Error('usage: node build-webp-encoder.mjs <output.js>');

// Resolve build deps from the current directory, not from where this script lives.
const require = createRequire(join(process.cwd(), 'noop.js'));
const { build } = require('esbuild');
const pkgDir = dirname(require.resolve('@jsquash/webp/package.json'));
const version = require('@jsquash/webp/package.json').version;

const workerEntry = `
import factory from ${JSON.stringify(join(pkgDir, 'codec/enc/webp_enc.js'))};
import wasm from ${JSON.stringify(join(pkgDir, 'codec/enc/webp_enc.wasm'))};
import { defaultOptions } from ${JSON.stringify(join(pkgDir, 'meta.js'))};

let ready;
self.onmessage = async ({ data }) => {
  const { id, pixels, width, height, quality, lossless } = data;
  try {
    // locateFile keeps the glue from building a URL off import.meta.url, which is empty here.
    ready = ready || factory({ noInitialRun: true, wasmBinary: wasm, locateFile: (path) => path });
    const codec = await ready;
    const result = codec.encode(new Uint8ClampedArray(pixels), width, height,
      { ...defaultOptions, quality, lossless: lossless ? 1 : 0 });
    if (!result) throw new Error('Encoding error');
    const buffer = result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength);
    self.postMessage({ id, buffer }, [buffer]);
  } catch (err) {
    ready = null;
    self.postMessage({ id, error: String((err && err.message) || err) });
  }
};
`;

const { outputFiles } = await build({
  stdin: { contents: workerEntry, resolveDir: pkgDir, loader: 'js' },
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2019',
  minify: true,
  write: false,
  loader: { '.wasm': 'binary' },
  logLevel: 'error', // the glue's import.meta.url fallback is expected to be stubbed
});

const wrapper = `/*! WebP encoder for browsers without canvas WebP support (Safari / iOS).
 * libwebp (BSD-3-Clause, Google) via @jsquash/webp ${version} (Apache-2.0, Squoosh).
 * Built by tools/build-webp-encoder.mjs. Exposes window.WebpEncoder.encode(imageData, { quality, lossless }). */
(function () {
  'use strict';
  var WORKER_SRC = ${JSON.stringify(outputFiles[0].text)};
  var worker = null, seq = 0, pending = new Map();

  function fail(err) {
    pending.forEach(function (p) { p.reject(err); });
    pending.clear();
    if (worker) worker.terminate();
    worker = null;
  }

  function getWorker() {
    if (worker) return worker;
    var url = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }));
    worker = new Worker(url);
    URL.revokeObjectURL(url);
    worker.onmessage = function (e) {
      var p = pending.get(e.data.id);
      if (!p) return;
      pending.delete(e.data.id);
      e.data.error ? p.reject(new Error(e.data.error)) : p.resolve(e.data.buffer);
    };
    worker.onerror = function (e) { fail(new Error((e && e.message) || 'WebP worker failed')); };
    return worker;
  }

  window.WebpEncoder = {
    // imageData's pixel buffer is transferred to the worker (it becomes unusable here).
    encode: function (imageData, opts) {
      opts = opts || {};
      return new Promise(function (resolve, reject) {
        var id = ++seq;
        pending.set(id, { resolve: resolve, reject: reject });
        var pixels = imageData.data.buffer;
        getWorker().postMessage({
          id: id, pixels: pixels, width: imageData.width, height: imageData.height,
          quality: opts.quality == null ? 75 : opts.quality, lossless: !!opts.lossless,
        }, [pixels]);
      });
    },
  };
})();
`;

writeFileSync(out, wrapper);
console.log(`wrote ${out} (${(wrapper.length / 1024).toFixed(0)} KB, @jsquash/webp ${version})`);
