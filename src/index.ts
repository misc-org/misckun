'use strict';

import { App, LogLevel } from '@slack/bolt';
import { db } from './firebase';
import dotenv from 'dotenv';
import { addDoc, collection, doc, getDoc, getDocs } from 'firebase/firestore';

dotenv.config();

const event: any[] = []

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

app.view('event-add', async ({ ack, body, view, logger, client }) => {
    logger.info(body);
    await ack();

    const val = view.state.values
    const event = val.event.event.value
    const date = val.date.date.selected_date

    const root = process.env.FIREBASE_RULE as string

    try {
        await addDoc(collection(db, 'events', root, 'event'), {
            event,
            date
        });
        await client.chat.postMessage({
            channel: body.user.id,
            text: 'イベントを追加しました。'
        });
    } catch (error) {
        logger.error(error);
        await client.chat.postMessage({
            channel: body.user.id,
            text: 'イベントの追加に失敗しました。'
        });
    }
});

app.command('/add-event', async ({ command, ack, body, client, logger, respond }) => {
    await ack();
    const user = await app.client.users.info({ user: command.user_id });
    if (user.user?.is_admin) {
        try {
            const triggerId = body.trigger_id;
            if (!triggerId) {
                await respond('イベントの追加に失敗しました。');
                return;
            }
            await client.views.open({
                trigger_id: triggerId,
                view: {
                    type: 'modal',
                    callback_id: 'event-add',
                    title: {
                        type: 'plain_text',
                        text: 'イベント追加'
                    },
                    blocks: [
                        {
                            type: 'input',
                            block_id: 'event',
                            element: {
                                type: 'plain_text_input',
                                action_id: 'event'
                            },
                            label: {
                                type: 'plain_text',
                                text: 'イベント'
                            }
                        },
                        {
                            type: 'input',
                            block_id: 'date',
                            element: {
                                type: 'datepicker',
                                action_id: 'date'
                            },
                            label: {
                                type: 'plain_text',
                                text: '日付'
                            }
                        }
                    ],
                    submit: {
                        type: 'plain_text',
                        text: '追加'
                    }
                }
            });
            logger.info('イベント追加モーダルを表示しました。');
        } catch (error) {
            logger.error(error);
            await respond('イベントの追加に失敗しました。');
        }
    } else {
        await respond("権限がありません。");
    }
});

app.action('view_more', async ({ ack, body, client, action }) => {
    await ack();

    try {
        if (body.type !== 'block_actions' || !body.view || !body.actions[0].value) {
            return;
        }
        console.log(body);
        await client.views.open({
            trigger_id: body.trigger_id,
            view: {
                type: 'modal',
                title: {
                    type: 'plain_text',
                    text: 'イベント詳細'
                },
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `*日付:* ${body.actions[0].value.date.text}\n*イベント:* ${body.actions[0].value.event.text}\n*詳細:* ${body.actions[0].value.desc.text}`
                        }
                    }
                ]
            }
        });
    } catch (error) {

    }
});

app.command('/event', async ({ command, ack, respond, client }) => {
    await ack();
    const root = process.env.FIREBASE_RULE as string;
    const querySnapshot = await getDocs(collection(db, "events", root, "event"));
    const events = querySnapshot.docs.map(doc => {
        const event = doc.data();
        return {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*日付:* ${event.date}\n*イベント:* ${event.event}`
            },
            accessory: {
                type: 'button',
                text: {
                    type: 'plain_text',
                    text: '詳細を見る'
                },
                value: JSON.stringify({
                    date: { text: event.date },
                    event: { text: event.event },
                    desc: { text: event.desc }
                }),
                action_id: 'view_more'
            }
        };
    });

    await client.views.open({
        trigger_id: command.trigger_id,
        view: {
            type: 'modal',
            callback_id: 'view_more',
            title: {
                type: 'plain_text',
                text: 'イベント一覧',
            },
            blocks: events,
        },
    });
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