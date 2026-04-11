import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

// 加载插件
dayjs.extend(utc)
dayjs.extend(timezone)

// 设置默认时区为北京时间
dayjs.tz.setDefault('Asia/Shanghai')

/**
 * 获取当前北京时间
 * @returns {dayjs.Dayjs} dayjs 对象（北京时间）
 */
export const now = () => dayjs().tz('Asia/Shanghai')

/**
 * 获取当前北京时间的 Date 对象（用于日期选择器）
 * @returns {Date} Date 对象（北京时间）
 */
export const nowDate = () => {
  return dayjs().tz('Asia/Shanghai').toDate()
}

/**
 * 获取指定天数前的北京时间 Date 对象
 * @param {number} days - 天数
 * @returns {Date} Date 对象
 */
export const daysAgoDate = (days) => {
  return dayjs().tz('Asia/Shanghai').subtract(days, 'day').toDate()
}

/**
 * 格式化日期为北京时间字符串
 * @param {string|Date|number} date - 日期（支持 UTC 或本地时间）
 * @param {string} format - 格式，默认 'YYYY-MM-DD HH:mm:ss'
 * @returns {string} 格式化后的北京时间字符串
 */
export const formatDate = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  if (!date) return '-'
  // 假设后端返回的是 UTC 时间，先按 UTC 解析，再转为北京时间
  return dayjs.utc(date).tz('Asia/Shanghai').format(format)
}

/**
 * 格式化日期为简短格式（月-日 时:分）
 * @param {string|Date|number} date - 日期
 * @returns {string} 格式化后的字符串
 */
export const formatShortDate = (date) => {
  if (!date) return '-'
  return dayjs.utc(date).tz('Asia/Shanghai').format('MM-DD HH:mm')
}

/**
 * 格式化日期为日期格式（年-月-日）
 * 专门用于处理日期选择器的 Date 对象（本地时间）
 * @param {string|Date|number} date - 日期
 * @returns {string} 格式化后的字符串
 */
export const formatDateOnly = (date) => {
  if (!date) return '-'
  // Date 对象来自日期选择器，是本地时间，直接格式化
  return dayjs(date).format('YYYY-MM-DD')
}

/**
 * 获取相对时间（几天前、几小时前等）
 * @param {string|Date|number} date - 日期
 * @returns {string} 相对时间描述
 */
export const fromNow = (date) => {
  if (!date) return '-'
  return dayjs(date).tz('Asia/Shanghai').fromNow()
}

// 导出配置好的 dayjs 实例
export default dayjs
