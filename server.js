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

// cron.schedule(
//   "0 */1 * * *", //ทุก 1 ชม.
//   //" 0 8-17 * * *", //เตือน 8-17 ทุกชม. 0 8-17 * * *
//   async () => {
//     console.log("------------------------");
//     await getFbYesterdaySendToLine(fb_accessToken); // report message today
//     await getFbSevenDaySendToLine(fb_accessToken); // report message 7d
//     console.log("Running task at very 1 hour==>", _date);
//   },
//   null,
//   true,
//   "Asia/Bangkok"
// );

// Create a cronjob that runs every hour
cron.schedule("0 * * * *", async () => {
  // Get the current time in the customer's time zone
  const time = moment().tz("Asia/Bangkok").format("HH:mm");
  // console.log("Check-----> Time ", time);

  // console.log("toLocaleTimeString->", _time);
  // console.log("toLocaleDateString->", _date);
  // Check if the time is 8:00 AM
  if (time === "09:00") {
    // Send out the email
    console.log("------------------------");
    // console.log("Start-----> schedule time ", time);
    await getFbYesterdaySendToLine(fb_accessToken, time); // report message yerterday
    await getFbSevenDaySendToLine(fb_accessToken, time); // report message 7d
  }
  // if (time === "23:00") {
  //   console.log("------------------------");
  //   await getFbTodaySendToLine(fb_accessToken, time); // report message today
  // }
});

app.get("/", (req, res) => {
  res.send("WELCOME");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// line
async function sendImageToLineNotify(imgUrl, time, _dateDetail) {
  const _message = `Send Report ${_dateDetail} @ ${_date} : ${time}`;
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
async function getFbYesterdaySendToLine(fb_accessToken, time) {
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
      // "&date_preset=last_7d",
      // "&date_preset=today",
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
            adset_name: arr[key].adset_name,
            impressions: arr[key].impressions,
            ad_name: arr[key].ad_name,
            messageCount: arr[key].actions, // "action_type": "onsite_conversion.total_messaging_connection"
          });

          arr[key].actions.forEach((getData, i) => {
            if (
              getData.action_type === fb_total_messaging_connection
              //"onsite_conversion.total_messaging_connection"
            ) {
              dataPush2.push({
                campaign_name: arr[key].campaign_name,
                adset_name: arr[key].adset_name,
                impressions: arr[key].impressions,
                ad_name: arr[key].ad_name,
                action_type: getData.action_type,
                value: getData.value,
              });
            }
            //

            //
          });
        }

        //
      });
      // console.log("dataPush2.length--> ", dataPush2.length);
      const arr_labels = [];

      dataPush2.forEach((e, i) => {
        arr_labels.push({
          _ad_name: e.ad_name,
          _value: e.value,
        });
      });
      console.log("dataPush2.length--> ", dataPush2.length);

      const arr_labels_chart = [];
      const arr_data_chart = [];
      dataPush2.forEach((e, i) => {
        //console.log("e--> ", e);
        arr_labels_chart.push(e.ad_name);
        arr_data_chart.push(e.value);
      });
      console.log("arr_labels_chart--> ", arr_labels_chart);

      // gen chart *********************
      const myChart = new ChartJsImage();
      myChart.setConfig({
        //type: "bar",
        type: "doughnut",
        data: {
          labels: arr_labels_chart,
          datasets: [
            {
              label: "My First Dataset",
              data: arr_data_chart,
              backgroundColor: [
                "rgb(255, 99, 132)",
                "rgb(54, 162, 235)",
                "rgb(255, 205, 86)",
                "rgb(255, 0, 0)",
                "rgb(0, 255, 0)",
                "rgb(0, 0, 255)",
              ],
              hoverOffset: 2,
            },
          ],
        },
        options: {
          title: {
            display: true,
            text: " รายงานจำนวนข้อความ เมื่อวาน | " + _date + ":" + time,
          },
        },
      });

      myChart.toFile("./tmp/FbChartReportYesterday.png");

      myChart.getShortUrl().then((short_url_image) => {
        console.log("short_url_image--> ", short_url_image);
        // line send
        sendImageToLineNotify(short_url_image, time, "Yesterday");
      });

      // End gen chart *********************
    })
    .catch((error) => {
      console.log(error);
    });
}

// Report Message Today
// async function getFbTodaySendToLine(fb_accessToken, time) {
//   const token = fb_accessToken;
//   let arr = [];
//   let dataPush = [];
//   let dataPush2 = [];
//   let config = {
//     method: "get",
//     maxBodyLength: Infinity,
//     url:
//       "https://graph.facebook.com/v19.0/" +
//       fb_act +
//       "/insights?sort=reach_descending&level=ad&fields=" +
//       fb_fields +
//       "&access_token=" +
//       token +
//       // "&date_preset=last_7d",
//       // "&date_preset=today",
//       "&date_preset=" +
//       _today,
//     headers: {
//       Cookie: "ps_l=0; ps_n=0",
//     },
//   };

//   await axios
//     .request(config)
//     .then((response) => {
//       arr = response.data.data;

//       //
//       Object.keys(arr).forEach((key) => {
//         if (arr[key].campaign_name == _campaign_name_filter) {
//           dataPush.push({
//             adset_name: arr[key].adset_name,
//             impressions: arr[key].impressions,
//             ad_name: arr[key].ad_name,
//             messageCount: arr[key].actions, // "action_type": "onsite_conversion.total_messaging_connection"
//           });

