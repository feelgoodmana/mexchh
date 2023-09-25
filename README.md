```
node v18 以上
```

```
const browser = await puppeteer.launch({
        headless: false,   //是否无头模式 false显示浏览器窗口方便调试 true隐藏浏览器窗口
        defaultViewport: null,
        args: [
            '--proxy-server=socks5://127.0.0.1:7777', // 代理设置 不需要删除此行
        ],
    });
```

```
cd mexchelper
npm install //or pnpm i 安装依赖
node index.js
//运行后获取的二维码保存再同目录 image.png
//网页超时设置 60s
```
