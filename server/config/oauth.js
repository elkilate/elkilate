const { google } = require('googleapis');

const CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ||
  '664081808677-snlirqp006ff626jnoeg0kutsfpg9k80.apps.googleusercontent.com';
const CLIENT_SECRET =
  process.env.GOOGLE_CLIENT_SECRET || 'W6TiuHYPWUeerMjDpLp7AWe2';
const REDIRECT_URI = 'https://developers.google.com/oauthplayground';
const REFRESH_TOKEN =
  process.env.GOOGLE_REFRESH_TOKEN ||
  '1//04a59nARlIdscCgYIARAAGAQSNwF-L9IrPLRSZpusktamHp6QFFPzD_gOc1sDFQucgRwhYocH62Vc-kH74PdQ7p2hf5HTyKGash0';

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

module.exports = {
  oAuth2Client,
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI,
  REFRESH_TOKEN,
};
