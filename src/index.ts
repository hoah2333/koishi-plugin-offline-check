// 导入 Context 和 Schema 类
import { Context, Schema } from "koishi";

// 声明插件名称
export const name = "offline-check";

// 声明配置接口
export interface Config {
    checkbot: {
        platform: string;
        selfId: string;
    };
    messagebot: {
        platform: string;
        selfId: string;
        channelId: string;
    };
}

// 声明配置验证器
export const Config: Schema<Config> = Schema.object({
    checkbot: Schema.object({
        platform: Schema.string().required().description("检查的机器人平台"),
        selfId: Schema.string().required().description("检查的机器人 SelfId"),
    }),
    messagebot: Schema.object({
        platform: Schema.string()
            .required()
            .description("发送消息的机器人平台"),
        selfId: Schema.string()
            .required()
            .description("发送消息的机器人 SelfId"),
        channelId: Schema.string().required().description("发送消息的频道"),
    }),
});

// 应用插件
export function apply(ctx: Context, config: Config) {
    // 监听登录更新事件
    ctx.on("login-updated", async ({ bot }) => {
        // 判断登录信息是否与配置中的 checkbot 信息相符
        if (
            config.checkbot.selfId === bot.selfId &&
            config.checkbot.platform === bot.platform
        ) {
            /**
             *  OFFLINE = 0,
             *  ONLINE = 1,
             *  CONNECT = 2,
             *  DISCONNECT = 3,
             *  RECONECT = 4,
             */
            let statusText: string[] = [
                "当前离线",
                "当前在线",
                "已连接至服务器",
                "已断开连接，请检查网络状态",
                "正在重连中，请等待重连或检查网络状态",
                "状态未知",
            ];

            // 判断状态是否需要发送消息
            if (bot.status == 1 || bot.status == 0 || bot.status == 4) {
                ctx.bots[
                    `${config.messagebot.platform}:${config.messagebot.selfId}`
                ].sendMessage(
                    config.messagebot.channelId,
                    `${bot.platform} 平台的 ${bot.user.name} 机器人${
                        statusText[bot.status]
                    }`
                );
            }
            // 判断状态是否需要重启
            if (bot.status == 3 || bot.status == 0) {
                await ctx.sleep(5000);
                if (bot.status == 3 || bot.status == 0) {
                    ctx.bots[
                        `${config.messagebot.platform}:${config.messagebot.selfId}`
                    ].sendMessage(config.messagebot.channelId, `正在尝试重连`);
                    ctx.bots[
                        `${config.checkbot.platform}:${config.checkbot.selfId}`
                    ].start();
                }
            }
            // 判断状态是否需要重新加载
            if (bot.status == 4) {
                await ctx.sleep(60000);
                if (bot.status == 4) {
                    ctx.bots[
                        `${config.messagebot.platform}:${config.messagebot.selfId}`
                    ].sendMessage(
                        config.messagebot.channelId,
                        `机器人重连失败，正在重启`
                    );
                    ctx.bots[
                        `${config.checkbot.platform}:${config.checkbot.selfId}`
                    ].stop();
                    await ctx.sleep(3000);
                    ctx.bots[
                        `${config.checkbot.platform}:${config.checkbot.selfId}`
                    ].start();
                }
            }
        }
    });
}
