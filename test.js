const http = require('http');

async function runTest() {
  const baseUrl = 'http://localhost:3000/api';

  const post = (path, data) => new Promise((resolve, reject) => {
    const req = http.request(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });

  console.log('========================================');
  console.log('🧪 RUNNING AD EXCLUSION ENGINE TEST');
  console.log('========================================\n');

  // 1. Create a campaign for Gemini
  const campRes = await post('/campaigns', {
    appBundleId: 'com.google.android.apps.bard',
    adTitle: 'Download Google Gemini Pro Today!',
    fallbackAd: 'Try Notion AI or ChatGPT instead!'
  });
  console.log('✅ Campaign Created:', campRes);
  const campaignId = campRes.campaignId;

  // 2. Register Device 1 (HAS Gemini installed)
  console.log('\n📱 Registering Device 1 (User ALREADY has Gemini)...');
  await post('/devices', {
    deviceToken: 'device_user_1',
    installedApps: ['com.google.android.apps.bard', 'com.spotify.music']
  });

  // 3. Request ad for Device 1
  const adRes1 = await post('/get-ad', {
    deviceToken: 'device_user_1',
    campaignId: campaignId
  });
  console.log('🎯 Ad Decision for Device 1:', adRes1);

  // 4. Register Device 2 (DOES NOT have Gemini installed)
  console.log('\n📱 Registering Device 2 (User DOES NOT have Gemini)...');
  await post('/devices', {
    deviceToken: 'device_user_2',
    installedApps: ['com.whatsapp', 'com.instagram.android']
  });

  // 5. Request ad for Device 2
  const adRes2 = await post('/get-ad', {
    deviceToken: 'device_user_2',
    campaignId: campaignId
  });
  console.log('🎯 Ad Decision for Device 2:', adRes2);
  console.log('\n========================================');
  console.log('🎉 TEST COMPLETE!');
  console.log('========================================');
}

runTest();