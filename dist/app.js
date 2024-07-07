"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bolt_1 = require("@slack/bolt");
const firebase_1 = require("./firebase");
const dotenv_1 = __importDefault(require("dotenv"));
const firestore_1 = require("firebase/firestore");
const child_process_1 = require("child_process");
dotenv_1.default.config();
function convertToMarkdown(elements) {
    let markdown = '';
    for (const element of elements) {
        switch (element.type) {
            case 'rich_text_list':
                element.elements.forEach((listElement) => {
                    markdown += `• ${convertToMarkdown([listElement])}\n`;
                });
                break;
            case 'rich_text_section':
                element.elements.forEach((sectionElement) => {
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
                element.elements.forEach((quoteElement) => {
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
const app = new bolt_1.App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    logLevel: bolt_1.LogLevel.DEBUG
});
app.event('app_home_opened', (_a) => __awaiter(void 0, [_a], void 0, function* ({ event, client, ack }) {
    try {
        const user = event.user;
        const root = process.env.FIREBASE_RULE;
        const querySnapshot = yield (0, firestore_1.getDocs)((0, firestore_1.collection)(firebase_1.db, 'events', root, 'event'));
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        const events = querySnapshot.docs
            .map(doc => (Object.assign(Object.assign({}, doc.data()), { date: new Date(doc.data().date), id: doc.id })))
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
        yield client.views.publish({
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
    }
    catch (error) {
        console.error(error);
    }
}));
app.command('/help', (_a) => __awaiter(void 0, [_a], void 0, function* ({ command, ack, respond }) {
    yield ack();
    yield respond('下記のリンクから、misckun の使い方を確認してください。\nhttps://github.com/misc-org/misckun/README.md');
    yield respond('また、BOT がうまく作動していないと感じた時は、担当者（<@kishintorii>）までご連絡ください！');
}));
app.command('/rule', (_a) => __awaiter(void 0, [_a], void 0, function* ({ command, ack, client }) {
    yield ack();
    let rules;
    if (command.text === 'misc') {
        rules = (yield fetch('https://raw.githubusercontent.com/misc-org/common-archives/main/rules.md').then(res => res.text())) || 'ルールが取得できませんでした。';
    }
    else if (command.text === 'slack') {
        rules = (yield fetch('https://raw.githubusercontent.com/misc-org/common-archives/main/slack.md').then(res => res.text())) || 'ルールが取得できませんでした。';
    }
    else {
        rules = '正しい引数を指定してください。';
    }
    yield client.chat.postMessage({
        channel: command.user_id,
        text: rules
    });
}));
app.view('event-add', (_a) => __awaiter(void 0, [_a], void 0, function* ({ ack, body, view, logger, client }) {
    var _b, _c, _d, _e, _f;
    logger.info(body);
    yield ack();
    const val = view.state.values;
    const event = val.event.event.value;
    const date = val.date.date.selected_date;
    const root = process.env.FIREBASE_RULE;
    try {
        yield (0, firestore_1.addDoc)((0, firestore_1.collection)(firebase_1.db, 'events', root, 'event'), {
            event,
            date,
            desc: (_b = val.desc.desc.rich_text_value) === null || _b === void 0 ? void 0 : _b.elements,
            grade: ((_c = val.grade.grade.selected_options) === null || _c === void 0 ? void 0 : _c.map(option => option.value)) || []
        });
        let desc = null;
        if (((_d = val.desc.desc.rich_text_value) === null || _d === void 0 ? void 0 : _d.elements) === undefined) {
            return;
        }
        else {
            desc = convertToMarkdown((_e = val.desc.desc.rich_text_value) === null || _e === void 0 ? void 0 : _e.elements);
        }
        yield client.chat.postMessage({
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
                        text: `<!channel>\n*イベント名*: ${event}\n*日付*: ${date}\n*参加学年*: ${(_f = val.grade.grade.selected_options) === null || _f === void 0 ? void 0 : _f.map(option => option.text.text).join(', ')}`
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
    }
    catch (error) {
        logger.error(error);
        yield client.chat.postMessage({
            channel: body.user.id,
            text: 'イベントの追加に失敗しました。'
        });
    }
}));
app.command('/add-event', (_a) => __awaiter(void 0, [_a], void 0, function* ({ command, ack, body, client, logger, respond }) {
    var _b;
    yield ack();
    const user = yield app.client.users.info({ user: command.user_id });
    if ((_b = user.user) === null || _b === void 0 ? void 0 : _b.is_admin) {
        try {
            const triggerId = body.trigger_id;
            if (!triggerId) {
                yield respond('イベントの追加に失敗しました。');
                return;
            }
            yield client.views.open({
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
        }
        catch (error) {
            logger.error(error);
            yield respond('イベントの追加に失敗しました。');
        }
    }
    else {
        yield respond("権限がありません。");
    }
}));
let repoDB = {};
app.view('report', (_a) => __awaiter(void 0, [_a], void 0, function* ({ ack, body, view, client }) {
    yield ack();
    const user = body.user.id;
    const values = view.state.values;
    const reason = values.reason.reason.value;
    const root = process.env.FIREBASE_RULE;
    if (!repoDB || !('id' in repoDB) || !('userName' in repoDB)) {
        return;
    }
    const { id, userName } = repoDB;
    yield (0, firestore_1.updateDoc)((0, firestore_1.doc)(firebase_1.db, 'events', root, 'event', id), {
        absent: {
            user: {
                id: user,
                name: userName,
                reason
            }
        }
    });
    yield client.chat.postMessage({
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
}));
app.action('report-click', (_a) => __awaiter(void 0, [_a], void 0, function* ({ ack, body, client }) {
    var _b;
    yield ack();
    const actionsBody = body;
    const { date, event, id } = JSON.parse(actionsBody.actions[0].value);
    try {
        if (body.type !== 'block_actions' || !body.view) {
            return;
        }
        repoDB = {};
        yield client.views.update({
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
        const userName = (_b = (yield client.users.info({ user: actionsBody.user.id })).user) === null || _b === void 0 ? void 0 : _b.name;
        if (!userName || !id) {
            return;
        }
        repoDB = { id, userName, date: date.text, event: event.text };
    }
    catch (error) {
        console.error(error);
        yield client.chat.postMessage({
            channel: actionsBody.user.id,
            text: '欠席報告のモーダルを開けませんでした。'
        });
    }
}));
app.view('event-edit', (_a) => __awaiter(void 0, [_a], void 0, function* ({ ack, body, view, logger, client }) {
    var _b, _c, _d, _e, _f;
    logger.info(body);
    yield ack();
    const val = view.state.values;
    const event = val.event.event.value;
    const date = val.date.date.selected_date;
    const root = process.env.FIREBASE_RULE;
    const { id } = repoDB;
    if (!root || !id) {
        return;
    }
    try {
        yield (0, firestore_1.updateDoc)((0, firestore_1.doc)(firebase_1.db, 'events', root, 'event', id), {
            event,
            date,
            desc: (_b = val.desc.desc.rich_text_value) === null || _b === void 0 ? void 0 : _b.elements,
            grade: ((_c = val.grade.grade.selected_options) === null || _c === void 0 ? void 0 : _c.map(option => option.value)) || []
        });
        let desc = null;
        if (((_d = val.desc.desc.rich_text_value) === null || _d === void 0 ? void 0 : _d.elements) === undefined) {
            return;
        }
        else {
            desc = convertToMarkdown((_e = val.desc.desc.rich_text_value) === null || _e === void 0 ? void 0 : _e.elements);
        }
        yield client.chat.postMessage({
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
                        text: `<!channel>\n*イベント名*: ${event}\n*日付*: ${date}\n*参加学年*: ${(_f = val.grade.grade.selected_options) === null || _f === void 0 ? void 0 : _f.map(option => option.text.text).join(', ')}`
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
    }
    catch (error) {
        logger.error(error);
        yield client.chat.postMessage({
            channel: body.user.id,
            text: 'イベントの編集に失敗しました。'
        });
    }
    repoDB = {};
}));
app.action('edit-click', (_a) => __awaiter(void 0, [_a], void 0, function* ({ ack, body, client }) {
    ack();
    const actionsBody = body;
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
    }
    catch (error) {
        console.error(error);
        yield client.chat.postMessage({
            channel: actionsBody.user.id,
            text: 'イベントの編集に失敗しました。'
        });
    }
}));
app.action('detail-clic', (_a) => __awaiter(void 0, [_a], void 0, function* ({ ack, body, client }) {
    yield ack();
    const actionsBody = body;
    const { date, event, desc, is_admin } = JSON.parse(actionsBody.actions[0].value);
    let elements = [
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
    yield client.views.open({
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
}));
app.command('/event', (_a) => __awaiter(void 0, [_a], void 0, function* ({ command, ack, client }) {
    yield ack();
    const root = process.env.FIREBASE_RULE;
    const querySnapshot = yield (0, firestore_1.getDocs)((0, firestore_1.collection)(firebase_1.db, "events", root, "event"));
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const is_admin = yield app.client.users.info({ user: command.user_id });
    const events = querySnapshot.docs
        .filter(doc => {
        const event = doc.data();
        const eventDate = new Date(event.date);
        return eventDate >= currentDate;
    })
        .map(doc => {
        var _a;
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
                    is_admin: (_a = is_admin.user) === null || _a === void 0 ? void 0 : _a.is_admin
                }),
                action_id: 'detail-clic'
            }
        };
    });
    yield client.chat.postMessage({
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
}));
app.command('/desctop', (_a) => __awaiter(void 0, [_a], void 0, function* ({ command, ack, client }) {
    yield ack();
    const computerId = command.text;
    if (!computerId) {
        yield client.chat.postMessage({
            channel: command.user_id,
            text: 'パソコンのIDを指定してください。'
        });
        return;
    }
    ///desctop 126.23.238.24
    (0, child_process_1.exec)(`ping -n 1 ${computerId}`, (error, stdout, stderr) => __awaiter(void 0, void 0, void 0, function* () {
        if (error) {
            console.log(`error: ${error.message}`);
            yield client.chat.postMessage({
                channel: command.user_id,
                text: `パソコン${computerId}の状態を確認できませんでした。`
            });
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            yield client.chat.postMessage({
                channel: command.user_id,
                text: `パソコン${computerId}の状態を確認できませんでした。`
            });
            return;
        }
        const status = stdout.includes('1 packets transmitted, 1 received') ? 'on' : 'off';
        yield client.chat.postMessage({
            channel: command.user_id,
            text: `パソコン${computerId}は${status}です。`
        });
    }));
}));
(() => __awaiter(void 0, void 0, void 0, function* () {
    yield app.start(process.env.PORT || 3000);
    console.log('⚡️ Bolt app is running!');
}))();
//# sourceMappingURL=app.js.map