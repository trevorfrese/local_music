const weeklyRoundUpEmailId = '20d651d6-8b8e-455c-bd34-a293b8582217';
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

const sendgrid = require('@sendgrid/mail');
const moment = require('moment');

sendgrid.setApiKey(SENDGRID_API_KEY);

const msg = {
  to: 'trevor.frese@gmail.com',
  from: 'trevor.frese@gmail.com',
  subject: `Discover Local Music ${moment().format('L')}`,
  template_id: weeklyRoundUpEmailId,
};

(async () => {
  try {
    const [resp, body] = await sendgrid.send(msg);
    console.log('done', resp, body);
  } catch (err) {
    console.log(err);
  }
})();
