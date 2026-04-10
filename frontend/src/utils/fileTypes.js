// 文件类型判断工具函数

export const isPdf = (filename) => {
  if (!filename) return false
  return filename.toLowerCase().endsWith('.pdf')
}

export const isWord = (filename) => {
  if (!filename) return false
  const ext = filename.toLowerCase()
  return ext.endsWith('.doc') || ext.endsWith('.docx')
}

export const isMarkdown = (filename) => {
  if (!filename) return false
  const ext = filename.toLowerCase()
  return ext.endsWith('.md') || ext.endsWith('.markdown')
}

export const isHtml = (filename) => {
  if (!filename) return false
  return filename.toLowerCase().endsWith('.html')
}

export const isTextFile = (filename) => {
  return isMarkdown(filename) || isHtml(filename)
}

export const getFileType = (filename) => {
  if (isPdf(filename)) return 'PDF 文档'
  if (isWord(filename)) return 'Word 文档'
  if (isMarkdown(filename)) return 'Markdown 文档'
  if (isHtml(filename)) return 'HTML 文档'
  return '其他文件'
}
