async function run() {
  const slug = "bong-ma-bao-thu";
  const url = `https://ophim1.com/phim/${slug}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const movie = data.movie || {};
    console.log("Trailer URL raw:", movie.trailer_url);
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
