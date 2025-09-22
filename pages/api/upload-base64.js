import { uploadBase64Files } from './upload';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const { files } = req.body;

    if (!files || !files.originalImage || !files.arVideo) {
      return res.status(400).json({
        success: false,
        error: '缺少必要的文件'
      });
    }

    const uploadResult = await uploadBase64Files(files);

    if (uploadResult.success) {
      res.status(200).json({
        success: true,
        message: '所有文件上传成功',
        data: uploadResult.data
      });
    } else {
      res.status(500).json({
        success: false,
        error: uploadResult.error
      });
    }

  } catch (error) {
    console.error('文件上传错误:', error);
    res.status(500).json({
      success: false,
      error: '文件上传失败',
      message: error.message
    });
  }
}
