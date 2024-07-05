module.exports = (api) => ({
    presets: [
        [
            "@babel/preset-typescript"
        ],
        [
            '@babel/preset-react',
            {
                runtime: 'automatic',
                importSource: 'jsx-slack',
                development: api.env('development'),
            },
        ],
        [
            '@babel/preset-env',
            {
                targets: "> 0.25%, not dead",
                useBuiltIns: 'entry',
                corejs: 3,
            },
        ],
    ],
})