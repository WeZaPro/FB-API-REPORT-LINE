const express = require("express");
const axios = require("axios");
require("dotenv").config();
//const dt = new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" });
const _time = new Date().toLocaleTimeString("en-US", {
  timeZone: "Asia/Bangkok",
});
const _date = new Date().toLocaleDateString("en-US", {
  timeZone: "Asia/Bangkok",
});
const ChartJsImage = require("chartjs-to-image");
var lineNotifyToken = process.env.lineNotifyToken;
const fb_act = process.env.facebook_acc_id; //business ads id
const fb_fields =
  "campaign_name,adset_name,ad_name,reach, impressions,clicks,cpc,ctr,actions, conversions";
const fb_total_messaging_connection =
  "onsite_conversion.total_messaging_connection";
const fb_accessToken = process.env.FB_ACCESS_TOKEN;
const _campaign_name_filter =
  "Run-Cam-การมีส่วนร่วม-ข้อความ-PageView-จากWeb-ข้อความ-ข้อมูลจากWeb";
const _last_7d = "last_7d";
const _today = "today";
const _yesterday = "yesterday";

const app = express();

// cron-job
const cron = require("node-cron");
const moment = require("moment-timezone");
//yesterday
let objectDate = new Date();
let today = objectDate.getDate();
let day = objectDate.getDate() - 1;
let lastSevenDay = objectDate.getDate() - 7;
let month = objectDate.getMonth();
let year = objectDate.getFullYear();
let yesterday = day + "/" + month + "/" + year;
let _last_sevenDay = lastSevenDay + "/" + month + "/" + year;
let rptToday = today + "/" + month + "/" + year;
console.log(yesterday);
console.log(_last_sevenDay);
console.log(rptToday);

// cron.schedule("*/20 * * * * *", async () => {
//   console.log("------------------------");
//   await getFbYesterdaySendToLine();
//   await getFbSevenDaySendToLine();
//   await getFbTodaySendToLine();
//   console.log("Running task at very 1 hour==>", _date);
// });

// Create a cronjob that runs every hour
cron.schedule("0 * * * *", async () => {
  const time = moment().tz("Asia/Bangkok").format("HH:mm");
  if (time === "10:00") {
    console.log("------------------------");
    await getFbYesterdaySendToLine();
    await getFbSevenDaySendToLine();
  } else if (time === "22:00") {
    console.log("------------------------");
    await getFbTodaySendToLine();
  }
});

