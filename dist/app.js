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
dotenv_1.default.config();
const event = [];
const app = new bolt_1.App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    logLevel: bolt_1.LogLevel.DEBUG
});
app.event('app_home_opened', (_a) => __awaiter(void 0, [_a], void 0, function* ({ event, client, ack }) {
    yield client.chat.postMessage({
        channel: event.channel,
        text: 'こんにちは！私は部活動サポートボットです。'
    });
}));
app.command('/rule', (_a) => __awaiter(void 0, [_a], void 0, function* ({ command, ack, respond }) {
    yield ack();
    const rules = `
    1. 部室は清潔に保つ\n2. パソコンは丁寧に扱う\n3. 予定は必ずカレンダーに記入する
  `;
    yield respond(rules);
}));
app.view('event-add', (_a) => __awaiter(void 0, [_a], void 0, function* ({ ack, body, view, logger, client }) {
    logger.info(body);
    yield ack();
    const val = view.state.values;
    const event = val.event.event.value;
    const date = val.date.date.selected_date;
    const root = process.env.FIREBASE_RULE;
    try {
        yield (0, firestore_1.addDoc)((0, firestore_1.collection)(firebase_1.db, 'events', root, 'event'), {
            event,
            date
        });
        yield client.chat.postMessage({
            channel: body.user.id,
            text: 'イベントを追加しました。'
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
app.view('report', (_a) => __awaiter(void 0, [_a], void 0, function* ({ ack, body, view, client }) {
    yield ack();
    const user = body.user.id;
    const values = view.state.values;
    const reason = values.reason.reason.value;
    const userInfo = yield client.users.info({ user });
    yield client.chat.postMessage({
        channel: "C07B5P6UFEX",
        text: `ユーザー @${userInfo.user.name}からの休み報告:\n*理由:* ${reason}`
    });
}));
app.action('report-click', (_a) => __awaiter(void 0, [_a], void 0, function* ({ ack, body, client }) {
    yield ack();
    const actionsBody = body;
    const { date, event } = JSON.parse(actionsBody.actions[0].value);
    try {
        if (body.type !== 'block_actions' || !body.view) {
            return;
        }
        yield client.views.update({
            view_id: body.view.id,
            hash: body.view.hash,
            view: {
                type: 'modal',
                callback_id: 'report',
                title: {
                    type: 'plain_text',
                    text: '休み報告'
                },
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `*日付:* ${date}\n*イベント:* ${event}`
                        }
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
                    text: '報告'
                }
            }
        });
    }
    catch (error) {
        console.error(error);
        yield client.chat.postMessage({
            channel: actionsBody.user.id,
            text: '休み報告のモーダルを開けませんでした。'
        });
    }
}));
app.action('detail-clic', (_a) => __awaiter(void 0, [_a], void 0, function* ({ ack, body, client }) {
    yield ack();
    const actionsBody = body;
    const { date, event, desc } = JSON.parse(actionsBody.actions[0].value);
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
                    elements: [
                        {
                            type: 'button',
                            text: {
                                type: 'plain_text',
                                text: '休みを報告する'
                            },
                            action_id: 'report-click',
                            value: actionsBody.actions[0].value
                        }
                    ]
                }
            ]
        }
    });
}));
app.command('/event', (_a) => __awaiter(void 0, [_a], void 0, function* ({ command, ack, respond }) {
    yield ack();
    const root = process.env.FIREBASE_RULE;
    const querySnapshot = yield (0, firestore_1.getDocs)((0, firestore_1.collection)(firebase_1.db, "events", root, "event"));
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
                action_id: 'detail-clic'
            }
        };
    });
    yield respond({
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
}));
app.command('/desctop', (_a) => __awaiter(void 0, [_a], void 0, function* ({ command, ack, respond }) {
    yield ack();
    const computerId = command.text;
    const status = Math.random() > 0.5 ? 'on' : 'off';
    yield respond(`パソコン${computerId}は${status === 'on' ? '使用中' : '使用されていません'}です。`);
}));
(() => __awaiter(void 0, void 0, void 0, function* () {
    yield app.start(process.env.PORT || 3000);
    console.log('⚡️ Bolt app is running!');
}))();
//# sourceMappingURL=app.js.map