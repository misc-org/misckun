import { App, LogLevel } from '@slack/bolt';
import { db } from './firebase';
import dotenv from 'dotenv';
import { addDoc, collection, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';

dotenv.config();

function convertToMarkdown(elements: any[]): string {
    let markdown = '';

    for (const element of elements) {
        switch (element.type) {
            case 'rich_text_list':
                element.elements.forEach((listElement: any) => {
                    markdown += `• ${convertToMarkdown([listElement])}\n`;
                });
                break;
            case 'rich_text_section':
                element.elements.forEach((sectionElement: any) => {
                    let text = sectionElement.text;
                    if (sectionElement.style) {
                        if (sectionElement.style.code) {
                            text = `\`${text}\``;
                        }
                        if (sectionElement.style.bold) {
                            text = `*${text}*`;
                        }
                        if (sectionElement.style.italic) {
                            text = `_${text}_`;
                        }
                        if (sectionElement.style.strike) {
                            text = `~${text}~`;
                        }
                    }
                    markdown += `${text}\n`;
                });
                break;
            case 'rich_text_quote':
                element.elements.forEach((quoteElement: any) => {
                    markdown += `>${quoteElement.text}\n`;
                });
                break;
            case 'rich_text_preformatted':
                markdown += `\`\`\`${element.elements[0].text}\`\`\``;
                break;
            case 'rich_text_link':
                markdown += `[${element.elements[0].text}](${element.elements[0].url})`;
                break;
            case 'rich_text_broadcast':
                markdown += `@channel`;
                break;
            default:
                console.log(`Unknown type: ${element.type}`);
        }
    }

    return markdown;
}

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
            date,
            desc: val.desc.desc.rich_text_value?.elements,
            grade: val.grade.grade.selected_options?.map(option => option.value) || []
        });

        let desc = null

        if (val.desc.desc.rich_text_value?.elements === undefined) {
            return;
        } else {
            desc = convertToMarkdown(val.desc.desc.rich_text_value?.elements);
        }
        await client.chat.postMessage({
            channel: 'C07B08ENKUK',
            blocks: [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: 'イベントが追加されました。'
                    }
                },
                {
                    type: 'divider'
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `<!channel>\n*イベント名*: ${event}\n*日付*: ${date}\n*参加学年*: ${val.grade.grade.selected_options?.map(option => option.text.text).join(', ')}`
                    }
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*詳細*:\n ${desc}`
                    }
                }
            ]
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
                            block_id: 'desc',
                            element: {
                                type: 'rich_text_input',
                                action_id: 'desc'
                            },
                            label: {
                                type: 'plain_text',
                                text: '詳細'
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
                        },
                        {
                            type: 'section',
                            block_id: 'grade',
                            text: {
                                type: 'plain_text',
                                text: '参加学年'
                            },
                            accessory: {
                                type: 'multi_static_select',
                                action_id: 'grade',
                                options: [
                                    {
                                        text: {
                                            type: 'plain_text',
                                            text: '1年'
                                        },
                                        value: '1'
                                    },
                                    {
                                        text: {
                                            type: 'plain_text',
                                            text: '2年'
                                        },
                                        value: '2'
                                    },
                                    {
                                        text: {
                                            type: 'plain_text',
                                            text: '3年'
                                        },
                                        value: '3'
                                    }
                                ]
                            }
                        }
                    ],
                    submit: {
                        type: 'plain_text',
                        text: '追加'
                    }
                }
            });
        } catch (error) {
            logger.error(error);
            await respond('イベントの追加に失敗しました。');
        }
    } else {
        await respond("権限がありません。");
    }
});

let repoDB: {id: string, userName: string, date: string, event: string} | {} = {};

app.view('report', async ({ ack, body, view, client }) => {
    await ack();

    const user = body.user.id;
    const values = view.state.values;
    const reason = values.reason.reason.value;

    const root = process.env.FIREBASE_RULE as string;
    if (!repoDB || !('id' in repoDB) || !('userName' in repoDB)) {
        return;
    }
    const { id, userName } = repoDB;
    await updateDoc(doc(db, 'events', root, 'event', id), {
        absent: {
            user: {
                id: user,
                name: userName,
                reason
            }
        }
    });

    await client.chat.postMessage({
        channel: "C07B5P6UFEX",
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `ユーザー <@${user}>からの欠席報告:\n*日付:* ${repoDB['date']}\n*イベント:* ${repoDB['event']}\n*理由:* ${reason}`
                }
            }
        ]
    });

    repoDB = {};
});

app.action('report-click', async ({ ack, body, client }) => {
    await ack();
    const actionsBody = body as unknown as { actions: [{ value: string }], trigger_id: string, user: { id: string } };
    const { date, event, id } = JSON.parse(actionsBody.actions[0].value);
    try {
        if (body.type !== 'block_actions' || !body.view) {
            return;
        }
        repoDB = {};
        await client.views.update({
            view_id: body.view.id,
            hash: body.view.hash,
            view: {
                type: 'modal',
                callback_id: 'report',
                title: {
                    type: 'plain_text',
                    text: '欠席報告'
                },
                blocks: [
                    {
                        type: 'context',
                        block_id: 'info',
                        elements: [
                            {
                                type: 'mrkdwn',
                                text: `*日付:* ${date.text}\n*イベント:* ${event.text}`
                            }
                        ]
                    },
                    {
                        type: 'input',
                        block_id: 'reason',
                        element: {
                            type: 'plain_text_input',
                            action_id: 'reason'
                        },
                        label: {
                            type: 'plain_text',
                            text: '理由'
                        }
                    }
                ],
                submit: {
                    type: 'plain_text',
                    text: '報告',
                }
            }
        });

        const userName = (await client.users.info({ user: actionsBody.user.id })).user?.name ;
        if (!userName || !id) {
            return;
        }
        repoDB = { id, userName, date: date.text, event: event.text};
    } catch (error) {
        console.error(error);
        await client.chat.postMessage({
            channel: actionsBody.user.id,
            text: '欠席報告のモーダルを開けませんでした。'
        });
    }
});

app.view('event-edit', async ({ ack, body, view, logger, client }) => {
    logger.info(body);
    await ack();

    const val = view.state.values
    const event = val.event.event.value
    const date = val.date.date.selected_date

    const root = process.env.FIREBASE_RULE as string

    const { id } = repoDB as { id: string };

    if (!root || !id) {
        return;
    }

    try {
        await updateDoc(doc(db, 'events', root, 'event', id), {
            event,
            date,
            desc: val.desc.desc.rich_text_value?.elements,
            grade: val.grade.grade.selected_options?.map(option => option.value) || []
        });

        let desc = null

        if (val.desc.desc.rich_text_value?.elements === undefined) {
            return;
        } else {
            desc = convertToMarkdown(val.desc.desc.rich_text_value?.elements);
        }
        await client.chat.postMessage({
            channel: 'C07B08ENKUK',
            blocks: [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: 'イベントが編集されました。'
                    }
                },
                {
                    type: 'divider'
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `<!channel>\n*イベント名*: ${event}\n*日付*: ${date}\n*参加学年*: ${val.grade.grade.selected_options?.map(option => option.text.text).join(', ')}`
                    }
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*詳細*:\n ${desc}`
                    }
                }
            ]
        });
    } catch (error) {
        logger.error(error);
        await client.chat.postMessage({
            channel: body.user.id,
            text: 'イベントの編集に失敗しました。'
        });
    }
});

