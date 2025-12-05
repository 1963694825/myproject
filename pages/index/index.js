// 引入抖音解析工具类
const DouyinParser = require('../../utils/api.js');
// 引入剪贴板辅助工具
const ClipboardHelper = require('../../utils/clipboardHelper.js');

Page({
  data: {
    videoUrl: '',
    isLoading: false
  },

  onLoad() {
    // 页面加载时自动检测剪贴板中的抖音链接
    this.checkClipboard()
  },

  // 检测剪贴板中的抖音链接
  async checkClipboard() {
    try {
      const result = await ClipboardHelper.getDouyinUrlFromClipboard()

      if (result.success && result.url) {
        // 检测到有效链接，自动填充
        const normalizedUrl = ClipboardHelper.normalizeUrl(result.url)
        this.setData({
          videoUrl: normalizedUrl
        })

        // 提示用户已自动填充
        wx.showToast({
          title: '已自动填充链接',
          icon: 'success',
          duration: 2000
        })
      }
    } catch (error) {
      // 静默处理错误（如用户拒绝授权）
      console.log('剪贴板检测失败:', error)
    }
  },

  // 输入框内容变化时触发
  onInput(e) {
    this.setData({
      videoUrl: e.detail.value
    })
  },

  // 解析视频链接
  async parseVideo() {
    let { videoUrl } = this.data

    // 检查链接是否为空
    if (!videoUrl) {
      wx.showToast({
        title: '请输入抖音视频链接',
        icon: 'none'
      })
      return
    }

    // 尝试从输入内容中提取链接（支持用户粘贴包含文本的分享内容）
    const extractedUrl = ClipboardHelper.extractDouyinUrl(videoUrl)
    if (extractedUrl) {
      videoUrl = ClipboardHelper.normalizeUrl(extractedUrl)
      // 更新输入框显示规范化后的链接
      this.setData({
        videoUrl: videoUrl
      })
    }

    // 验证是否为有效的抖音链接
    if (!ClipboardHelper.isValidDouyinUrl(videoUrl)) {
      wx.showToast({
        title: '请输入有效的抖音视频链接',
        icon: 'none',
        duration: 2000
      })
      return
    }

    // 设置加载状态
    this.setData({
      isLoading: true
    })

    try {
      // 调用解析函数
      const result = await DouyinParser.parseVideoUrl(videoUrl)

      // 隐藏加载状态
      this.setData({
        isLoading: false
      })

      if (result.success) {
        // 解析成功，跳转到结果页面
        wx.navigateTo({
          url: `/pages/result/result?data=${encodeURIComponent(JSON.stringify(result.data))}`
        })
      } else {
        // 解析失败，显示错误信息
        wx.showToast({
          title: result.error,
          icon: 'none'
        })
      }
    } catch (error) {
      // 隐藏加载状态
      this.setData({
        isLoading: false
      })

      // 显示错误信息
      wx.showToast({
        title: error.message || '解析失败',
        icon: 'none'
      })
    }
  }
})