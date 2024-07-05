import {app} from "./app";

declare const global: {
    [method: string]: unknown;
};

global.app = app;