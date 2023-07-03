const https = require("https");
const fs = require("fs");
const { create, node } = require("xmlbuilder2");

function fetchP2PData(
  page = 1,
  fiat = "ARS",
  tradeType = "BUY",
  asset = "USDT",
  payTypes = []
) {
  return new Promise((resolve, reject) => {
    const baseObj = {
      page,
      rows: 20,
      publisherType: null,
      asset,
      tradeType,
      fiat,
      payTypes,
    };

    const stringData = JSON.stringify(baseObj);
    const options = {
      hostname: "p2p.binance.com",
      port: 443,
      path: "/bapi/c2c/v2/friendly/c2c/adv/search",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": stringData.length,
      },
    };

    const req = https.request(options, (res) => {
      let output = "";
      res.on("data", (d) => {
        output += d;
      });

      res.on("end", () => {
        try {
          const jsonOutput = JSON.parse(output);
          const rates = jsonOutput.data.adList.map((ad) => ({
            from: ad.advertiserTradeCurrency,
            to: ad.assetName,
            in: ad.price,
            out: ad.assetAmount,
          }));

          // Sort the rates by price in descending order
          rates.sort((a, b) => b.in - a.in);

          // Get the top 10 rates
          const top10Rates = rates.slice(0, 10);

          // Calculate the median of the top 10 rates
          const median = calculateMedian(top10Rates.map((rate) => rate.in));

          // Generate the XML output
          const xmlOutput = generateXML(top10Rates, median);

          // Write the XML output to a text file
          fs.writeFile("/home/cataloupe/Desktop/rates/results.xml", xmlOutput, (error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.write(stringData);
    req.end();
  });
}

function calculateMedian(arr) {
  const sortedArr = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(sortedArr.length / 2);
  return sortedArr.length % 2 === 0
    ? (sortedArr[mid - 1] + sortedArr[mid]) / 2
    : sortedArr[mid];
}

function generateXML(rates, median) {
  const xml = create({ encoding: "UTF-8" }).ele("rates");

  rates.forEach((rate) => {
    xml
      .ele("item")
      .ele("from").txt(rate.from).up()
      .ele("to").txt(rate.to).up()
      .ele("in").txt(median.toString()).up()
      .ele("out").txt(rate.out).up()
      .up();
  });

  return xml.end({ prettyPrint: true });
}

module.exports = fetchP2PData;
