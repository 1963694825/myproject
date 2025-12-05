Page({
  data: {
    videoInfo: null,
    isLoading: false,
    showPlayer: false
  },

  onLoad(options) {
    // 页面加载时解析传入的数据
    if (options.data) {
      try {
        const videoInfo = JSON.parse(decodeURIComponent(options.data))
        this.setData({
          videoInfo
        })
      } catch (error) {
        console.error('解析数据失败:', error)
        wx.showToast({
          title: '数据解析失败',
          icon: 'none'
        })
      }
    }
  },

  // 返回首页
  goBack() {
    wx.navigateBack()
  },

  // 复制无水印链接
  copyLink() {
    const { noWatermarkUrl } = this.data.videoInfo
    if (!noWatermarkUrl) {
      wx.showToast({
        title: '视频链接不存在',
        icon: 'none'
      })
      return
    }
    
    wx.setClipboardData({
      data: noWatermarkUrl,
      success() {
        wx.showToast({
          title: '链接已复制',
          icon: 'success'
        })
      },
      fail() {
        wx.showToast({
          title: '复制失败',
          icon: 'none'
        })
      }
    })
  },

  // 播放视频
  playVideo() {
    const { noWatermarkUrl } = this.data.videoInfo
    if (!noWatermarkUrl) {
      wx.showToast({
        title: '视频链接不存在',
        icon: 'none'
      })
      return
    }
    
    this.setData({
      showPlayer: true
    })
    
    // 延迟获取视频上下文并播放
    setTimeout(() => {
      const videoContext = wx.createVideoContext('videoPlayer', this)
      videoContext.play()
    }, 100)
  },

  // 关闭播放器
  closePlayer() {
    // 暂停视频播放
    const videoContext = wx.createVideoContext('videoPlayer', this)
    videoContext.pause()
    
    this.setData({
      showPlayer: false
    })
  },

  // 视频播放错误处理
  onVideoError(e) {
    console.error('视频播放出错:', e)
    wx.showToast({
      title: '视频播放出错',
      icon: 'none'
    })
  },

  // 视频播放完成
  onVideoEnded() {
    wx.showToast({
      title: '视频播放完毕',
      icon: 'none'
    })
  },

  // 下载视频
  downloadVideo() {
    const { noWatermarkUrl } = this.data.videoInfo
    
    if (!noWatermarkUrl) {
      wx.showToast({
        title: '视频链接不存在',
        icon: 'none'
      })
      return
    }

    // 显示加载提示
    this.setData({
      isLoading: true
    })

    // 下载文件
    wx.downloadFile({
      url: noWatermarkUrl,
      success: (res) => {
        if (res.statusCode === 200) {
          // 保存到相册
          wx.saveVideoToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              wx.showToast({
                title: '保存成功',
                icon: 'success'
              })
            },
            fail: (saveErr) => {
              console.error('保存失败:', saveErr);
              wx.showToast({
                title: '保存失败',
                icon: 'none'
              })
            },
            complete: () => {
              this.setData({
                isLoading: false
              })
            }
          })
        } else {
          wx.showToast({
            title: '下载失败',
            icon: 'none'
          })
          this.setData({
            isLoading: false
          })
        }
      },
      fail: (downloadErr) => {
        console.error('下载失败:', downloadErr);
        wx.showToast({
          title: '下载失败',
          icon: 'none'
        })
        this.setData({
          isLoading: false
        })
      }
    })
  }
})