//           arr[key].actions.forEach((getData, i) => {
//             if (
//               getData.action_type === fb_total_messaging_connection
//               //"onsite_conversion.total_messaging_connection"
//             ) {
//               dataPush2.push({
//                 campaign_name: arr[key].campaign_name,
//                 adset_name: arr[key].adset_name,
//                 impressions: arr[key].impressions,
//                 ad_name: arr[key].ad_name,
//                 action_type: getData.action_type,
//                 value: getData.value,
//               });
//             }
//             //

//             //
//           });
//         }

//         //
//       });
//       // console.log("dataPush2.length--> ", dataPush2.length);
//       const arr_labels = [];

//       dataPush2.forEach((e, i) => {
//         arr_labels.push({
//           _ad_name: e.ad_name,
//           _value: e.value,
//         });
//       });
//       console.log("dataPush2.length--> ", dataPush2.length);

//       const arr_labels_chart = [];
//       const arr_data_chart = [];
//       dataPush2.forEach((e, i) => {
//         //console.log("e--> ", e);
//         arr_labels_chart.push(e.ad_name);
//         arr_data_chart.push(e.value);
//       });
//       console.log("arr_labels_chart--> ", arr_labels_chart);

//       // gen chart *********************
//       const myChart = new ChartJsImage();
//       myChart.setConfig({
//         //type: "bar",
//         type: "doughnut",
//         data: {
//           labels: arr_labels_chart,
//           datasets: [
//             {
//               label: "My First Dataset",
//               data: arr_data_chart,
//               backgroundColor: [
//                 "rgb(255, 99, 132)",
//                 "rgb(54, 162, 235)",
//                 "rgb(255, 205, 86)",
//                 "rgb(255, 0, 0)",
//                 "rgb(0, 255, 0)",
//                 "rgb(0, 0, 255)",
//               ],
//               hoverOffset: 2,
//             },
//           ],
//         },
//         options: {
//           title: {
//             display: true,
//             text: " รายงานจำนวนข้อความ เมื่อวาน | " + _date + ":" + time,
//           },
//         },
//       });

//       myChart.toFile("./tmp/FbChartReportYesterday.png");

//       myChart.getShortUrl().then((short_url_image) => {
//         console.log("short_url_image--> ", short_url_image);
//         // line send
//         sendImageToLineNotify(short_url_image, time, _date);
//       });

//       // End gen chart *********************
//     })
//     .catch((error) => {
//       console.log(error);
//     });
// }

// Report Message 7D
async function getFbSevenDaySendToLine(fb_accessToken, time) {
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
    //"&date_preset=today",
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
            adset_name: arr[key].adset_name,
            impressions: arr[key].impressions,
            ad_name: arr[key].ad_name,
            messageCount: arr[key].actions, // "action_type": "onsite_conversion.total_messaging_connection"
          });

          arr[key].actions.forEach((getData, i) => {
            if (
              getData.action_type === fb_total_messaging_connection
              //"onsite_conversion.total_messaging_connection"
            ) {
              dataPush2.push({
                campaign_name: arr[key].campaign_name,
                adset_name: arr[key].adset_name,
                impressions: arr[key].impressions,
                ad_name: arr[key].ad_name,
                action_type: getData.action_type,
                value: getData.value,
              });
            }
            //

            //
          });
        }

        //
      });
      // console.log("dataPush2.length--> ", dataPush2.length);
      const arr_labels = [];

      dataPush2.forEach((e, i) => {
        arr_labels.push({
          _ad_name: e.ad_name,
          _value: e.value,
        });
      });
      console.log("dataPush2.length--> ", dataPush2.length);

      const arr_labels_chart = [];
      const arr_data_chart = [];
      dataPush2.forEach((e, i) => {
        //console.log("e--> ", e);
        arr_labels_chart.push(e.ad_name);
        arr_data_chart.push(e.value);
      });
      console.log("arr_labels_chart--> ", arr_labels_chart);

      // gen chart *********************
      const myChart = new ChartJsImage();
      myChart.setConfig({
        //type: "bar",
        type: "doughnut",
        data: {
          // labels: [
          //   dataPush2[0].ad_name,
          //   dataPush2[1].ad_name,
          //   dataPush2[2].ad_name,
          // ],
          labels: arr_labels_chart,
          datasets: [
            {
              label: "My First Dataset",
              // data: [
              //   dataPush2[0].value,
              //   dataPush2[1].value,
              //   dataPush2[2].value,
              // ],
              data: arr_data_chart,
              backgroundColor: [
                "rgb(255, 99, 132)",
                "rgb(54, 162, 235)",
                "rgb(255, 205, 86)",
                "rgb(255, 0, 0)",
                "rgb(0, 255, 0)",
                "rgb(0, 0, 255)",
              ],
              hoverOffset: 2,
            },
          ],
        },
        options: {
          title: {
            display: true,
            text: " รายงานจำนวนข้อความ 7 วัน | " + _date + ":" + time,
            // + " " +
            // dataPush2[0].action_type,
          },
        },
      });

      myChart.toFile("./tmp/FbChartReport7D.png");

      myChart.getShortUrl().then((short_url_image) => {
        console.log("short_url_image--> ", short_url_image);
        // line send
        sendImageToLineNotify(short_url_image, time, "Last 7D");
      });

      // End gen chart *********************
    })
    .catch((error) => {
      console.log(error);
    });
}