app.get("/", (req, res) => {
  res.send("WELCOME");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// line
async function sendImageToLineNotify(imgUrl, dt, _dateDetail) {
  const _message = `Send Report ${_dateDetail} @ ${dt}`;
  const _imageThumbnail = imgUrl;
  const _imageFullsize = imgUrl;

  let data = JSON.stringify({
    payload: {
      message: "TEST 1234-6789",
      imageFile: imgUrl,
    },
  });
  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: `https://notify-api.line.me/api/notify?message=${_message}&imageThumbnail=${_imageThumbnail}&imageFullsize=${_imageFullsize}`,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lineNotifyToken}`,
    },
    data: data,
  };

  await axios
    .request(config)
    .then((response) => {
      console.log(JSON.stringify(response.data));
    })
    .catch((error) => {
      console.log(error);
    });
}

// Report Message Yesterday
async function getFbYesterdaySendToLine() {
  // app.get("/yesterday", async (req, res) => {
  const time = moment().tz("Asia/Bangkok").format("HH:mm");

  const token = fb_accessToken;
  let arr = [];
  let dataPush = [];
  let dataPush2 = [];
  let config = {
    method: "get",
    maxBodyLength: Infinity,
    url:
      "https://graph.facebook.com/v19.0/" +
      fb_act +
      "/insights?sort=reach_descending&level=ad&fields=" +
      fb_fields +
      "&access_token=" +
      token +
      "&date_preset=" +
      _yesterday,
    headers: {
      Cookie: "ps_l=0; ps_n=0",
    },
  };

  await axios
    .request(config)
    .then((response) => {
      arr = response.data.data;

      //
      Object.keys(arr).forEach((key) => {
        if (arr[key].campaign_name == _campaign_name_filter) {
          dataPush.push({
            campaign_name: arr[key].campaign_name,
            adset_name: arr[key].adset_name,
            impressions: arr[key].impressions,
            ad_name: arr[key].ad_name,
            messageCount: arr[key].actions,
          });
        }
      });
      //console.log("dataPush--> ", dataPush);
      dataPush.forEach((e, i) => {
        if (e.messageCount != undefined) {
          dataPush2.push(e);
        }
      });

      const dataPush3 = [];
      dataPush2.forEach((e, i) => {
        //console.log("dataPush2 --> ", e);
        dataPush3.push(e);
      });

      const chartData = [];
      dataPush3.forEach((e, i) => {
        e.messageCount.forEach((ee, ii) => {
          if (
            ee.action_type === "onsite_conversion.total_messaging_connection"
          ) {
            chartData.push({
              label: e.ad_name,
              data: ee.value,
            });
          }
        });
      });
      const _data = [];
      const _label = [];

      chartData.forEach((eeee, iiii) => {
        _label.push(eeee.label);
        _data.push(eeee.data);
      });

      // gen chart *********************

      const myChart = new ChartJsImage();
      myChart.setConfig({
        //type: "bar",
        type: "doughnut",
        data: {
          labels: _label,
          datasets: [
            {
              label: "My First Dataset",
              data: _data,
              backgroundColor: [
                "rgb(255, 128, 0)",
                "rgb(0,255, 128)",
                "rgb(255, 102, 255)",
                "rgb(255, 99, 132)",
                "rgb(54, 162, 235)",
                "rgb(255, 205, 86)",
              ],
              hoverOffset: 2,
            },
          ],
        },
        options: {
          title: {
            display: true,
            text: " รายงานจำนวนข้อความ เมื่อวาน | " + yesterday, //+ ":" + time,
          },
        },
      });

      myChart.toFile("./tmp/FbChartReportYesterday.png");

      myChart.getShortUrl().then((short_url_image) => {
        console.log("short_url_image--> ", short_url_image);
        // line send
        sendImageToLineNotify(short_url_image, yesterday, "Yesterday");
      });

      // End gen chart *********************
    })
    .catch((error) => {
      console.log(error);
    });

  //res.send("YESTERDAY");
  // });
}

async function getFbSevenDaySendToLine() {
  // app.get("/yesterday", async (req, res) => {
  const time = moment().tz("Asia/Bangkok").format("HH:mm");

  const token = fb_accessToken;
  let arr = [];
  let dataPush = [];
  let dataPush2 = [];
  let config = {
    method: "get",
    maxBodyLength: Infinity,
    url:
      "https://graph.facebook.com/v19.0/" +
      fb_act +
      "/insights?sort=reach_descending&level=ad&fields=" +
      fb_fields +
      "&access_token=" +
      token +
      "&date_preset=" +
      _last_7d,
    headers: {
      Cookie: "ps_l=0; ps_n=0",
    },
  };

  await axios
    .request(config)
    .then((response) => {
      arr = response.data.data;

      //
      Object.keys(arr).forEach((key) => {
        if (arr[key].campaign_name == _campaign_name_filter) {
          dataPush.push({
            campaign_name: arr[key].campaign_name,
            adset_name: arr[key].adset_name,
            impressions: arr[key].impressions,
            ad_name: arr[key].ad_name,
            messageCount: arr[key].actions,
          });
        }
      });
      //console.log("dataPush--> ", dataPush);
      dataPush.forEach((e, i) => {
        if (e.messageCount != undefined) {
          dataPush2.push(e);
        }
      });

      const dataPush3 = [];
      dataPush2.forEach((e, i) => {
        //console.log("dataPush2 --> ", e);
        dataPush3.push(e);
      });

      const chartData = [];
      dataPush3.forEach((e, i) => {
        e.messageCount.forEach((ee, ii) => {
          if (
            ee.action_type === "onsite_conversion.total_messaging_connection"
          ) {
            chartData.push({
              label: e.ad_name,
              data: ee.value,
            });
          }
        });
      });
      const _data = [];
      const _label = [];

      chartData.forEach((eeee, iiii) => {
        _label.push(eeee.label);
        _data.push(eeee.data);
      });

      // gen chart *********************

      const myChart = new ChartJsImage();
      myChart.setConfig({
        //type: "bar",
        type: "doughnut",
        data: {
          labels: _label,
          datasets: [
            {
              label: "My First Dataset",
              data: _data,
              backgroundColor: [
                "rgb(255, 128, 0)",
                "rgb(0,255, 128)",
                "rgb(255, 102, 255)",
                "rgb(255, 99, 132)",
                "rgb(54, 162, 235)",
                "rgb(255, 205, 86)",
              ],
              hoverOffset: 2,
            },
          ],
        },
        options: {
          title: {
            display: true,
            text:
              " รายงานจำนวนข้อความ 7วัน | " +
              _last_sevenDay +
              " - " +
              yesterday, //+ ":" + time,
          },
        },
      });
      let set7D = _last_sevenDay + " - " + yesterday;
      console.log("set7D--> ", set7D);
      myChart.toFile("./tmp/FbChartReportLast7D.png");

      myChart.getShortUrl().then((short_url_image) => {
        console.log("short_url_image--> ", short_url_image);
        // line send
        sendImageToLineNotify(short_url_image, set7D, "Last 7 day");
      });

      // End gen chart *********************
    })
    .catch((error) => {
      console.log(error);
    });

  //res.send("YESTERDAY");
  // });
}

async function getFbTodaySendToLine() {
  // app.get("/yesterday", async (req, res) => {
  const time = moment().tz("Asia/Bangkok").format("HH:mm");

  const token = fb_accessToken;
  let arr = [];
  let dataPush = [];
  let dataPush2 = [];
  let config = {
    method: "get",
    maxBodyLength: Infinity,
    url:
      "https://graph.facebook.com/v19.0/" +
      fb_act +
      "/insights?sort=reach_descending&level=ad&fields=" +
      fb_fields +
      "&access_token=" +
      token +
      "&date_preset=" +
      _today,
    headers: {
      Cookie: "ps_l=0; ps_n=0",
    },
  };

  await axios
    .request(config)
    .then((response) => {
      arr = response.data.data;

      //
      Object.keys(arr).forEach((key) => {
        if (arr[key].campaign_name == _campaign_name_filter) {
          dataPush.push({
            campaign_name: arr[key].campaign_name,
            adset_name: arr[key].adset_name,
            impressions: arr[key].impressions,
            ad_name: arr[key].ad_name,
            messageCount: arr[key].actions,
          });
        }
      });
      //console.log("dataPush--> ", dataPush);
      dataPush.forEach((e, i) => {
        if (e.messageCount != undefined) {
          dataPush2.push(e);
        }
      });

      const dataPush3 = [];
      dataPush2.forEach((e, i) => {
        //console.log("dataPush2 --> ", e);
        dataPush3.push(e);
      });

      const chartData = [];
      dataPush3.forEach((e, i) => {
        e.messageCount.forEach((ee, ii) => {
          if (
            ee.action_type === "onsite_conversion.total_messaging_connection"
          ) {
            chartData.push({
              label: e.ad_name,
              data: ee.value,
            });
          }
        });
      });
      const _data = [];
      const _label = [];

      chartData.forEach((eeee, iiii) => {
        _label.push(eeee.label);
        _data.push(eeee.data);
      });

      // gen chart *********************

      const myChart = new ChartJsImage();
      myChart.setConfig({
        //type: "bar",
        type: "doughnut",
        data: {
          labels: _label,
          datasets: [
            {
              label: "My First Dataset",
              data: _data,
              backgroundColor: [
                "rgb(255, 128, 0)",
                "rgb(0,255, 128)",
                "rgb(255, 102, 255)",
                "rgb(255, 99, 132)",
                "rgb(54, 162, 235)",
                "rgb(255, 205, 86)",
              ],
              hoverOffset: 2,
            },
          ],
        },
        options: {
          title: {
            display: true,
            text: " รายงานจำนวนข้อความ วันนี้ | " + rptToday, //+ ":" + time,
          },
        },
      });

      myChart.toFile("./tmp/FbChartReportToday.png");

      myChart.getShortUrl().then((short_url_image) => {
        console.log("short_url_image--> ", short_url_image);
        // line send
        sendImageToLineNotify(short_url_image, rptToday, "Today");
      });

      // End gen chart *********************
    })
    .catch((error) => {
      console.log(error);
    });

  //res.send("YESTERDAY");
  // });
}
