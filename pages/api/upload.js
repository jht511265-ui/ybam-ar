export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    // 临时解决方案：返回模拟的URL
    const timestamp = Date.now();
    
    const uploadResults = {
      originalImage: `https://picsum.photos/400/300?random=${timestamp}`,
      videoURL: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
      markerImage: `https://picsum.photos/400/300?random=${timestamp + 1}`
    };

    res.status(200).json({
      success: true,
      message: '文件上传模拟成功（演示模式）',
      data: uploadResults
    });

  } catch (error) {
    console.error('文件上传错误:', error);
    res.status(500).json({
      success: false,
      error: '文件上传失败',
      message: error.message
    });
  }
}
