export function getRequireEnv(key: string): string {
    const value = process.env[key]

    if (!value) {
        throw new Error(`[ENV ERROR] Biến môi trường '${key}' chưa được định nghĩa!`)
    }

    return value;
}