export async function POST(req) {
    const { text } = await req.json();
  
    const response = await fetch("https://libretranslate.com/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source: "en",
        target: "ne",
        format: "text"
      })
    });
  
    const data = await response.json();
  
    return new Response(
      JSON.stringify({ translatedText: data.translatedText }),
      { status: 200 }
    );
  }
  