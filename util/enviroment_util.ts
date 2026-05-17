
export function environmentFileName(fileName: string, ext: string): string {
    const env = process.env.NODE_ENV;
    if (env && env !== 'prod') {
        return `${fileName}.${env.toLowerCase()}.${ext}`;
    }
    return `${fileName}.${ext}`;
}