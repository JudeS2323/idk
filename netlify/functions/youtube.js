// GET /.netlify/functions/youtube?muscle=chest&max=10
// Needs an environment variable on Netlify: YOUTUBE_API_KEY

const HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  // Cache each muscle search for 1 day to save your YouTube quota
  "Cache-Control": "public, max-age=3600",
  "Netlify-CDN-Cache-Control": "public, s-maxage=86400",
};

const ALLOWED_MUSCLES = [
  "chest", "back", "shoulders", "biceps", "triceps", "forearms",
  "abs", "glutes", "quads", "hamstrings", "calves", "legs",
];

exports.handler = async (event) => {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: "Missing YOUTUBE_API_KEY" }) };
  }

  const params = event.queryStringParameters || {};
  const muscle = (params.muscle || "").toLowerCase().trim();
  const max = Math.min(parseInt(params.max, 10) || 10, 25);

  if (!ALLOWED_MUSCLES.includes(muscle)) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ error: "Invalid muscle", allowed: ALLOWED_MUSCLES }),
    };
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.search = new URLSearchParams({
    part: "snippet",
    q: `${muscle} workout exercises proper form`,
    type: "video",
    videoEmbeddable: "true",
    videoDuration: "medium",
    safeSearch: "strict",
    maxResults: String(max),
    key,
  }).toString();

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      return {
        statusCode: res.status,
        headers: HEADERS,
        body: JSON.stringify({ error: data.error?.message || "YouTube API error" }),
      };
    }

    const videos = (data.items || []).map((item) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      thumbnail:
        item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
    }));

    // Flat lists too, because they're easier to bind in Thunkable
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        muscle,
        videos,
        ids: videos.map((v) => v.id),
        titles: videos.map((v) => v.title),
        channels: videos.map((v) => v.channel),
        thumbnails: videos.map((v) => v.thumbnail),
      }),
    };
  } catch (err) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};
