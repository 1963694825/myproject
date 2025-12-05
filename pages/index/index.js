// 引入抖音解析工具类
const DouyinParser = require('../../utils/api.js');

Page({
  data: {
    videoUrl: '',
    isLoading: false
  },

  onLoad() {
    // 页面加载时执行
  },

  // 输入框内容变化时触发
  onInput(e) {
    this.setData({
      videoUrl: e.detail.value
    })
  },

  // 解析视频链接
  async parseVideo() {
    const { videoUrl } = this.data
    
    // 检查链接是否为空
    if (!videoUrl) {
      wx.showToast({
        title: '请输入抖音视频链接',
        icon: 'none'
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