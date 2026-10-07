const defaults = {
  SITE_NAME: 'Paper Notes',
  SITE_URL: 'https://libok03.github.io',
  LOGIN: 'disable',
  COMMENT_AUDIT: 'true',
  IPQPS: '60',
  DISABLE_REGION: 'true',
  DISABLE_USERAGENT: 'true',
  DISABLE_AUTHOR_NOTIFY: 'true'
};

for (const [name, value] of Object.entries(defaults)) {
  if (process.env[name] === undefined) process.env[name] = value;
}

const Application = require('@waline/vercel');
module.exports = Application({plugins: []});
