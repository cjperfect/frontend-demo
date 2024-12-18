const express = require("express");
const cors = require("cors");
// 中间件，处理FormData对象的中间件
const multer = require("multer");
const fse = require("fs-extra");
const path = require("path");

const app = express();

// 解决跨域问题
app.use(cors());

// 使用 express.json() 来解析请求体中的其他字段
// 支持JSON格式的请求体
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadDir = "uploads/";

// 创建 uploads 目录（如果不存在的话）
if (!fse.existsSync(uploadDir)) {
  fse.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 存储到uploads目录
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 获取文件名和切片编号
    const { fileName, currentPart } = req.body;
    cb(null, `${fileName}.part-${currentPart}`);
  },
});

const upload = multer({ storage });

// upload.single("file") 表示存储FormData中名为"file"的文件
app.post("/upload", upload.single("file"), (req, res) => {
  const { fileName, totalPart, currentPart } = req.body;

  // 如果是最后一个切片，开始合并文件
  if (parseInt(totalPart) === parseInt(currentPart)) {
    mergeFileChunk(fileName, totalPart);
  }

  res.status(200).json({ message: `当前第${currentPart}切片上传完毕！！！` });
});

app.post("/merge", (req, res) => {
  const { fileName, totalChunk } = req.body;
  mergeFileChunk(fileName, totalChunk);
  res.status(200).json({ message: `合并完成！！！` });
});

async function mergeFileChunk(fileName, totalPart) {
  const writeStream = fse.createWriteStream(path.join(uploadDir, fileName));
  let partIndex = 1;

  while (partIndex <= totalPart) {
    const partFilePath = path.join(uploadDir, `${fileName}.part-${partIndex}`);
    if (fse.existsSync(partFilePath)) {
      const partStream = fse.createReadStream(partFilePath);
      partStream.pipe(writeStream, { end: false });

      // 等待当前切片完成后，再处理下一个切片
      await new Promise((resolve, reject) => {
        partStream.on("end", () => {
          // 此切片已经读取了（或者说已经合并完成），需要删除
          fse.unlinkSync(partFilePath);
          resolve();
        });

        partStream.on("error", reject);
      });

      partIndex++;
    } else {
      // 某个切片不存在，跳出循环
      break;
    }
  }

  // 合并完成
  writeStream.end(() => {
    console.log("合并完成！！！");
  });
}

app.listen(5000);
