import formidable from "formidable";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// 关闭 Next.js 默认 bodyParser，启用 formidable
export const config = {
  api: {
    bodyParser: false,
  },
};

// 配置 Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const form = formidable({
        multiples: false, // 一次一个文件
        uploadDir: "/tmp", // 临时目录
        keepExtensions: true,
      });

      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error("上传错误:", err);
          return res.status(500).json({ error: "文件上传失败" });
        }

        const file = files.file;
        if (!file) {
          return res.status(400).json({ error: "未检测到上传的文件" });
        }

        try {
          // 上传到 Cloudinary
          const result = await cloudinary.uploader.upload(file.filepath, {
            resource_type: "auto", // 自动检测文件类型（图片/视频）
            folder: "ybam-ar", // Cloudinary 文件夹
          });

          // 删除临时文件
          fs.unlinkSync(file.filepath);

          return res.status(200).json({
            success: true,
            url: result.secure_url,
            public_id: result.public_id,
          });
        } catch (cloudErr) {
          console.error("Cloudinary 上传失败:", cloudErr);
          return res.status(500).json({ error: "上传到 Cloudinary 失败" });
        }
      });
    } catch (error) {
      console.error("处理上传失败:", error);
      return res.status(500).json({ error: "服务器错误" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).json({ error: "Method not allowed" });
  }
}
