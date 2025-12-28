const express = require("express");
const cors = require("cors");
const amazonPaapi = require("amazon-paapi");
const rateLimit = require("express-rate-limit");
require("dotenv").config(); // Use .env for keys!

const app = express();

// 1. SECURITY: Allow your extension to talk to this server
app.use(cors());
app.use(express.json());

// 2. RATE LIMITING: Amazon will block you if you go over 1 req/sec
const apiLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 1, // limit each IP to 1 request per second
  message: { error: "Too many requests. Please slow down!" },
});

const commonParameters = {
  AccessKey: process.env.AMAZON_ACCESS_KEY,
  SecretKey: process.env.AMAZON_SECRET_KEY,
  PartnerTag: process.env.AMAZON_ID, // e.g., yourID-20
  PartnerType: "Associates",
  Marketplace: "www.amazon.com",
};

app.get("/api/amazon-deals", apiLimiter, async (req, res) => {
  const category = req.query.category || "All";

  const requestParameters = {
    Keywords: "deals", // Specific keyword to find sales
    SearchIndex: category,
    ItemCount: 5,
    Resources: [
      "ItemInfo.Title",
      "Images.Primary.Medium",
      "Offers.Listings.Price",
    ],
  };

  try {
    const data = await amazonPaapi.SearchItems(
      commonParameters,
      requestParameters
    );

    // 3. DATA CLEANING: Simplify the data for your popup.js
    const simplifiedDeals = data.SearchResult.Items.map((item) => ({
      title: item.ItemInfo.Title.DisplayValue,
      image: item.Images.Primary.Medium.URL,
      price: item.Offers.Listings[0].Price.DisplayAmount,
      original: item.Offers.Listings[0].Price.Savings
        ? item.Offers.Listings[0].Price.Savings.Amount
        : "",
      affiliateUrl: item.DetailPageURL,
    }));

    res.json(simplifiedDeals);
  } catch (error) {
    console.error("Amazon API Error:", error);
    res.status(500).json({ error: "Failed to fetch deals from Amazon" });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
