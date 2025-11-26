import express from "express";
import fetch from "node-fetch";

const app = express();

app.use(express.json());

app.post("/send-otp", async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: "Phone number is required" });
  }

  try {
    const response = await fetch("https://control.msg91.com/api/v5/otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authkey: process.env.MSG91_AUTH_KEY,
      },
      body: JSON.stringify({
        mobile: `91${phone}`,
        template_id: process.env.MSG91_TEMPLATE_ID,
        otp_length: 6,
        realTimeResponse: 1,
      }),
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Send OTP Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/verify-otp", async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ error: "Phone & OTP required" });
  }

  try {
    const response = await fetch(
      `https://control.msg91.com/api/v5/otp/verify?mobile=91${phone}&otp=${otp}`,
      {
        method: "GET",
        headers: {
          authkey: process.env.MSG91_AUTH_KEY,
        },
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Verify OTP Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/get-ip", async (req, res) => {
  try {
    const response = await fetch("https://api64.ipify.org?format=json");
    const data = await response.json();
    res.json({
      outbound_ip: data.ip,
      note: "Add this IP in Msg91 whitelist",
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// -----------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
