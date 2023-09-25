import puppeteer from 'puppeteer';
import * as fs from "fs"
import * as path from "path"

//获取最新价，如当前是 8 点，需要指定 8 点59 分56 秒获取最新价
const getLastCoverPriceMinuteLength = 59 // 指定当前小时的第几分钟获取最新价格，
const coverMinute = '00' //指定第几分钟点击平仓按钮
// 两个数字需要联动

const getLastCoverPriceSecondsLength = 56//指定当前小时的第几秒获取最新价格，

// 设定时间点击平仓，如当前是 8 点，需要指定 8 点 00 分00 秒300 毫秒触发平仓
//
const coverHours00 = '00'//指定第几时点击平仓按钮，如 00 时
const coverHours08 = '08'//指定第几时点击平仓按钮，如 08 时
const coverHours16 = '16'//指定第几时点击平仓按钮，如 16 时

const coverMinSeconds = '01'//在第1秒之后持续点击平仓
const coverMaxSeconds = '10'//在第10秒之前持续点击平仓
const coverMillSeconds = 300// 大于多少毫秒再开启点击平仓

const currentCoverHours = coverHours08

console.log("费率结算时间：" + currentCoverHours + "时" + coverMinute + "分")

import { fileURLToPath } from 'url';
import { dirname } from 'path';

// 获取当前文件的URL
const currentFileUrl = import.meta.url;

// 将URL转换为文件路径
const currentFilePath = fileURLToPath(currentFileUrl);

// 使用字符串操作获取文件名（不包括路径）
const currentFilename = currentFilePath.split('/').pop();

// 去除文件名的扩展名
const filenameWithoutExtension = currentFilename.split('.').slice(0, -1).join('.');

console.log(' 文件名' + filenameWithoutExtension); // 输出当前文件的文件名（不包括路径和后缀）

