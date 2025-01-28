// @ts-check
import { FlatCompat } from '@eslint/eslintrc';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// mimic CommonJS variables -- not needed if using CommonJS
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname, // optional; default: process.cwd()
    resolvePluginsRelativeTo: __dirname, // optional
});

export default [
    // mimic environments
    ...compat.env({
        es2020: true,
        node: true,
        mocha: true,
        jest: true,
    }),

    // mimic plugins
    ...compat.plugins('mocha', 'jest'),

    // translate an entire config
    ...compat.config({
        plugins: ['mocha', 'jest'],
        extends: 'airbnb-base',
        env: {
            es2020: true,
            node: true,
            jest: true,
            mocha: true,
        },
        rules: {
            indent: ['error', 4, { SwitchCase: 1 }],
            'no-underscore-dangle': [0],
            'max-len': ['error', {
                code: 140,
                ignoreComments: true,
            }],
            'no-console': 0,
            'object-curly-newline': ['error', {
                ObjectPattern: { multiline: true },
            }],
            'newline-per-chained-call': ['error', {
                ignoreChainWithDepth: 10,
            }],
            'object-property-newline': ['error', {
                allowAllPropertiesOnSameLine: true,
            }],
            'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
        },
    }),
];
