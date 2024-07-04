'use strict';

import { App, LogLevel } from '@slack/bolt';
import * as http from 'http';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    logLevel: LogLevel.DEBUG
});

app.event('app_home_opened', async ({ event, client, ack }) => {
    await client.chat.postMessage({
        channel: event.channel,
        text: 'こんにちは！私は部活動サポートボットです。'
    });
});

app.command('/rule', async ({ command, ack, respond }) => {
    await ack();
    const rules = `
    1. 部室は清潔に保つ\n2. パソコンは丁寧に扱う\n3. 予定は必ずカレンダーに記入する
  `;
    await respond(rules);
});

app.command('/add-event', async ({ command, ack, respond }) => {
    await ack();
    const user = await app.client.users.info({ user: command.user_id });
    if (user.user?.is_admin) {
        await respond(`予定が追加されました: ${command.text}`);
    } else {
        await respond("権限がありません。");
    }
});

app.command('/event', async ({ command, ack, respond }) => {
    await ack();
    const events = `
    - 7月5日 10:00 会議
    - 7月6日 15:00 勉強会
  `;
    await respond(events);
});

app.command('/desctop', async ({ command, ack, respond }) => {
    await ack();
    const computerId = command.text;
    const status = Math.random() > 0.5 ? 'on' : 'off';
    await respond(`パソコン${computerId}は${status === 'on' ? '使用中' : '使用されていません'}です。`);
});

(async () => {
    await app.start(process.env.PORT || 3000);
    console.log('⚡️ Bolt app is running!');
})();