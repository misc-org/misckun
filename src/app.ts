import { App, Button, Checkboxes, Datepicker, DateTimepicker, LogLevel, MultiSelect, Overflow, RadioButtons, RichTextInput, Select, Timepicker, WorkflowButton } from '@slack/bolt';
import { db } from './firebase';
import dotenv from 'dotenv';
import { addDoc, collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { exec } from 'child_process';

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
    try {
        const user = event.user;
        const root = process.env.FIREBASE_RULE as string;

        interface EventData {
            date: Date;
            id: string;
            event?: string;
            desc?: string;
        }

        const querySnapshot = await getDocs(collection(db, 'events', root, 'event'));

        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        const events = querySnapshot.docs
            .map(doc => ({ ...doc.data() as EventData, date: new Date(doc.data().date), id: doc.id }))
            .filter(({ date }) => date >= currentDate)
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .slice(0, 3)
            .map(doc => {
                const date = new Date(doc.date);
                const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
                return {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*日付:* ${formattedDate}\n*イベント:* ${doc.event}`
                    },
                    accessory: {
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: '詳細を見る'
                        },
                        value: JSON.stringify({
                            date: { text: doc.date },
                            event: { text: doc.event },
                            desc: { text: doc.desc },
                            id: doc.id,
                            is_admin: false
                        }),
                        action_id: 'detail-clic'
                    }
                };
            });

        await client.views.publish({
            user_id: user,
            view: {
                type: 'home',
                blocks: [
                    {
                        type: 'image',
                        image_url: 'https://raw.githubusercontent.com/misc-org/.github/main/images/background.png',
                        alt_text: 'MISC'
                    },
                    {
                        type: 'header',
                        text: {
                            type: 'plain_text',
                            text: 'MISC の 公式BOT misckun へようこそ！'
                        }
                    },
                    {
                        type: 'divider'
                    },
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: 'ここでは、BOT に関する情報やイベント情報を確認することができます。'
                        }
                    },
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: 'BOT の使い方については、 `/help` と入力してください。\nまた、BOT がうまく作動していないと感じた時は、担当者（<@kishintorii>）までご連絡ください！'
                        }
                    },
                    {
                        type: 'header',
                        text: {
                            type: 'plain_text',
                            text: 'イベント一覧 (3件まで)'
                        }
                    },
                    {
                        type: 'divider'
                    },
                    ...events,
                    {
                        type: 'header',
                        text: {
                            type: 'plain_text',
                            text: 'コマンド'
                        }
                    },
                    {
                        type: 'divider'
                    },
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: '`/rule`'
                        }
                    },
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: '*slack* に関するルールを確認する場合は、 `/rule slack` と入力してください。\n*misc* に関するルールを確認する場合は、 `/rule misc` と入力してください。'
                        },
                    },
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: '`/event`'
                        }
                    },
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: 'イベント一覧を確認する場合は、 `/event` と入力してください。\n「詳細を見る」を押すことで、イベントの詳細確認と、出血連絡を行うことができます。'
                        },
                    },
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: '`/desctop`'
                        },
                    },
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: 'パソコンの起動状態を確認する場合は、 `/desctop` と入力してください。'
                        }
                    },
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: '`/add-event` *管理者限定コマンド*'
                        }
                    },
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: 'イベントを追加する場合は、 `/add-event` と入力してください。'
                        }
                    },
                ]
            }
        });
    } catch (error) {
        console.error(error);
    }
});

app.command('/help', async ({ command, ack, respond }) => {
    await ack();
    await respond('下記のリンクから、misckun の使い方を確認してください。\nhttps://github.com/misc-org/misckun/README.md');
    await respond('また、BOT がうまく作動していないと感じた時は、担当者（<@kishintorii>）までご連絡ください！');
});

app.command('/rule', async ({ command, ack, client }) => {
    await ack();
    let rules;
    if (command.text === 'misc') {
        rules = await fetch('https://raw.githubusercontent.com/misc-org/common-archives/main/rules.md').then(res => res.text()) || 'ルールが取得できませんでした。';
    } else if (command.text === 'slack') {
        rules = await fetch('https://raw.githubusercontent.com/misc-org/common-archives/main/slack.md').then(res => res.text()) || 'ルールが取得できませんでした。';
    } else {
        rules = '正しい引数を指定してください。';
    }
    await client.chat.postMessage({
        channel: command.user_id,
        text: rules
    });
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

let repoDB: { id: string, userName: string, date: string, event: string } | {} = {};

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

        const userName = (await client.users.info({ user: actionsBody.user.id })).user?.name;
        if (!userName || !id) {
            return;
        }
        repoDB = { id, userName, date: date.text, event: event.text };
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

    repoDB = {};
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

    let elements: (Button | Checkboxes | Datepicker | DateTimepicker | MultiSelect | Overflow | RadioButtons | Select | Timepicker | WorkflowButton | RichTextInput)[] = [
        {
            type: 'button',
            text: {
                type: 'plain_text',
                text: '欠席を報告する'
            },
            action_id: 'report-click',
            value: actionsBody.actions[0].value
        }
    ];

    if (is_admin) {
        elements.push({
            type: 'button',
            text: {
                type: 'plain_text',
                text: '編集する'
            },
            action_id: 'edit-click',
            value: actionsBody.actions[0].value
        });
    }

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
                    elements: elements
                }
            ]
        }
    });
});


app.command('/event', async ({ command, ack, client }) => {
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

    await client.chat.postMessage({
        channel: command.user_id,
        blocks: [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: 'イベント一覧'
                }
            },
            {
                type: 'divider'
            },
            ...events
        ]
    });
});

app.command('/desctop', async ({ command, ack, client }) => {
    await ack();
    const computerId = command.text;

    if (!computerId) {
        await client.chat.postMessage({
            channel: command.user_id,
            text: 'パソコンのIDを指定してください。'
        });
        return;
    }

    ///desctop 126.23.238.24

    exec(`ping -n 1 ${computerId}`, async (error, stdout: string | string[], stderr: any) => {
        if (error) {
            console.log(`error: ${error.message}`);
            await client.chat.postMessage({
                channel: command.user_id,
                text: `パソコン${computerId}の状態を確認できませんでした。`
            });
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            await client.chat.postMessage({
                channel: command.user_id,
                text: `パソコン${computerId}の状態を確認できませんでした。`
            });
            return;
        }

        const status = stdout.includes('1 packets transmitted, 1 received') ? 'on' : 'off';
        await client.chat.postMessage({
            channel: command.user_id,
            text: `パソコン${computerId}は${status}です。`
        });
    });
});

(async () => {
    await app.start(process.env.PORT || 3000);
    console.log('⚡️ Bolt app is running!');
})();