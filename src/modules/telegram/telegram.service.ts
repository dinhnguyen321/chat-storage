import { OnModuleInit, Logger, UnauthorizedException, Injectable } from "@nestjs/common";
import { Telegraf } from 'telegraf';
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from 'rxjs'
import { InjectRepository } from "@nestjs/typeorm";
import { ConversationEntity } from "../entities/conversations.entity.js";
import { Repository } from "typeorm";

@Injectable()
export class TelegramService implements OnModuleInit {
    private bot: Telegraf;
    private readonly logger = new Logger(TelegramService.name);

    constructor(
        private configService: ConfigService,
        private httpService: HttpService,
        @InjectRepository(ConversationEntity)
        private readonly conversationRepository: Repository<ConversationEntity>
    ) {
        const token = this.configService.get<string>('TELEGRAM__BOT_TOKEN');

        if (!token) {
            throw new UnauthorizedException('Telegram bot token is not configured')
        }    
        // Khởi tạo bot telegaf
        this.bot = new Telegraf(token);
    }

    onModuleInit() {
        this.bot.on('text', async (ctx) => {
            const text = ctx.message.text;
            const telegramUserId = ctx.from.id ? ctx.from.id : 'new';

            this.logger.log(`Nhận được tin nhắn từ [${telegramUserId}]: ${text}`);

            // Test phản hồi cơ bản trước khi gọi fast-api
            await ctx.reply(`Bot Thinking...`)
            try {
                // const apiBaseUrl =  this.configService.get<string>('FASTAPI_URL');
                const apiBaseUrl =  this.configService.get<string>('CHAT_DB_URL');
                const internalSecret = this.configService.get<string>('TELEGRAM__INTERNAL_SECRET')

                // Tạm thời fix cứng user_id hoặc map từ telegramUserId sang DB user_id
                const dbUserId = telegramUserId || '123456'
                
                let conversation = await this.conversationRepository.findOne({
                    where: {
                        user_id: dbUserId.toString(),
                    },
                    order: {
                        updated_at: 'DESC'
                    }
                })

                // Xác định fastApi_conversation_id gửi lên FastAPI
                // Nếu trong DB đã có rồi thì dùng, chưa có thì gửi 'new'
                const conversation_id = conversation?.id || 'new'
                const selectorChoices: never[] = [];

                const payload = {
                        content: text,
                        selector_choices: selectorChoices,
                        user_id: dbUserId.toString(),
                }

                const targetUrl = `${apiBaseUrl}/messages/conversations/${conversation_id}`

                const response = await firstValueFrom(
                    this.httpService.post(
                        targetUrl ,
                        payload,
                        {
                            headers: {
                                'X-Telegram-Integration-Secret': internalSecret,
                            }
                        }
                    )
                )
                this.logger.log(`Gọi FastAPI thành công! Response: ${JSON.stringify(response.data)}`);
                // Nhận kết quả từ FastAPI trả về
                const responseData = await response.data;
                const replyText = responseData?.messages[1].content || 'Đã phản hồi.';
                
                await ctx.reply(replyText)
            } catch (error) {
                await ctx.reply('Xin lỗi, hệ thống đang bận, vui lòng thử lại sau.');
                this.logger.error('Lỗi khi gọi FastAPI create message telegram:', error);
                if (error) {
                    this.logger.error(`Status: ${error}`);
                    this.logger.error(`Data: ${JSON.stringify(error)}`);
                }
            }
        });

        // Khởi động bot
        this.bot.launch().then(() => {
            this.logger.log(`Telegram Bot đã được khởi động thành công!`);
        })

        // Dừng bot an toàn khi ứng dụng tắt
        process.once('SIGINT', () => this.bot.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
    }
}