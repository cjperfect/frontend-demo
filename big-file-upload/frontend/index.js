let input = document.getElementById("input");
let upload = document.getElementById("upload");
let files = {}; //创建一个文件对象
let chunkList = []; //存放切片的数组

/**
 * 创建切片
 * @param {*} file 大文件
 * @param {*} size 切片文件大小
 */
const createChunk = (file, size = 2 * 1024 * 1024) => {
  const chunkList = [];
  let cur = 0;

  // 切出大小为size的切片
  while (cur < file.size) {
    chunkList.push({
      file: file.slice(cur, cur + size),
    });

    cur += size;
  }

  return chunkList;
};

// 读取文件
input.addEventListener("change", (e) => {
  files = e.target.files[0];
  // 创建切片
  chunkList = createChunk(files);
});

// 数据处理，将切片数据包装成表单类型数据，才能传递给后端
const uploadFile = async (list) => {
  const requestList = list
    .map(({ file, fileName, chunkName, totalPart, currentPart }) => {
      // 创建表单类型数据，便于传给后端
      const formData = new FormData();
      formData.append("fileName", fileName);
      formData.append("chunkName", chunkName);
      formData.append("totalPart", totalPart);
      formData.append("currentPart", currentPart);
      formData.append("file", file);
      return formData;
    })
    .map((formData) => {
      return axios.post("http://localhost:5000/upload", formData, {
        headers: "Content-Type:application/x-www-form-urlencoded",
      });
    });
};

upload.addEventListener("click", () => {
  // 每个切片都需要做处理，添加相关信息，这个也就是需要上传的切片
  const uploadList = chunkList.map(({ file }, index) => {
    return {
      file, // 切片信息
      size: file.size, // 切片大小
      fileName: files.name, // 完整大文件的名称
      chunkName: `${files.name}-${index}`, // 切片名称
      totalPart: chunkList.length, // 总共有多少个chunk
      currentPart: index + 1, // 当前切片索引
    };
  });

  // 执行上传函数
  uploadFile(uploadList);
});
