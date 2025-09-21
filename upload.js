export default async function handler(req, res) {
  res.status(501).json({ 
    error: '文件上传功能暂不可用',
    message: '请使用外部图片和视频URL'
  });
}