app.action('edit-click', async ({ ack, body, client }) => {
    ack();
    const actionsBody = body as unknown as { actions: [{ value: string }], trigger_id: string, user: { id: string } };
    const { date, event, desc, id } = JSON.parse(actionsBody.actions[0].value);

    try {
        if (body.type !== 'block_actions' || !body.view) {
            return;
        }
        repoDB = {};
        client.views.update({
            view_id: body.view.id,
            hash: body.view.hash,
            view: {
                type: 'modal',
                callback_id: 'event-edit',
                title: {
                    type: 'plain_text',
                    text: 'イベント編集'
                },
                blocks: [
                    {
                        type: 'input',
                        block_id: 'event',
                        element: {
                            type: 'plain_text_input',
                            action_id: 'event',
                            initial_value: event.text
                        },
                        label: {
                            type: 'plain_text',
                            text: 'イベント'
                        }
                    },
                    {
                        type: 'input',
                        block_id: 'desc',
                        element: {
                            type: 'rich_text_input',
                            action_id: 'desc',
                            initial_value: {
                                type: 'rich_text',
                                elements: desc.text
                            }
                        },
                        label: {
                            type: 'plain_text',
                            text: '詳細'
                        }
                    },
                    {
                        type: 'input',
                        block_id: 'date',
                        element: {
                            type: 'datepicker',
                            action_id: 'date',
                            initial_date: date.text
                        },
                        label: {
                            type: 'plain_text',
                            text: '日付'
                        }
                    },
                    {
                        type: 'section',
                        block_id: 'grade',
                        text: {
                            type: 'plain_text',
                            text: '参加学年'
                        },
                        accessory: {
                            type: 'multi_static_select',
                            action_id: 'grade',
                            options: [
                                {
                                    text: {
                                        type: 'plain_text',
                                        text: '1年'
                                    },
                                    value: '1'
                                },
                                {
                                    text: {
                                        type: 'plain_text',
                                        text: '2年'
                                    },
                                    value: '2'
                                },
                                {
                                    text: {
                                        type: 'plain_text',
                                        text: '3年'
                                    },
                                    value: '3'
                                }
                            ]
                        }
                    }
                ],
                submit: {
                    type: 'plain_text',
                    text: '編集'
                }
            }
        });

        repoDB = { id, date: date.text, event: event.text };
    } catch (error) {
        console.error(error);
        await client.chat.postMessage({
            channel: actionsBody.user.id,
            text: 'イベントの編集に失敗しました。'
        });
    }
});

