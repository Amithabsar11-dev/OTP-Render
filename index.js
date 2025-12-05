// import express from "express";
// import fetch from "node-fetch";

// const app = express();

// app.use(express.json());

// app.post("/send-otp", async (req, res) => {
//   const { phone } = req.body;

//   if (!phone) {
//     return res.status(400).json({ error: "Phone number is required" });
//   }

//   try {
//     const response = await fetch("https://control.msg91.com/api/v5/otp", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         authkey: process.env.MSG91_AUTH_KEY,
//       },
//       body: JSON.stringify({
//         mobile: `91${phone}`,
//         template_id: process.env.MSG91_TEMPLATE_ID,
//         otp_length: 6,
//         realTimeResponse: 1,
//       }),
//     });

//     const data = await response.json();
//     res.json(data);
//   } catch (err) {
//     console.error("Send OTP Error:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// app.post("/verify-otp", async (req, res) => {
//   const { phone, otp } = req.body;

//   if (!phone || !otp) {
//     return res.status(400).json({ error: "Phone & OTP required" });
//   }

//   try {
//     const response = await fetch(
//       `https://control.msg91.com/api/v5/otp/verify?mobile=91${phone}&otp=${otp}`,
//       {
//         method: "GET",
//         headers: {
//           authkey: process.env.MSG91_AUTH_KEY,
//         },
//       }
//     );

//     const data = await response.json();
//     res.json(data);
//   } catch (err) {
//     console.error("Verify OTP Error:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// app.get("/get-ip", async (req, res) => {
//   try {
//     const response = await fetch("https://api64.ipify.org?format=json");
//     const data = await response.json();
//     res.json({
//       outbound_ip: data.ip,
//       note: "Add this IP in Msg91 whitelist",
//     });
//   } catch (err) {
//     res.json({ error: err.message });
//   }
// });

// // -----------------------
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => console.log(`Server running on ${PORT}`));

import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ==========================
// SIMPLE OTP MEMORY STORE
// ==========================
const otpStore = new Map();

function saveOtp(phone, otp) {
  otpStore.set(phone, { otp, timestamp: Date.now() });
}

function verifyOtpStored(phone, otp) {
  const entry = otpStore.get(phone);
  if (!entry) return false;

  // Expire after 5 minutes
  if (Date.now() - entry.timestamp > 5 * 60 * 1000) {
    otpStore.delete(phone);
    return false;
  }

  return entry.otp === otp;
}

// ==========================
// SEND OTP USING SMS API
// ==========================
app.post("/send-otp", async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ ok: false, error: "Phone required" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  saveOtp(phone, otp);

  try {
    const response = await fetch("https://control.msg91.com/api/v5/sms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authkey: process.env.MSG91_AUTH_KEY,
      },
      body: JSON.stringify({
        sms: [
          {
            to: [`91${phone}`],
            otp: otp   
          },
        ],
        sender: "SRLBRM",
        route: "4",
        template_id: process.env.MSG91_SMS_TEMPLATE_ID,
        DLT_TE_ID: process.env.MSG91_DLT_TEMPLATE_ID,
      }),
    });

    const raw = await response.text();
    console.log("MSG91 RAW RESPONSE:", raw);

    return res.json({ ok: true, provider: raw });
  } catch (err) {
    return res.json({ ok: false, error: err.message });
  }
});


// ==========================
// VERIFY OTP
// ==========================
app.post("/verify-otp", (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.json({ verified: false, error: "Phone & OTP required" });
  }

  const valid = verifyOtpStored(phone, otp);

  if (valid) {
    otpStore.delete(phone);
    return res.json({ verified: true });
  }

  return res.json({ verified: false, error: "Invalid or expired OTP" });
});

// ==========================
app.get("/get-ip", async (req, res) => {
  try {
    const resp = await fetch("https://api64.ipify.org?format=json");
    const data = await resp.json();
    res.json({ outbound_ip: data.ip });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// ==========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on PORT", PORT));
