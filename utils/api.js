// 引入工具函数
const { formatFileSize, formatDuration } = require('./util.js');

// 抖音视频解析工具类
class DouyinParser {
  // 解析抖音视频链接获取无水印地址
  static async parseVideoUrl(videoUrl) {
    try {
      // 预处理URL，确保有协议
      const processedUrl = this.preprocessUrl(videoUrl);
      
      // 验证是否为抖音链接
      if (!this.isValidDouyinUrl(processedUrl)) {
        throw new Error('请输入抖音平台的视频链接');
      }
      
      // 1. 提取视频ID
      const videoId = this.extractVideoId(processedUrl);
      
      if (!videoId) {
        throw new Error('无法提取视频ID，请检查链接是否正确');
      }
      
      // 2. 调用TikHub解析接口
      const result = await this.callTikHubParseApi(processedUrl, videoId);
      
      // 验证返回数据
      if (!result) {
        throw new Error('解析失败，未收到有效响应');
      }
      
      // 检查是否包含错误信息
      if (result.error) {
        throw new Error(result.error);
      }
      
      // 检查是否获取到无水印视频地址
      if (!result.noWatermarkUrl) {
        throw new Error('解析失败，未能获取到无水印视频地址');
      }
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // 预处理URL，确保有协议
  static preprocessUrl(url) {
    if (!url) return '';
    
    // 如果没有协议，添加默认的https协议
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // 检查是否是抖音域名，使用https
      if (url.includes('douyin.com') || url.includes('iesdouyin.com')) {
        return 'https://' + url;
      }
      // 其他情况也默认使用https
      return 'https://' + url;
    }
    
    return url;
  }
  
  // 提取视频ID
  static extractVideoId(url) {
    // 抖音链接格式示例：
    // https://v.douyin.com/xxxxxx/
    // https://www.iesdouyin.com/share/video/xxxxxx/
    // https://douyin.com/video/xxxxxx/
    
    const patterns = [
      /v\.douyin\.com\/([a-zA-Z0-9]+)/,
      /(?:www\.)?iesdouyin\.com\/share\/video\/(\d+)/,
      /(?:www\.)?douyin\.com\/video\/(\d+)/,
      /(?:www\.)?douyin\.com\/share\/video\/(\d+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  }
  
  // 调用TikHub解析接口
  static async callTikHubParseApi(originalUrl, videoId) {
    // TikHub API密钥
    const apiKey = 'lMkSMcET9gqlp2iwN46Yxi3QDymwSaR56SbKv2nYVNiis3u8O3KJZxG5aA==';
    
    // 使用正确的API端点和参数
    // 根据测试结果，使用share_url参数的端点可以正常工作
    const apiUrl = `https://api.tikhub.io/api/v1/douyin/web/fetch_one_video_by_share_url`;
    const params = { share_url: originalUrl };
    
    try {
      const result = await this.makeRequestWithParams(apiUrl, params, apiKey);
      return result;
    } catch (error) {
      throw error;
    }
  }
  
  // 发起带参数的HTTP请求
  static makeRequestWithParams(apiUrl, params, apiKey) {
    // 构造查询字符串
    const queryString = Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    const fullUrl = `${apiUrl}${queryString ? '?' + queryString : ''}`;
    
    return new Promise((resolve, reject) => {
      wx.request({
        url: fullUrl,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data) {
            // 根据TikHub API的响应格式处理数据
            const data = res.data;
            
            // 检查是否有错误信息
            if (data.error) {
              reject(new Error(data.error.message || '解析失败'));
              return;
            }
            
            // 解析成功，构造返回数据
            // 根据实际API响应结构调整字段映射
            const resultData = this.parseApiResponse(data);
            
            resolve(resultData);
          } else if (res.statusCode === 404) {
            reject(new Error(`API端点不存在: ${fullUrl}`));
          } else if (res.statusCode === 401) {
            reject(new Error('API密钥无效或过期'));
          } else if (res.statusCode === 422) {
            // 422错误通常包含详细的验证错误信息
            let errorMsg = '请求参数验证失败';
            if (res.data && res.data.detail) {
              if (Array.isArray(res.data.detail)) {
                errorMsg = res.data.detail.map(item => {
                  if (typeof item === 'object') {
                    // 更详细地显示字段缺失信息
                    if (item.type === 'missing' && item.loc) {
                      return `缺少必需字段: ${item.loc.join('.')}`;
                    }
                    return item.msg || item.loc || JSON.stringify(item);
                  }
                  return item;
                }).join(', ');
              } else {
                errorMsg = res.data.detail;
              }
            }
            reject(new Error(`参数验证错误: ${errorMsg}`));
          } else if (res.statusCode === 429) {
            reject(new Error('请求过于频繁，请稍后再试'));
          } else if (res.statusCode >= 500) {
            reject(new Error(`服务器错误，状态码: ${res.statusCode}`));
          } else {
            reject(new Error(`API请求失败，状态码: ${res.statusCode}`));
          }
        },
        fail: (err) => {
          reject(new Error(`网络请求失败: ${err.errMsg}`));
        }
      });
    });
  }
  
  // 解析API响应数据
  static parseApiResponse(data) {
    // 初始化结果对象
    const resultData = {
      videoId: '',
      originUrl: '',
      noWatermarkUrl: '',
      coverImage: '',
      title: '',
      duration: 0,
      size: '',
      rawData: data
    };
    
    try {
      // 提取视频ID
      if (data.data && data.data.aweme_detail && data.data.aweme_detail.aweme_id) {
        resultData.videoId = data.data.aweme_detail.aweme_id;
      } else if (data.aweme_id) {
        resultData.videoId = data.aweme_id;
      } else if (data.id) {
        resultData.videoId = data.id;
      }
      
      // 提取标题
      if (data.data && data.data.aweme_detail && data.data.aweme_detail.desc) {
        resultData.title = data.data.aweme_detail.desc;
      } else if (data.title) {
        resultData.title = data.title;
      } else if (data.desc) {
        resultData.title = data.desc;
      }
      
      // 提取原始链接
      if (data.data && data.data.aweme_detail && data.data.aweme_detail.share_url) {
        resultData.originUrl = data.data.aweme_detail.share_url;
      } else if (data.share_url) {
        resultData.originUrl = data.share_url;
      } else if (data.url) {
        resultData.originUrl = data.url;
      }
      
      // 提取无水印视频链接
      if (data.data && data.data.aweme_detail && data.data.aweme_detail.video) {
        const video = data.data.aweme_detail.video;
        
        // 尝试从play_addr.url_list获取
        if (video.play_addr && video.play_addr.url_list && video.play_addr.url_list.length > 0) {
          resultData.noWatermarkUrl = video.play_addr.url_list[0];
        } 
        // 尝试从play_addr_h264.url_list获取
        else if (video.play_addr_h264 && video.play_addr_h264.url_list && video.play_addr_h264.url_list.length > 0) {
          resultData.noWatermarkUrl = video.play_addr_h264.url_list[0];
        }
        // 尝试从bit_rate中获取
        else if (video.bit_rate && Array.isArray(video.bit_rate) && video.bit_rate.length > 0) {
          for (const bitRate of video.bit_rate) {
            if (bitRate.play_addr && bitRate.play_addr.url_list && bitRate.play_addr.url_list.length > 0) {
              resultData.noWatermarkUrl = bitRate.play_addr.url_list[0];
              break;
            }
          }
        }
      }
      
      // 如果还没有找到无水印链接，尝试从旧字段获取
      if (!resultData.noWatermarkUrl) {
        resultData.noWatermarkUrl = data.video_url || 
                                   data.video_no_watermark_url_hd || 
                                   data.video_no_watermark_url || 
                                   data.download_url || 
                                   data.url || 
                                   data.video_download_url || 
                                   data.play_url || 
                                   data.data?.video_download_url || '';
      }
      
      // 提取封面图片
      if (data.data && data.data.aweme_detail && data.data.aweme_detail.video && data.data.aweme_detail.video.cover) {
        const cover = data.data.aweme_detail.video.cover;
        if (cover.url_list && cover.url_list.length > 0) {
          resultData.coverImage = cover.url_list[0];
        }
      } else {
        resultData.coverImage = data.cover_url || data.thumbnail_url || data.cover || data.video_cover_url || '';
      }
      
      // 提取视频时长
      if (data.data && data.data.aweme_detail && data.data.aweme_detail.video && data.data.aweme_detail.video.duration) {
        resultData.duration = data.data.aweme_detail.video.duration;
      } else {
        resultData.duration = data.duration || data.video_duration || 0;
      }
      
      // 提取视频大小
      if (data.data && data.data.aweme_detail && data.data.aweme_detail.video && data.data.aweme_detail.video.play_addr && data.data.aweme_detail.video.play_addr.data_size) {
        resultData.size = formatFileSize(data.data.aweme_detail.video.play_addr.data_size);
      } else {
        resultData.size = data.video_size ? formatFileSize(data.video_size) : '';
      }
    } catch (error) {
      console.error('解析API响应数据时出错:', error);
    }
    
    return resultData;
  }
  
  // 发起HTTP请求（保留原有方法以兼容性）
  static makeRequest(apiUrl, apiKey) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: apiUrl,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data) {
            // 根据TikHub API的响应格式处理数据
            const data = res.data;
            
            // 检查是否有错误信息
            if (data.error) {
              reject(new Error(data.error.message || '解析失败'));
              return;
            }
            
            // 解析成功，构造返回数据
            // 根据实际API响应结构调整字段映射
            const resultData = this.parseApiResponse(data);
            
            resolve(resultData);
          } else if (res.statusCode === 404) {
            reject(new Error(`API端点不存在: ${apiUrl}`));
          } else if (res.statusCode === 401) {
            reject(new Error('API密钥无效或过期'));
          } else if (res.statusCode === 422) {
            // 422错误通常包含详细的验证错误信息
            let errorMsg = '请求参数验证失败';
            if (res.data && res.data.detail) {
              if (Array.isArray(res.data.detail)) {
                errorMsg = res.data.detail.map(item => {
                  if (typeof item === 'object') {
                    // 更详细地显示字段缺失信息
                    if (item.type === 'missing' && item.loc) {
                      return `缺少必需字段: ${item.loc.join('.')}`;
                    }
                    return item.msg || item.loc || JSON.stringify(item);
                  }
                  return item;
                }).join(', ');
              } else {
                errorMsg = res.data.detail;
              }
            }
            reject(new Error(`参数验证错误: ${errorMsg}`));
          } else if (res.statusCode === 429) {
            reject(new Error('请求过于频繁，请稍后再试'));
          } else if (res.statusCode >= 500) {
            reject(new Error(`服务器错误，状态码: ${res.statusCode}`));
          } else {
            reject(new Error(`API请求失败，状态码: ${res.statusCode}`));
          }
        },
        fail: (err) => {
          reject(new Error(`网络请求失败: ${err.errMsg}`));
        }
      });
    });
  }
  
  // 验证链接是否为有效的抖音链接
  static isValidDouyinUrl(url) {
    if (!url) return false;
    
    // 先预处理URL确保有协议
    const processedUrl = this.preprocessUrl(url);
    
    const douyinPatterns = [
      /douyin\.com/,
      /iesdouyin\.com/
    ];
    
    return douyinPatterns.some(pattern => pattern.test(processedUrl));
  }
  
  // 获取视频信息（不下载）
  static async getVideoInfo(videoUrl) {
    const result = await this.parseVideoUrl(videoUrl);
    
    if (result.success) {
      // 只返回基本信息，不包含下载链接
      const { title, coverImage, duration, size } = result.data;
      return {
        success: true,
        data: { title, coverImage, duration: duration ? formatDuration(duration) : '', size }
      };
    } else {
      return result;
    }
  }
}

module.exports = DouyinParser;