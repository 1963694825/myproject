/**
 * 剪贴板辅助工具类
 * 用于处理剪贴板读取和抖音链接提取
 */

class ClipboardHelper {
  /**
   * 读取剪贴板内容
   * @returns {Promise<string>} 剪贴板文本内容
   */
  static async getClipboardData() {
    return new Promise((resolve, reject) => {
      wx.getClipboardData({
        success: (res) => {
          resolve(res.data || '')
        },
        fail: (err) => {
          reject(err)
        }
      })
    })
  }

  /**
   * 从文本中提取抖音链接
   * 支持多种格式：
   * - https://v.douyin.com/xxxxx/
   * - https://www.douyin.com/video/xxxxx
   * - https://www.iesdouyin.com/share/video/xxxxx
   * - 包含在分享文本中的链接
   * 
   * @param {string} text - 待提取的文本
   * @returns {string|null} 提取到的链接，如果没有则返回 null
   */
  static extractDouyinUrl(text) {
    if (!text || typeof text !== 'string') {
      return null
    }

    // 正则表达式匹配抖音链接
    // 匹配 douyin.com 和 iesdouyin.com 域名
    const patterns = [
      // 匹配 v.douyin.com 短链接
      /https?:\/\/v\.douyin\.com\/[A-Za-z0-9]+\/?/i,
      // 匹配 www.douyin.com 完整链接
      /https?:\/\/(?:www\.)?douyin\.com\/[^\s]*/i,
      // 匹配 iesdouyin.com 链接
      /https?:\/\/(?:www\.)?iesdouyin\.com\/[^\s]*/i,
      // 匹配移动端链接
      /https?:\/\/m\.douyin\.com\/[^\s]*/i
    ]

    // 尝试每个正则表达式
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        // 清理链接末尾可能的标点符号
        let url = match[0]
        // 移除末尾的标点符号（但保留 URL 中的参数）
        url = url.replace(/[,;。，；！!？?]+$/, '')
        return url
      }
    }

    return null
  }

  /**
   * 验证是否为有效的抖音链接
   * @param {string} url - 待验证的链接
   * @returns {boolean} 是否为有效的抖音链接
   */
  static isValidDouyinUrl(url) {
    if (!url || typeof url !== 'string') {
      return false
    }

    // 检查是否包含抖音域名
    const douyinDomains = [
      'douyin.com',
      'iesdouyin.com'
    ]

    return douyinDomains.some(domain => url.includes(domain))
  }

  /**
   * 从剪贴板读取并提取抖音链接
   * @returns {Promise<{success: boolean, url?: string, error?: string}>}
   */
  static async getDouyinUrlFromClipboard() {
    try {
      const clipboardText = await this.getClipboardData()
      
      if (!clipboardText) {
        return {
          success: false,
          error: '剪贴板为空'
        }
      }

      const url = this.extractDouyinUrl(clipboardText)
      
      if (!url) {
        return {
          success: false,
          error: '未检测到抖音链接'
        }
      }

      if (!this.isValidDouyinUrl(url)) {
        return {
          success: false,
          error: '链接格式不正确'
        }
      }

      return {
        success: true,
        url: url
      }
    } catch (error) {
      return {
        success: false,
        error: error.errMsg || '读取剪贴板失败'
      }
    }
  }

  /**
   * 规范化抖音链接
   * 清理链接中的多余参数和空格
   * @param {string} url - 原始链接
   * @returns {string} 规范化后的链接
   */
  static normalizeUrl(url) {
    if (!url) return ''
    
    // 移除首尾空格
    url = url.trim()
    
    // 确保使用 https
    url = url.replace(/^http:/, 'https:')
    
    return url
  }
}

module.exports = ClipboardHelper
