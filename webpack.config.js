const path = require("path");
const GasPlugin = require("gas-webpack-plugin");

module.exports = {
    mode: "development",
    devtool: false,
    context: __dirname,
    entry: "./src/app.ts",
    output: {
        path: path.join(__dirname, "dist"),
        filename: "index.js",
    },
    resolve: {
        extensions: [".ts", ".js", ".tsx"],
        fallback: {
            "crypto": require.resolve("crypto-browserify"),
            "stream": require.resolve("stream-browserify"),
            "util": require.resolve("util"),
            "path": require.resolve("path-browserify"),
            "url": require.resolve("url"),
            "buffer": require.resolve("buffer/"),
            "http": require.resolve("stream-http"),
            "querystring": require.resolve("querystring-es3"),
            "fs": require.resolve("browserify-fs"),
            "zlib": require.resolve("browserify-zlib"),
            "os": require.resolve("os-browserify/browser"),
            "net": false,
            "async_hooks": false,
            "vm": require.resolve("vm-browserify"),
            "https": require.resolve("https-browserify"),
            "assert": require.resolve("assert/")
        },
    },
    module: {
        rules: [
            {
                test: /\.[tj]sx?$/,
                exclude: /node_modules/,
                loader: "babel-loader",
            },
        ],

    },
    plugins: [
        new GasPlugin(),
    ],
};