const main = async () => {

    const targetTime = setLastCoverPriceForNearestHourTimestamp();
    // 使用 toLocaleString 方法格式化为日期和时间字符串
    const formattedTime = new Date(targetTime).toLocaleString();
    console.log(`目标时间是：${formattedTime}`);


    const browser1 = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        userDataDir: path.resolve(process.cwd(), filenameWithoutExtension),
        args: [
            '--proxy-server=socks5://127.0.0.1:1080',
        ],
    });
    const page1 = await browser1.newPage();


    //判断是否登录
    await page1.goto('https://www.mexc.com/zh-CN/user'); // 将URL替换为您要检查的页面

    // 使用page.$函数来查找包含用户信息的元素，将选择器替换为实际的选择器
    const userEle = '#__next > div.user-menu_wrapper__zYCrt > div.overview_component_overview__vZq0j > div.content-box > div.left > div.overview_overview_box__eL8CH.overview_identification__1k3m4.overview_identificationOld__8NQCD > div:nth-child(1) > div > h4'


    //检测元素是否显示的逻辑
    const isElementVisible = await page1.waitForSelector(userEle, { viisible: true, timeout: 5000 })
        .then(() => true)
        .catch(() => false);
    if (isElementVisible) {
        console.log(' 已登录');
    } else {
        console.log('未登录');
        await page1.goto('https://www.mexc.com/zh-CN/login', { 'timeout': 1000 * 60 });
        // 等待找到登录页面
        await page1.waitForSelector("#__next > div.login_loginBox__kVwMC > div.login_wrapper__aEuqp > div > div.login_left__f0lLE > div > div > div:nth-child(2)", { timeout: 999999 })

        //找到二维码
        const data = await page1.evaluate(() => {
            return document.querySelector('#__next > div.login_loginBox__kVwMC > div.login_wrapper__aEuqp > div > div.qrcode-login_wrapper__agi1J.qrcode-login_component_qr_code__cVz9c > div.qrcode-login_qrcodeWrapper__sOsyE > div > canvas').toDataURL();
        });
        if (data) {
            const imgData = data.replace(/^data:image\/\w+;base64,/, "");
            var dataBuffer = Buffer.from(imgData, 'base64');
            fs.writeFileSync("image.png", dataBuffer)
            console.log("二维码保存成功 扫码登录", "image.png")
        }
        //一直等待找到元素，直至超时
        await page1.waitForSelector(userEle, { viisible: true, timeout: 99999 })
    }

    await page1.waitForTimeout(1500); // 3秒延时

    await page1.goto('https://futures.mexc.com/exchange/BTC_USDT', { 'timeout': 1000 * 60 });
    console.log("跳转合约页面完成")


    // await page.waitForSelector("#rc-tabs-0-tab-4", { timeout: 999999 })
    // await page.click("#rc-tabs-0-tab-4")
    // console.log("点击当前委托")

    getCurrentTimestamp('开始倒计时的时间');
    // 计算距离目标时间的时间间隔（以秒为单位）
    const timeToWait = getTimetoWait(targetTime)
    var timeRemainingInSeconds = Math.floor(timeToWait / 1000);
    // 创建定时器，每秒执行一次
    const intervalId = setInterval(function () {

        // 打印时间间隔
        console.log(`目标时间是：${formattedTime}`);
        console.log(`还有 ${timeRemainingInSeconds} 秒`);
        // 获取当前时间（以毫秒为单位）
        const currentDownTime = new Date().getTime();
        // 如果当前时间达到或超过目标时间，停止定时器
        if (currentDownTime >= targetTime) {
            clearInterval(intervalId);
            console.log('已到达目标时间！');
        }
        timeRemainingInSeconds = timeRemainingInSeconds - 1;
    }, 1000); // 每秒执行一次
    getCurrentTimestamp('倒计时完成的时间');
    await page1.waitForTimeout(timeToWait); // 等到 整点前55 秒再开始
    getCurrentTimestamp('page等待完成时间');
    // 定义要点击的元素选择器
    // 撤单按钮
    const elementSelectorCancle = '#mexc-web-inspection-futures-exchange-current-entrust > div > div.pages-contract-handlerecord-position-oneClickWrapper';

    //持仓量
    const SelectorOpenCountText = '#mexc-web-inspection-futures-exchange-current-position > div > div.components-arrowbox-index-scrollWrapper > div > div > div > div > div > div > div > table > tbody > tr > td:nth-child(2) > span'

    // 强平价
    const SelectorCoverPriceText = '#mexc-web-inspection-futures-exchange-current-position > div > div.components-arrowbox-index-scrollWrapper > div > div > div > div > div > div > div > table > tbody > tr > td:nth-child(6) > span'

    //卖出价格输入框
    const SelectorSellPriceInput = '#rc_select_1'

    //百分比输入框
    const countInput = '#rc_select_2'

    //平多按钮
    const coverLongBtn = '#mexc-web-inspection-futures-exchange-current-position > div > div.components-arrowbox-index-scrollWrapper > div > div > div > div > div > div > div > table > tbody > tr > td:nth-child(12) > div > div > button:nth-child(4)'

    await page1.waitForSelector(SelectorOpenCountText, { timeout: 999999 })
    var openCountTextEnd = await page1.$eval(SelectorOpenCountText, el => el.textContent);


    const separator = " ";
    const openCountResult = openCountTextEnd.split(separator)[0];

    console.log("持仓量" + openCountResult)

    // 获取强平价
    await page1.waitForSelector(SelectorCoverPriceText, { timeout: 999999 })
    var coverPriceTextEnd = +await page1.$eval(SelectorCoverPriceText, el => el.textContent);
    console.log("coverPriceTextEnd" + coverPriceTextEnd)

    // 将数字加上自己小数点后的最小单位 作为卖出价
    var sellPriceTextEnd = coverPriceTextEnd + getMinUint(coverPriceTextEnd)

    console.log(sellPriceTextEnd); // 输出 7.9（如果有两位小数）


    // 在输入框中填充文本
    await page1.waitForSelector(SelectorSellPriceInput, { timeout: 999999 })
    console.log(" 找到 ：sellPriceInput")
    await page1.type(SelectorSellPriceInput, String(sellPriceTextEnd));
    await page1.type(countInput, openCountResult)


    getCurrentTimestamp('获取好定价等到点击平仓');
    // 开始定时任务多万
    const interval = setInterval(async () => {
        const currentTime = new Date();
        // 获取当前小时和毫秒
        const hours = String(currentTime.getHours()).padStart(2, '0');
        const minutes = String(currentTime.getMinutes()).padStart(2, '0');
        const seconds = String(currentTime.getSeconds()).padStart(2, '0');
        const milliseconds = String(currentTime.getMilliseconds()).padStart(3, '0');
        // 格式化为日期和时间字符串（包括毫秒）
        const formattedTime = `${hours}:${minutes}:${seconds}.${milliseconds}`;

        console.log("当前时间：" + formattedTime)

        //大于整点的 300 毫秒资金费率才生效
        const is00 = (hours == coverHours00 && minutes == coverMinute && seconds <= coverMaxSeconds && milliseconds >= coverMillSeconds)
        const is08 = (hours == coverHours08 && minutes == coverMinute && seconds <= coverMaxSeconds && milliseconds >= coverMillSeconds)
        const is16 = (hours == coverHours16 && minutes == coverMinute && seconds <= coverMaxSeconds && milliseconds >= coverMillSeconds)
        // 判断是否大于指定时间
        if (is00 || is08 || is16) {
            //  平仓
            await page1.waitForSelector(coverLongBtn, { timeout: 999999 })
            console.log(" 找到 coverLongBtn")
            // await page.waitForTimeout(2000); // 3秒延时
            await page1.click(coverLongBtn)
            getCurrentTimestamp('点击完平仓');
            console.log(" 找到 coverLongBtn  平仓")
        }
        else {
            if (minutes == coverMinute && seconds > coverMaxSeconds) { clearInterval(interval) }
            console.log("不进入");
        }

        // // 一键撤单
        // if (cancleTimes.includes(currentTime)) {
        //     // 当当前时间匹配目标时间之一时，执行点击操作
        //     //   await page.waitForSelector(elementSelectorCancle, { timeout: 999999 })
        //     await page.click(elementSelectorCancle)
        //     console.log("点击一键撤销")
        // }

    }, 300); // 每秒检查一次


    // 等待一段时间后关闭浏览器
    //   setTimeout(async () => {
    //     clearInterval(interval); // 清除定时任务
    //     await browser.close(); // 关闭浏览器
    //   }, 86400000); // 等待一天（24小时）后关闭
}