app.action('detail-clic', async ({ ack, body, client }) => {
    await ack();
    const actionsBody = body as unknown as { actions: [{ value: string }], trigger_id: string };
    const { date, event, desc, is_admin } = JSON.parse(actionsBody.actions[0].value);
    if (is_admin) {
        await client.views.open({
            trigger_id: actionsBody.trigger_id,
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
                            text: `*日付:* ${date.text}\n*イベント:* ${event.text}\n*詳細:* ${desc.text}`
                        }
                    },
                    {
                        type: 'actions',
                        elements: [
                            {
                                type: 'button',
                                text: {
                                    type: 'plain_text',
                                    text: '欠席を報告する'
                                },
                                action_id: 'report-click',
                                value: actionsBody.actions[0].value
                            },
                            {
                                type: 'button',
                                text: {
                                    type: 'plain_text',
                                    text: '編集'
                                },
                                action_id: 'edit-click',
                                value: actionsBody.actions[0].value
                            }
                        ]
                    }
                ]
            }
        });
    } else {
        await client.views.open({
            trigger_id: actionsBody.trigger_id,
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
                            text: `*日付:* ${date.text}\n*イベント:* ${event.text}\n*詳細:* ${desc.text}`
                        }
                    },
                    {
                        type: 'actions',
                        elements: [
                            {
                                type: 'button',
                                text: {
                                    type: 'plain_text',
                                    text: '欠席を報告する'
                                },
                                action_id: 'report-click',
                                value: actionsBody.actions[0].value
                            }
                        ]
                    }
                ]
            }
        });
    }
});

app.command('/event', async ({ command, ack, respond }) => {
    await ack();
    const root = process.env.FIREBASE_RULE as string;
    const querySnapshot = await getDocs(collection(db, "events", root, "event"));

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const is_admin = await app.client.users.info({ user: command.user_id });


    const events = querySnapshot.docs
        .filter(doc => {
            const event = doc.data();
            const eventDate = new Date(event.date);
            return eventDate >= currentDate;
        })
        .map(doc => {
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
                        desc: { text: event.desc },
                        id: doc.id,
                        is_admin: is_admin.user?.is_admin
                    }),
                    action_id: 'detail-clic'
                }
            };
    });

    await respond({
        blocks: [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: 'イベント一覧'
                }
            },
            ...events
        ],
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