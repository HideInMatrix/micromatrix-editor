import { Markdown } from '@tiptap/markdown'

// Markdown 扩展配置
export const useMarkdownExtension = () => {
    return Markdown.configure({
        markedOptions: {
            gfm: true, // 启用 GitHub Flavored Markdown (GFM) 支持
            breaks: true, // 启用换行符转换为 <br> 标签
            pedantic: false, // 允许一些不严格的 Markdown 语法
        }
    })
}