// 指定最近的整点前多少秒来获取最新价格
function setLastCoverPriceForNearestHourTimestamp() {
    const now = new Date();
    const nearestHourTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        now.getHours(), // 下一个小时
        0, // 分钟
        0, // 秒
        0 // 毫秒
    );
    //如希望 8 点前 30 分 55 秒，则minuteLength=29，secondsLength=5
    const totalLength = 60 * getLastCoverPriceMinuteLength + getLastCoverPriceSecondsLength
    const nearestHourTimestamp = nearestHourTime.getTime() + 1000 * totalLength; // 转换为时间戳

    return nearestHourTimestamp;
}

//格式化输出当前时间戳
function getCurrentTimestamp(title) {
    const currentTime = new Date();
    // 获取当前小时和毫秒
    const hours = String(currentTime.getHours()).padStart(2, '0');
    const minutes = String(currentTime.getMinutes()).padStart(2, '0');
    const seconds = String(currentTime.getSeconds()).padStart(2, '0');
    const milliseconds = String(currentTime.getMilliseconds()).padStart(3, '0');
    // 格式化为日期和时间字符串（包括毫秒）
    const formattedTime = `${hours}:${minutes}:${seconds}.${milliseconds}`;
    console.log(title + formattedTime)
    return formattedTime;

}

// 获取最小单位+1 作为卖出价
function getMinUint(getCurrentCoverPrice) {
    const originalNumber = getCurrentCoverPrice;
    const numberString = originalNumber.toString();
    console.log('numberString'+numberString)

    const decimalIndex = numberString.indexOf('.');
    const decimalPlaces = decimalIndex === -1 ? 0 : numberString.length - decimalIndex - 1;

    // 计算最小单位
    const minimumUnit = 1 / Math.pow(10, decimalPlaces);
    console.log('minimumUnit'+minimumUnit)
    return minimumUnit
}

//目标时间减去当前时间还剩多少秒倒计时
function getTimetoWait(targetTime) {
    const currentTime = new Date();
    const timeToWait = targetTime - currentTime;
    return timeToWait;

}

main()