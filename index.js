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

const otpStore = new Map();

// Save OTP for a phone
function saveOtp(phone, otp) {
  otpStore.set(phone, { otp, timestamp: Date.now() });
}

// Verify OTP (5 minute expiry)
function verifyStoredOtp(phone, otp) {
  const record = otpStore.get(phone);
  if (!record) return false;

  const isExpired = Date.now() - record.timestamp > 5 * 60 * 1000; 
  if (isExpired) {
    otpStore.delete(phone);
    return false;
  }

  return record.otp === otp;
}

app.post("/send-otp", async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: "Phone number is required" });
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
            message: `Your Saral Bhraman login OTP is ${otp}. Please do not share it with anyone.`,
            to: [`91${phone}`],
          },
        ],
        sender: "SRLBRM", 
        route: "4",
        DLT_TE_ID: process.env.MSG91_DLT_TEMPLATE_ID, 
      }),
    });

    const data = await response.json();
    console.log("MSG91 SEND SMS RESPONSE:", data);


    return res.json({ ok: true, provider: data });
  } catch (error) {
    console.error("Send OTP Error:", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});


app.post("/verify-otp", (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ verified: false, error: "Phone & OTP required" });
  }

  const isValid = verifyStoredOtp(phone, otp);

  if (isValid) {
    otpStore.delete(phone);
    return res.json({ verified: true });
  } else {
    return res.status(400).json({ verified: false, error: "Invalid or expired OTP" });
  }
});


app.get("/get-ip", async (req, res) => {
  try {
    const response = await fetch("https://api64.ipify.org?format=json");
    const data = await response.json();
    res.json({ outbound_ip: data.ip, note: "Add this IP in Msg91 whitelist" });
  } catch (err) {
    res.json({ error: err.message });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on PORT ${PORT}`));
