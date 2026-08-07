const fs = require('fs');

async function testMovieDetailAndPlayback() {
  const slug = 'toi-va-cac-cau-be-nha-walter-phan-2';
  console.log('Fetching phimapi detail for:', slug);
  
  const res = await fetch(`https://phimapi.com/phim/${slug}`);
  const data = await res.json();
  
  console.log('Movie Title:', data.movie?.name);
  console.log('Episodes list length:', data.episodes?.length);
  
  const episodes = data.episodes || [];
  const vietsubStreams = [];
  
  for (const server of episodes) {
    const serverName = server.server_name || "Vietsub";
    const serverData = server.server_data || [];
    
    // Find episode 1 (slug: tap-01)
    const matchedEpisode = serverData.find(ep => ep.slug === 'tap-01' || ep.name === 'Tập 01' || ep.slug === 'tap-1') || serverData[0];
    
    if (matchedEpisode) {
      console.log('Matched episode for server', serverName, ':', matchedEpisode);
      
      const m3u8Url = matchedEpisode.link_m3u8 || (/\.m3u8($|\?)/i.test(matchedEpisode.link) ? matchedEpisode.link : "");
      const embedUrl = matchedEpisode.link_embed || (!m3u8Url ? matchedEpisode.link : "");
      
      if (m3u8Url) {
        vietsubStreams.push({
          name: `${serverName} - Trực Tiếp HLS (Vietsub / Thuyết Minh)`,
          url: m3u8Url,
          streamType: "http"
        });
      }
      if (embedUrl) {
        vietsubStreams.push({
          name: `${serverName} - Player Embed (Vietsub / Thuyết Minh)`,
          url: embedUrl,
          streamType: "embed"
        });
      }
    }
  }
  
  console.log('\nExtracted Vietsub Streams:');
  console.log(vietsubStreams);
  console.log('\nPrimary chosen HLS stream URL:', vietsubStreams[0]?.url);
}

testMovieDetailAndPlayback().catch(console.error);
