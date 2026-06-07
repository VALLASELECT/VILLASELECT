exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: ""
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

  try {
    const { amount, villaName, checkIn, checkOut, guests } = JSON.parse(event.body);
    const origin = event.headers.origin || "https://villaselect.netlify.app";

    const params = new URLSearchParams();
    params.append("payment_method_types[]", "card");
    params.append("line_items[0][price_data][currency]", "eur");
    params.append("line_items[0][price_data][product_data][name]", "Acompte – " + villaName);
    params.append("line_items[0][price_data][product_data][description]", "Du " + checkIn + " au " + checkOut + " · " + guests + " voyageur(s)");
    params.append("line_items[0][price_data][unit_amount]", String(Math.round(amount * 100)));
    params.append("line_items[0][quantity]", "1");
    params.append("mode", "payment");
    params.append("locale", "fr");
    params.append("success_url", origin + "?payment=success");
    params.append("cancel_url", origin + "?payment=cancel");

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + STRIPE_SECRET_KEY,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });

    const session = await response.json();

    if (session.error) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: session.error.message })
      };
    }

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ url: session.url })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: error.message })
    };
  }
};
