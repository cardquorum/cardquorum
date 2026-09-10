import { defineConfig, mergeConfig } from 'vitest/config';
import { nodePreset } from '../../vitest.node';

export default mergeConfig(
  nodePreset,
  defineConfig({
    /*
     * NestJS resolves constructor dependencies from `design:paramtypes`, which
     * only exists if the transform emits decorator metadata.
     *
     * Vite 8 transforms with Oxc, which implements this natively — there is no
     * need for unplugin-swc or any other transform plugin. Oxc *can* read these
     * two flags from the nearest tsconfig.json, but apps/backend/tsconfig.json
     * is a solution file that declares neither; they live in tsconfig.app.json
     * and tsconfig.spec.json, which Oxc never looks at. So they are set here.
     *
     * Failure mode if this block is removed: a SyntaxError on the first
     * decorator, or — subtler — Nest reporting that it "can't resolve
     * dependencies of AppController".
     *
     * `reflect-metadata` is deliberately not added as a setup file: it is
     * imported for its side effects by @nestjs/core, which every Nest spec
     * pulls in before any decorated class of ours evaluates. Verified.
     */
    oxc: {
      decorator: { legacy: true, emitDecoratorMetadata: true },
    },
    test: {
      name: 'backend',
      coverage: { reportsDirectory: '../../coverage/backend' },
    },
  }),
);
