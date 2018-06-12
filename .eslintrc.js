module.exports = {
    'plugins': [
        'mocha',
        'jest'
    ],
    'extends': 'airbnb-base',
    'rules': {
        'indent': ['error', 4, { 'SwitchCase': 1 }],
        'no-underscore-dangle': [0],
        'max-len': ['error', {
            'code': 140,
            'ignoreComments': true
        }],
        'no-console': 0,
        "object-curly-newline": ["error", {
            "ObjectPattern": { "multiline": true },
        }],
        "newline-per-chained-call": ["error", {
            "ignoreChainWithDepth": 10,
        }],
        "object-property-newline": ["error", {
            "allowAllPropertiesOnSameLine": true,
        }]
    },
    'env': {
        'mocha': true,
        'jest': true
    },
    "globals": {
        "negativeAssertion": true
    }
};
