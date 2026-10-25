import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { 
    ConfigService
 } from '@nestjs/config'
@Injectable()
export class FastApiService {
    private readonly logger = new Logger(FastApiService.name);
    private readonly FASTAPI_URL: string;
    private readonly CLIENT_ID: string;
    private readonly CLIENT_SECRET: string;
    // Lưu token vào bộ nhớ RAM của NestJS
    private cachedToken: string | null = null;
    private tokenExpiresAt: number = 0; // Timestamp tính bằng giây

    constructor(private readonly configService: ConfigService) {
        // Lấy URL với fallback an toàn cho local
        this.FASTAPI_URL = this.configService.getOrThrow<string>('FASTAPI_URL', 'http://localhost:8000');
        // Lấy biến bắt buộc, dùng getOrThrow để Fail-Fast đúng thời điểm NestJS khởi tạo Service
        this.CLIENT_ID = this.configService.getOrThrow<string>('FASTAPI_CLIENT_ID');
        this.CLIENT_SECRET = this.configService.getOrThrow<string>('FASTAPI_CLIENT_SECRET');
    }

    /**
     * Lấy Token hợp lệ (Tự động xin lại nếu Token cũ hết hạn)
     */
    async getValidToken(): Promise<string> {
        const nowInSeconds = Math.floor(Date.now() / 1000);

        // Nếu đã có token và thời gian hết hạn còn trên 60 giây -> Dùng lại Token cũ
        if (this.cachedToken && this.tokenExpiresAt - nowInSeconds > 60) {
        return this.cachedToken;
        }

        // Nếu chưa có hoặc Token đã/sắp hết hạn -> Gọi sang FastAPI xin Token mới
        this.logger.log('Token hết hạn hoặc chưa có, đang xin Token mới từ FastAPI...');
        return await this.renewToken();
    }

    private async renewToken(): Promise<string> {
        try {
            const params = new URLSearchParams();

            params.append('grant_type', 'client_credentials'); // OAuth2 Client Credentials
            params.append('client_id', this.CLIENT_ID);
            params.append('client_secret', this.CLIENT_SECRET);
            
            const res = await axios.post(`${this.FASTAPI_URL}/auth/service-token`, 
                params.toString(),
                {
                headers: {
                    "Content-Type": 'application/x-www-form-urlencoded',
                }
            })

            const { access_token, expires_in } = res.data

            this.cachedToken = access_token;
            // Lưu thời điểm hết hạn (Hiện tại + expires_in)
            this.tokenExpiresAt = Math.floor(Date.now() / 1000) + (expires_in || 3600)
            
            this.logger.log('Lấy Token mới thành công!');
            return this.cachedToken!;
        } catch (error) {
            this.logger.error('Lỗi khi lấy Token từ FastAPI:', error);
            throw new Error('Không thể kết nối xác thực với FastAPI');
        }
    }
}